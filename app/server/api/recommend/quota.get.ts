import { getAuthorizedUser } from '../../utils/auth'
import { recommednationLimiter } from '../../utils/ratelimit'
import type { RecommendationQuota } from '../../utils/ratelimit'

export default defineEventHandler(async (event) => {
  const { user } = await getAuthorizedUser(event)

  return (await recommednationLimiter.getRemaining(user.id)) satisfies RecommendationQuota
})
