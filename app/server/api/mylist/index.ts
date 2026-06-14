import { getAuthorizedUser } from '../../utils/auth/authorize-user'
import { requireCompletedOnboarding } from '../../utils/auth/onboarding'
import { throwSupabaseError } from '../../utils/shared/api-error'
import { userListReadLimiter } from '../../utils/user-lists/rate-limit'

const USER_MY_LIST_TABLE = 'user_my_list'
const USER_WATCHED_MOVIES_TABLE = 'user_watched_movies'
const APPEND_MY_LIST_RPC = 'append_my_list'
const REMOVE_MY_LIST_RPC = 'remove_my_list'
const SUPPORTED_METHODS = ['GET', 'POST', 'DELETE']
const ALREADY_WATCHED_STATUS = 'Movie is already in watched list'
const RATE_LIMIT_STATUS_MESSAGE = 'Too many My List requests.'

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

async function callMyListRpc(
  event: Parameters<typeof getAuthorizedUser>[0],
  supabase: Awaited<ReturnType<typeof getAuthorizedUser>>['supabase'],
  name: string,
  userId: string,
  tmdbId: number
) {
  const { error } = await supabase.rpc(name, {
    target_tmdb_id: tmdbId,
  })

  if (error) {
    throwSupabaseError(event, error, {
      event: 'mylist.rpc_failed',
      userId,
      tmdbId,
      publicMessage: 'Unable to update My List.',
      extra: {
        rpc: name,
      },
    })
  }
}

async function ensureMovieIsNotWatched(
  event: Parameters<typeof getAuthorizedUser>[0],
  supabase: Awaited<ReturnType<typeof getAuthorizedUser>>['supabase'],
  userId: string,
  tmdbId: number
) {
  const { data, error } = await supabase
    .from(USER_WATCHED_MOVIES_TABLE)
    .select('tmdb_id')
    .eq('user_id', userId)
    .eq('tmdb_id', tmdbId)

  if (error) {
    throwSupabaseError(event, error, {
      event: 'mylist.watched_lookup_failed',
      userId,
      tmdbId,
      publicMessage: 'Unable to update My List.',
      extra: {
        table: USER_WATCHED_MOVIES_TABLE,
        operation: 'select',
      },
    })
  }

  if ((data ?? []).length > 0) {
    throw createError({ statusCode: 409, statusMessage: ALREADY_WATCHED_STATUS })
  }
}

export default defineEventHandler(async (event) => {
  const method = event.method
  const { supabase, user } = await getAuthorizedUser(event)
  await requireCompletedOnboarding(event, supabase, user.id)

  if (method === 'GET') {
    const { success } = await userListReadLimiter.limit(`mylist:${user.id}`)

    if (!success) {
      throw createError({
        statusCode: 429,
        statusMessage: RATE_LIMIT_STATUS_MESSAGE,
      })
    }

    const { data, error } = await supabase
      .from(USER_MY_LIST_TABLE)
      .select('tmdb_ids')
      .eq('user_id', user.id)
      .limit(1)
      .maybeSingle()

    if (error) {
      throwSupabaseError(event, error, {
        event: 'mylist.list_failed',
        userId: user.id,
        publicMessage: 'Unable to load My List.',
        extra: {
          table: USER_MY_LIST_TABLE,
          operation: 'select',
        },
      })
    }

    const tmdbIds = Array.isArray(data?.tmdb_ids) ? (data.tmdb_ids as number[]) : []

    return { success: true, tmdbIds }
  }

  if (method === 'POST') {
    const tmdbId = validateTmdbId(extractTmdbId(await readBody<unknown>(event)))
    await ensureMovieIsNotWatched(event, supabase, user.id, tmdbId)
    await callMyListRpc(event, supabase, APPEND_MY_LIST_RPC, user.id, tmdbId)

    return {
      success: true,
      myListCount: null,
    }
  }

  if (method === 'DELETE') {
    const tmdbId = validateTmdbId(extractTmdbId(await readBody<unknown>(event)))
    await callMyListRpc(event, supabase, REMOVE_MY_LIST_RPC, user.id, tmdbId)

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
