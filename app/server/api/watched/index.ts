import type { H3Event } from 'h3'
import { getAuthorizedUser } from '../../utils/auth/authorize-user'
import { throwSupabaseError } from '../../utils/shared/api-error'

interface HydratedMovie {
  tmdbId: number
  title: string
  year: number
  posterPath: string
  genres?: string[]
  runtime?: number | null
}

interface MovieRow {
  tmdb_id: number
  title: string
  poster_path: string
  release_date: string
  runtime: number
  genres: string[]
}

const USER_WATCHED_MOVIES_TABLE = 'user_watched_movies'
const MOVIES_TABLE = 'movies'
const WATCHED_CONFLICT_TARGET = 'user_id,tmdb_id'
const SUPPORTED_METHODS = ['GET', 'POST', 'DELETE']
const LOAD_WATCHED_MOVIES_MESSAGE = 'Unable to load watched movies.'
const UPDATE_WATCHED_MOVIES_MESSAGE = 'Unable to update watched movies.'

function parseYear(releaseDate: string): number {
  return parseInt(releaseDate.split('-')[0] || '0', 10)
}

function extractTmdbId(body: unknown): number | null {
  if (!body || typeof body !== 'object') {
    return null
  }

  const record = body as Record<string, unknown>
  if (typeof record.tmdbId === 'number') {
    return record.tmdbId
  }

  if (!record.movie || typeof record.movie !== 'object') {
    return null
  }

  const movie = record.movie as Record<string, unknown>
  return typeof movie.tmdbId === 'number' ? movie.tmdbId : null
}

function validateTmdbId(tmdbId: number | null): number {
  if (typeof tmdbId !== 'number' || !Number.isInteger(tmdbId) || tmdbId <= 0) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid tmdbId' })
  }

  return tmdbId
}

function toHydratedMovie(row: MovieRow): HydratedMovie {
  const movie: HydratedMovie = {
    tmdbId: row.tmdb_id,
    title: row.title,
    year: parseYear(row.release_date),
    posterPath: row.poster_path,
  }

  if (row.genres.length > 0) {
    movie.genres = row.genres
  }

  if (row.runtime > 0) {
    movie.runtime = row.runtime
  }

  return movie
}

async function hydrateMovies(
  event: H3Event,
  supabase: Awaited<ReturnType<typeof getAuthorizedUser>>['supabase'],
  tmdbIds: number[]
): Promise<HydratedMovie[]> {
  if (tmdbIds.length === 0) {
    return []
  }

  const { data, error } = await supabase
    .from(MOVIES_TABLE)
    .select('tmdb_id, title, poster_path, release_date, runtime, genres')
    .in('tmdb_id', tmdbIds)

  if (error) {
    throwSupabaseError(event, error, {
      event: 'watched.hydrate_movies_failed',
      publicMessage: LOAD_WATCHED_MOVIES_MESSAGE,
      extra: {
        table: MOVIES_TABLE,
        operation: 'select',
      },
    })
  }

  const rows = (data ?? []) as MovieRow[]
  const rowById = new Map(rows.map((row) => [row.tmdb_id, row]))

  return tmdbIds.map((tmdbId) => {
    const row = rowById.get(tmdbId)

    if (row) {
      return toHydratedMovie(row)
    }

    return {
      tmdbId,
      title: '',
      year: 0,
      posterPath: '',
    }
  })
}

export default defineEventHandler(async (event) => {
  const method = event.method
  const { supabase, user } = await getAuthorizedUser(event)

  if (method === 'GET') {
    const { data, error } = await supabase
      .from(USER_WATCHED_MOVIES_TABLE)
      .select('tmdb_id')
      .eq('user_id', user.id)

    if (error) {
      throwSupabaseError(event, error, {
        event: 'watched.list_failed',
        userId: user.id,
        publicMessage: LOAD_WATCHED_MOVIES_MESSAGE,
        extra: {
          table: USER_WATCHED_MOVIES_TABLE,
          operation: 'select',
        },
      })
    }

    const tmdbIds = ((data ?? []) as Array<{ tmdb_id: number }>).map((movie) => movie.tmdb_id)

    return {
      success: true,
      movies: await hydrateMovies(event, supabase, tmdbIds),
    }
  }

  if (method === 'POST') {
    const tmdbId = validateTmdbId(extractTmdbId(await readBody<unknown>(event)))
    const { error } = await supabase.from(USER_WATCHED_MOVIES_TABLE).upsert(
      {
        user_id: user.id,
        tmdb_id: tmdbId,
      },
      {
        onConflict: WATCHED_CONFLICT_TARGET,
        ignoreDuplicates: true,
      }
    )

    if (error) {
      throwSupabaseError(event, error, {
        event: 'watched.upsert_failed',
        userId: user.id,
        tmdbId,
        publicMessage: UPDATE_WATCHED_MOVIES_MESSAGE,
        extra: {
          table: USER_WATCHED_MOVIES_TABLE,
          operation: 'upsert',
        },
      })
    }

    return {
      success: true,
      watchedCount: null,
    }
  }

  if (method === 'DELETE') {
    const tmdbId = validateTmdbId(extractTmdbId(await readBody<unknown>(event)))
    const { error } = await supabase
      .from(USER_WATCHED_MOVIES_TABLE)
      .delete()
      .eq('user_id', user.id)
      .eq('tmdb_id', tmdbId)

    if (error) {
      throwSupabaseError(event, error, {
        event: 'watched.delete_failed',
        userId: user.id,
        tmdbId,
        publicMessage: UPDATE_WATCHED_MOVIES_MESSAGE,
        extra: {
          table: USER_WATCHED_MOVIES_TABLE,
          operation: 'delete',
        },
      })
    }

    return {
      success: true,
      watchedCount: null,
    }
  }

  throw createError({
    statusCode: 405,
    statusMessage: `Method must be one of: ${SUPPORTED_METHODS.join(', ')}`,
  })
})
