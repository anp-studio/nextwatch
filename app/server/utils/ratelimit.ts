import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

// da lakse moze da se menja
export const RECOMMENDATION_LIMIT = 20

export function createRateLimiter() {
  const config = useRuntimeConfig()

  const redis = new Redis({
    url: config.upstash.redisUrl,
    token: config.upstash.redisToken,
  })

  const tmdbLimiter = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(40, '1 s'),
    analytics: true,
  })

  const recommednationLimiter = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(RECOMMENDATION_LIMIT, '1 d'),
    analytics: true,
  })

  return { tmdbLimiter, recommednationLimiter }
}
