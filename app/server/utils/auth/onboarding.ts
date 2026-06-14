import type { SupabaseClient } from '@supabase/supabase-js'
import type { H3Event } from 'h3'
import { throwSupabaseError } from '../shared/api-error'

const PROFILES_TABLE = 'profiles'
const ONBOARDING_REQUIRED_STATUS_CODE = 403
const ONBOARDING_REQUIRED_STATUS_MESSAGE = 'Onboarding required.'
const ONBOARDING_REQUIRED_ERROR_CODE = 'ONBOARDING_REQUIRED'

interface ProfileOnboardingRow {
  onboarding_completed_at: string | null
}

export interface OnboardingStatus {
  completed: boolean
  completedAt: string | null
}

function toOnboardingStatus(row: ProfileOnboardingRow | null): OnboardingStatus {
  const completedAt = row?.onboarding_completed_at ?? null

  return {
    completed: completedAt !== null,
    completedAt,
  }
}

export async function getOnboardingStatus(
  event: H3Event,
  supabase: SupabaseClient,
  userId: string
): Promise<OnboardingStatus> {
  const { data, error } = await supabase
    .from(PROFILES_TABLE)
    .select('onboarding_completed_at')
    .eq('id', userId)
    .limit(1)
    .maybeSingle()

  if (error) {
    throwSupabaseError(event, error, {
      event: 'onboarding.status_lookup_failed',
      userId,
      publicMessage: 'Unable to load onboarding status.',
      extra: {
        table: PROFILES_TABLE,
        operation: 'select',
      },
    })
  }

  return toOnboardingStatus((data ?? null) as ProfileOnboardingRow | null)
}

export function createOnboardingRequiredError() {
  return createError({
    statusCode: ONBOARDING_REQUIRED_STATUS_CODE,
    statusMessage: ONBOARDING_REQUIRED_STATUS_MESSAGE,
    data: {
      code: ONBOARDING_REQUIRED_ERROR_CODE,
    },
  })
}

export async function requireCompletedOnboarding(
  event: H3Event,
  supabase: SupabaseClient,
  userId: string
): Promise<OnboardingStatus> {
  const status = await getOnboardingStatus(event, supabase, userId)

  if (!status.completed) {
    throw createOnboardingRequiredError()
  }

  return status
}
