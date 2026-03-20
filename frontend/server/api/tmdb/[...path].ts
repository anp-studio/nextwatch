import { fetchTmdb } from '../../utils/tmdb'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const path = event.context.params?.path as string | undefined
  const apiKey = config.tmdbApiKey || process.env.NUXT_TMDB_API_KEY || ''

  if (!path) {
    throw createError({
      statusCode: 400,
      message: 'Path parameter is required',
    })
  }

  return fetchTmdb(path, query)
})
