import { Redis } from '@upstash/redis'

export function createRedisClient(): Redis {
  const config = useRuntimeConfig()
  return new Redis({
    url: config.upstash.redisUrl,
    token: config.upstash.redisToken,
  })
}
