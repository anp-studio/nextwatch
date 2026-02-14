import { getSimilaritiesById } from '~~/server/services/similarity-service'

export default defineEventHandler(async (event) => {
  const movieIdParam = getRouterParam(event, 'movieId')

  const movieId = parseInt(movieIdParam || '')
  if (isNaN(movieId)) {
    throw createError({
      statusCode: 400,
      message: 'Invalid movie ID format',
    })
  }

  const result = await getSimilaritiesById(movieId, {
    limit: 20,
  })

  if (!result) {
    throw createError({
      statusCode: 404,
      message: `No similarities found for movie ID ${movieId}`,
    })
  }

  return result
})
