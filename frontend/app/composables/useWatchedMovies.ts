import type { WatchedMovie, PendingWatchedMovie, MoviePreview } from '~/types/movie'

const PENDING_WATCHED_STORAGE_KEY = 'movie-recommender-pending-watched'

export const useWatchedMovies = () => {
  const { IMAGE_BASE } = useMovieDetails()
  const supabase = useSupabase()

  const watchedMovies = useState<WatchedMovie[]>('watched', () => [])
  const pendingWatchedMovies = useState<PendingWatchedMovie[]>('pending-watched', () => [])

  const loadPendingWatchedFromStorage = () => {
    if (!import.meta.client) return

    try {
      const raw = window.localStorage.getItem(PENDING_WATCHED_STORAGE_KEY)
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
        window.localStorage.removeItem(PENDING_WATCHED_STORAGE_KEY)
        return
      }

      window.localStorage.setItem(
        PENDING_WATCHED_STORAGE_KEY,
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

      const response = await $fetch<{ success: boolean; movies: WatchedMovie[] }>('/api/watched', {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

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

  return {
    watchedMovies,
    pendingWatchedMovies,
    markAsWatched,
    queuePendingWatchedMovie,
    processPendingWatchedMovies,
    syncWatchedMoviesFromSupabase,
    clearWatchedMovies,
  }
}
