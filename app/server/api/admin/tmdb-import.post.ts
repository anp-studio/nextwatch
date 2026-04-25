import { monthlyRunDateNear, shouldSkipWeeklyImport } from '../../utils/tmdb-import-schedule'

const ADMIN_TOKEN_HEADER = 'x-admin-token'
const MAX_BAD_TOKEN_FAILURES = 5
const LOCK_DURATION_MS = 15 * 60 * 1000

interface ThrottleEntry {
  failures: number
  lockedUntil: number
}

interface ImportRequestBody {
  fullRefresh?: boolean
  scheduleType?: 'weekly' | 'monthly'
}

function isImportRequestBody(value: unknown): value is ImportRequestBody {
  if (typeof value !== 'object' || value === null) return false
  const v = value as Record<string, unknown>
  if ('fullRefresh' in v && typeof v.fullRefresh !== 'boolean') return false
  if (
    'scheduleType' in v &&
    v.scheduleType !== 'weekly' &&
    v.scheduleType !== 'monthly' &&
    v.scheduleType !== undefined
  )
    return false
  return true
}

const throttleMap = new Map<string, ThrottleEntry>()
let importInFlight = false

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig(event)

  if (!config.adminToken) {
    throw createError({ statusCode: 503, statusMessage: 'Admin token not configured' })
  }

  const ip = getRequestIP(event, { xForwardedFor: true }) ?? 'unknown'
  const throttle = throttleMap.get(ip)
  if (throttle && throttle.lockedUntil > Date.now()) {
    throw createError({ statusCode: 429, statusMessage: 'Too many failed attempts' })
  }

  const token = getHeader(event, ADMIN_TOKEN_HEADER)
  if (!token || token !== config.adminToken) {
    const entry: ThrottleEntry = throttle ?? { failures: 0, lockedUntil: 0 }
    entry.failures++
    if (entry.failures >= MAX_BAD_TOKEN_FAILURES) {
      entry.lockedUntil = Date.now() + LOCK_DURATION_MS
    }
    throttleMap.set(ip, entry)
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

  throttleMap.delete(ip)

  const rawBody = await readBody<unknown>(event)
  if (rawBody !== null && rawBody !== undefined && !isImportRequestBody(rawBody)) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid request body' })
  }
  const body = (rawBody as ImportRequestBody | null | undefined) ?? {}
  const { fullRefresh = false, scheduleType } = body

  if (scheduleType === 'weekly') {
    const now = new Date()
    const decision = shouldSkipWeeklyImport(now, monthlyRunDateNear(now))
    if (decision.shouldSkip) {
      return { skipped: true, reason: decision.reason }
    }
  }

  if (importInFlight) {
    throw createError({ statusCode: 409, statusMessage: 'Import already running' })
  }

  importInFlight = true
  try {
    return await runTmdbImport({ fullRefresh })
  } finally {
    importInFlight = false
  }
})
