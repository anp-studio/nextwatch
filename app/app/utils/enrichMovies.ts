import { posterPath } from '~/utils/formatMovie'

interface EnrichableMovie {
  tmdbId: number
  genres?: string[]
  runtime?: number | null
  posterPath: string
}

interface PatchBody {
  tmdbId: number
  genres?: string[]
  runtime?: number | null
  posterPath?: string
}

export async function enrichAndPatchMovies<T extends EnrichableMovie>(
  movies: T[],
  token: string,
  endpoint: string,
  getMovieDetails: (tmdbId: number) => Promise<{ genres: string[]; runtime: number | null; poster: string }>
) {
  for (const movie of movies) {
    if (
      movie.genres &&
      movie.genres.length > 0 &&
      movie.runtime !== undefined &&
      movie.posterPath
    ) {
      continue
    }

    try {
      const details = await getMovieDetails(movie.tmdbId)
      const patch: PatchBody = { tmdbId: movie.tmdbId }

      if (!movie.genres || movie.genres.length === 0) {
        patch.genres = details.genres
        movie.genres = details.genres
      }
      if (movie.runtime === undefined) {
        patch.runtime = details.runtime
        movie.runtime = details.runtime
      }
      if (!movie.posterPath) {
        patch.posterPath = posterPath(details.poster)
        movie.posterPath = posterPath(details.poster)
      }

      await $fetch(endpoint, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` },
        body: patch,
      })
    } catch {
    }
  }
}
