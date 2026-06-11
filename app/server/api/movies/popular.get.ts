import type { H3Event } from 'h3'
import { fetchTmdb } from '../../utils/tmdb/client'

interface TmdbPopularMovie {
  id: number
  title: string
  original_title: string
  poster_path: string | null
  backdrop_path: string | null
  release_date: string
  vote_average: number
  genre_ids: number[]
  overview: string
}

interface TmdbPopularResponse {
  results: TmdbPopularMovie[]
}

function isTmdbPopularResponse(value: unknown): value is TmdbPopularResponse {
  if (typeof value !== 'object' || value === null) {
    return false
  }

  const candidate = value as { results: unknown }
  return Array.isArray(candidate.results)
}

export default defineCachedEventHandler(
  async (event: H3Event) => {
    const response = await fetchTmdb(event, 'movie/popular', { page: 1 })

    if (!isTmdbPopularResponse(response)) {
      throw createError({
        statusCode: 502,
        statusMessage: 'Unexpected TMDB popular response format.',
      })
    }

    const results = response.results
      .filter((movie) => movie.poster_path && movie.release_date && movie.vote_average !== 0)
      .map((movie) => ({
        id: movie.id,
        title: movie.title,
        original_title: movie.original_title,
        poster_path: movie.poster_path,
        backdrop_path: movie.backdrop_path,
        release_date: movie.release_date,
        vote_average: movie.vote_average,
        genre_ids: movie.genre_ids ?? [],
        overview: movie.overview,
      }))

    return { results }
  },
  {
    maxAge: 60 * 60 * 12,
    swr: true,
  }
)
