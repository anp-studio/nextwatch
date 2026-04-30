import { createClient } from '@supabase/supabase-js'
import type { SupabaseClient, User } from '@supabase/supabase-js'
import type { H3Event } from 'h3'
import { throwConfigError } from './api-error'

export interface AuthorizedUser {
  supabase: SupabaseClient
  user: User
}

export async function getAuthorizedUser(event: H3Event): Promise<AuthorizedUser> {
  const config = useRuntimeConfig(event)
  const { supabaseUrl, supabaseKey } = config.public

  if (!supabaseUrl || !supabaseKey) {
    throwConfigError(event, new Error('Missing Supabase public configuration'), {
      event: 'auth.public_supabase_misconfigured',
    })
  }

  const authHeader = getHeader(event, 'authorization')

  if (!authHeader?.startsWith('Bearer ')) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

  const token = authHeader.slice('Bearer '.length)

  const supabase = createClient(supabaseUrl, supabaseKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  })

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser(token)

  if (error || !user) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

  return { supabase, user }
}

export function createServiceSupabaseClient(event: H3Event): SupabaseClient {
  const config = useRuntimeConfig(event)
  const { supabaseUrl } = config.public
  const serviceRoleKey = config.supabaseServiceRoleKey

  if (!supabaseUrl || !serviceRoleKey) {
    throwConfigError(event, new Error('Missing Supabase service role configuration'), {
      event: 'auth.service_supabase_misconfigured',
    })
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  })
}
