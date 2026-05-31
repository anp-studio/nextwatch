import { Ratelimit } from '@upstash/ratelimit'
import { createRedisClient } from './redis'

// da lakse moze da se menja
export const RECOMMENDATION_LIMIT = 20
const TMDB_LIMIT = 40
const TMDB_WINDOW = '1 s'
const RECOMMENDATION_WINDOW = '1 d'
export const TMDB_GLOBAL_LIMITER_KEY = 'tmdb:global'

export interface RecommendationQuota {
  limit: number
  remaining: number
  reset: number
}

const redis = createRedisClient()

export const tmdbLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.fixedWindow(TMDB_LIMIT, TMDB_WINDOW),
  analytics: false,
})

export const recommendationLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(RECOMMENDATION_LIMIT, RECOMMENDATION_WINDOW),
  analytics: false,
})

// keep this for now but will remove later
export const recommednationLimiter = recommendationLimiter
