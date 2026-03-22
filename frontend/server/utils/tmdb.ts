import type { QueryObject } from 'ufo'

const TMDB_API_URL = 'https://api.themoviedb.org/3'

export async function fetchTmdb(path: string, query: QueryObject = {}): Promise<unknown> {
  const config = useRuntimeConfig()
  const apiKey = config.tmdbApiKey || process.env.NUXT_TMDB_API_KEY || ''

  if (!apiKey) {
    throw createError({
      statusCode: 500,
      message: 'TMDB API key is not configured. Set NUXT_TMDB_API_KEY.',
    })
  }

  try {
    return await $fetch(path, {
      baseURL: TMDB_API_URL,
      params: {
        api_key: apiKey,
        language: 'en-US',
        ...query,
      },
      headers: { Accept: 'application/json' },
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
