import { createHash } from 'node:crypto'
import type { H3Event } from 'h3'
import type { SupabaseClient } from '@supabase/supabase-js'
import { getAuthorizedUser } from '../utils/auth'
import {
  fetchMyListMovies,
  fetchWatchedMovies,
  getRecommendationsFromPlatformAi,
  hasEnoughRecommendationsToCache,
  hasValidTmdbId,
  hydrateRecommendationsByTmdbIds,
  MIN_RECOMMENDATIONS_TO_CACHE,
} from '../utils/recommendations'
import type { RecommendationWithId, WatchedMovieRecord } from '../utils/recommendations'
import { acquireRecommendationLock, releaseRecommendationLock } from '../utils/recommendation-lock'
import { createRedisClient } from '../utils/redis'
import { throwSupabaseError } from '../utils/api-error'

const RECOMMENDATIONS_TABLE = 'recommendations'
const TTL_MS = 7 * 24 * 60 * 60 * 1000
const QUERY_TRUE = ['true', '1']
const LOAD_RECOMMENDATIONS_MESSAGE = 'Unable to load recommendations right now.'
const SAVE_RECOMMENDATIONS_MESSAGE = 'Unable to save recommendations right now.'

interface CachedRow {
  tmdb_ids: number[]
  watched_hash: string
  expires_at: string
}

interface RecommendationCacheState {
  freshRecommendationIds: number[] | null
  storedRecommendationIds: number[]
}

interface RecommendationResponse {
  recommendations: number[]
  cached: boolean
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
  const sorted = [...movies].sort((a, b) => a.tmdbId - b.tmdbId).map(({ tmdbId }) => ({ tmdbId }))
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

function buildSuccessResponse(
  recommendationIds: number[],
  cached: boolean
): RecommendationResponse {
  return {
    recommendations: [...recommendationIds],
    cached,
  }
}

function createInsufficientRecommendationsError() {
  return createError({
    statusCode: 502,
    statusMessage: 'Recommendation generation returned too few valid TMDB matches.',
  })
}

async function getRecommendationCacheState(
  event: H3Event,
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
    throwSupabaseError(event, error, {
      event: 'recommendation.cache_read_failed',
      userId,
      publicMessage: LOAD_RECOMMENDATIONS_MESSAGE,
      extra: {
        table: RECOMMENDATIONS_TABLE,
        operation: 'select',
      },
    })
  }

  if (!data) {
    return {
      freshRecommendationIds: null,
      storedRecommendationIds: [],
    }
  }

  const row = data as CachedRow
  const tmdbIds = dedupeRecommendationIds(Array.isArray(row.tmdb_ids) ? row.tmdb_ids : [])
  const isFresh = new Date(row.expires_at) > new Date() && row.watched_hash === watchedHash

  return {
    freshRecommendationIds: isFresh ? tmdbIds : null,
    storedRecommendationIds: tmdbIds,
  }
}

async function storeCachedRecommendations(
  event: H3Event,
  supabase: SupabaseClient,
  userId: string,
  recommendations: RecommendationWithId[],
  watchedHash: string
): Promise<void> {
  const recommendationIds = dedupeRecommendationIds(toRecommendationIds(recommendations))

  const { error } = await supabase.from(RECOMMENDATIONS_TABLE).upsert({
    user_id: userId,
    tmdb_ids: recommendationIds,
    watched_hash: watchedHash,
    expires_at: new Date(Date.now() + TTL_MS).toISOString(),
  })

  if (error) {
    throwSupabaseError(event, error, {
      event: 'recommendation.cache_write_failed',
      userId,
      publicMessage: SAVE_RECOMMENDATIONS_MESSAGE,
      extra: {
        table: RECOMMENDATIONS_TABLE,
        operation: 'upsert',
      },
    })
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
    const watchedMovies = await fetchWatchedMovies(supabase, user.id, { event })
    let excludedMovies: RecommendationWithId[] = []

    if (watchedMovies.length === 0) {
      throw createError({
        statusCode: 400,
        statusMessage: 'No watched movies found. Watch some movies first.',
      })
    }

    const watchedHash = computeWatchedHash(watchedMovies)
    const cacheState = await getRecommendationCacheState(event, supabase, user.id, watchedHash)

    if (!isGetNew && !isRefresh && cacheState.freshRecommendationIds) {
      return buildSuccessResponse(cacheState.freshRecommendationIds, true)
    }

    const myListMovies = await fetchMyListMovies(supabase, user.id, { event })

    if (isGetNew && cacheState.storedRecommendationIds.length > 0) {
      excludedMovies = await hydrateRecommendationsByTmdbIds(
        supabase,
        cacheState.storedRecommendationIds,
        { event, userId: user.id }
      )
    }

    let recommendations: RecommendationWithId[]
    try {
      const platformAiResult = await getRecommendationsFromPlatformAi(
        watchedMovies,
        myListMovies,
        user.id,
        event,
        excludedMovies
      )
      const generatedRecommendations = platformAiResult.recommendations

      recommendations = dedupeRecommendations(filterValidRecommendations(generatedRecommendations))

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

      return buildSuccessResponse(cacheState.storedRecommendationIds, true)
    }

    await storeCachedRecommendations(event, supabase, user.id, recommendations, watchedHash)

    return buildSuccessResponse(toRecommendationIds(recommendations), false)
  } finally {
    await releaseRecommendationLock(redis, lock)
  }
})
