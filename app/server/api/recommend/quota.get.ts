import { getAuthorizedUser } from '../../utils/auth/authorize-user'
import { requireCompletedOnboarding } from '../../utils/auth/onboarding'
import { recommendationLimiter } from '../../utils/recommendations/rate-limit'
import type { RecommendationQuota } from '../../utils/recommendations/rate-limit'

export default defineEventHandler(async (event) => {
  const { supabase, user } = await getAuthorizedUser(event)
  await requireCompletedOnboarding(event, supabase, user.id)

  return (await recommendationLimiter.getRemaining(user.id)) satisfies RecommendationQuota
})
