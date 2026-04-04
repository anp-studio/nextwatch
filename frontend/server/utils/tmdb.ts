import type { H3Event } from 'h3'
import { createRateLimiter } from './ratelimit'

const TMDB_API_URL = 'https://api.themoviedb.org/3'

type TmdbQuery = Record<string, string | string[] | number | undefined>

export async function fetchTmdb(
  event: H3Event,
  path: string,
  query: TmdbQuery = {}
): Promise<unknown> {
  const config = useRuntimeConfig()
  const apiKey = config.tmdbApiKey || process.env.NUXT_TMDB_API_KEY

  if (!apiKey) {
    throw createError({
      statusCode: 500,
      message: 'TMDB API key is not configured. Set NUXT_TMDB_API_KEY.',
    })
  }

  const ip = getRequestIP(event, { xForwardedFor: true }) ?? 'anonymous'
  const { tmdbLimiter } = createRateLimiter()
  const { success, limit, remaining, reset } = await tmdbLimiter.limit(ip)

  setResponseHeaders(event, {
    'X-RateLimit-Limit': String(limit),
    'X-RateLimit-Remaining': String(remaining),
    'X-RateLimit-Reset': String(reset),
  })

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
