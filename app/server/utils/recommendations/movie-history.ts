import type { SupabaseClient } from '@supabase/supabase-js'
import {
  LOAD_RECOMMENDATIONS_MESSAGE,
  MOVIES_TABLE,
  MY_LIST_TABLE,
  WATCHED_MOVIES_TABLE,
} from './constants'
import type { RecommendationErrorContext, RecommendationWithId, WatchedMovieRecord } from './types'
import { logPrivateError, throwSupabaseError } from '../shared/api-error'

interface MoviePromptRow {
  tmdb_id: number
  title: string
  release_date: string
  genres?: string[]
  popularity?: number
  vote_count?: number
}

interface RecommendationMovieRow extends MoviePromptRow {
  original_title: string
}

function throwRecommendationSupabaseError(
  cause: unknown,
  publicMessage: string,
  logEvent: string,
  extra: Record<string, unknown>,
  context: RecommendationErrorContext = {}
): never {
  const { event, userId } = context

  if (event) {
    throwSupabaseError(event, cause, {
      event: logEvent,
      userId,
      publicMessage,
      extra,
    })
  }

  logPrivateError({
    cause,
    event: logEvent,
    source: 'supabase',
    statusCode: 500,
    userId,
    extra,
  })

  throw createError({
    statusCode: 500,
    statusMessage: publicMessage,
  })
}

function parseYear(releaseDate: string): number {
  return Number.parseInt(releaseDate.split('-')[0] || '0', 10)
}

async function fetchMovieRowsByIds<T extends MoviePromptRow>(
  supabase: SupabaseClient,
  tmdbIds: number[],
  columns: string,
  context: RecommendationErrorContext = {}
): Promise<T[]> {
  if (tmdbIds.length === 0) {
    return []
  }

  const { data, error } = await supabase.from(MOVIES_TABLE).select(columns).in('tmdb_id', tmdbIds)

  if (error) {
    throwRecommendationSupabaseError(
      error,
      LOAD_RECOMMENDATIONS_MESSAGE,
      'recommendation.movie_rows_fetch_failed',
      {
        table: MOVIES_TABLE,
        operation: 'select',
      },
      context
    )
  }

  return (data ?? []) as unknown as T[]
}

async function hydratePromptMovies(
  supabase: SupabaseClient,
  tmdbIds: number[],
  context: RecommendationErrorContext = {}
): Promise<WatchedMovieRecord[]> {
  const rows = await fetchMovieRowsByIds<MoviePromptRow>(
    supabase,
    tmdbIds,
    'tmdb_id, title, release_date, genres, popularity, vote_count',
    context
  )
  const rowById = new Map(rows.map((row) => [row.tmdb_id, row]))

  return tmdbIds.flatMap((tmdbId) => {
    const row = rowById.get(tmdbId)

    if (!row || row.title.trim().length === 0) {
      return []
    }

    return [
      {
        tmdbId,
        title: row.title,
        year: parseYear(row.release_date),
        genres: row.genres ?? [],
        popularity: row.popularity ?? 0,
        voteCount: row.vote_count ?? 0,
      },
    ]
  })
}

export async function hydrateRecommendationsByTmdbIds(
  supabase: SupabaseClient,
  tmdbIds: number[],
  context: RecommendationErrorContext = {}
): Promise<RecommendationWithId[]> {
  const rows = await fetchMovieRowsByIds<RecommendationMovieRow>(
    supabase,
    tmdbIds,
    'tmdb_id, title, original_title, release_date',
    context
  )
  const rowById = new Map(rows.map((row) => [row.tmdb_id, row]))

  return tmdbIds.map((tmdbId) => {
    const row = rowById.get(tmdbId)
    const title = row?.title ?? ''
    const originalTitle = row?.original_title || title

    return {
      name: title,
      originalName: originalTitle,
      year: row ? parseYear(row.release_date) : 0,
      tmdbId,
    }
  })
}

export async function fetchWatchedMovies(
  supabase: SupabaseClient,
  userId: string,
  context: RecommendationErrorContext = {}
): Promise<WatchedMovieRecord[]> {
  const { data, error } = await supabase
    .from(WATCHED_MOVIES_TABLE)
    .select('tmdb_id')
    .eq('user_id', userId)

  if (error) {
    throwRecommendationSupabaseError(
      error,
      LOAD_RECOMMENDATIONS_MESSAGE,
      'recommendation.watched_fetch_failed',
      {
        table: WATCHED_MOVIES_TABLE,
        operation: 'select',
      },
      {
        ...context,
        userId,
      }
    )
  }

  const tmdbIds = ((data ?? []) as Array<{ tmdb_id: number }>).map((movie) => movie.tmdb_id)
  return hydratePromptMovies(supabase, tmdbIds, {
    ...context,
    userId,
  })
}

export async function fetchMyListMovies(
  supabase: SupabaseClient,
  userId: string,
  context: RecommendationErrorContext = {}
): Promise<WatchedMovieRecord[]> {
  const { data, error } = await supabase
    .from(MY_LIST_TABLE)
    .select('tmdb_ids')
    .eq('user_id', userId)
    .limit(1)
    .maybeSingle()

  if (error) {
    throwRecommendationSupabaseError(
      error,
      LOAD_RECOMMENDATIONS_MESSAGE,
      'recommendation.my_list_fetch_failed',
      {
        table: MY_LIST_TABLE,
        operation: 'select',
      },
      {
        ...context,
        userId,
      }
    )
  }

  const tmdbIds = Array.isArray(data?.tmdb_ids) ? (data.tmdb_ids as number[]) : []
  return hydratePromptMovies(supabase, tmdbIds, {
    ...context,
    userId,
  })
}
