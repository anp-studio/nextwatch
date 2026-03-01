import { supabase } from './client'

export async function createUser(username) {
  const { data, error } = await supabase
    .from('users')
    .insert([{ username }])
    .select()
    .single()

  if (error) throw error
  return data
}

export async function getUserById(id) {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', id)
    .single()

  if (error) throw error
  return data
}