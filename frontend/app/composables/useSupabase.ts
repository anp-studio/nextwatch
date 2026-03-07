import type { SupabaseClient } from '@supabase/supabase-js'

export const useSupabase = (): SupabaseClient => {
  return useNuxtApp().$supabase as SupabaseClient
}
