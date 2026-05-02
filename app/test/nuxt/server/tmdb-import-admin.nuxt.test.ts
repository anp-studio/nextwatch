import { createServer } from 'node:http'
import type { AddressInfo } from 'node:net'
import type { Server } from 'node:http'
import {
  createApp,
  createError,
  defineEventHandler,
  getHeader,
  getRequestIP,
  readBody,
  toNodeListener,
} from 'h3'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

const MAX_BAD_TOKEN_FAILURES = 5
const BAD_TOKEN_LOCK_TTL_S = 15 * 60

const { redisState, runTmdbImportMock } = vi.hoisted(() => {
  const keyValues = new Map<string, string>()
  const expiryByKey = new Map<string, number>()

  function clearRedisState() {
    keyValues.clear()
    expiryByKey.clear()
  }

  const redis = {
    async get<T>(key: string): Promise<T | null> {
      const value = keyValues.get(key)
      if (value === undefined) {
        return null
      }

      return Number(value) as T
    },
    async incr(key: string): Promise<number> {
      const currentValue = Number(keyValues.get(key) ?? '0') + 1
      keyValues.set(key, String(currentValue))

      return currentValue
    },
    async expire(key: string, ttlSeconds: number): Promise<number> {
      expiryByKey.set(key, ttlSeconds)
      return keyValues.has(key) ? 1 : 0
    },
    async del(key: string): Promise<number> {
      const deleted = keyValues.delete(key)
      expiryByKey.delete(key)
      return deleted ? 1 : 0
    },
    async set(
      key: string,
      value: string,
      options?: { ex?: number; nx?: boolean }
    ): Promise<'OK' | null> {
      if (options?.nx && keyValues.has(key)) {
        return null
      }

      keyValues.set(key, value)
      if (options?.ex !== undefined) {
        expiryByKey.set(key, options.ex)
      }

      return 'OK'
    },
    async eval(script: string, keys: string[], args: string[]): Promise<number> {
      void script

      const key = keys[0] ?? ''
      const expectedValue = args[0] ?? ''

      if (keyValues.get(key) !== expectedValue) {
        return 0
      }

      keyValues.delete(key)
      expiryByKey.delete(key)
      return 1
    },
  }

  return {
    redisState: {
      clear: clearRedisState,
      getValue: (key: string) => keyValues.get(key),
      getExpiry: (key: string) => expiryByKey.get(key),
      redis,
    },
    runTmdbImportMock: vi.fn(),
  }
})

vi.mock('../../../server/utils/tmdb-import-runner', () => ({
  runTmdbImport: runTmdbImportMock,
}))

vi.mock('../../../server/utils/redis', () => ({
  createRedisClient: () => redisState.redis,
}))

Object.assign(globalThis, {
  createError,
  defineEventHandler,
  getHeader,
  getRequestIP,
  readBody,
  useRuntimeConfig: vi.fn(() => ({
    adminToken: 'test-admin-token',
  })),
})

const { default: adminImportHandler } = await import('../../../server/api/admin/tmdb-import.post')

function deferredPromise<T>() {
  let resolve!: (value: T) => void
  let reject!: (reason?: unknown) => void
  const promise = new Promise<T>((innerResolve, innerReject) => {
    resolve = innerResolve
    reject = innerReject
  })

  return { promise, resolve, reject }
}

async function readJson(response: Response) {
  return response.json() as Promise<Record<string, unknown>>
}

function createHeaders(overrides: Record<string, string> = {}): HeadersInit {
  return {
    'x-admin-token': 'test-admin-token',
    ...overrides,
  }
}

describe('/api/admin/tmdb-import', () => {
  const app = createApp()
  app.use('/api/admin/tmdb-import', adminImportHandler)

  let baseUrl = ''
  let server: Server

  beforeAll(async () => {
    server = createServer(toNodeListener(app))
    await new Promise<void>((resolve) => {
      server.listen(0, '127.0.0.1', () => resolve())
    })
    const address = server.address() as AddressInfo
    baseUrl = `http://127.0.0.1:${address.port}`
  })

  afterAll(async () => {
    await new Promise<void>((resolve, reject) => {
      server.close((error) => {
        if (error) {
          reject(error)
          return
        }

        resolve()
      })
    })
  })

  beforeEach(() => {
    redisState.clear()
    runTmdbImportMock.mockResolvedValue({
      imported: 1,
      skipped: 0,
      adultExcluded: 0,
      lowPopularityExcluded: 0,
      durationSeconds: '0.01',
    })
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('accepts an empty-body trigger request without the Vercel forwarded IP header', async () => {
    const response = await fetch(`${baseUrl}/api/admin/tmdb-import`, {
      method: 'POST',
      headers: createHeaders(),
    })
    const body = await readJson(response)

    expect(response.status).toBe(200)
    expect(body.imported).toBe(1)
    expect(runTmdbImportMock).toHaveBeenCalledTimes(1)
  })

  it('rejects legacy request bodies', async () => {
    const response = await fetch(`${baseUrl}/api/admin/tmdb-import`, {
      method: 'POST',
      headers: {
        ...createHeaders(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ fullRefresh: true }),
    })

    expect(response.status).toBe(400)
  })

  it('rejects a second request while an import is already running', async () => {
    const pendingImport = deferredPromise<{
      imported: number
      skipped: number
      adultExcluded: number
      lowPopularityExcluded: number
      durationSeconds: string
    }>()

    runTmdbImportMock.mockReturnValueOnce(pendingImport.promise)

    const firstRequest = fetch(`${baseUrl}/api/admin/tmdb-import`, {
      method: 'POST',
      headers: createHeaders({
        'x-vercel-forwarded-for': '198.51.100.10',
      }),
    })

    await Promise.resolve()

    const secondResponse = await fetch(`${baseUrl}/api/admin/tmdb-import`, {
      method: 'POST',
      headers: createHeaders({
        'x-vercel-forwarded-for': '198.51.100.11',
      }),
    })

    pendingImport.resolve({
      imported: 1,
      skipped: 0,
      adultExcluded: 0,
      lowPopularityExcluded: 0,
      durationSeconds: '0.01',
    })

    await firstRequest

    expect(secondResponse.status).toBe(409)
  })

  it('throttles repeated invalid tokens using Redis-backed counters', async () => {
    const throttleIp = '203.0.113.10'

    for (let attempt = 1; attempt < MAX_BAD_TOKEN_FAILURES; attempt++) {
      const response = await fetch(`${baseUrl}/api/admin/tmdb-import`, {
        method: 'POST',
        headers: createHeaders({
          'x-admin-token': `invalid-token-${attempt}`,
          'x-vercel-forwarded-for': throttleIp,
        }),
      })

      expect(response.status).toBe(401)
    }

    const throttledResponse = await fetch(`${baseUrl}/api/admin/tmdb-import`, {
      method: 'POST',
      headers: createHeaders({
        'x-admin-token': 'still-invalid',
        'x-vercel-forwarded-for': throttleIp,
      }),
    })

    expect(throttledResponse.status).toBe(429)
    expect(redisState.getValue(`admin-import:bad-token:${throttleIp}`)).toBe(
      String(MAX_BAD_TOKEN_FAILURES)
    )
    expect(redisState.getExpiry(`admin-import:bad-token:${throttleIp}`)).toBe(BAD_TOKEN_LOCK_TTL_S)
    expect(runTmdbImportMock).not.toHaveBeenCalled()
  })

  it('clears failed token state after a successful authenticated request', async () => {
    const throttleIp = '203.0.113.20'

    const invalidResponse = await fetch(`${baseUrl}/api/admin/tmdb-import`, {
      method: 'POST',
      headers: createHeaders({
        'x-admin-token': 'invalid-token',
        'x-vercel-forwarded-for': throttleIp,
      }),
    })

    expect(invalidResponse.status).toBe(401)
    expect(redisState.getValue(`admin-import:bad-token:${throttleIp}`)).toBe('1')

    const successResponse = await fetch(`${baseUrl}/api/admin/tmdb-import`, {
      method: 'POST',
      headers: createHeaders({
        'x-vercel-forwarded-for': throttleIp,
      }),
    })

    expect(successResponse.status).toBe(200)
    expect(redisState.getValue(`admin-import:bad-token:${throttleIp}`)).toBeUndefined()
  })

  it('releases the Redis lock when the import runner throws', async () => {
    const errorMessage = 'tmdb import failed'
    runTmdbImportMock.mockRejectedValueOnce(new Error(errorMessage))

    const errorResponse = await fetch(`${baseUrl}/api/admin/tmdb-import`, {
      method: 'POST',
      headers: createHeaders({
        'x-vercel-forwarded-for': '203.0.113.30',
      }),
    })

    expect(errorResponse.status).toBe(500)
    expect(redisState.getValue('admin-import:lock')).toBeUndefined()

    const retryResponse = await fetch(`${baseUrl}/api/admin/tmdb-import`, {
      method: 'POST',
      headers: createHeaders({
        'x-vercel-forwarded-for': '203.0.113.31',
      }),
    })

    expect(retryResponse.status).toBe(200)
  })
})
