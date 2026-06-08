import { Ratelimit } from '@upstash/ratelimit'
import { createRedisClient } from '../shared/redis'

const TMDB_LIMIT = 40
const TMDB_WINDOW = '1 s'
export const TMDB_GLOBAL_LIMITER_KEY = 'tmdb:global'

export const tmdbLimiter = new Ratelimit({
  redis: createRedisClient(),
  limiter: Ratelimit.fixedWindow(TMDB_LIMIT, TMDB_WINDOW),
  analytics: false,
})
