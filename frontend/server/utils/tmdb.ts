const TMDB_API_URL = 'https://api.themoviedb.org/3'

type TmdbQuery = Record<string, string | string[] | number | undefined>

export async function fetchTmdb(path: string, query: TmdbQuery = {}): Promise<unknown> {
  const config = useRuntimeConfig()
  const apiKey = config.tmdbApiKey

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
        language: 'en-US',
        ...query,
      },
      headers: { Accept: 'application/json', Authorization: `Bearer ${apiKey}` },
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
