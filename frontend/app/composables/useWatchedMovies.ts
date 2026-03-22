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

  const syncWatchedMoviesFromSupabase = async () => {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (!session?.user.id) {
        watchedMovies.value = []
        return
      }

      const { data, error } = await supabase
        .from('watched_movies')
        .select('movies')
        .eq('user_id', session.user.id)
        .maybeSingle()

      if (error) {
        throw error
      }

      watchedMovies.value = Array.isArray(data?.movies) ? (data.movies as WatchedMovie[]) : []
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

      if (!session?.user.id) {
        return 'unauthorized'
      }

      const posterPath = movie.poster.slice(IMAGE_BASE.length)
      const originalList = [...watchedMovies.value]

      if (!watchedMovies.value.some((s) => s.tmdbId === movie.id)) {
        watchedMovies.value.push({
          tmdbId: movie.id,
          title: movie.title,
          year: movie.year,
          posterPath,
        })
      }

      void (async () => {
        try {
          await supabase.from('watched_movies').upsert(
            {
              user_id: session.user.id,
              movies: watchedMovies.value,
              updated_at: new Date().toISOString(),
            },
            { onConflict: 'user_id' }
          )
          console.log(`Marked movie ${movie.id} as watched for user ${session.user.id}`)
        } catch (error) {
          console.error('Failed to save watched movies to Supabase:', error)
          watchedMovies.value = originalList
        }
      })()
    } catch (error) {
      console.error('Failed to mark movie as watched:', error)
      return 'error'
    }

    return 'ok'
  }

  const unmarkAsWatched = async (tmdbId: number): Promise<'ok' | 'unauthorized' | 'error'> => {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (!session?.user.id) {
        return 'unauthorized'
      }

      const originalList = [...watchedMovies.value]
      watchedMovies.value = watchedMovies.value.filter((movie) => movie.tmdbId !== tmdbId)

      void (async () => {
        try {
          await supabase.from('watched_movies').upsert(
            {
              user_id: session.user.id,
              movies: watchedMovies.value,
              updated_at: new Date().toISOString(),
            },
            { onConflict: 'user_id' }
          )

          console.log(`Unmarked movie ${tmdbId} as watched for user ${session.user.id}`)
        } catch (error) {
          console.error('Failed to save watched movies to Supabase:', error)
          watchedMovies.value = originalList
        }
      })()
    } catch (error) {
      console.error('Failed to unmark movie as watched:', error)
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

  const processPendingWatchedMovies = async (): Promise<number> => {
    if (pendingWatchedMovies.value.length === 0) {
      loadPendingWatchedFromStorage()
    }

    if (pendingWatchedMovies.value.length === 0) {
      return 0
    }

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (!session?.user.id) {
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
          if (!watchedMovies.value.some((s) => s.tmdbId === movie.id)) {
            watchedMovies.value.push({
              tmdbId: movie.id,
              title: movie.title,
              year: movie.year,
              posterPath: movie.posterPath,
            })
          }

          void (async () => {
            try {
              await supabase.from('watched_movies').upsert(
                {
                  user_id: session.user.id,
                  movies: watchedMovies.value,
                  updated_at: new Date().toISOString(),
                },
                { onConflict: 'user_id' }
              )
            } catch (error) {
              console.error(`Failed to save pending movie ${movie.id}:`, error)
            }
          })()

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
    unmarkAsWatched,
    queuePendingWatchedMovie,
    processPendingWatchedMovies,
    syncWatchedMoviesFromSupabase,
    clearWatchedMovies,
  }
}
