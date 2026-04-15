import { getAuthorizedUser } from '../../utils/auth'

interface WatchedMovie {
  tmdbId: number
  title: string
  year: number
  posterPath: string
  genres?: string[]
  runtime?: number | null
}

interface WatchBody {
  movie?: Partial<WatchedMovie>
}

export default defineEventHandler(async (event) => {
  const method = event.method
  const { supabase, user } = await getAuthorizedUser(event)

  if (method === 'GET') {
    const { data: existing, error: selectError } = await supabase
      .from('watched_movies')
      .select('movies')
      .eq('user_id', user.id)
      .limit(1)
      .maybeSingle()

    if (selectError) {
      throw createError({ statusCode: 500, statusMessage: selectError.message })
    }

    const watchedMovies = Array.isArray(existing?.movies) ? (existing.movies as WatchedMovie[]) : []

    return {
      success: true,
      movies: watchedMovies,
    }
  }

  if (method === 'POST') {
    const body = await readBody<WatchBody>(event)
    const movie = body.movie

    if (
      !movie ||
      typeof movie.tmdbId !== 'number' ||
      !movie.title ||
      typeof movie.year !== 'number' ||
      typeof movie.posterPath !== 'string'
    ) {
      throw createError({ statusCode: 400, statusMessage: 'Invalid movie payload' })
    }

    const { data: existing, error: selectError } = await supabase
      .from('watched_movies')
      .select('movies')
      .eq('user_id', user.id)
      .limit(1)
      .maybeSingle()

    if (selectError) {
      throw createError({ statusCode: 500, statusMessage: selectError.message })
    }

    const watchedMovies = Array.isArray(existing?.movies) ? (existing.movies as WatchedMovie[]) : []

    const alreadyWatched = watchedMovies.some(
      (watchedMovie) => watchedMovie.tmdbId === movie.tmdbId
    )

    if (!alreadyWatched) {
      const entry: WatchedMovie = {
        tmdbId: movie.tmdbId,
        title: movie.title,
        year: movie.year,
        posterPath: movie.posterPath,
      }
      if (Array.isArray(movie.genres) && movie.genres.length > 0) {
        entry.genres = movie.genres
      }
      if (typeof movie.runtime === 'number') {
        entry.runtime = movie.runtime
      }
      watchedMovies.push(entry)
    }

    const updatedAt = new Date().toISOString()

    if (existing) {
      const { error: updateError } = await supabase
        .from('watched_movies')
        .update({
          movies: watchedMovies,
          updated_at: updatedAt,
        })
        .eq('user_id', user.id)

      if (updateError) {
        throw createError({ statusCode: 500, statusMessage: updateError.message })
      }
    } else {
      const { error: insertError } = await supabase.from('watched_movies').insert({
        user_id: user.id,
        movies: watchedMovies,
        updated_at: updatedAt,
      })

      if (insertError) {
        throw createError({ statusCode: 500, statusMessage: insertError.message })
      }
    }

    return {
      success: true,
      watchedCount: watchedMovies.length,
    }
  }

  if (method === 'DELETE') {
    const body = await readBody<{ tmdbId?: number }>(event)

    if (typeof body.tmdbId !== 'number') {
      throw createError({ statusCode: 400, statusMessage: 'Invalid tmdbId' })
    }

    const { data: existing, error: selectError } = await supabase
      .from('watched_movies')
      .select('movies')
      .eq('user_id', user.id)
      .limit(1)
      .maybeSingle()

    if (selectError) {
      throw createError({ statusCode: 500, statusMessage: selectError.message })
    }

    if (!existing) {
      throw createError({ statusCode: 404, statusMessage: 'No watched movies found' })
    }

    const watchedMovies = Array.isArray(existing.movies) ? (existing.movies as WatchedMovie[]) : []
    const filtered = watchedMovies.filter((m) => m.tmdbId !== body.tmdbId)

    const { error: updateError } = await supabase
      .from('watched_movies')
      .update({
        movies: filtered,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', user.id)

    if (updateError) {
      throw createError({ statusCode: 500, statusMessage: updateError.message })
    }

    return {
      success: true,
      watchedCount: filtered.length,
    }
  }

  throw createError({ statusCode: 405, statusMessage: 'Method Not Allowed' })
})
