interface OnboardingStatusResponse {
  completed: boolean
  completedAt: string | null
}

interface CompleteOnboardingResponse extends OnboardingStatusResponse {
  success: boolean
}

function isOnboardingStatusResponse(value: unknown): value is OnboardingStatusResponse {
  if (!value || typeof value !== 'object') {
    return false
  }

  const status = value as Record<string, unknown>

  return (
    typeof status.completed === 'boolean' &&
    (typeof status.completedAt === 'string' || status.completedAt === null)
  )
}

function isCompleteOnboardingResponse(value: unknown): value is CompleteOnboardingResponse {
  if (!isOnboardingStatusResponse(value)) {
    return false
  }

  return typeof (value as unknown as Record<string, unknown>).success === 'boolean'
}

export function useOnboarding() {
  const supabase = useSupabase()
  const completed = useState<boolean | null>('onboarding-completed', () => null)
  const completedAt = useState<string | null>('onboarding-completed-at', () => null)
  const pending = useState('onboarding-pending', () => false)
  const error = useState<string | null>('onboarding-error', () => null)
  const hasResolved = computed(() => completed.value !== null)
  const isOnboardingComplete = computed(() => completed.value === true)

  function clearStatus() {
    completed.value = null
    completedAt.value = null
    error.value = null
    pending.value = false
  }

  async function fetchStatus(accessToken?: string): Promise<OnboardingStatusResponse | null> {
    pending.value = true
    error.value = null

    try {
      const token = await resolveAccessToken(supabase, accessToken)

      if (!token) {
        clearStatus()
        return null
      }

      const response = await $fetch<unknown>('/api/onboarding/status', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (!isOnboardingStatusResponse(response)) {
        throw new Error('Onboarding status response was invalid.')
      }

      completed.value = response.completed
      completedAt.value = response.completedAt

      return response
    } catch (caughtError) {
      completed.value = null
      completedAt.value = null
      error.value =
        caughtError instanceof Error ? caughtError.message : 'Unable to load onboarding status.'
      return null
    } finally {
      pending.value = false
    }
  }

  async function completeOnboarding(
    tmdbIds: number[],
    accessToken?: string
  ): Promise<CompleteOnboardingResponse | null> {
    pending.value = true
    error.value = null

    try {
      const token = await resolveAccessToken(supabase, accessToken)

      if (!token) {
        clearStatus()
        return null
      }

      const response = await $fetch<unknown>('/api/onboarding/complete', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: {
          tmdbIds,
        },
      })

      if (!isCompleteOnboardingResponse(response)) {
        throw new Error('Onboarding completion response was invalid.')
      }

      completed.value = response.completed
      completedAt.value = response.completedAt

      return response
    } catch (caughtError) {
      error.value =
        caughtError instanceof Error ? caughtError.message : 'Unable to complete onboarding.'
      return null
    } finally {
      pending.value = false
    }
  }

  return {
    completed,
    completedAt,
    pending,
    error,
    hasResolved,
    isOnboardingComplete,
    fetchStatus,
    completeOnboarding,
    clearStatus,
  }
}
