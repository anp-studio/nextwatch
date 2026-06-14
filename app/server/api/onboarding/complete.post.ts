import { getAuthorizedUser } from '../../utils/auth/authorize-user'
import {
  getOnboardingStatus,
  type OnboardingStatus,
} from '../../utils/auth/onboarding'
import { createServiceSupabaseClient } from '../../utils/shared/supabase-client'
import { throwSupabaseError } from '../../utils/shared/api-error'

const USER_WATCHED_MOVIES_TABLE = 'user_watched_movies'
const PROFILES_TABLE = 'profiles'
const WATCHED_CONFLICT_TARGET = 'user_id,tmdb_id'
const MIN_ONBOARDING_MOVIES = 5

interface CompleteOnboardingBody {
  tmdbIds?: unknown
}

interface OnboardingWatchedRow {
  user_id: string
  tmdb_id: number
}

function isCompleteOnboardingBody(value: unknown): value is CompleteOnboardingBody {
  return typeof value === 'object' && value !== null
}

function toUniqueTmdbIds(body: unknown): number[] {
  if (!isCompleteOnboardingBody(body) || !Array.isArray(body.tmdbIds)) {
    throw createError({
      statusCode: 400,
      statusMessage: 'tmdbIds must be an array of movie ids.',
    })
  }

  if (body.tmdbIds.length < MIN_ONBOARDING_MOVIES) {
    throw createError({
      statusCode: 400,
      statusMessage: `Select at least ${MIN_ONBOARDING_MOVIES} movies.`,
    })
  }

  const tmdbIds = body.tmdbIds.map((tmdbId) => {
    if (typeof tmdbId !== 'number' || !Number.isInteger(tmdbId) || tmdbId <= 0) {
      throw createError({
        statusCode: 400,
        statusMessage: 'tmdbIds must contain only positive integers.',
      })
    }

    return tmdbId
  })

  if (new Set(tmdbIds).size !== tmdbIds.length) {
    throw createError({
      statusCode: 400,
      statusMessage: 'tmdbIds must not contain duplicates.',
    })
  }

  return tmdbIds
}

function toWatchedRows(userId: string, tmdbIds: number[]): OnboardingWatchedRow[] {
  return tmdbIds.map((tmdbId) => ({
    user_id: userId,
    tmdb_id: tmdbId,
  }))
}

async function insertWatchedRows(
  event: Parameters<typeof getAuthorizedUser>[0],
  supabase: Awaited<ReturnType<typeof getAuthorizedUser>>['supabase'],
  userId: string,
  tmdbIds: number[]
): Promise<void> {
  const { error } = await supabase.from(USER_WATCHED_MOVIES_TABLE).upsert(
    toWatchedRows(userId, tmdbIds),
    {
      onConflict: WATCHED_CONFLICT_TARGET,
      ignoreDuplicates: true,
    }
  )

  if (error) {
    throwSupabaseError(event, error, {
      event: 'onboarding.watched_seed_failed',
      userId,
      publicMessage: 'Unable to complete onboarding.',
      extra: {
        table: USER_WATCHED_MOVIES_TABLE,
        operation: 'upsert',
      },
    })
  }
}

async function markOnboardingComplete(
  event: Parameters<typeof getAuthorizedUser>[0],
  userId: string
): Promise<OnboardingStatus> {
  const supabase = createServiceSupabaseClient(event, 'onboarding.service_supabase_misconfigured')
  const completedAt = new Date().toISOString()
  const { error } = await supabase.from(PROFILES_TABLE).upsert({
    id: userId,
    onboarding_completed_at: completedAt,
  })

  if (error) {
    throwSupabaseError(event, error, {
      event: 'onboarding.profile_update_failed',
      userId,
      publicMessage: 'Unable to complete onboarding.',
      extra: {
        table: PROFILES_TABLE,
        operation: 'upsert',
      },
    })
  }

  return {
    completed: true,
    completedAt,
  }
}

export default defineEventHandler(async (event) => {
  const { supabase, user } = await getAuthorizedUser(event)
  const tmdbIds = toUniqueTmdbIds(await readBody(event))
  const onboardingStatus = await getOnboardingStatus(event, supabase, user.id)

  if (onboardingStatus.completed) {
    throw createError({
      statusCode: 409,
      statusMessage: 'Onboarding has already been completed.',
    })
  }

  await insertWatchedRows(event, supabase, user.id, tmdbIds)
  const completedStatus = await markOnboardingComplete(event, user.id)

  return {
    success: true,
    ...completedStatus,
  }
})
