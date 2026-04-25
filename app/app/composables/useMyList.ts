import type {
  MyListMovie,
  MoviePreview,
  PendingMyListMovie,
  WatchedMovie,
} from '~/types/movie'
import { enrichAndPatchMovies } from '~/utils/enrichMovies'

const PENDING_MY_LIST_STORAGE_KEY = 'movie-recommender-pending-my-list'

const isPendingMyListMovie = (movie: unknown): movie is PendingMyListMovie => {
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

export const useMyList = () => {
  const supabase = useSupabase()

  const myList = useState<MyListMovie[]>('my-list', () => [])
  const watchedMovies = useState<WatchedMovie[]>('watched', () => [])
  const pendingMyListMovies = useState<PendingMyListMovie[]>('pending-my-list', () => [])

  const { load: loadPendingMyListFromStorage, persist: persistPendingMyListToStorage } =
    usePendingStorage(PENDING_MY_LIST_STORAGE_KEY, pendingMyListMovies, isPendingMyListMovie)

  const clearMyList = () => {
    myList.value = []
  }

  const syncMyListFromSupabase = async (accessToken?: string) => {
    try {
      const token = await resolveAccessToken(supabase, accessToken)

      if (!token) {
        myList.value = []
        return
      }

      const response = await $fetch<{ success: boolean; movies: MyListMovie[] }>('/api/mylist', {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      myList.value = response.movies

      const { getMovieDetails } = useMovieDetails()
      await enrichAndPatchMovies(myList.value, token, '/api/mylist', getMovieDetails)
    } catch {
    }
  }

  const addToMyList = async (
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

      const alreadyInState = myList.value.some((m) => m.tmdbId === movie.id)
      if (!alreadyInState) {
        const entry: MyListMovie = {
          tmdbId: movie.id,
          title: movie.title,
          year: movie.year,
          posterPath: path,
        }
        if (movie.genres?.length) entry.genres = movie.genres
        if (typeof movie.runtime === 'number') entry.runtime = movie.runtime
        myList.value.push(entry)
      }

      try {
        await $fetch('/api/mylist', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
          body: {
            movie: {
              tmdbId: movie.id,
              title: movie.title,
              year: movie.year,
              posterPath: path,
              ...(movie.genres?.length ? { genres: movie.genres } : {}),
              ...(typeof movie.runtime === 'number' ? { runtime: movie.runtime } : {}),
            },
          },
        })
      } catch {
        if (!alreadyInState) {
          myList.value = myList.value.filter((m) => m.tmdbId !== movie.id)
        }
        return 'error'
      }
    } catch {
      return 'error'
    }

    return 'ok'
  }

  const removeFromMyList = async (tmdbId: number): Promise<'ok' | 'unauthorized' | 'error'> => {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (!session?.access_token) {
        return 'unauthorized'
      }

      myList.value = myList.value.filter((m) => m.tmdbId !== tmdbId)

      await $fetch('/api/mylist', {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
        body: { tmdbId },
      })
    } catch {
      await syncMyListFromSupabase()
      return 'error'
    }

    return 'ok'
  }

  const queuePendingMyListMovie = (
    movie: Pick<MoviePreview, 'id' | 'title' | 'year' | 'poster'> & {
      genres?: string[]
      runtime?: number | null
    }
  ) => {
    if (pendingMyListMovies.value.some((pendingMovie) => pendingMovie.id === movie.id)) {
      return
    }

    const entry: PendingMyListMovie = {
      id: movie.id,
      title: movie.title,
      year: movie.year,
      posterPath: posterPath(movie.poster),
    }
    if (movie.genres?.length) entry.genres = movie.genres
    if (typeof movie.runtime === 'number') entry.runtime = movie.runtime

    pendingMyListMovies.value.push(entry)

    persistPendingMyListToStorage()
  }

  const removePendingMyListMovie = (movieId: number) => {
    pendingMyListMovies.value = pendingMyListMovies.value.filter((movie) => movie.id !== movieId)
    persistPendingMyListToStorage()
  }

  const processPendingMyListMovies = async (accessToken?: string): Promise<number> => {
    if (pendingMyListMovies.value.length === 0) {
      loadPendingMyListFromStorage()
    }

    if (pendingMyListMovies.value.length === 0) {
      return 0
    }

    try {
      const token = await resolveAccessToken(supabase, accessToken)

      if (!token) {
        return 0
      }

      let processedCount = 0
      const queueSnapshot = [...pendingMyListMovies.value]

      for (const movie of queueSnapshot) {
        const isAlreadyInMyList = myList.value.some((listMovie) => listMovie.tmdbId === movie.id)
        const isAlreadyWatched = watchedMovies.value.some(
          (watchedMovie) => watchedMovie.tmdbId === movie.id
        )

        if (isAlreadyInMyList || isAlreadyWatched) {
          removePendingMyListMovie(movie.id)
          processedCount++
          continue
        }

        try {
          await $fetch('/api/mylist', {
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
                ...(movie.genres?.length ? { genres: movie.genres } : {}),
                ...(typeof movie.runtime === 'number' ? { runtime: movie.runtime } : {}),
              },
            },
          })

          if (!myList.value.some((listMovie) => listMovie.tmdbId === movie.id)) {
            const entry: MyListMovie = {
              tmdbId: movie.id,
              title: movie.title,
              year: movie.year,
              posterPath: movie.posterPath,
            }
            if (movie.genres?.length) entry.genres = movie.genres
            if (typeof movie.runtime === 'number') entry.runtime = movie.runtime
            myList.value.push(entry)
          }

          removePendingMyListMovie(movie.id)
          processedCount++
        } catch {
        }
      }

      return processedCount
    } catch {
      return 0
    }
  }

  return {
    myList,
    pendingMyListMovies,
    addToMyList,
    removeFromMyList,
    queuePendingMyListMovie,
    removePendingMyListMovie,
    processPendingMyListMovies,
    syncMyListFromSupabase,
    clearMyList,
  }
}
