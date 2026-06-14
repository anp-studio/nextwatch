import { createServer } from 'node:http'
import type { AddressInfo } from 'node:net'
import type { Server } from 'node:http'
import type { SupabaseClient } from '@supabase/supabase-js'
import {
  createApp,
  createError,
  defineEventHandler,
  getHeader,
  readBody,
  toNodeListener,
} from 'h3'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

const {
  getAuthorizedUserMock,
  createServiceSupabaseClientMock,
  userListReadLimiterLimitMock,
  recommendationLimiterGetRemainingMock,
} = vi.hoisted(() => ({
  getAuthorizedUserMock: vi.fn(),
  createServiceSupabaseClientMock: vi.fn(),
  userListReadLimiterLimitMock: vi.fn(),
  recommendationLimiterGetRemainingMock: vi.fn(),
}))

vi.mock('../../../server/utils/auth/authorize-user', () => ({
  getAuthorizedUser: getAuthorizedUserMock,
}))

vi.mock('../../../server/utils/user-lists/rate-limit', () => ({
  userListReadLimiter: {
    limit: userListReadLimiterLimitMock,
  },
}))

vi.mock('../../../server/utils/recommendations/rate-limit', () => ({
  recommendationLimiter: {
    getRemaining: recommendationLimiterGetRemainingMock,
  },
}))

vi.mock('../../../server/utils/shared/supabase-client', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('../../../server/utils/shared/supabase-client')>()

  return {
    ...actual,
    createServiceSupabaseClient: createServiceSupabaseClientMock,
  }
})

Object.assign(globalThis, {
  createError,
  defineEventHandler,
  getHeader,
  readBody,
})

const { default: onboardingStatusHandler } = await import('../../../server/api/onboarding/status.get')
const { default: onboardingCompleteHandler } = await import(
  '../../../server/api/onboarding/complete.post'
)
const { default: watchedHandler } = await import('../../../server/api/watched/index')
const { default: myListHandler } = await import('../../../server/api/mylist/index')
const { default: recommendQuotaHandler } = await import(
  '../../../server/api/recommend/quota.get'
)

interface ProfileRow {
  id: string
  onboarding_completed_at: string | null
}

interface MyListRow {
  tmdb_ids: number[]
}

interface OnboardingState {
  profile: ProfileRow
  watchedIds: number[]
  watchedUpserts: Array<Record<string, unknown> | Array<Record<string, unknown>>>
  profileUpdates: Array<Record<string, unknown>>
  myListRow: MyListRow | null
}

function createServiceSupabase(state: OnboardingState): SupabaseClient {
  return {
    from(table: string) {
      if (table === 'profiles') {
        return {
          async upsert(payload: Record<string, unknown>) {
            if (payload.id === TEST_USER_ID && typeof payload.onboarding_completed_at === 'string') {
              state.profile.onboarding_completed_at = payload.onboarding_completed_at
              state.profileUpdates.push(payload)
            }

            return { error: null }
          },
        }
      }

      throw new Error(`Unexpected service table: ${table}`)
    },
  } as unknown as SupabaseClient
}

const TEST_USER_ID = '00000000-0000-0000-0000-000000000001'
const COMPLETED_AT = '2026-06-14T10:00:00.000Z'

function createMockSupabase(state: OnboardingState) {
  return {
    from(table: string) {
      if (table === 'profiles') {
        return createProfilesBuilder(state)
      }

      if (table === 'user_watched_movies') {
        return createWatchedBuilder(state)
      }

      if (table === 'user_my_list') {
        return createMyListBuilder(state)
      }

      throw new Error(`Unexpected table: ${table}`)
    },
  }
}

function createProfilesBuilder(state: OnboardingState) {
  const filters: Record<string, unknown> = {}

  const builder = {
    select() {
      return builder
    },
    eq(key: string, value: unknown) {
      filters[key] = value
      return builder
    },
    limit() {
      return builder
    },
    async maybeSingle() {
      if (filters.id !== TEST_USER_ID) {
        return { data: null, error: null }
      }

      return { data: state.profile, error: null }
    },
    async upsert(payload: Record<string, unknown>) {
      state.profileUpdates.push(payload)

      if (payload.id === TEST_USER_ID && typeof payload.onboarding_completed_at === 'string') {
        state.profile.onboarding_completed_at = payload.onboarding_completed_at
      }

      return { error: null }
    },
    update(payload: Record<string, unknown>) {
      state.profileUpdates.push(payload)
      return builder
    },
    async single() {
      Object.assign(state.profile, {
        onboarding_completed_at:
          typeof state.profileUpdates.at(-1)?.onboarding_completed_at === 'string'
            ? state.profileUpdates.at(-1)?.onboarding_completed_at
            : state.profile.onboarding_completed_at,
      })

      return {
        data: state.profile,
        error: null,
      }
    },
  }

  return builder
}

function createWatchedBuilder(state: OnboardingState) {
  const filters: Record<string, unknown> = {}

  const builder = {
    select() {
      return builder
    },
    eq(key: string, value: unknown) {
      filters[key] = value
      return builder
    },
    async upsert(payload: Record<string, unknown> | Array<Record<string, unknown>>) {
      state.watchedUpserts.push(payload)

      const rows = Array.isArray(payload) ? payload : [payload]
      for (const row of rows) {
        const tmdbId = row.tmdb_id
        if (typeof tmdbId === 'number' && !state.watchedIds.includes(tmdbId)) {
          state.watchedIds.push(tmdbId)
        }
      }

      return { error: null }
    },
    async then(resolve: (value: { data: Array<{ tmdb_id: number }>; error: null }) => void) {
      const filteredIds = state.watchedIds.filter((tmdbId) => {
        if (typeof filters.tmdb_id === 'number' && filters.tmdb_id !== tmdbId) {
          return false
        }

        if (typeof filters.user_id === 'string' && filters.user_id !== TEST_USER_ID) {
          return false
        }

        return true
      })

      resolve({
        data: filteredIds.map((tmdbId) => ({ tmdb_id: tmdbId })),
        error: null,
      })
    },
  }

  return builder
}

function createMyListBuilder(state: OnboardingState) {
  const builder = {
    select() {
      return builder
    },
    eq() {
      return builder
    },
    limit() {
      return builder
    },
    async maybeSingle() {
      return { data: state.myListRow, error: null }
    },
  }

  return builder
}

async function readJson<T>(response: Response) {
  return response.json() as Promise<T>
}

describe('onboarding routes', () => {
  const app = createApp()
  app.use('/api/onboarding/status', onboardingStatusHandler)
  app.use('/api/onboarding/complete', onboardingCompleteHandler)
  app.use('/api/watched', watchedHandler)
  app.use('/api/mylist', myListHandler)
  app.use('/api/recommend/quota', recommendQuotaHandler)

  let baseUrl = ''
  let server: Server
  let state: OnboardingState

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
    state = {
      profile: {
        id: TEST_USER_ID,
        onboarding_completed_at: null,
      },
      watchedIds: [],
      watchedUpserts: [],
      profileUpdates: [],
      myListRow: { tmdb_ids: [] },
    }

    getAuthorizedUserMock.mockResolvedValue({
      supabase: createMockSupabase(state),
      user: { id: TEST_USER_ID },
    })
    createServiceSupabaseClientMock.mockImplementation(() => createServiceSupabase(state))
    userListReadLimiterLimitMock.mockResolvedValue({
      success: true,
      limit: 20,
      remaining: 19,
      reset: 0,
    })
    recommendationLimiterGetRemainingMock.mockResolvedValue({
      limit: 20,
      remaining: 20,
      reset: 0,
    })
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('returns incomplete onboarding status when the profile has no completion timestamp', async () => {
    const response = await fetch(`${baseUrl}/api/onboarding/status`)
    const body = await readJson<{ completed: boolean; completedAt: string | null }>(response)

    expect(response.status).toBe(200)
    expect(body).toEqual({
      completed: false,
      completedAt: null,
    })
  })

  it('returns completed onboarding status when the profile has a completion timestamp', async () => {
    state.profile.onboarding_completed_at = COMPLETED_AT

    const response = await fetch(`${baseUrl}/api/onboarding/status`)
    const body = await readJson<{ completed: boolean; completedAt: string | null }>(response)

    expect(response.status).toBe(200)
    expect(body).toEqual({
      completed: true,
      completedAt: COMPLETED_AT,
    })
  })

  it('rejects onboarding completion with fewer than five movies', async () => {
    const response = await fetch(`${baseUrl}/api/onboarding/complete`, {
      method: 'POST',
      body: JSON.stringify({
        tmdbIds: [11, 22, 33, 44],
      }),
      headers: { 'Content-Type': 'application/json' },
    })

    expect(response.status).toBe(400)
  })

  it('rejects onboarding completion with duplicate movie ids', async () => {
    const response = await fetch(`${baseUrl}/api/onboarding/complete`, {
      method: 'POST',
      body: JSON.stringify({
        tmdbIds: [11, 22, 22, 33, 44],
      }),
      headers: { 'Content-Type': 'application/json' },
    })

    expect(response.status).toBe(400)
  })

  it('batch inserts watched rows and marks onboarding complete', async () => {
    const tmdbIds = [11, 22, 33, 44, 55]

    const response = await fetch(`${baseUrl}/api/onboarding/complete`, {
      method: 'POST',
      body: JSON.stringify({ tmdbIds }),
      headers: { 'Content-Type': 'application/json' },
    })
    const body = await readJson<{
      success: boolean
      completed: boolean
      completedAt: string | null
    }>(response)

    expect(response.status).toBe(200)
    expect(body.success).toBe(true)
    expect(body.completed).toBe(true)
    expect(body.completedAt).not.toBeNull()
    expect(state.watchedUpserts).toHaveLength(1)
    expect(state.watchedUpserts[0]).toEqual(
      tmdbIds.map((tmdbId) => ({
        user_id: TEST_USER_ID,
        tmdb_id: tmdbId,
      }))
    )
    expect(state.profileUpdates).toHaveLength(1)
  })

  it('rejects onboarding completion for already onboarded users', async () => {
    state.profile.onboarding_completed_at = COMPLETED_AT

    const response = await fetch(`${baseUrl}/api/onboarding/complete`, {
      method: 'POST',
      body: JSON.stringify({
        tmdbIds: [11, 22, 33, 44, 55],
      }),
      headers: { 'Content-Type': 'application/json' },
    })

    expect(response.status).toBe(409)
  })

  it('blocks watched access until onboarding is complete', async () => {
    const response = await fetch(`${baseUrl}/api/watched`)
    const body = await readJson<{ statusCode: number; statusMessage: string }>(response)

    expect(response.status).toBe(403)
    expect(body.statusMessage).toBe('Onboarding required.')
  })

  it('blocks my-list access until onboarding is complete', async () => {
    const response = await fetch(`${baseUrl}/api/mylist`)
    const body = await readJson<{ statusCode: number; statusMessage: string }>(response)

    expect(response.status).toBe(403)
    expect(body.statusMessage).toBe('Onboarding required.')
  })

  it('blocks recommendation quota access until onboarding is complete', async () => {
    const response = await fetch(`${baseUrl}/api/recommend/quota`)
    const body = await readJson<{ statusCode: number; statusMessage: string }>(response)

    expect(response.status).toBe(403)
    expect(body.statusMessage).toBe('Onboarding required.')
  })

  it('allows protected routes after onboarding is complete', async () => {
    state.profile.onboarding_completed_at = COMPLETED_AT
    state.watchedIds = [101]

    const watchedResponse = await fetch(`${baseUrl}/api/watched`)
    const quotaResponse = await fetch(`${baseUrl}/api/recommend/quota`)

    expect(watchedResponse.status).toBe(200)
    expect(quotaResponse.status).toBe(200)
  })
})
