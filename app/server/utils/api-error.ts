import type { H3Event } from 'h3'

const INTERNAL_SERVER_ERROR_STATUS_CODE = 500
const BAD_GATEWAY_STATUS_CODE = 502
const SERVICE_UNAVAILABLE_STATUS_CODE = 503

type ErrorSource = 'supabase' | 'gemini' | 'tmdb' | 'import' | 'config' | 'unknown'

interface LogContext {
  event: string
  source: ErrorSource
  publicMessage: string
  statusCode?: number
  userId?: string
  route?: string
  method?: string
  tmdbId?: number
  extra?: Record<string, unknown>
}

interface PublicErrorOptions extends LogContext {
  cause: unknown
}

interface PrivateErrorLogOptions {
  cause: unknown
  event: string
  source: ErrorSource
  statusCode?: number
  route?: string
  method?: string
  userId?: string
  tmdbId?: number
  extra?: Record<string, unknown>
}

function toErrorDetails(cause: unknown): Record<string, unknown> {
  if (cause instanceof Error) {
    return {
      name: cause.name,
      message: cause.message,
      stack: cause.stack,
    }
  }

  if (typeof cause === 'object' && cause !== null) {
    const record = cause as Record<string, unknown>

    return {
      message: typeof record.message === 'string' ? record.message : 'Unknown error',
      statusCode: typeof record.statusCode === 'number' ? record.statusCode : undefined,
      code: typeof record.code === 'string' ? record.code : undefined,
      details: record.details,
      hint: record.hint,
    }
  }

  return {
    message: String(cause),
  }
}

function getRoute(event: H3Event): string {
  return event.path
}

function getMethod(event: H3Event): string {
  return event.method
}

export function logPrivateError(options: PrivateErrorLogOptions): void {
  const { cause, event, source, statusCode, route, method, userId, tmdbId, extra = {} } = options

  // eslint-disable-next-line no-console
  console.error(
    JSON.stringify({
      level: 'error',
      event,
      source,
      route,
      method,
      userId,
      tmdbId,
      statusCode,
      error: toErrorDetails(cause),
      extra,
      timestamp: new Date().toISOString(),
    })
  )
}

export function throwPublicError(event: H3Event, options: PublicErrorOptions): never {
  const {
    cause,
    event: eventName,
    source,
    publicMessage,
    statusCode = INTERNAL_SERVER_ERROR_STATUS_CODE,
    userId,
    route = getRoute(event),
    method = getMethod(event),
    tmdbId,
    extra = {},
  } = options

  logPrivateError({
    cause,
    event: eventName,
    source,
    route,
    method,
    userId,
    tmdbId,
    statusCode,
    extra,
  })

  throw createError({
    statusCode,
    statusMessage: publicMessage,
  })
}

export function throwSupabaseError(
  event: H3Event,
  cause: unknown,
  options: Omit<PublicErrorOptions, 'cause' | 'source'>
): never {
  return throwPublicError(event, {
    ...options,
    cause,
    source: 'supabase',
  })
}

export function throwGeminiError(
  event: H3Event,
  cause: unknown,
  options: Omit<PublicErrorOptions, 'cause' | 'source'>
): never {
  return throwPublicError(event, {
    ...options,
    cause,
    source: 'gemini',
    statusCode: options.statusCode ?? BAD_GATEWAY_STATUS_CODE,
  })
}

export function throwTmdbError(
  event: H3Event,
  cause: unknown,
  options: Omit<PublicErrorOptions, 'cause' | 'source'>
): never {
  return throwPublicError(event, {
    ...options,
    cause,
    source: 'tmdb',
    statusCode: options.statusCode ?? BAD_GATEWAY_STATUS_CODE,
  })
}

export function throwConfigError(
  event: H3Event,
  cause: unknown,
  options: Omit<PublicErrorOptions, 'cause' | 'source' | 'publicMessage'>
): never {
  return throwPublicError(event, {
    ...options,
    cause,
    source: 'config',
    statusCode: SERVICE_UNAVAILABLE_STATUS_CODE,
    publicMessage: 'Service is temporarily unavailable.',
  })
}

export function throwImportError(
  event: H3Event,
  cause: unknown,
  options: Omit<PublicErrorOptions, 'cause' | 'source'>
): never {
  return throwPublicError(event, {
    ...options,
    cause,
    source: 'import',
    statusCode: options.statusCode ?? BAD_GATEWAY_STATUS_CODE,
  })
}
