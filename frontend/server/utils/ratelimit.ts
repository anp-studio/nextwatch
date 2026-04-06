import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

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

  const modelLimiter = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(20, '1 d'),
    analytics: true,
  })

  return {
    tmdbLimiter,
    recommednationLimiter: modelLimiter,
  }
}
