const store = new Map<string, number[]>()

const MAX_REQUESTS = 100
const TIME_WINDOW = 60 * 1000 // 1 minuta

export default defineEventHandler(async (event) => {
  const path = getRequestURL(event).pathname

  if (!path.startsWith('/api/public')) {
    return
  }

  const ip = getRequestIP(event, { xForwardedFor: true }) ?? 'unknown'
  const now = Date.now()

  const timestamps = (store.get(ip) ?? []).filter((time) => now - time < TIME_WINDOW)
  timestamps.push(now)
  store.set(ip, timestamps)

  setResponseHeaders(event, {
    'X-RateLimit-Limit': String(MAX_REQUESTS),
    'X-RateLimit-Remaining': String(Math.max(0, MAX_REQUESTS - timestamps.length)),
  })

  if (timestamps.length > MAX_REQUESTS) {
    throw createError({
      statusCode: 429,
      message: 'Too many requests. Please try again later.',
    })
  }
})
