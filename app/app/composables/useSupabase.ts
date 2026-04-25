import type { SupabaseClient } from '@supabase/supabase-js'

export const useSupabase = (): SupabaseClient => {
  return useNuxtApp().$supabase as SupabaseClient
}

export async function resolveAccessToken(
  supabase: SupabaseClient,
  provided?: string
): Promise<string | undefined> {
  if (provided) return provided
  const { data: { session } } = await supabase.auth.getSession()
  return session?.access_token
}
