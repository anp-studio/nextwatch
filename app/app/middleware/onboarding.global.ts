const HOME_ROUTE = '/'
const ONBOARDING_ROUTE = '/onboarding'
const PROFILE_LOGIN_ROUTE = '/profile?auth=login'
const AUTH_ALLOWED_ROUTES = new Set(['/profile', '/reset-password'])

export default defineNuxtRouteMiddleware(async (to) => {
  const { user, initialize } = useAuth()
  const { completed, hasResolved, fetchStatus } = useOnboarding()

  await initialize()

  if (!user.value) {
    if (to.path === ONBOARDING_ROUTE) {
      return navigateTo(PROFILE_LOGIN_ROUTE)
    }

    return
  }

  if (!hasResolved.value) {
    await fetchStatus()
  }

  if (completed.value === true) {
    if (to.path === ONBOARDING_ROUTE) {
      return navigateTo(HOME_ROUTE)
    }

    return
  }

  if (to.path === ONBOARDING_ROUTE || AUTH_ALLOWED_ROUTES.has(to.path)) {
    return
  }

  return navigateTo(ONBOARDING_ROUTE)
})
