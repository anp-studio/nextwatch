import { createServer } from 'node:http'
import { createHash } from 'node:crypto'
import type { AddressInfo } from 'node:net'
import type { Server } from 'node:http'
import type { SupabaseClient } from '@supabase/supabase-js'
import { createApp, createError, defineEventHandler, getQuery, toNodeListener } from 'h3'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  cloneRecommendations,
  cloneWatchedMovies,
  FRESH_CACHE_RECOMMENDATIONS,
  GENERATED_RECOMMENDATIONS,
  INSUFFICIENT_VALID_RECOMMENDATIONS,
  MY_LIST_MOVIES,
  STALE_RECOMMENDATIONS,
  TEST_USER_ID,
  WATCHED_MOVIES,
} from '../../fixtures/recommendation-fixtures'

const {
  fetchMyListMoviesMock,
  fetchWatchedMoviesMock,
  getAuthorizedUserMock,
  getRecommendationsFromGeminiMock,
} = vi.hoisted(() => ({
  fetchMyListMoviesMock: vi.fn(),
  fetchWatchedMoviesMock: vi.fn(),
  getAuthorizedUserMock: vi.fn(),
  getRecommendationsFromGeminiMock: vi.fn(),
}))

vi.mock('../../../server/utils/auth', () => ({
  getAuthorizedUser: getAuthorizedUserMock,
}))

vi.mock('../../../server/utils/recommendations', () => ({
  fetchMyListMovies: fetchMyListMoviesMock,
  fetchWatchedMovies: fetchWatchedMoviesMock,
  getRecommendationsFromGemini: getRecommendationsFromGeminiMock,
  hasEnoughRecommendationsToCache: (recommendations: Array<{ tmdbId: number | null }>) =>
    recommendations.filter((recommendation) => recommendation.tmdbId !== null).length >= 5,
  hasValidTmdbId: (recommendation: { tmdbId: number | null }) => recommendation.tmdbId !== null,
}))

Object.assign(globalThis, {
  createError,
  defineEventHandler,
  getQuery,
})

const { default: recommendHandler } = await import('../../../server/api/recommend.get')

interface MockCacheRow {
  recommendations: Array<{
    name: string
    originalName: string
    year: number
    tmdbId: number | null
  }>
  watched_hash: string
  expires_at: string
}

interface MockSupabaseState {
  cachedRow: MockCacheRow | null
  selectError: { message: string } | null
  upsertError: { message: string } | null
  upsertPayload: {
    user_id: string
    recommendations: Array<{
      name: string
      originalName: string
      year: number
      tmdbId: number | null
    }>
    watched_hash: string
    expires_at: string
  } | null
}

function computeWatchedHash(movies: typeof WATCHED_MOVIES): string {
  const sorted = [...movies]
    .sort((a, b) => a.tmdbId - b.tmdbId)
    .map(({ tmdbId, title, year }) => ({ tmdbId, title, year }))

  return createHash('sha256').update(JSON.stringify(sorted)).digest('hex')
}

function createMockSupabase(state: MockSupabaseState): SupabaseClient {
  return {
    from() {
      const builder = {
        select() {
          return builder
        },
        eq() {
          return builder
        },
        async maybeSingle() {
          if (state.selectError) {
            return { data: null, error: state.selectError }
          }

          return { data: state.cachedRow, error: null }
        },
        async upsert(payload: MockSupabaseState['upsertPayload']) {
          state.upsertPayload = payload

          if (state.upsertError) {
            return { error: state.upsertError }
          }

          if (!payload) {
            return { error: null }
          }

          state.cachedRow = {
            recommendations: cloneRecommendations(payload.recommendations),
            watched_hash: payload.watched_hash,
            expires_at: payload.expires_at,
          }

          return { error: null }
        },
      }

      return builder
    },
  } as unknown as SupabaseClient
}

async function readJson(response: Response) {
  return response.json() as Promise<Record<string, unknown>>
}

describe('/api/recommend', () => {
  const app = createApp()
  app.use('/api/recommend', recommendHandler)

  let baseUrl = ''
  let server: Server
  let supabaseState: MockSupabaseState

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
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-04-23T00:00:00.000Z'))

    supabaseState = {
      cachedRow: null,
      selectError: null,
      upsertError: null,
      upsertPayload: null,
    }

    getAuthorizedUserMock.mockResolvedValue({
      supabase: createMockSupabase(supabaseState),
      user: { id: TEST_USER_ID },
    })
    fetchWatchedMoviesMock.mockResolvedValue(cloneWatchedMovies(WATCHED_MOVIES))
    fetchMyListMoviesMock.mockResolvedValue(cloneWatchedMovies(MY_LIST_MOVIES))
    getRecommendationsFromGeminiMock.mockResolvedValue(
      cloneRecommendations(GENERATED_RECOMMENDATIONS)
    )
  })

  afterEach(() => {
    vi.clearAllMocks()
    vi.useRealTimers()
  })

  it('returns fresh cached recommendations without calling Gemini', async () => {
    supabaseState.cachedRow = {
      recommendations: cloneRecommendations(FRESH_CACHE_RECOMMENDATIONS),
      watched_hash: computeWatchedHash(WATCHED_MOVIES),
      expires_at: '2026-04-30T00:00:00.000Z',
    }

    const response = await fetch(`${baseUrl}/api/recommend`)
    const body = await readJson(response)

    expect(response.status).toBe(200)
    expect(body.cached).toBe(true)
    expect(body.regenerationError).toBeNull()
    expect(body.staleRecommendations).toBeNull()
    expect(body.recommendations).toEqual(FRESH_CACHE_RECOMMENDATIONS)
    expect(getRecommendationsFromGeminiMock).not.toHaveBeenCalled()
  })

  it('regenerates and stores recommendations when cache is not reusable', async () => {
    supabaseState.cachedRow = {
      recommendations: cloneRecommendations(FRESH_CACHE_RECOMMENDATIONS),
      watched_hash: 'outdated-hash',
      expires_at: '2026-04-20T00:00:00.000Z',
    }

    const response = await fetch(`${baseUrl}/api/recommend?refresh=true`)
    const body = await readJson(response)

    expect(response.status).toBe(200)
    expect(body.cached).toBe(false)
    expect(body.regenerationError).toBeNull()
    expect(body.staleRecommendations).toBeNull()
    expect(body.recommendations).toEqual(GENERATED_RECOMMENDATIONS)
    expect(getRecommendationsFromGeminiMock).toHaveBeenCalledTimes(1)
    expect(supabaseState.upsertPayload?.recommendations).toEqual(GENERATED_RECOMMENDATIONS)
  })

  it('returns stale recommendations with retryable regeneration metadata for 503 failures', async () => {
    supabaseState.cachedRow = {
      recommendations: cloneRecommendations(STALE_RECOMMENDATIONS),
      watched_hash: 'expired-hash',
      expires_at: '2026-04-01T00:00:00.000Z',
    }
    getRecommendationsFromGeminiMock.mockRejectedValue(
      createError({
        statusCode: 503,
        statusMessage: 'Gemini is temporarily unavailable due to high demand.',
      })
    )

    const response = await fetch(`${baseUrl}/api/recommend?refresh=true`)
    const body = await readJson(response)

    expect(response.status).toBe(200)
    expect(body.recommendations).toBeNull()
    expect(body.cached).toBe(false)
    expect(body.regenerationError).toEqual({
      statusCode: 503,
      statusMessage: 'Gemini is temporarily unavailable due to high demand.',
      retryable: true,
    })
    expect(body.staleRecommendations).toEqual(STALE_RECOMMENDATIONS)
  })

  it('returns stale recommendations with non-retryable metadata for 429 failures', async () => {
    supabaseState.cachedRow = {
      recommendations: cloneRecommendations(STALE_RECOMMENDATIONS),
      watched_hash: 'expired-hash',
      expires_at: '2026-04-01T00:00:00.000Z',
    }
    getRecommendationsFromGeminiMock.mockRejectedValue(
      createError({
        statusCode: 429,
        statusMessage: 'Daily recommendation limit reached. Please try again tomorrow.',
      })
    )

    const response = await fetch(`${baseUrl}/api/recommend?refresh=true`)
    const body = await readJson(response)

    expect(response.status).toBe(200)
    expect(body.regenerationError).toEqual({
      statusCode: 429,
      statusMessage: 'Daily recommendation limit reached. Please try again tomorrow.',
      retryable: false,
    })
    expect(body.staleRecommendations).toEqual(STALE_RECOMMENDATIONS)
  })

  it('returns fallback metadata when regeneration results in too few valid recommendations', async () => {
    supabaseState.cachedRow = {
      recommendations: cloneRecommendations(STALE_RECOMMENDATIONS),
      watched_hash: 'expired-hash',
      expires_at: '2026-04-01T00:00:00.000Z',
    }
    getRecommendationsFromGeminiMock.mockResolvedValue(
      cloneRecommendations(INSUFFICIENT_VALID_RECOMMENDATIONS)
    )

    const response = await fetch(`${baseUrl}/api/recommend?refresh=true`)
    const body = await readJson(response)

    expect(response.status).toBe(200)
    expect(body.recommendations).toBeNull()
    expect(body.regenerationError).toEqual({
      statusCode: 502,
      statusMessage: 'Recommendation generation returned too few valid TMDB matches.',
      retryable: false,
    })
    expect(body.staleRecommendations).toEqual(STALE_RECOMMENDATIONS)
  })

  it('preserves the original error when regeneration fails without stored fallback', async () => {
    getRecommendationsFromGeminiMock.mockRejectedValue(
      createError({
        statusCode: 503,
        statusMessage: 'Gemini is temporarily unavailable due to high demand.',
      })
    )

    const response = await fetch(`${baseUrl}/api/recommend?refresh=true`)
    const body = await readJson(response)

    expect(response.status).toBe(503)
    expect(body.statusCode).toBe(503)
    expect(body.statusMessage).toBe('Gemini is temporarily unavailable due to high demand.')
  })
})
