import type { H3Event } from 'h3'
import { createRateLimiter } from './ratelimit'
import { throwConfigError, throwTmdbError } from './api-error'

const TMDB_API_ORIGIN = 'https://api.themoviedb.org'
const TMDB_API_URL = 'https://api.themoviedb.org/3/'
const RATE_LIMIT_HEADER_LIMIT = 'X-RateLimit-Limit'
const RATE_LIMIT_HEADER_REMAINING = 'X-RateLimit-Remaining'
const RATE_LIMIT_HEADER_RESET = 'X-RateLimit-Reset'
const TMDB_RATE_LIMIT_HEADER_LIMIT = 'X-TMDB-RateLimit-Limit'
const TMDB_RATE_LIMIT_HEADER_REMAINING = 'X-TMDB-RateLimit-Remaining'
const TMDB_RATE_LIMIT_HEADER_RESET = 'X-TMDB-RateLimit-Reset'
const PROTOCOL_RELATIVE_PREFIX = '//'
const ABSOLUTE_URL_PATTERN = /^[a-zA-Z][a-zA-Z\d+\-.]*:/
const SEARCH_MOVIE_PATH = 'search/movie'
const MOVIE_PATH_SEGMENT = 'movie'
const NUMERIC_SEGMENT_PATTERN = /^\d+$/
const TMDB_FETCH_FAILED_MESSAGE = 'Movie data is temporarily unavailable.'

type TmdbQuery = Record<string, string | string[] | number | undefined>

function normalizeTmdbPath(path: string): string {
  const normalizedPath = path.trim()

  if (!normalizedPath) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Path cannot be empty.',
    })
  }

  // make sure path is realtive and not absolute URL
  if (
    normalizedPath.startsWith(PROTOCOL_RELATIVE_PREFIX) ||
    ABSOLUTE_URL_PATTERN.test(normalizedPath)
  ) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Absolute URLs are not allowed in the path.',
    })
  }

  // remove leading slashes
  return normalizedPath.replace(/^\/+/, '')
}

function buildTmdbUrl(path: string): string {
  const normalizedPath = normalizeTmdbPath(path)
  const url = new URL(normalizedPath, TMDB_API_URL)

  if (url.origin !== TMDB_API_ORIGIN) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Only TMDB paths are allowed.',
    })
  }

  if (!url.pathname.startsWith('/3/')) {
    throw createError({
      statusCode: 400,
      statusMessage: 'TMDB path must stay within the API base path.',
    })
  }

  const tmdbPath = url.pathname.slice(3) // remove the '/3/' prefix
  // check if the path is either the search/movie endpoint or a movie/{id} endpoint with a numeric id
  const pathSegments = tmdbPath.split('/')
  const movieIdSegment = pathSegments[1]
  const isSearchMoviePath = tmdbPath === SEARCH_MOVIE_PATH
  const isMovieByIdPath =
    pathSegments.length === 2 &&
    pathSegments[0] === MOVIE_PATH_SEGMENT &&
    typeof movieIdSegment === 'string' &&
    NUMERIC_SEGMENT_PATTERN.test(movieIdSegment)
  const isAllowedPath = isSearchMoviePath || isMovieByIdPath

  if (!isAllowedPath) {
    throw createError({
      statusCode: 400,
      statusMessage: `TMDB path is not allowed.`,
    })
  }

  return url.toString()
}

export async function fetchTmdb(
  event: H3Event,
  path: string,
  query: TmdbQuery = {}
): Promise<unknown> {
  const config = useRuntimeConfig()
  const apiKey = config.tmdbApiKey

  if (!apiKey) {
    throwConfigError(event, new Error('Missing TMDB API key'), {
      event: 'tmdb.misconfigured',
    })
  }

  const safeUrl = buildTmdbUrl(path)

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
      statusMessage: 'Rate limit exceeded for TMDB API. Please try again later.',
    })
  }

  try {
    return await $fetch(safeUrl, {
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
    throwTmdbError(event, error, {
      event: 'tmdb.fetch_failed',
      publicMessage: TMDB_FETCH_FAILED_MESSAGE,
      statusCode,
      extra: {
        path,
      },
    })
  }
}
