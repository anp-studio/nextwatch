import { createHash } from 'node:crypto'
import type { SupabaseClient } from '@supabase/supabase-js'
import { getAuthorizedUser } from '../utils/auth'
import {
  fetchMyListMovies,
  fetchWatchedMovies,
  getRecommendationsFromGemini,
  hydrateRecommendationsByTmdbIds,
  hasEnoughRecommendationsToCache,
  hasValidTmdbId,
  MIN_RECOMMENDATIONS_TO_CACHE,
} from '../utils/recommendations'
import type { RecommendationWithId, WatchedMovieRecord } from '../utils/recommendations'
import { acquireRecommendationLock, releaseRecommendationLock } from '../utils/recommendation-lock'
import { createRedisClient } from '../utils/redis'

const RECOMMENDATIONS_TABLE = 'recommendations'
const MOVIES_TABLE = 'movies'
const TTL_MS = 7 * 24 * 60 * 60 * 1000
const QUERY_TRUE = ['true', '1']
const PRODUCTION_NODE_ENV = 'production'
const MIN_RECOMMENDATION_POPULARITY = 1

interface RecommendationDebugItem {
  tmdbId: number
  originalName: string
  year: number
}

interface UnmatchedRecommendationDebugItem {
  name: string
  originalName: string
  year: number
}

interface CachedRow {
  tmdb_ids: number[]
  watched_hash: string
  expires_at: string
}

interface RecommendationPopularityRow {
  tmdb_id: number
  popularity: number
}

interface RecommendationCacheState {
  freshRecommendationIds: number[] | null
  storedRecommendationIds: number[]
}

interface RegenerationErrorPayload {
  statusCode: number
  statusMessage: string
  retryable: boolean
}

interface RecommendationResponse {
  recommendations: Array<number | RecommendationDebugItem> | null
  cached: boolean
  stale: false
  regenerationError: RegenerationErrorPayload | null
  staleRecommendations: Array<number | RecommendationDebugItem> | null
  unmatchedRecommendations: UnmatchedRecommendationDebugItem[] | null
}

function isQueryFlagEnabled(value: unknown): boolean {
  return typeof value === 'string' && QUERY_TRUE.includes(value)
}

function filterValidRecommendations(
  recommendations: RecommendationWithId[]
): RecommendationWithId[] {
  return recommendations.filter(hasValidTmdbId)
}

function computeWatchedHash(movies: WatchedMovieRecord[]): string {
  const sorted = [...movies]
    .sort((a, b) => a.tmdbId - b.tmdbId)
    .map(({ tmdbId, title, year }) => ({ tmdbId, title, year }))
  return createHash('sha256').update(JSON.stringify(sorted)).digest('hex')
}

function toRecommendationIds(recommendations: RecommendationWithId[]): number[] {
  return recommendations.flatMap((recommendation) =>
    recommendation.tmdbId === null ? [] : [recommendation.tmdbId]
  )
}

function dedupeRecommendationIds(recommendationIds: number[]): number[] {
  const seenIds = new Set<number>()
  const dedupedIds: number[] = []

  for (const recommendationId of recommendationIds) {
    if (seenIds.has(recommendationId)) {
      continue
    }

    seenIds.add(recommendationId)
    dedupedIds.push(recommendationId)
  }

  return dedupedIds
}

function dedupeRecommendations(recommendations: RecommendationWithId[]): RecommendationWithId[] {
  const seenIds = new Set<number>()
  const dedupedRecommendations: RecommendationWithId[] = []

  for (const recommendation of recommendations) {
    if (recommendation.tmdbId === null) {
      continue
    }

    if (seenIds.has(recommendation.tmdbId)) {
      continue
    }

    seenIds.add(recommendation.tmdbId)
    dedupedRecommendations.push(recommendation)
  }

  return dedupedRecommendations
}

async function filterLowPopularityRecommendationIds(
  supabase: SupabaseClient,
  recommendationIds: number[]
): Promise<number[]> {
  if (recommendationIds.length === 0) {
    return []
  }

  const { data, error } = await supabase
    .from(MOVIES_TABLE)
    .select('tmdb_id, popularity')
    .in('tmdb_id', recommendationIds)

  if (error) {
    throw createError({ statusCode: 500, statusMessage: error.message })
  }

  const popularityById = new Map(
    ((data ?? []) as RecommendationPopularityRow[]).map((row) => [row.tmdb_id, row.popularity])
  )
  // Movies absent from the local DB are not penalized — only known-low-popularity movies are filtered out
  const filteredIds = recommendationIds.filter((recommendationId) => {
    const popularity = popularityById.get(recommendationId)
    return popularity === undefined || popularity >= MIN_RECOMMENDATION_POPULARITY
  })

  return filteredIds.length >= MIN_RECOMMENDATIONS_TO_CACHE ? filteredIds : recommendationIds
}

async function sanitizeRecommendationIds(
  supabase: SupabaseClient,
  recommendationIds: number[]
): Promise<number[]> {
  const dedupedIds = dedupeRecommendationIds(recommendationIds)
  return filterLowPopularityRecommendationIds(supabase, dedupedIds)
}

async function sanitizeRecommendations(
  supabase: SupabaseClient,
  recommendations: RecommendationWithId[]
): Promise<RecommendationWithId[]> {
  const dedupedRecommendations = dedupeRecommendations(filterValidRecommendations(recommendations))
  const allowedIds = new Set(
    await sanitizeRecommendationIds(supabase, toRecommendationIds(dedupedRecommendations))
  )

  return dedupedRecommendations.filter(
    (recommendation) => recommendation.tmdbId !== null && allowedIds.has(recommendation.tmdbId)
  )
}

function isDevelopmentMode(): boolean {
  return import.meta.dev || process.env.NODE_ENV !== PRODUCTION_NODE_ENV
}

function toRecommendationDebugItems(
  recommendations: RecommendationWithId[]
): RecommendationDebugItem[] {
  return recommendations.flatMap((recommendation) =>
    recommendation.tmdbId === null
      ? []
      : [
          {
            tmdbId: recommendation.tmdbId,
            originalName: recommendation.originalName,
            year: recommendation.year,
          },
        ]
  )
}

function toUnmatchedRecommendationDebugItems(
  recommendations: RecommendationWithId[]
): UnmatchedRecommendationDebugItem[] {
  if (!isDevelopmentMode()) {
    return []
  }

  return recommendations.flatMap((recommendation) =>
    recommendation.tmdbId !== null
      ? []
      : [
          {
            name: recommendation.name,
            originalName: recommendation.originalName,
            year: recommendation.year,
          },
        ]
  )
}

async function formatRecommendationItems(
  supabase: SupabaseClient,
  recommendationIds: number[]
): Promise<Array<number | RecommendationDebugItem>> {
  if (!isDevelopmentMode()) {
    return [...recommendationIds]
  }

  return (await hydrateRecommendationsByTmdbIds(supabase, recommendationIds)).flatMap(
    (recommendation) =>
      recommendation.tmdbId === null
        ? []
        : [
            {
              tmdbId: recommendation.tmdbId,
              originalName: recommendation.originalName,
              year: recommendation.year,
            },
          ]
  )
}

async function buildSuccessResponse(
  supabase: SupabaseClient,
  recommendationIds: number[],
  cached: boolean
): Promise<RecommendationResponse> {
  return {
    recommendations: await formatRecommendationItems(supabase, recommendationIds),
    cached,
    stale: false,
    regenerationError: null,
    staleRecommendations: null,
    unmatchedRecommendations: null,
  }
}

async function buildFailureResponse(
  supabase: SupabaseClient,
  regenerationError: RegenerationErrorPayload,
  staleRecommendationIds: number[],
  unmatchedRecommendations: UnmatchedRecommendationDebugItem[] | null = null
): Promise<RecommendationResponse> {
  return {
    recommendations: null,
    cached: false,
    stale: false,
    regenerationError,
    staleRecommendations: await formatRecommendationItems(supabase, staleRecommendationIds),
    unmatchedRecommendations: isDevelopmentMode() ? unmatchedRecommendations : null,
  }
}

function isErrorWithStatus(
  error: unknown
): error is { statusCode: number; statusMessage?: string } {
  return (
    typeof error === 'object' &&
    error !== null &&
    typeof (error as { statusCode?: unknown }).statusCode === 'number'
  )
}

function normalizeRegenerationError(error: unknown): RegenerationErrorPayload {
  if (isErrorWithStatus(error)) {
    const statusCode = error.statusCode
    const statusMessage =
      typeof error.statusMessage === 'string' && error.statusMessage.length > 0
        ? error.statusMessage
        : 'Recommendation regeneration failed.'

    return {
      statusCode,
      statusMessage,
      retryable: statusCode === 503,
    }
  }

  if (error instanceof Error) {
    return {
      statusCode: 500,
      statusMessage: error.message || 'Recommendation regeneration failed.',
      retryable: false,
    }
  }

  return {
    statusCode: 500,
    statusMessage: 'Recommendation regeneration failed.',
    retryable: false,
  }
}

function createInsufficientRecommendationsError() {
  return createError({
    statusCode: 502,
    statusMessage: 'Recommendation generation returned too few valid TMDB matches.',
  })
}

async function getRecommendationCacheState(
  supabase: SupabaseClient,
  userId: string,
  watchedHash: string
): Promise<RecommendationCacheState> {
  const { data, error } = await supabase
    .from(RECOMMENDATIONS_TABLE)
    .select('tmdb_ids, watched_hash, expires_at')
    .eq('user_id', userId)
    .maybeSingle()

  if (error) {
    throw createError({ statusCode: 500, statusMessage: error.message })
  }

  if (!data) {
    return {
      freshRecommendationIds: null,
      storedRecommendationIds: [],
    }
  }

  const row = data as CachedRow
  const tmdbIds = await sanitizeRecommendationIds(
    supabase,
    Array.isArray(row.tmdb_ids) ? row.tmdb_ids : []
  )
  const isFresh = new Date(row.expires_at) > new Date() && row.watched_hash === watchedHash

  return {
    freshRecommendationIds: isFresh ? tmdbIds : null,
    storedRecommendationIds: tmdbIds,
  }
}

async function storeCachedRecommendations(
  supabase: SupabaseClient,
  userId: string,
  recommendations: RecommendationWithId[],
  watchedHash: string
): Promise<void> {
  const recommendationIds = await sanitizeRecommendationIds(
    supabase,
    toRecommendationIds(recommendations)
  )

  const { error } = await supabase.from(RECOMMENDATIONS_TABLE).upsert({
    user_id: userId,
    tmdb_ids: recommendationIds,
    watched_hash: watchedHash,
    expires_at: new Date(Date.now() + TTL_MS).toISOString(),
  })

  if (error) {
    throw createError({ statusCode: 500, statusMessage: error.message })
  }
}

export default defineEventHandler(async (event) => {
  const { supabase, user } = await getAuthorizedUser(event)
  const { getNew, refresh } = getQuery(event)
  const isGetNew = isQueryFlagEnabled(getNew)
  const isRefresh = !isGetNew && isQueryFlagEnabled(refresh)

  const redis = createRedisClient()
  const lock = await acquireRecommendationLock(redis, user.id)

  if (!lock) {
    throw createError({
      statusCode: 409,
      statusMessage: 'Recommendation request already in progress.',
    })
  }

  try {
    const watchedMovies = await fetchWatchedMovies(supabase, user.id)
    let excludedMovies: RecommendationWithId[] = []

    if (watchedMovies.length === 0) {
      throw createError({
        statusCode: 400,
        statusMessage: 'No watched movies found. Watch some movies first.',
      })
    }

    const watchedHash = computeWatchedHash(watchedMovies)
    const cacheState = await getRecommendationCacheState(supabase, user.id, watchedHash)

    if (!isGetNew && !isRefresh && cacheState.freshRecommendationIds) {
      return buildSuccessResponse(supabase, cacheState.freshRecommendationIds, true)
    }

    const myListMovies = await fetchMyListMovies(supabase, user.id)

    if (isGetNew) {
      excludedMovies = cacheState.storedRecommendationIds.map((tmdbId) => ({
        name: '',
        originalName: '',
        year: 0,
        tmdbId,
      }))
    }

    let recommendations: RecommendationWithId[]
    let unmatchedRecommendations: UnmatchedRecommendationDebugItem[] | null = null
    let tmdbFallbackCount = 0
    let geminiSystemPrompt = ''
    let geminiUserMessage = ''
    try {
      const geminiResult = await getRecommendationsFromGemini(
        watchedMovies,
        myListMovies,
        user.id,
        event,
        excludedMovies
      )
      const generatedRecommendations = geminiResult.recommendations
      tmdbFallbackCount = geminiResult.tmdbFallbackCount
      geminiSystemPrompt = geminiResult.systemPrompt
      geminiUserMessage = geminiResult.userMessage
      unmatchedRecommendations = toUnmatchedRecommendationDebugItems(generatedRecommendations)

      recommendations = await sanitizeRecommendations(supabase, generatedRecommendations)

      if (
        recommendations.length < MIN_RECOMMENDATIONS_TO_CACHE ||
        !hasEnoughRecommendationsToCache(recommendations)
      ) {
        throw createInsufficientRecommendationsError()
      }
    } catch (error) {
      if (cacheState.storedRecommendationIds.length === 0) {
        throw error
      }

      return buildFailureResponse(
        supabase,
        normalizeRegenerationError(error),
        cacheState.storedRecommendationIds,
        unmatchedRecommendations
      )
    }

    await storeCachedRecommendations(supabase, user.id, recommendations, watchedHash)

    if (isDevelopmentMode()) {
      return {
        recommendations: toRecommendationDebugItems(recommendations),
        cached: false,
        stale: false,
        regenerationError: null,
        staleRecommendations: null,
        unmatchedRecommendations,
        tmdbFallbackCount,
        geminiPrompt: {
          system: geminiSystemPrompt,
          user: geminiUserMessage,
        },
      }
    }

    return buildSuccessResponse(supabase, toRecommendationIds(recommendations), false)
  } finally {
    await releaseRecommendationLock(redis, lock)
  }
})
