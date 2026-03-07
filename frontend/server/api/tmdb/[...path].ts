const TMDB_API_URL = 'https://api.themoviedb.org/3'

export default defineEventHandler(async (event): Promise<any> => {
  const config = useRuntimeConfig()
  const query = getQuery(event)
  const path = event.context.params?.path as string | undefined

  if (!path) {
    throw createError({
      statusCode: 400,
      message: 'Path parameter is required',
    })
  }

  try {
    return await $fetch(path, {
      baseURL: TMDB_API_URL,
      params: {
        api_key: config.tmdbApiKey,
        language: 'en-US',
        ...query,
      },
      headers: { Accept: 'application/json' },
    })
  } catch (error: any) {
    const status = error.response?.status || 500
    setResponseStatus(event, status)
    return { error: String(error) }
  }
})
