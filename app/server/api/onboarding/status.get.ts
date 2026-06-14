import { getAuthorizedUser } from '../../utils/auth/authorize-user'
import { getOnboardingStatus } from '../../utils/auth/onboarding'

export default defineEventHandler(async (event) => {
  const { supabase, user } = await getAuthorizedUser(event)

  return await getOnboardingStatus(event, supabase, user.id)
})
