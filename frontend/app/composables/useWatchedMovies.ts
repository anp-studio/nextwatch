import type { WatchedMovie, PendingWatchedMovie, MoviePreview } from '~/types/movie'

const PENDING_WATCHED_STORAGE_KEY = 'movie-recommender-pending-watched'

export const useWatchedMovies = () => {
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
    } catch {
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
    } catch {
      // persist failed silently
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
    } catch {
      // failed to load watched movies
    }
  }

  const markAsWatched = async (
    movie: Pick<MoviePreview, 'id' | 'title' | 'year' | 'poster'> & { genres?: string[]; runtime?: number | null }
  ): Promise<'ok' | 'unauthorized' | 'error'> => {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (!session?.access_token) {
        return 'unauthorized'
      }

      const path = posterPath(movie.poster)

      const alreadyInState = watchedMovies.value.some((s) => s.tmdbId === movie.id)
      if (!alreadyInState) {
        const entry: WatchedMovie = {
          tmdbId: movie.id,
          title: movie.title,
          year: movie.year,
          posterPath: path,
        }
        if (movie.genres?.length) entry.genres = movie.genres
        if (typeof movie.runtime === 'number') entry.runtime = movie.runtime
        watchedMovies.value.push(entry)
      }

      try {
        const body: Record<string, unknown> = {
          movie: {
            tmdbId: movie.id,
            title: movie.title,
            year: movie.year,
            posterPath: path,
            ...(movie.genres?.length ? { genres: movie.genres } : {}),
            ...(typeof movie.runtime === 'number' ? { runtime: movie.runtime } : {}),
          },
        }
        await $fetch('/api/watched', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
          body,
        })
      } catch {
        if (!alreadyInState) {
          watchedMovies.value = watchedMovies.value.filter((m) => m.tmdbId !== movie.id)
        }
        return 'error'
      }
    } catch {
      return 'error'
    }

    return 'ok'
  }

  const removeFromWatched = async (tmdbId: number): Promise<'ok' | 'unauthorized' | 'error'> => {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (!session?.access_token) {
        return 'unauthorized'
      }

      watchedMovies.value = watchedMovies.value.filter((m) => m.tmdbId !== tmdbId)

      await $fetch('/api/watched', {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
        body: { tmdbId },
      })
    } catch {
      await syncWatchedMoviesFromSupabase()
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
      posterPath: posterPath(movie.poster),
    })

    persistPendingWatchedToStorage()
  }

  const removePendingWatchedMovie = (movieId: number) => {
    pendingWatchedMovies.value = pendingWatchedMovies.value.filter((m) => m.id !== movieId)
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
          await $fetch('/api/watched', {
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
        } catch {
          // failed to process pending movie
        }
      }

      return processedCount
    } catch {
      return 0
    }
  }

  return {
    watchedMovies,
    pendingWatchedMovies,
    markAsWatched,
    removeFromWatched,
    queuePendingWatchedMovie,
    removePendingWatchedMovie,
    processPendingWatchedMovies,
    syncWatchedMoviesFromSupabase,
    clearWatchedMovies,
  }
}
