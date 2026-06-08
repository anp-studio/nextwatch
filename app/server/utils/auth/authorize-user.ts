import type { SupabaseClient, User } from '@supabase/supabase-js'
import type { H3Event } from 'h3'
import { createAuthorizedSupabaseClient } from '../shared/supabase-client'

export interface AuthorizedUser {
  supabase: SupabaseClient
  user: User
}

export async function getAuthorizedUser(event: H3Event): Promise<AuthorizedUser> {
  const authHeader = getHeader(event, 'authorization')

  if (!authHeader?.startsWith('Bearer ')) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

  const token = authHeader.slice('Bearer '.length)
  const supabase = createAuthorizedSupabaseClient(event, token)

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser(token)

  if (error || !user) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

  return { supabase, user }
}
