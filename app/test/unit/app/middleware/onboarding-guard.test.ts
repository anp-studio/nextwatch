import { computed, ref } from 'vue'
import { beforeEach, describe, expect, it, vi } from 'vitest'

describe('onboarding global middleware', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
  })

  async function loadMiddleware(options: {
    user: Record<string, unknown> | null
    loading?: boolean
    completed: boolean | null
  }) {
    const initialize = vi.fn().mockResolvedValue(undefined)
    const fetchStatus = vi.fn().mockResolvedValue(undefined)
    const navigateTo = vi.fn((target: string) => target)

    Object.assign(globalThis, {
      defineNuxtRouteMiddleware: (handler: unknown) => handler,
      navigateTo,
      useAuth: () => ({
        user: computed(() => options.user),
        loading: computed(() => options.loading ?? false),
        initialize,
      }),
      useOnboarding: () => ({
        completed: ref(options.completed),
        hasResolved: computed(() => options.completed !== null),
        fetchStatus,
      }),
    })

    const { default: middleware } = await import('../../../../app/middleware/onboarding.global')

    return {
      middleware,
      initialize,
      fetchStatus,
      navigateTo,
    }
  }

  it('redirects authenticated incomplete users to onboarding', async () => {
    const { middleware, navigateTo } = await loadMiddleware({
      user: { id: 'user-1' },
      completed: false,
    })

    const result = await middleware({ path: '/search' })

    expect(navigateTo).toHaveBeenCalledWith('/onboarding')
    expect(result).toBe('/onboarding')
  })

  it('redirects authenticated completed users away from onboarding', async () => {
    const { middleware, navigateTo } = await loadMiddleware({
      user: { id: 'user-1' },
      completed: true,
    })

    const result = await middleware({ path: '/onboarding' })

    expect(navigateTo).toHaveBeenCalledWith('/')
    expect(result).toBe('/')
  })

  it('redirects unauthenticated users away from onboarding to login', async () => {
    const { middleware, navigateTo } = await loadMiddleware({
      user: null,
      completed: null,
    })

    const result = await middleware({ path: '/onboarding' })

    expect(navigateTo).toHaveBeenCalledWith('/profile?auth=login')
    expect(result).toBe('/profile?auth=login')
  })

  it('allows incomplete authenticated users to stay on profile', async () => {
    const { middleware, navigateTo } = await loadMiddleware({
      user: { id: 'user-1' },
      completed: false,
    })

    const result = await middleware({ path: '/profile' })

    expect(navigateTo).not.toHaveBeenCalled()
    expect(result).toBeUndefined()
  })
})
