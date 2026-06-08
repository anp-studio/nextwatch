import { getAuthorizedUser } from '../../utils/auth/authorize-user'
import { recommendationLimiter } from '../../utils/recommendations/rate-limit'
import type { RecommendationQuota } from '../../utils/recommendations/rate-limit'

export default defineEventHandler(async (event) => {
  const { user } = await getAuthorizedUser(event)

  return (await recommendationLimiter.getRemaining(user.id)) satisfies RecommendationQuota
})
