import { supabase } from './client'

export async function markAsWatched(userId, movieId, rating) {
  const { data, error } = await supabase
    .from('watch_history')
    .upsert([
      {
        user_id: userId,
        movie_id: movieId,
        user_rating: rating
      }
    ])

  if (error) throw error
  return data
}

export async function getWatchedMovies(userId) {
  const { data, error } = await supabase
    .from('watch_history')
    .select(`
      user_rating,
      movies (
        id,
        title,
        genre
      )
    `)
    .eq('user_id', userId)

  if (error) throw error
  return data
}