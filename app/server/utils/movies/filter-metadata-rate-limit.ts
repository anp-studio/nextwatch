import { Ratelimit } from '@upstash/ratelimit'
import { createRedisClient } from '../shared/redis'

export const FILTER_METADATA_LIMIT = 5
const FILTER_METADATA_WINDOW = '1 s'

export const filterMetadataLimiter = new Ratelimit({
  redis: createRedisClient(),
  limiter: Ratelimit.fixedWindow(FILTER_METADATA_LIMIT, FILTER_METADATA_WINDOW),
  analytics: false,
})
