import { createClient } from '@supabase/supabase-js'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { H3Event } from 'h3'
import { throwConfigError } from './api-error'

const SUPABASE_AUTH_OPTIONS = {
  persistSession: false,
  autoRefreshToken: false,
}

interface PublicSupabaseClientOptions {
  misconfiguredEvent: string
  authorizationToken?: string
}

export function createSupabaseServerClient(
  supabaseUrl: string,
  supabaseKey: string,
  authorizationToken?: string
): SupabaseClient {
  if (authorizationToken) {
    return createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: `Bearer ${authorizationToken}` } },
      auth: SUPABASE_AUTH_OPTIONS,
    })
  }

  return createClient(supabaseUrl, supabaseKey, {
    auth: SUPABASE_AUTH_OPTIONS,
  })
}

export function createPublicSupabaseClient(
  event: H3Event,
  options: PublicSupabaseClientOptions
): SupabaseClient {
  const config = useRuntimeConfig(event)
  const { supabaseUrl, supabaseKey } = config.public

  if (!supabaseUrl || !supabaseKey) {
    throwConfigError(event, new Error('Missing Supabase public configuration'), {
      event: options.misconfiguredEvent,
    })
  }

  return createSupabaseServerClient(supabaseUrl, supabaseKey, options.authorizationToken)
}

export function createAuthorizedSupabaseClient(event: H3Event, token: string): SupabaseClient {
  return createPublicSupabaseClient(event, {
    misconfiguredEvent: 'auth.public_supabase_misconfigured',
    authorizationToken: token,
  })
}

export function createServiceSupabaseClient(
  event: H3Event,
  misconfiguredEvent = 'auth.service_supabase_misconfigured'
): SupabaseClient {
  const config = useRuntimeConfig(event)
  const { supabaseUrl } = config.public
  const serviceRoleKey = config.supabaseServiceRoleKey

  if (!supabaseUrl || !serviceRoleKey) {
    throwConfigError(event, new Error('Missing Supabase service role configuration'), {
      event: misconfiguredEvent,
    })
  }

  return createSupabaseServerClient(supabaseUrl, serviceRoleKey)
}
