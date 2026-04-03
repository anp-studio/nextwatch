export type { Movie, MoviePreview } from '~/types/movie'

export const useMovies = () => {
  const { IMAGE_BASE, getPopularMovies, getMovieDetails } = useMovieDetails()
  const {
    watchedMovies,
    pendingWatchedMovies,
    markAsWatched,
    unmarkAsWatched,
    queuePendingWatchedMovie,
    processPendingWatchedMovies,
    syncWatchedMoviesFromSupabase,
    clearWatchedMovies,
  } = useWatchedMovies()

  return {
    IMAGE_BASE,
    getPopularMovies,
    getMovieDetails,
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
