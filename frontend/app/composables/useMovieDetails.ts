import type {
  Movie,
  MoviePreview,
  TMDBMovie,
  TMDBPopularResponse,
  TMDBGenreListResponse,
  TMDBGenre,
} from '~/types/movie'

const IMAGE_BASE = 'https://image.tmdb.org/t/p/w500'
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
    } catch (error) {
      console.error(`Failed to load movie details for ${movieId}:`, error)
      throw new Error(TMDB_ERROR_MESSAGE)
    }
  }

  const getPopularMovies = async (): Promise<MoviePreview[]> => {
    try {
      const [moviesData, genresData] = await Promise.all([
        $fetch<TMDBPopularResponse>('/api/tmdb/movie/popular', { params: { page: 1 } }),
        $fetch<TMDBGenreListResponse>('/api/tmdb/genre/movie/list'),
      ])

      const genreMap = new Map<number, string>(
        genresData.genres.map((g: TMDBGenre) => [g.id, g.name]),
      )

      return moviesData.results
        .map((movie: TMDBMovie) => ({
          id: movie.id,
          title: movie.title,
          poster: movie.poster_path ? `${IMAGE_BASE}${movie.poster_path}` : '',
          rating: Math.round(movie.vote_average * 10) / 10,
          year: parseInt(movie.release_date?.split('-')[0] || '0'),
          genres: movie.genre_ids.map((id) => genreMap.get(id) || 'Unknown').slice(0, 3),
          description: movie.overview,
        }))
        .slice(0, 20)
    } catch (error) {
      console.error('Failed to load popular movies:', error)
      throw new Error(TMDB_ERROR_MESSAGE)
    }
  }

  return {
    IMAGE_BASE,
    getMovieDetails,
    getPopularMovies,
    movieCache,
  }
}
