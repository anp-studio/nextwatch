import { getAuthorizedUser } from '../../utils/auth/authorize-user'
import { requireCompletedOnboarding } from '../../utils/auth/onboarding'
import { throwSupabaseError } from '../../utils/shared/api-error'
import { userListReadLimiter } from '../../utils/user-lists/rate-limit'

const USER_WATCHED_MOVIES_TABLE = 'user_watched_movies'
const WATCHED_CONFLICT_TARGET = 'user_id,tmdb_id'
const SUPPORTED_METHODS = ['GET', 'POST', 'DELETE']
const LOAD_WATCHED_MOVIES_MESSAGE = 'Unable to load watched movies.'
const UPDATE_WATCHED_MOVIES_MESSAGE = 'Unable to update watched movies.'
const RATE_LIMIT_STATUS_MESSAGE = 'Too many watched list requests.'

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


export default defineEventHandler(async (event) => {
  const method = event.method
  const { supabase, user } = await getAuthorizedUser(event)
  await requireCompletedOnboarding(event, supabase, user.id)

  if (method === 'GET') {
    const { success } = await userListReadLimiter.limit(`watched:${user.id}`)

    if (!success) {
      throw createError({
        statusCode: 429,
        statusMessage: RATE_LIMIT_STATUS_MESSAGE,
      })
    }

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

    return { success: true, tmdbIds }
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
