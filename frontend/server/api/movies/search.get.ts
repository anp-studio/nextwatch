interface TmdbSearchMovie {
  id: number
  title: string
  original_title: string
  poster_path: string | null
  release_date: string
  vote_average: number
}

interface TmdbSearchResponse {
  results: TmdbSearchMovie[]
}

function isTmdbSearchResponse(value: unknown): value is TmdbSearchResponse {
  if (typeof value !== 'object' || value === null) {
    return false
  }

  const candidate = value as { results?: unknown }
  return Array.isArray(candidate.results)
}

export default defineEventHandler(async (event) => {
  const { q } = getQuery<{ q?: string }>(event)
  const query = q?.trim() ?? ''

  if (!query) {
    return { results: [] }
  }

  const payload = await fetchTmdb(event, '/search/movie', {
    query,
    page: 1,
  })

  if (!isTmdbSearchResponse(payload)) {
    throw createError({
      statusCode: 502,
      statusMessage: 'Unexpected TMDB search response format.',
    })
  }

  // fileter out movies that don't have a poster, release date, or have a vote average of 0
  const validMovies = payload.results.filter((movie) => {
    return movie.poster_path && movie.release_date !== null && movie.vote_average !== 0
  })

  const results = validMovies.map((movie) => ({
    id: movie.id,
    title: movie.title,
    original_title: movie.original_title,
    poster_path: movie.poster_path,
    release_date: movie.release_date,
    vote_average: movie.vote_average,
  }))

  return { results }
})
