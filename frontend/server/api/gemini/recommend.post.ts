import { getAuthorizedUser } from '../../utils/auth'
import {
  fetchWatchedMovies,
  getRecommendationsFromGemini,
} from '../../utils/recommendations'

const MAX_WATCHED_FOR_PROMPT = 50

interface RecommendBody {
  movies?: Array<{ id: number; title: string; year: number }>
}

interface WatchedMovieRecord {
  tmdbId: number
  title: string
  year: number
}

function mergeMovieLists(
  supabaseMovies: WatchedMovieRecord[],
  localMovies: Array<{ id: number; title: string; year: number }>
): Array<{ title: string; year: number }> {
  const seenIds = new Set(supabaseMovies.map((m) => m.tmdbId))
  const merged = supabaseMovies.map(({ title, year }) => ({ title, year }))

  for (const movie of localMovies) {
    if (!seenIds.has(movie.id)) {
      merged.push({ title: movie.title, year: movie.year })
    }
  }

  return merged
}

export default defineEventHandler(async (event) => {
  const { supabase, user } = await getAuthorizedUser(event)
  const body = (await readBody<RecommendBody>(event)) ?? {}

  const supabaseMovies = await fetchWatchedMovies(supabase, user.id)
  const localMovies = body.movies ?? []
  const watchedMovies = mergeMovieLists(supabaseMovies, localMovies)

  if (watchedMovies.length === 0) {
    throw createError({
      statusCode: 400,
      statusMessage: 'No watched movies found. Watch some movies first.',
    })
  }

  const recommendations = await getRecommendationsFromGemini(
    watchedMovies.slice(0, MAX_WATCHED_FOR_PROMPT)
  )

  return { recommendations }
})
