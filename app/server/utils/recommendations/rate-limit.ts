import { Ratelimit } from '@upstash/ratelimit'
import { createRedisClient } from '../shared/redis'

// da lakse moze da se menja
export const RECOMMENDATION_LIMIT = 10
const RECOMMENDATION_WINDOW = '1 d'

export interface RecommendationQuota {
  limit: number
  remaining: number
  reset: number
}

export const recommendationLimiter = new Ratelimit({
  redis: createRedisClient(),
  limiter: Ratelimit.slidingWindow(RECOMMENDATION_LIMIT, RECOMMENDATION_WINDOW),
  analytics: false,
})
