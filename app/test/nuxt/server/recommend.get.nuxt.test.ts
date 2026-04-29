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
  recommendationIds,
  STALE_RECOMMENDATIONS,
  TEST_USER_ID,
  WATCHED_MOVIES,
} from '../../fixtures/recommendation-fixtures'

const {
  fetchMyListMoviesMock,
  fetchWatchedMoviesMock,
  getAuthorizedUserMock,
  getRecommendationsFromGeminiMock,
  acquireRecommendationLockMock,
  releaseRecommendationLockMock,
} = vi.hoisted(() => ({
  fetchMyListMoviesMock: vi.fn(),
  fetchWatchedMoviesMock: vi.fn(),
  getAuthorizedUserMock: vi.fn(),
  getRecommendationsFromGeminiMock: vi.fn(),
  acquireRecommendationLockMock: vi.fn(),
  releaseRecommendationLockMock: vi.fn(),
}))

vi.mock('../../../server/utils/auth', () => ({
  getAuthorizedUser: getAuthorizedUserMock,
}))

vi.mock('../../../server/utils/recommendations', () => ({
  fetchMyListMovies: fetchMyListMoviesMock,
  fetchWatchedMovies: fetchWatchedMoviesMock,
  getRecommendationsFromGemini: getRecommendationsFromGeminiMock,
  MIN_RECOMMENDATIONS_TO_CACHE: 5,
  hydrateRecommendationsByTmdbIds: (supabase: unknown, tmdbIds: number[]) =>
    Promise.resolve(
      [
        ...FRESH_CACHE_RECOMMENDATIONS,
        ...GENERATED_RECOMMENDATIONS,
        ...STALE_RECOMMENDATIONS,
        ...INSUFFICIENT_VALID_RECOMMENDATIONS,
      ]
        .filter((recommendation) => recommendation.tmdbId !== null && tmdbIds.includes(recommendation.tmdbId))
        .map((recommendation) => ({
          name: recommendation.name,
          originalName: recommendation.originalName,
          year: recommendation.year,
          tmdbId: recommendation.tmdbId,
        }))
    ),
  hasEnoughRecommendationsToCache: (recommendations: Array<{ tmdbId: number | null }>) =>
    recommendations.filter((recommendation) => recommendation.tmdbId !== null).length >= 5,
  hasValidTmdbId: (recommendation: { tmdbId: number | null }) => recommendation.tmdbId !== null,
}))

vi.mock('../../../server/utils/recommendation-lock', () => ({
  acquireRecommendationLock: acquireRecommendationLockMock,
  releaseRecommendationLock: releaseRecommendationLockMock,
}))

vi.mock('../../../server/utils/redis', () => ({
  createRedisClient: () => ({}),
}))

Object.assign(globalThis, {
  createError,
  defineEventHandler,
  getQuery,
})

const { default: recommendHandler } = await import('../../../server/api/recommend.get')

interface MockCacheRow {
  tmdb_ids: number[]
  watched_hash: string
  expires_at: string
}

interface MockMovieRow {
  tmdb_id: number
  popularity: number
}

interface MockSupabaseState {
  cachedRow: MockCacheRow | null
  movieRows: MockMovieRow[]
  selectError: { message: string } | null
  upsertError: { message: string } | null
  upsertPayload: {
    user_id: string
    tmdb_ids: number[]
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
    from(table: string) {
      if (table === 'movies') {
        const movieBuilder = {
          select() {
            return movieBuilder
          },
          async in(_column: string, tmdbIds: number[]) {
            return {
              data: state.movieRows.filter((row) => tmdbIds.includes(row.tmdb_id)),
              error: null,
            }
          },
        }

        return movieBuilder
      }

      const recommendationBuilder = {
        select() {
          return recommendationBuilder
        },
        eq() {
          return recommendationBuilder
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
            tmdb_ids: [...payload.tmdb_ids],
            watched_hash: payload.watched_hash,
            expires_at: payload.expires_at,
          }

          return { error: null }
        },
      }

      return recommendationBuilder
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
      movieRows: [
        ...recommendationIds(FRESH_CACHE_RECOMMENDATIONS),
        ...recommendationIds(GENERATED_RECOMMENDATIONS),
        ...recommendationIds(STALE_RECOMMENDATIONS),
        ...recommendationIds(INSUFFICIENT_VALID_RECOMMENDATIONS),
      ].map((tmdb_id) => ({ tmdb_id, popularity: 50 })),
      selectError: null,
      upsertError: null,
      upsertPayload: null,
    }

    getAuthorizedUserMock.mockResolvedValue({
      supabase: createMockSupabase(supabaseState),
      user: { id: TEST_USER_ID },
    })
    acquireRecommendationLockMock.mockResolvedValue({
      key: `recommendation-lock:${TEST_USER_ID}`,
      value: 'lock-token',
    })
    releaseRecommendationLockMock.mockResolvedValue(true)
    fetchWatchedMoviesMock.mockResolvedValue(cloneWatchedMovies(WATCHED_MOVIES))
    fetchMyListMoviesMock.mockResolvedValue(cloneWatchedMovies(MY_LIST_MOVIES))
    getRecommendationsFromGeminiMock.mockResolvedValue({
      recommendations: cloneRecommendations(GENERATED_RECOMMENDATIONS),
      tmdbFallbackCount: 0,
      systemPrompt: '',
      userMessage: '',
    })
  })

  afterEach(() => {
    vi.clearAllMocks()
    vi.useRealTimers()
  })

  it('returns fresh cached recommendations without calling Gemini', async () => {
    supabaseState.cachedRow = {
      tmdb_ids: recommendationIds(FRESH_CACHE_RECOMMENDATIONS),
      watched_hash: computeWatchedHash(WATCHED_MOVIES),
      expires_at: '2026-04-30T00:00:00.000Z',
    }

    const response = await fetch(`${baseUrl}/api/recommend`)
    const body = await readJson(response)

    expect(response.status).toBe(200)
    expect(body.cached).toBe(true)
    expect(body.regenerationError).toBeNull()
    expect(body.staleRecommendations).toBeNull()
    expect(body.unmatchedRecommendations).toBeNull()
    expect(body.recommendations).toEqual(
      FRESH_CACHE_RECOMMENDATIONS.map(({ tmdbId, originalName, year }) => ({
        tmdbId,
        originalName,
        year,
      }))
    )
    expect(getRecommendationsFromGeminiMock).not.toHaveBeenCalled()
  })

  it('regenerates and stores recommendations when cache is not reusable', async () => {
    supabaseState.cachedRow = {
      tmdb_ids: recommendationIds(FRESH_CACHE_RECOMMENDATIONS),
      watched_hash: 'outdated-hash',
      expires_at: '2026-04-20T00:00:00.000Z',
    }

    const response = await fetch(`${baseUrl}/api/recommend?refresh=true`)
    const body = await readJson(response)

    expect(response.status).toBe(200)
    expect(body.cached).toBe(false)
    expect(body.regenerationError).toBeNull()
    expect(body.staleRecommendations).toBeNull()
    expect(body.unmatchedRecommendations).toEqual([])
    expect(body.recommendations).toEqual(
      GENERATED_RECOMMENDATIONS.map(({ tmdbId, originalName, year }) => ({
        tmdbId,
        originalName,
        year,
      }))
    )
    expect(getRecommendationsFromGeminiMock).toHaveBeenCalledTimes(1)
    expect(supabaseState.upsertPayload?.tmdb_ids).toEqual(
      recommendationIds(GENERATED_RECOMMENDATIONS)
    )
  })

  it('deduplicates generated recommendations before returning and caching them', async () => {
    getRecommendationsFromGeminiMock.mockResolvedValue({
      recommendations: [
        GENERATED_RECOMMENDATIONS[0]!,
        GENERATED_RECOMMENDATIONS[0]!,
        GENERATED_RECOMMENDATIONS[1]!,
        GENERATED_RECOMMENDATIONS[2]!,
        GENERATED_RECOMMENDATIONS[3]!,
        GENERATED_RECOMMENDATIONS[4]!,
      ],
      tmdbFallbackCount: 0,
      systemPrompt: '',
      userMessage: '',
    })

    const response = await fetch(`${baseUrl}/api/recommend?refresh=true`)
    const body = await readJson(response)

    expect(response.status).toBe(200)
    expect(body.recommendations).toEqual(
      GENERATED_RECOMMENDATIONS.map(({ tmdbId, originalName, year }) => ({
        tmdbId,
        originalName,
        year,
      }))
    )
    expect(supabaseState.upsertPayload?.tmdb_ids).toEqual(
      recommendationIds(GENERATED_RECOMMENDATIONS)
    )
  })

  it('returns unmatched recommendations from Gemini when TMDB resolution fails', async () => {
    getRecommendationsFromGeminiMock.mockResolvedValue({
      recommendations: [
        ...cloneRecommendations(GENERATED_RECOMMENDATIONS),
        {
          name: 'Unknown Festival Cut',
          originalName: 'Unknown Festival Cut',
          year: 2024,
          tmdbId: null,
        },
      ],
      tmdbFallbackCount: 0,
      systemPrompt: '',
      userMessage: '',
    })

    const response = await fetch(`${baseUrl}/api/recommend?refresh=true`)
    const body = await readJson(response)

    expect(response.status).toBe(200)
    expect(body.recommendations).toEqual(
      GENERATED_RECOMMENDATIONS.map(({ tmdbId, originalName, year }) => ({
        tmdbId,
        originalName,
        year,
      }))
    )
    expect(body.unmatchedRecommendations).toEqual([
      {
        name: 'Unknown Festival Cut',
        originalName: 'Unknown Festival Cut',
        year: 2024,
      },
    ])
  })

  it('returns resolved recommendations and stores the sanitized cache payload', async () => {
    const extendedRecommendations = [
      ...cloneRecommendations(GENERATED_RECOMMENDATIONS),
      { ...STALE_RECOMMENDATIONS[0]! },
    ]
    const lowPopularityId = GENERATED_RECOMMENDATIONS[4]!.tmdbId
    supabaseState.movieRows = supabaseState.movieRows.map((row) =>
      row.tmdb_id === lowPopularityId ? { ...row, popularity: 1 } : row
    )
    getRecommendationsFromGeminiMock.mockResolvedValue({
      recommendations: extendedRecommendations,
      tmdbFallbackCount: 0,
      systemPrompt: '',
      userMessage: '',
    })

    const response = await fetch(`${baseUrl}/api/recommend?refresh=true`)
    const body = await readJson(response)

    expect(response.status).toBe(200)
    expect(Array.isArray(body.recommendations)).toBe(true)
    expect((body.recommendations as Array<unknown>).length).toBeGreaterThanOrEqual(5)
    expect(body.unmatchedRecommendations).toEqual([])
    expect(supabaseState.upsertPayload?.tmdb_ids).toEqual(recommendationIds(extendedRecommendations))
  })

  it('returns stale recommendations with retryable regeneration metadata for 503 failures', async () => {
    supabaseState.cachedRow = {
      tmdb_ids: recommendationIds(STALE_RECOMMENDATIONS),
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
    expect(body.unmatchedRecommendations).toBeNull()
    expect(body.staleRecommendations).toEqual(
      STALE_RECOMMENDATIONS.map(({ tmdbId, originalName, year }) => ({
        tmdbId,
        originalName,
        year,
      }))
    )
  })

  it('returns stale recommendations with non-retryable metadata for 429 failures', async () => {
    supabaseState.cachedRow = {
      tmdb_ids: recommendationIds(STALE_RECOMMENDATIONS),
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
    expect(body.unmatchedRecommendations).toBeNull()
    expect(body.staleRecommendations).toEqual(
      STALE_RECOMMENDATIONS.map(({ tmdbId, originalName, year }) => ({
        tmdbId,
        originalName,
        year,
      }))
    )
  })

  it('returns fallback metadata when regeneration results in too few valid recommendations', async () => {
    supabaseState.cachedRow = {
      tmdb_ids: recommendationIds(STALE_RECOMMENDATIONS),
      watched_hash: 'expired-hash',
      expires_at: '2026-04-01T00:00:00.000Z',
    }
    getRecommendationsFromGeminiMock.mockResolvedValue({
      recommendations: cloneRecommendations(INSUFFICIENT_VALID_RECOMMENDATIONS),
      tmdbFallbackCount: 0,
      systemPrompt: '',
      userMessage: '',
    })

    const response = await fetch(`${baseUrl}/api/recommend?refresh=true`)
    const body = await readJson(response)

    expect(response.status).toBe(200)
    expect(body.recommendations).toBeNull()
    expect(body.regenerationError).toEqual({
      statusCode: 502,
      statusMessage: 'Recommendation generation returned too few valid TMDB matches.',
      retryable: false,
    })
    expect(body.unmatchedRecommendations).toEqual(
      INSUFFICIENT_VALID_RECOMMENDATIONS.filter(({ tmdbId }) => tmdbId === null).map(
        ({ name, originalName, year }) => ({
          name,
          originalName,
          year,
        })
      )
    )
    expect(body.staleRecommendations).toEqual(
      STALE_RECOMMENDATIONS.map(({ tmdbId, originalName, year }) => ({
        tmdbId,
        originalName,
        year,
      }))
    )
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
