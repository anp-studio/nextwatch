import type {
  WatchedMovie,
  PendingWatchedMovie,
  MoviePreview,
  Movie,
} from '~/types/movie'

const PENDING_WATCHED_STORAGE_KEY = 'movie-recommender-pending-watched'

const isPendingWatchedMovie = (movie: unknown): movie is PendingWatchedMovie => {
  if (!movie || typeof movie !== 'object') {
    return false
  }

  const pendingMovie = movie as Record<string, unknown>

  return (
    typeof pendingMovie.id === 'number' &&
    typeof pendingMovie.title === 'string' &&
    typeof pendingMovie.year === 'number' &&
    typeof pendingMovie.posterPath === 'string'
  )
}

const hasWatchedMovieDetails = (
  movie: Pick<WatchedMovie, 'title' | 'year' | 'posterPath'> & {
    genres?: string[]
    runtime?: number | null
  }
) =>
  movie.title.trim().length > 0 &&
  movie.year > 0 &&
  movie.posterPath.trim().length > 0 &&
  Array.isArray(movie.genres) &&
  movie.genres.length > 0 &&
  movie.runtime !== undefined

const applyDetailsToWatchedMovie = (movie: WatchedMovie, details: Movie) => {
  movie.title = details.title
  movie.year = details.year
  movie.posterPath = posterPath(details.poster)
  movie.genres = details.genres
  movie.runtime = details.runtime
}

const hydrateMissingWatchedMovieDetails = async (movies: WatchedMovie[]) => {
  const { getMovieDetails } = useMovieDetails()

  for (const movie of movies) {
    if (hasWatchedMovieDetails(movie)) {
      continue
    }

    try {
      const details = await getMovieDetails(movie.tmdbId)
      applyDetailsToWatchedMovie(movie, details)
    } catch {
      // Cache warming is best-effort; list sync should still succeed.
    }
  }
}

export const useWatchedMovies = () => {
  const supabase = useSupabase()
  const { myList, removeFromMyList, removePendingMyListMovie } = useMyList()

  const watchedMovies = useState<WatchedMovie[]>('watched', () => [])
  const pendingWatchedMovies = useState<PendingWatchedMovie[]>('pending-watched', () => [])

  const { load: loadPendingWatchedFromStorage, persist: persistPendingWatchedToStorage } =
    usePendingStorage(PENDING_WATCHED_STORAGE_KEY, pendingWatchedMovies, isPendingWatchedMovie)

  const clearWatchedMovies = () => {
    watchedMovies.value = []
  }

  const syncWatchedMoviesFromSupabase = async (accessToken?: string) => {
    try {
      const token = await resolveAccessToken(supabase, accessToken)

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
      await hydrateMissingWatchedMovieDetails(watchedMovies.value)
    } catch {
      // Watched sync is best-effort; callers handle empty state.
    }
  }

  const syncMyListAfterWatchingMovie = async (movieId: number) => {
    removePendingMyListMovie(movieId)

    if (!myList.value.some((movie) => movie.tmdbId === movieId)) {
      return
    }

    try {
      await removeFromMyList(movieId)
    } catch {
      // best-effort move; watched succeeded so don't fail the whole call
    }
  }

  const markAsWatched = async (
    movie: Pick<MoviePreview, 'id' | 'title' | 'year' | 'poster'> & {
      genres?: string[]
      runtime?: number | null
    }
  ): Promise<'ok' | 'unauthorized' | 'error'> => {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (!session?.access_token) {
        return 'unauthorized'
      }

      const path = posterPath(movie.poster)
      let details: Movie | null = null

      if (
        !hasWatchedMovieDetails({
          title: movie.title,
          year: movie.year,
          posterPath: path,
          genres: movie.genres,
          runtime: movie.runtime,
        })
      ) {
        try {
          const { getMovieDetails } = useMovieDetails()
          details = await getMovieDetails(movie.id)
        } catch {
          // Cache warming is best-effort; adding watched should still use the ID.
        }
      }

      const alreadyInState = watchedMovies.value.some((s) => s.tmdbId === movie.id)
      if (!alreadyInState) {
        const entry: WatchedMovie = {
          tmdbId: movie.id,
          title: details?.title ?? movie.title,
          year: details?.year ?? movie.year,
          posterPath: details ? posterPath(details.poster) : path,
        }
        if (details?.genres.length) entry.genres = details.genres
        if (details) entry.runtime = details.runtime
        if (!details && movie.genres?.length) entry.genres = movie.genres
        if (!details && typeof movie.runtime === 'number') entry.runtime = movie.runtime
        watchedMovies.value.push(entry)
      }

      try {
        await $fetch('/api/watched', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
          body: { tmdbId: movie.id },
        })
      } catch {
        if (!alreadyInState) {
          watchedMovies.value = watchedMovies.value.filter((m) => m.tmdbId !== movie.id)
        }
        return 'error'
      }

      await syncMyListAfterWatchingMovie(movie.id)
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
    removePendingMyListMovie(movie.id)

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
      const token = await resolveAccessToken(supabase, accessToken)

      if (!token) {
        return 0
      }

      let processedCount = 0
      const queueSnapshot = [...pendingWatchedMovies.value]

      for (const movie of queueSnapshot) {
        if (watchedMovies.value.some((s) => s.tmdbId === movie.id)) {
          await syncMyListAfterWatchingMovie(movie.id)
          removePendingWatchedMovie(movie.id)
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
              tmdbId: movie.id,
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

          await syncMyListAfterWatchingMovie(movie.id)
          removePendingWatchedMovie(movie.id)
          processedCount++
        } catch {
          // Keep processing the pending queue after a single failed insert.
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
