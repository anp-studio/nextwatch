import { createClient } from '@supabase/supabase-js'

interface WatchedMovie {
  tmdbId: number
  title: string
  year: number
}

interface WatchBody {
  movie?: Partial<WatchedMovie>
}

const getAuthorizedUser = async (event: Parameters<typeof defineEventHandler>[0]) => {
  const config = useRuntimeConfig(event)
  const authHeader = getHeader(event, 'authorization')

  if (!authHeader?.startsWith('Bearer ')) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

  const token = authHeader.slice('Bearer '.length)

  const supabase = createClient(
    config.public.supabaseUrl as string,
    config.public.supabaseKey as string,
    {
      global: {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    }
  )

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser(token)

  if (userError || !user) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

  return { supabase, user }
}

export default defineEventHandler(async (event) => {
  const method = getMethod(event)
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

    const watchedMovies = Array.isArray(existing?.movies)
      ? (existing.movies as WatchedMovie[])
      : []

    return {
      success: true,
      movies: watchedMovies,
    }
  }

  if (method === 'POST') {
    const body = await readBody<WatchBody>(event)
    const movie = body.movie

    if (!movie || typeof movie.tmdbId !== 'number' || !movie.title || typeof movie.year !== 'number') {
      throw createError({ statusCode: 400, statusMessage: 'Invalid movie payload' })
    }

    const { data: existing, error: selectError } = await supabase
      .from('watched_movies')
      .select('id,movies')
      .eq('user_id', user.id)
      .limit(1)
      .maybeSingle()

    if (selectError) {
      throw createError({ statusCode: 500, statusMessage: selectError.message })
    }

    const watchedMovies = Array.isArray(existing?.movies)
      ? (existing.movies as WatchedMovie[])
      : []

    const alreadyWatched = watchedMovies.some((watchedMovie) => watchedMovie.tmdbId === movie.tmdbId)

    if (!alreadyWatched) {
      watchedMovies.push({
        tmdbId: movie.tmdbId,
        title: movie.title,
        year: movie.year,
      })
    }

    const updatedAt = new Date().toISOString()

    if (existing?.id) {
      const { error: updateError } = await supabase
        .from('watched_movies')
        .update({
          movies: watchedMovies,
          updated_at: updatedAt,
        })
        .eq('id', existing.id)

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

  throw createError({ statusCode: 405, statusMessage: 'Method Not Allowed' })
})
