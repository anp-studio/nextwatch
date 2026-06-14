import { Ratelimit } from '@upstash/ratelimit'
import { createRedisClient } from '../shared/redis'

export const USER_LIST_READ_LIMIT = 20
const USER_LIST_READ_WINDOW = '1 m'

export const userListReadLimiter = new Ratelimit({
  redis: createRedisClient(),
  limiter: Ratelimit.fixedWindow(USER_LIST_READ_LIMIT, USER_LIST_READ_WINDOW),
  analytics: false,
})
