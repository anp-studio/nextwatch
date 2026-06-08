import { randomUUID } from 'node:crypto'
import type { Redis } from '@upstash/redis'

const LOCK_KEY_BASE = `admin-import:lock`
const LOCK_TTL_S = 15 * 60

export interface AdminLock {
  key: string
  value: string
}

export async function acquireAdminLock(redis: Redis): Promise<AdminLock | null> {
  const lockKey = `${LOCK_KEY_BASE}`
  const lockValue = randomUUID()

  const result = await redis.set(lockKey, lockValue, {
    nx: true,
    ex: LOCK_TTL_S,
  })

  if (!result) return null

  return { key: lockKey, value: lockValue }
}

export async function releaseAdminLock(redis: Redis, lock: AdminLock): Promise<boolean> {
  const result = (await redis.eval(
    `
    if redis.call("get", KEYS[1]) == ARGV[1] then
      return redis.call("del", KEYS[1])
    else
      return 0
    end
    `,
    [lock.key],
    [lock.value]
  )) as number

  return result === 1
}
