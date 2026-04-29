import { Ratelimit } from '@upstash/ratelimit'
import { createRedisClient } from './redis'

// da lakse moze da se menja
export const RECOMMENDATION_LIMIT = 20

export function createRateLimiter() {
  const redis = createRedisClient()

  const tmdbLimiter = new Ratelimit({
    redis,
    limiter: Ratelimit.fixedWindow(40, '1 s'),
    analytics: false,
  })

  const recommednationLimiter = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(RECOMMENDATION_LIMIT, '1 d'),
    analytics: false,
  })

  return { tmdbLimiter, recommednationLimiter }
}
