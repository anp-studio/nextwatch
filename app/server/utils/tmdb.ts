import type { H3Event } from 'h3'
import { createRateLimiter } from './ratelimit'

const TMDB_API_URL = 'https://api.themoviedb.org/3'
const RATE_LIMIT_HEADER_LIMIT = 'X-RateLimit-Limit'
const RATE_LIMIT_HEADER_REMAINING = 'X-RateLimit-Remaining'
const RATE_LIMIT_HEADER_RESET = 'X-RateLimit-Reset'
const TMDB_RATE_LIMIT_HEADER_LIMIT = 'X-TMDB-RateLimit-Limit'
const TMDB_RATE_LIMIT_HEADER_REMAINING = 'X-TMDB-RateLimit-Remaining'
const TMDB_RATE_LIMIT_HEADER_RESET = 'X-TMDB-RateLimit-Reset'

type TmdbQuery = Record<string, string | string[] | number | undefined>

export async function fetchTmdb(
  event: H3Event,
  path: string,
  query: TmdbQuery = {}
): Promise<unknown> {
  const config = useRuntimeConfig()
  const apiKey = config.tmdbApiKey

  if (!apiKey) {
    throw createError({
      statusCode: 500,
      message: 'TMDB API key is not configured. Set NUXT_TMDB_API_KEY.',
    })
  }

  const ip = getRequestIP(event, { xForwardedFor: true }) ?? 'anonymous'
  const { tmdbLimiter } = createRateLimiter()
  const { success, limit, remaining, reset } = await tmdbLimiter.limit(ip)

  const responseHeaders: Record<string, string> = {
    [TMDB_RATE_LIMIT_HEADER_LIMIT]: String(limit),
    [TMDB_RATE_LIMIT_HEADER_REMAINING]: String(remaining),
    [TMDB_RATE_LIMIT_HEADER_RESET]: String(reset),
  }

  if (!getResponseHeader(event, RATE_LIMIT_HEADER_LIMIT)) {
    responseHeaders[RATE_LIMIT_HEADER_LIMIT] = String(limit)
    responseHeaders[RATE_LIMIT_HEADER_REMAINING] = String(remaining)
    responseHeaders[RATE_LIMIT_HEADER_RESET] = String(reset)
  }

  setResponseHeaders(event, responseHeaders)

  if (!success) {
    throw createError({
      statusCode: 429,
      message: 'Rate limit exceeded for TMDB API. Please try again later.',
    })
  }

  try {
    return await $fetch(path, {
      baseURL: TMDB_API_URL,
      params: {
        language: 'en-US',
        ...query,
      },
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
    })
  } catch (error: unknown) {
    const fetchError = error as {
      response?: { status?: number; _data?: { status_message?: string } }
    }
    const statusCode = fetchError.response?.status ?? 500
    const statusMessage =
      statusCode === 401
        ? 'TMDB request unauthorized. Check NUXT_TMDB_API_KEY.'
        : (fetchError.response?._data?.status_message ?? 'Failed to fetch data from TMDB.')

    throw createError({
      statusCode,
      statusMessage,
    })
  }
}
