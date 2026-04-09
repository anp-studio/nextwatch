import { createHash } from 'node:crypto'
import type { SupabaseClient } from '@supabase/supabase-js'
import { getAuthorizedUser } from '../utils/auth'
import { fetchWatchedMovies, getRecommendationsFromGemini } from '../utils/recommendations'
import type { RecommendationWithId, WatchedMovieRecord } from '../utils/recommendations'

const RECOMMENDATIONS_TABLE = 'recommendations'
const TTL_MS = 7 * 24 * 60 * 60 * 1000

interface CachedRow {
  recommendations: RecommendationWithId[]
  watched_hash: string
  expires_at: string
}

function computeWatchedHash(movies: WatchedMovieRecord[]): string {
  const sorted = [...movies]
    .sort((a, b) => a.tmdbId - b.tmdbId)
    .map(({ tmdbId, title, year }) => ({ tmdbId, title, year }))
  return createHash('sha256').update(JSON.stringify(sorted)).digest('hex')
}

async function getCachedRecommendations(
  supabase: SupabaseClient,
  userId: string,
  watchedHash: string
): Promise<RecommendationWithId[] | null> {
  const { data, error } = await supabase
    .from(RECOMMENDATIONS_TABLE)
    .select('recommendations, watched_hash, expires_at')
    .eq('user_id', userId)
    .maybeSingle()

  if (error) {
    throw createError({ statusCode: 500, statusMessage: error.message })
  }

  if (!data) return null

  const row = data as CachedRow
  const isFresh = new Date(row.expires_at) > new Date() && row.watched_hash === watchedHash

  return isFresh ? row.recommendations : null
}

async function getCachedRecommendationsRaw(
  supabase: SupabaseClient,
  userId: string
): Promise<RecommendationWithId[]> {
  const { data, error } = await supabase
    .from(RECOMMENDATIONS_TABLE)
    .select('recommendations')
    .eq('user_id', userId)
    .maybeSingle()

  if (error) {
    throw createError({ statusCode: 500, statusMessage: error.message })
  }

  if (!data) return []

  const row = data as Pick<CachedRow, 'recommendations'>
  return row.recommendations
}

async function storeCachedRecommendations(
  supabase: SupabaseClient,
  userId: string,
  recommendations: RecommendationWithId[],
  watchedHash: string
): Promise<void> {
  const { error } = await supabase.from(RECOMMENDATIONS_TABLE).upsert({
    user_id: userId,
    recommendations,
    watched_hash: watchedHash,
    expires_at: new Date(Date.now() + TTL_MS).toISOString(),
  })

  if (error) {
    throw createError({ statusCode: 500, statusMessage: error.message })
  }
}

export default defineEventHandler(async (event) => {
  const { supabase, user } = await getAuthorizedUser(event)
  const { refresh } = getQuery(event)
  const isRefresh = refresh === 'true' || refresh === '1'

  const watchedMovies = await fetchWatchedMovies(supabase, user.id)

  if (watchedMovies.length === 0) {
    throw createError({
      statusCode: 400,
      statusMessage: 'No watched movies found. Watch some movies first.',
    })
  }

  const watchedHash = computeWatchedHash(watchedMovies)

  if (!isRefresh) {
    const cached = await getCachedRecommendations(supabase, user.id, watchedHash)
    if (cached) {
      return { recommendations: cached, cached: true }
    }
  }

  const excludedMovies = isRefresh
    ? await getCachedRecommendationsRaw(supabase, user.id)
    : []

  const recommendations = await getRecommendationsFromGemini(watchedMovies, user.id, event, excludedMovies)

  await storeCachedRecommendations(supabase, user.id, recommendations, watchedHash)

  return { recommendations, cached: false }
})
