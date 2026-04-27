import type { Movie } from '~/types/movie'
import { IMAGE_BASE } from '~/constants'
const TMDB_ERROR_MESSAGE = 'TMDB data is unavailable right now. Check NUXT_TMDB_API_KEY.'

export const useMovieDetails = () => {
  const movieCache = useState<Record<number, Movie>>('movie-details-cache', () => ({}))

  const getMovieDetails = async (movieId: number): Promise<Movie> => {
    const cached = movieCache.value[movieId]
    if (cached) return cached

    try {
      const movie = await $fetch<Movie>(`/api/movies/${movieId}`)
      movieCache.value[movieId] = movie
      return movie
    } catch {
      throw new Error(TMDB_ERROR_MESSAGE)
    }
  }

  return {
    IMAGE_BASE,
    getMovieDetails,
    movieCache,
  }
}
