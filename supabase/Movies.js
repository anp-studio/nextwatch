import { supabase } from './client'

export async function getAllMovies() {
  const { data, error } = await supabase
    .from('movies')
    .select('*')

  if (error) throw error
  return data
}

export async function getMovieById(id) {
  const { data, error } = await supabase
    .from('movies')
    .select('*')
    .eq('id', id)
    .single()

  if (error) throw error
  return data
}