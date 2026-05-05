import { createError } from 'h3'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const {
  createClientMock,
  createGunzipMock,
  createInterfaceMock,
  fromWebMock,
} = vi.hoisted(() => ({
  createClientMock: vi.fn(),
  createGunzipMock: vi.fn(),
  createInterfaceMock: vi.fn(),
  fromWebMock: vi.fn(),
}))

vi.mock('@supabase/supabase-js', () => ({
  createClient: createClientMock,
}))

vi.mock('node:zlib', () => ({
  createGunzip: createGunzipMock,
}))

vi.mock('node:readline', () => ({
  createInterface: createInterfaceMock,
}))

vi.mock('node:stream', () => ({
  Readable: {
    fromWeb: fromWebMock,
  },
}))

const { runTmdbImport } = await import('../../server/utils/tmdb-import-runner')

interface ImportRow {
  tmdb_id: number
  original_title: string
  popularity: number
}

function createFetchResponse() {
  return {
    ok: true,
    status: 200,
    statusText: 'OK',
    body: {},
  }
}

function createAsyncIterable(lines: string[]) {
  return {
    async *[Symbol.asyncIterator]() {
      for (const line of lines) {
        yield line
      }
    },
  }
}

function buildExportRows(count: number): string[] {
  return Array.from({ length: count }, (_, index) =>
    JSON.stringify({
      id: index + 1,
      original_title: `Movie ${index + 1}`,
      popularity: index + 1,
      adult: false,
    })
  )
}

describe('runTmdbImport', () => {
  let upsertMock: ReturnType<typeof vi.fn>

  beforeEach(() => {
    Object.assign(globalThis, {
      createError,
      useRuntimeConfig: vi.fn(() => ({
        public: {
          supabaseUrl: 'https://example.supabase.co',
        },
        supabaseServiceRoleKey: 'test-service-role-key',
      })),
    })
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(createFetchResponse()))
    fromWebMock.mockReturnValue({
      pipe: vi.fn().mockReturnValue('decompressed-stream'),
    })
    createGunzipMock.mockReturnValue('gunzip-stream')

    upsertMock = vi.fn().mockResolvedValue({ error: null })
    createClientMock.mockReturnValue({
      from: vi.fn().mockReturnValue({
        upsert: upsertMock,
      }),
    })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.clearAllMocks()
  })

  it('filters invalid, adult, and low-popularity rows before bulk upserting', async () => {
    const lines = [
      '{bad json',
      JSON.stringify({ id: '1', original_title: 'Invalid', popularity: 10, adult: false }),
      JSON.stringify({ id: 1, original_title: 'Adult Movie', popularity: 10, adult: true }),
      JSON.stringify({ id: 2, original_title: 'Low Popularity', popularity: 0.24, adult: false }),
      ...Array.from({ length: 99_997 }, (_, index) =>
        JSON.stringify({
          id: index + 4,
          original_title: `Filtered Movie ${index + 4}`,
          popularity: 0.24,
          adult: false,
        })
      ),
      JSON.stringify({ id: 3, original_title: 'Kept Movie', popularity: 9.5, adult: false }),
    ]

    createInterfaceMock.mockReturnValue(createAsyncIterable(lines))

    const result = await runTmdbImport({} as never)

    expect(result).toEqual({
      imported: 1,
      skipped: 2,
      adultExcluded: 1,
      lowPopularityExcluded: 99_998,
      durationSeconds: expect.any(String),
    })
    expect(upsertMock).toHaveBeenCalledTimes(1)
    expect(upsertMock).toHaveBeenCalledWith(
      [{ tmdb_id: 3, original_title: 'Kept Movie', popularity: 9.5 }],
      { onConflict: 'tmdb_id', defaultToNull: false }
    )
  })

  it('flushes 1000-row batches and keeps only five concurrent write requests', async () => {
    let activeRequests = 0
    let maxActiveRequests = 0

    createInterfaceMock.mockReturnValue(createAsyncIterable(buildExportRows(100_000)))
    upsertMock.mockImplementation(async (_rows: ImportRow[]) => {
      activeRequests++
      maxActiveRequests = Math.max(maxActiveRequests, activeRequests)
      await new Promise((resolve) => setTimeout(resolve, 1))
      activeRequests--
      return { error: null }
    })

    const result = await runTmdbImport({} as never)

    expect(result.imported).toBe(100_000)
    expect(upsertMock).toHaveBeenCalledTimes(100)
    expect(upsertMock.mock.calls[0]?.[0]).toHaveLength(1000)
    expect(maxActiveRequests).toBeLessThanOrEqual(5)
  })

  it('fails when the export is truncated below the minimum expected row count', async () => {
    createInterfaceMock.mockReturnValue(createAsyncIterable(buildExportRows(99_999)))

    await expect(runTmdbImport({} as never)).rejects.toMatchObject({
      statusCode: 502,
      statusMessage: 'TMDB import failed',
    })
  })
})
