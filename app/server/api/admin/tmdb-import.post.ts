import { runTmdbImport } from '../../utils/tmdb/import-runner'
import { acquireAdminLock, releaseAdminLock } from '../../utils/tmdb/import-lock'
import { createRedisClient } from '../../utils/shared/redis'
import type { H3Event } from 'h3'

const ADMIN_TOKEN_HEADER = 'x-admin-token'
const MAX_BAD_TOKEN_FAILURES = 5
const BAD_TOKEN_KEY_PREFIX = 'admin-import:bad-token:'
const BAD_TOKEN_LOCK_TTL_S = 15 * 60

const redis = createRedisClient()

function getClientIp(event: H3Event): string {
  const vercelForwardedFor = getHeader(event, 'x-vercel-forwarded-for')
  if (vercelForwardedFor) {
    return vercelForwardedFor.split(',')[0]?.trim() || 'unknown'
  }

  return getRequestIP(event) ?? 'unknown'
}

function getBadTokenKey(ip: string): string {
  return `${BAD_TOKEN_KEY_PREFIX}${ip}`
}

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig(event)

  if (!config.adminToken) {
    throw createError({ statusCode: 503, statusMessage: 'Admin token not configured' })
  }

  const ip = getClientIp(event) // use the original client IP for throttling
  const throttleKey = getBadTokenKey(ip)
  const currentFailures = await redis.get<number>(throttleKey)

  if ((currentFailures ?? 0) >= MAX_BAD_TOKEN_FAILURES) {
    throw createError({ statusCode: 429, statusMessage: 'Too many failed attempts' })
  }

  const token = getHeader(event, ADMIN_TOKEN_HEADER)
  if (!token || token !== config.adminToken) {
    const failures = await redis.incr(throttleKey)

    if (failures === 1) {
      await redis.expire(throttleKey, BAD_TOKEN_LOCK_TTL_S)
    }

    if (failures >= MAX_BAD_TOKEN_FAILURES) {
      throw createError({ statusCode: 429, statusMessage: 'Too many failed attempts' })
    }

    throw createError({ statusCode: 401, statusMessage: 'Invalid admin token' })
  }

  await redis.del(throttleKey) // reset failure count on successful authentication

  const rawBody = await readBody<unknown>(event)
  if (rawBody !== null && rawBody !== undefined) {
    throw createError({
      statusCode: 400,
      statusMessage: 'This endpoint does not accept a request body',
    })
  }

  const importInFlight = await acquireAdminLock(redis)

  if (!importInFlight) {
    throw createError({ statusCode: 409, statusMessage: 'Import already running' })
  }

  try {
    return await runTmdbImport(event)
  } finally {
    await releaseAdminLock(redis, importInFlight)
  }
})
