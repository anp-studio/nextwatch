import { getSimilaritiesById } from '~~/server/services/similarity-service'
import { defineEventHandler, getRouterParam, getQuery, createError } from 'h3'

export default defineEventHandler(async (event) => {
  const movieIdParam = getRouterParam(event, 'movieId')

  if (!movieIdParam) {
    throw createError({
      statusCode: 400,
      message: 'Movie ID is required',
    })
  }

  const movieId = parseInt(movieIdParam || '')
  if (isNaN(movieId)) {
    throw createError({
      statusCode: 400,
      message: 'Invalid movie ID format',
    })
  }

  const query = getQuery(event)
  const limit = query.limit ? parseInt(query.limit as string) : 25 // Default limit to 25 if not provided
  const minScore = query.minScore ? parseFloat(query.minScore as string) : undefined

  if (isNaN(limit) || limit <= 0) {
    throw createError({
      statusCode: 400,
      message: 'Limit must be a positive integer',
    })
  }

  if (minScore !== undefined && (isNaN(minScore) || minScore < 0 || minScore > 1)) {
    throw createError({
      statusCode: 400,
      message: 'minScore must be a number between 0 and 1',
    })
  }

  const result = await getSimilaritiesById(movieId, {
    limit: Math.min(limit, 25), // Force maximum limit of 25
    minScore,
  })

  if (!result) {
    throw createError({
      statusCode: 404,
      message: `No similarities found for movie ID ${movieId}`,
    })
  }

  return result
})
