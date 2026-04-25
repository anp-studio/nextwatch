import { getAuthorizedUser } from '../../utils/auth'

interface MyListMovie {
  tmdbId: number
  title: string
  year: number
  posterPath: string
  genres?: string[]
  runtime?: number | null
}

interface MyListBody {
  movie?: Partial<MyListMovie>
}

interface MyListPatchBody {
  tmdbId?: number
  genres?: string[]
  runtime?: number | null
  posterPath?: string
  title?: string
  year?: number
}

export default defineEventHandler(async (event) => {
  const method = event.method
  const { supabase, user } = await getAuthorizedUser(event)

  if (method === 'GET') {
    const { data: existing, error: selectError } = await supabase
      .from('my_list_movies')
      .select('movies')
      .eq('user_id', user.id)
      .limit(1)
      .maybeSingle()

    if (selectError) {
      throw createError({ statusCode: 500, statusMessage: selectError.message })
    }

    const myList = Array.isArray(existing?.movies) ? (existing.movies as MyListMovie[]) : []

    return {
      success: true,
      movies: myList,
    }
  }

  if (method === 'POST') {
    const body = await readBody<MyListBody>(event)
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
      .from('my_list_movies')
      .select('movies')
      .eq('user_id', user.id)
      .limit(1)
      .maybeSingle()

    if (selectError) {
      throw createError({ statusCode: 500, statusMessage: selectError.message })
    }

    const myList = Array.isArray(existing?.movies) ? (existing.movies as MyListMovie[]) : []

    const alreadyInList = myList.some((listMovie) => listMovie.tmdbId === movie.tmdbId)

    if (!alreadyInList) {
      const entry: MyListMovie = {
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
      myList.push(entry)
    }

    const updatedAt = new Date().toISOString()

    if (existing) {
      const { error: updateError } = await supabase
        .from('my_list_movies')
        .update({
          movies: myList,
          updated_at: updatedAt,
        })
        .eq('user_id', user.id)

      if (updateError) {
        throw createError({ statusCode: 500, statusMessage: updateError.message })
      }
    } else {
      const { error: insertError } = await supabase.from('my_list_movies').insert({
        user_id: user.id,
        movies: myList,
        updated_at: updatedAt,
      })

      if (insertError) {
        throw createError({ statusCode: 500, statusMessage: insertError.message })
      }
    }

    return {
      success: true,
      myListCount: myList.length,
    }
  }

  if (method === 'DELETE') {
    const body = await readBody<{ tmdbId?: number }>(event)

    if (typeof body.tmdbId !== 'number') {
      throw createError({ statusCode: 400, statusMessage: 'Invalid tmdbId' })
    }

    const { data: existing, error: selectError } = await supabase
      .from('my_list_movies')
      .select('movies')
      .eq('user_id', user.id)
      .limit(1)
      .maybeSingle()

    if (selectError) {
      throw createError({ statusCode: 500, statusMessage: selectError.message })
    }

    if (!existing) {
      return {
        success: true,
        myListCount: 0,
      }
    }

    const myList = Array.isArray(existing.movies) ? (existing.movies as MyListMovie[]) : []
    const filtered = myList.filter((m) => m.tmdbId !== body.tmdbId)

    const { error: updateError } = await supabase
      .from('my_list_movies')
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
      myListCount: filtered.length,
    }
  }

  if (method === 'PATCH') {
    const body = await readBody<MyListPatchBody>(event)

    if (typeof body.tmdbId !== 'number') {
      throw createError({ statusCode: 400, statusMessage: 'Invalid tmdbId' })
    }

    const { data: existing, error: selectError } = await supabase
      .from('my_list_movies')
      .select('movies')
      .eq('user_id', user.id)
      .limit(1)
      .maybeSingle()

    if (selectError) {
      throw createError({ statusCode: 500, statusMessage: selectError.message })
    }

    if (!existing) {
      throw createError({ statusCode: 404, statusMessage: 'No list found' })
    }

    const myList = Array.isArray(existing.movies) ? (existing.movies as MyListMovie[]) : []
    const updated = myList.map((m) => {
      if (m.tmdbId !== body.tmdbId) return m
      const patched = { ...m }
      if (Array.isArray(body.genres)) patched.genres = body.genres
      if (body.runtime !== undefined) patched.runtime = body.runtime
      if (body.posterPath) patched.posterPath = body.posterPath
      if (body.title) patched.title = body.title
      if (typeof body.year === 'number') patched.year = body.year
      return patched
    })

    const { error: updateError } = await supabase
      .from('my_list_movies')
      .update({ movies: updated, updated_at: new Date().toISOString() })
      .eq('user_id', user.id)

    if (updateError) {
      throw createError({ statusCode: 500, statusMessage: updateError.message })
    }

    return { success: true }
  }

  throw createError({ statusCode: 405, statusMessage: 'Method Not Allowed' })
})
