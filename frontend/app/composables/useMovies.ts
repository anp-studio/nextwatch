import type {
  TMDBMovie,
  TMDBMovieDetails,
  TMDBPopularResponse,
  TMDBGenreListResponse,
  TMDBGenre,
} from '~/types/tmdb'

export interface Movie {
  id: number
  imdb_id?: string | null
  title: string
  poster: string
  rating: number
  year: number
  duration: string
  genres: string[]
  actors: string[]
  description: string
}

export interface MoviePreview {
  id: number
  title: string
  poster: string
  rating: number
  year: number
  genres: string[]
  description: string
}

export const useMovies = () => {
  const config = useRuntimeConfig()
  const apiKey = config.public.tmdbApiKey
  const BASE_URL = 'https://api.themoviedb.org/3'
  const IMAGE_BASE = 'https://image.tmdb.org/t/p/w500'

  const getPopularMovies = async (): Promise<MoviePreview[]> => {
    const [moviesResponse, genresResponse] = await Promise.all([
      fetch(`${BASE_URL}/movie/popular?api_key=${apiKey}&language=en-US&page=1`),
      fetch(`${BASE_URL}/genre/movie/list?api_key=${apiKey}`),
    ])

    if (!moviesResponse.ok || !genresResponse.ok) {
      throw new Error('Failed to fetch movies')
    }

    const moviesData: TMDBPopularResponse = await moviesResponse.json()
    const genresData: TMDBGenreListResponse = await genresResponse.json()

    const genreMap = new Map<number, string>(
      genresData.genres.map((g: TMDBGenre) => [g.id, g.name])
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
      .slice(0, 20) // * limit to first 20 movies
  }

  const getMovieDetails = async (movieId: number): Promise<Movie> => {
    const response = await fetch(
      `${BASE_URL}/movie/${movieId}?api_key=${apiKey}&language=en-US&append_to_response=credits`
    )

    if (!response.ok) {
      throw new Error('Failed to fetch movie details')
    }

    const data: TMDBMovieDetails = await response.json()
    return {
      id: data.id,
      imdb_id: data.imdb_id,
      title: data.title,
      poster: data.poster_path ? `${IMAGE_BASE}${data.poster_path}` : '',
      rating: Math.round(data.vote_average * 10) / 10,
      year: parseInt(data.release_date?.split('-')[0] || '0'),
      duration: data.runtime ? `${Math.floor(data.runtime / 60)}h ${data.runtime % 60}m` : 'N/A',
      genres: data.genres.map((g) => g.name),
      actors: data.credits.cast.slice(0, 5).map((actor) => actor.name),
      description: data.overview,
    }
  }

  // just for development and testing purposes
  const moviesMock = useState<Movie[]>('movies', () => [
    {
      id: 1,
      title: 'Inception',
      poster: 'https://www.themoviedb.org/t/p/w600_and_h900_face/xlaY2zyzMfkhk0HSC5VUwzoZPU1.jpg',
      rating: 8.8,
      year: 2010,
      duration: '2h 28m',
      genres: ['Sci-Fi', 'Action'],
      actors: ['Leonardo DiCaprio', 'Joseph Gordon-Levitt'],
      description:
        'A thief who steals corporate secrets through the use of dream-sharing technology is given the inverse task of planting an idea into the mind of a C.E.O.',
    },
    {
      id: 2,
      title: 'The Dark Knight',
      poster: 'https://image.tmdb.org/t/p/w500/qJ2tW6WMUDux911r6m7haRef0WH.jpg',
      rating: 9.0,
      year: 2008,
      duration: '2h 32m',
      genres: ['Action', 'Crime'],
      actors: ['Christian Bale', 'Heath Ledger'],
      description:
        'When the menace known as the Joker wreaks havoc and chaos on the people of Gotham, Batman must accept one of the greatest psychological and physical tests of his ability to fight injustice.',
    },
    {
      id: 3,
      title: 'Interstellar',
      poster: 'https://image.tmdb.org/t/p/w500/gEU2QniL6C8zt6bOSdyTDrJwAKt.jpg',
      rating: 8.6,
      year: 2014,
      duration: '2h 49m',
      genres: ['Adventure', 'Drama'],
      actors: ['Matthew McConaughey', 'Anne Hathaway'],
      description:
        "A team of explorers travel through a wormhole in space in an attempt to ensure humanity's survival.",
    },
  ])

  const watchedMovies = useState<number[]>('watched', () => [])

  const markAsWatched = (tmdbId: number) => {
    if (!watchedMovies.value.includes(tmdbId)) {
      watchedMovies.value.push(tmdbId)
    }
    // TODO: later supabsae will map tmdbID, imdbID, omdbID
  }

  return { getPopularMovies, getMovieDetails, moviesMock, watchedMovies, markAsWatched }
}
