import { getAuthorizedUser } from '../../utils/auth'

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

const USER_MY_LIST_TABLE = 'user_my_list'
const MOVIES_TABLE = 'movies'
const APPEND_MY_LIST_RPC = 'append_my_list'
const REMOVE_MY_LIST_RPC = 'remove_my_list'
const SUPPORTED_METHODS = ['GET', 'POST', 'DELETE']

function parseYear(releaseDate: string): number {
  return parseInt(releaseDate.split('-')[0] || '0', 10)
}

// can send boyh tmdbId or full movie object with tmdbId property
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
    throw createError({ statusCode: 500, statusMessage: error.message })
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

async function callMyListRpc(
  supabase: Awaited<ReturnType<typeof getAuthorizedUser>>['supabase'],
  name: string,
  userId: string,
  tmdbId: number
) {
  const { error } = await supabase.rpc(name, {
    target_user_id: userId,
    target_tmdb_id: tmdbId,
  })

  if (error) {
    throw createError({ statusCode: 500, statusMessage: error.message })
  }
}

export default defineEventHandler(async (event) => {
  const method = event.method
  const { supabase, user } = await getAuthorizedUser(event)

  if (method === 'GET') {
    const { data, error } = await supabase
      .from(USER_MY_LIST_TABLE)
      .select('tmdb_ids')
      .eq('user_id', user.id)
      .limit(1)
      .maybeSingle()

    if (error) {
      throw createError({ statusCode: 500, statusMessage: error.message })
    }

    const tmdbIds = Array.isArray(data?.tmdb_ids) ? (data.tmdb_ids as number[]) : []

    return {
      success: true,
      movies: await hydrateMovies(supabase, tmdbIds),
    }
  }

  if (method === 'POST') {
    const tmdbId = validateTmdbId(extractTmdbId(await readBody<unknown>(event)))
    await callMyListRpc(supabase, APPEND_MY_LIST_RPC, user.id, tmdbId)

    return {
      success: true,
      myListCount: null,
    }
  }

  if (method === 'DELETE') {
    const tmdbId = validateTmdbId(extractTmdbId(await readBody<unknown>(event)))
    await callMyListRpc(supabase, REMOVE_MY_LIST_RPC, user.id, tmdbId)

    return {
      success: true,
      myListCount: null,
    }
  }

  throw createError({
    statusCode: 405,
    statusMessage: `Method must be one of: ${SUPPORTED_METHODS.join(', ')}`,
  })
})
