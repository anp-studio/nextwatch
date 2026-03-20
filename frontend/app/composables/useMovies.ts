import type { TMDBMovie, TMDBPopularResponse, TMDBGenreListResponse, TMDBGenre } from '~/types/tmdb'

interface WatchedMovie {
  tmdbId: number
  title: string
  year: number
  posterPath: string
}

interface PendingWatchedMovie {
  id: number
  title: string
  year: number
  posterPath: string
}

export const useMovies = () => {
  const IMAGE_BASE = 'https://image.tmdb.org/t/p/w500'
  const tmdbErrorMessage = 'TMDB data is unavailable right now. Check NUXT_TMDB_API_KEY.'
  const pendingWatchedStorageKey = 'movie-recommender-pending-watched'

  const getPopularMovies = async (): Promise<MoviePreview[]> => {
    try {
      const [moviesData, genresData] = await Promise.all([
        $fetch<TMDBPopularResponse>('/api/tmdb/movie/popular', { params: { page: 1 } }),
        $fetch<TMDBGenreListResponse>('/api/tmdb/genre/movie/list'),
      ])

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
        .slice(0, 20)
    } catch (error) {
      console.error('Failed to load popular movies:', error)
      throw new Error(tmdbErrorMessage)
    }
  }

  const getMovieDetails = async (movieId: number): Promise<Movie> => {
    try {
      return await $fetch<Movie>(`/api/movies/${movieId}`)
    } catch (error) {
      console.error(`Failed to load movie details for ${movieId}:`, error)
      throw new Error(tmdbErrorMessage)
    }
  }

  const watchedMovies = useState<WatchedMovie[]>('watched', () => [])
  const pendingWatchedMovies = useState<PendingWatchedMovie[]>('pending-watched', () => [])
  const supabase = useSupabase()

  const loadPendingWatchedFromStorage = () => {
    if (!import.meta.client) return

    try {
      const raw = window.localStorage.getItem(pendingWatchedStorageKey)
      if (!raw) {
        pendingWatchedMovies.value = []
        return
      }

      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed)) {
        pendingWatchedMovies.value = parsed.filter(
          (movie): movie is PendingWatchedMovie =>
            typeof movie?.id === 'number' &&
            typeof movie?.title === 'string' &&
            typeof movie?.year === 'number' &&
            typeof movie?.posterPath === 'string'
        )
      }
    } catch (error) {
      console.error('Failed to read pending watched movies from storage:', error)
      pendingWatchedMovies.value = []
    }
  }

  const persistPendingWatchedToStorage = () => {
    if (!import.meta.client) return

    try {
      if (pendingWatchedMovies.value.length === 0) {
        window.localStorage.removeItem(pendingWatchedStorageKey)
        return
      }

      window.localStorage.setItem(
        pendingWatchedStorageKey,
        JSON.stringify(pendingWatchedMovies.value)
      )
    } catch (error) {
      console.error('Failed to persist pending watched movies to storage:', error)
    }
  }

  const clearWatchedMovies = () => {
    watchedMovies.value = []
  }

  const syncWatchedMoviesFromSupabase = async (accessToken?: string) => {
    try {
      let token = accessToken

      if (!token) {
        const {
          data: { session },
        } = await supabase.auth.getSession()

        token = session?.access_token
      }

      if (!token) {
        watchedMovies.value = []
        return
      }

      const response = await $fetch<{ success: boolean; movies: WatchedMovie[] }>(
        '/api/watched',
        {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      )

      watchedMovies.value = response.movies
    } catch (error) {
      console.error('Failed to load watched movies from Supabase:', error)
    }
  }

  const markAsWatched = async (
    movie: Pick<MoviePreview, 'id' | 'title' | 'year' | 'poster'>
  ): Promise<'ok' | 'unauthorized' | 'error'> => {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (!session?.access_token) {
        return 'unauthorized'
      }

      const posterPath = movie.poster.slice(IMAGE_BASE.length)

      if (!watchedMovies.value.some((s) => s.tmdbId === movie.id)) {
        watchedMovies.value.push({
          tmdbId: movie.id,
          title: movie.title,
          year: movie.year,
          posterPath,
        })
      }

      $fetch('/api/watched', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
        body: {
          movie: {
            tmdbId: movie.id,
            title: movie.title,
            year: movie.year,
            posterPath,
          },
        },
      })
    } catch (error) {
      console.error('Failed to mark movie as watched in Supabase:', error)
      return 'error'
    }

    return 'ok'
  }

  const queuePendingWatchedMovie = (
    movie: Pick<MoviePreview, 'id' | 'title' | 'year' | 'poster'>
  ) => {
    if (pendingWatchedMovies.value.some((pendingMovie) => pendingMovie.id === movie.id)) {
      return
    }

    pendingWatchedMovies.value.push({
      id: movie.id,
      title: movie.title,
      year: movie.year,
      posterPath: movie.poster.slice(IMAGE_BASE.length),
    })

    persistPendingWatchedToStorage()
  }

  const processPendingWatchedMovies = async (accessToken?: string): Promise<number> => {
    if (pendingWatchedMovies.value.length === 0) {
      loadPendingWatchedFromStorage()
    }

    if (pendingWatchedMovies.value.length === 0) {
      return 0
    }

    try {
      let token = accessToken

      if (!token) {
        const {
          data: { session },
        } = await supabase.auth.getSession()

        token = session?.access_token
      }

      if (!token) {
        return 0
      }

      let processedCount = 0
      const queueSnapshot = [...pendingWatchedMovies.value]

      for (const movie of queueSnapshot) {
        if (watchedMovies.value.some((s) => s.tmdbId === movie.id)) {
          pendingWatchedMovies.value = pendingWatchedMovies.value.filter(
            (pendingMovie) => pendingMovie.id !== movie.id
          )
          persistPendingWatchedToStorage()
          processedCount++
          continue
        }

        try {
          $fetch('/api/watched', {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${token}`,
            },
            body: {
              movie: {
                tmdbId: movie.id,
                title: movie.title,
                year: movie.year,
                posterPath: movie.posterPath,
              },
            },
          })

          if (!watchedMovies.value.some((s) => s.tmdbId === movie.id)) {
            watchedMovies.value.push({
              tmdbId: movie.id,
              title: movie.title,
              year: movie.year,
              posterPath: movie.posterPath,
            })
          }

          pendingWatchedMovies.value = pendingWatchedMovies.value.filter(
            (pendingMovie) => pendingMovie.id !== movie.id
          )

          persistPendingWatchedToStorage()
          processedCount++
        } catch (error) {
          console.error(`Failed to process pending movie ${movie.id}:`, error)
        }
      }

      return processedCount
    } catch (error) {
      console.error('Failed to process pending watched movies:', error)
      return 0
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
      trailer: null,
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
      trailer: null,
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
      trailer: null,
    },
  ])

  return {
    IMAGE_BASE,
    getPopularMovies,
    getMovieDetails,
    moviesMock,
    watchedMovies,
    pendingWatchedMovies,
    markAsWatched,
    queuePendingWatchedMovie,
    processPendingWatchedMovies,
    syncWatchedMoviesFromSupabase,
    clearWatchedMovies,
  }
}

export interface Movie {
  id: number
  title: string
  poster: string
  rating: number
  year: number
  duration: string
  genres: string[]
  actors: string[]
  description: string
  trailer: string | null
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
