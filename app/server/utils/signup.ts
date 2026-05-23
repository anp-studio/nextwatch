import { createClient } from '@supabase/supabase-js'
import type { Session, SupabaseClient, User } from '@supabase/supabase-js'
import type { H3Event } from 'h3'
import { throwConfigError, throwSupabaseError } from './api-error'
import { createServiceSupabaseClient } from './auth'

export const EMAIL_ALREADY_REGISTERED_CODE = 'EMAIL_ALREADY_REGISTERED'

const AUTH_EMAIL_EXISTS_RPC = 'auth_email_exists'
const MIN_PASSWORD_LENGTH = 6
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const VALIDATION_STATUS_CODE = 400
const CONFLICT_STATUS_CODE = 409
const SIGNUP_FAILED_MESSAGE = 'Unable to create account.'
const CAPTCHA_REQUIRED_MESSAGE = 'Captcha verification is required.'

export interface SignupPayload {
  email: string
  password: string
  username: string
  captchaToken: string
}

export interface SignupResult {
  user: User | null
  session: Session | null
}

export interface EmailAlreadyRegisteredError extends Error {
  code: typeof EMAIL_ALREADY_REGISTERED_CODE
}

interface SignupRequestBody {
  email?: unknown
  password?: unknown
  username?: unknown
  captchaToken?: unknown
}

function isSignupRequestBody(body: unknown): body is SignupRequestBody {
  return typeof body === 'object' && body !== null
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase()
}

function requireStringField(body: SignupRequestBody, field: keyof SignupRequestBody): string {
  const value = body[field]

  if (typeof value !== 'string') {
    throw createError({
      statusCode: VALIDATION_STATUS_CODE,
      statusMessage: `${field} is required.`,
    })
  }

  return value.trim()
}

export function validateSignupPayload(body: unknown): SignupPayload {
  if (!isSignupRequestBody(body)) {
    throw createError({
      statusCode: VALIDATION_STATUS_CODE,
      statusMessage: 'Request body is required.',
    })
  }

  const email = normalizeEmail(requireStringField(body, 'email'))
  const password = requireStringField(body, 'password')
  const username = requireStringField(body, 'username')
  const captchaToken = requireStringField(body, 'captchaToken')

  // supabase will fail regardles but it is better to catch these common issues early and return a clear error message
  if (!EMAIL_PATTERN.test(email)) {
    throw createError({
      statusCode: VALIDATION_STATUS_CODE,
      statusMessage: 'Email is invalid.',
    })
  }

  if (password.length < MIN_PASSWORD_LENGTH) {
    throw createError({
      statusCode: VALIDATION_STATUS_CODE,
      statusMessage: `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`,
    })
  }

  if (!username) {
    throw createError({
      statusCode: VALIDATION_STATUS_CODE,
      statusMessage: 'Username is required.',
    })
  }

  if (!captchaToken) {
    throw createError({
      statusCode: VALIDATION_STATUS_CODE,
      statusMessage: CAPTCHA_REQUIRED_MESSAGE,
    })
  }

  return {
    email,
    password,
    username,
    captchaToken,
  }
}

export async function verifySignupCaptcha(captchaToken: string): Promise<void> {
  if (!captchaToken.trim()) {
    throw createError({
      statusCode: VALIDATION_STATUS_CODE,
      statusMessage: CAPTCHA_REQUIRED_MESSAGE,
    })
  }
}

function createSignupSupabaseClient(event: H3Event): SupabaseClient {
  const config = useRuntimeConfig(event)
  const { supabaseUrl, supabaseKey } = config.public

  if (!supabaseUrl || !supabaseKey) {
    throwConfigError(event, new Error('Missing Supabase public configuration'), {
      event: 'signup.public_supabase_misconfigured',
    })
  }

  return createClient(supabaseUrl, supabaseKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  })
}

export async function checkAuthEmailExists(event: H3Event, email: string): Promise<boolean> {
  const supabase = createServiceSupabaseClient(event)
  const { data, error } = await supabase.rpc(AUTH_EMAIL_EXISTS_RPC, {
    target_email: normalizeEmail(email),
  })

  if (error) {
    throwSupabaseError(event, error, {
      event: 'signup.email_exists_check_failed',
      publicMessage: SIGNUP_FAILED_MESSAGE,
      extra: {
        rpc: AUTH_EMAIL_EXISTS_RPC,
      },
    })
  }

  return data === true
}

export function createEmailAlreadyRegisteredError(): EmailAlreadyRegisteredError {
  const error = createError({
    statusCode: CONFLICT_STATUS_CODE,
    statusMessage: 'Email is already registered.',
    data: {
      code: EMAIL_ALREADY_REGISTERED_CODE,
    },
  }) as unknown as EmailAlreadyRegisteredError

  error.code = EMAIL_ALREADY_REGISTERED_CODE

  return error
}

export async function signupWithSupabase(
  event: H3Event,
  payload: SignupPayload
): Promise<SignupResult> {
  const supabase = createSignupSupabaseClient(event)
  const { data, error } = await supabase.auth.signUp({
    email: payload.email,
    password: payload.password,
    options: {
      data: {
        full_name: payload.username,
      },
    },
  })

  if (error) {
    throwSupabaseError(event, error, {
      event: 'signup.supabase_signup_failed',
      publicMessage: SIGNUP_FAILED_MESSAGE,
    })
  }

  return {
    user: data.user,
    session: data.session,
  }
}
