import type { H3Event } from 'h3'
import { GENERATE_RECOMMENDATIONS_MESSAGE } from './constants'
import type {
  InitialModelRecommendation,
  Recommendation,
  ReplacementModelRecommendation,
} from './types'
import { RECOMMENDATION_RESPONSE_SCHEMA, REPLACEMENT_RESPONSE_SCHEMA } from './prompts'
import { logPrivateError, throwAiProviderError } from '../shared/api-error'

const AI_RESPONSE_LOG_PREVIEW_LENGTH = 8000

interface RecommendationObjectResponse {
  recommendations: unknown
}

function throwPlatformAiRecommendationError(
  cause: unknown,
  logEvent: string,
  context: {
    event?: H3Event
    userId?: string
    statusCode: number
    extra?: Record<string, unknown>
  }
): never {
  const { event, userId, statusCode, extra } = context

  if (event) {
    throwAiProviderError(event, cause, {
      event: logEvent,
      userId,
      publicMessage: GENERATE_RECOMMENDATIONS_MESSAGE,
      statusCode,
      extra,
    })
  }

  logPrivateError({
    cause,
    event: logEvent,
    source: 'ai_provider',
    statusCode,
    userId,
    extra,
  })

  throw createError({
    statusCode,
    statusMessage: GENERATE_RECOMMENDATIONS_MESSAGE,
  })
}

export function isRecommendationArray(value: unknown): value is Recommendation[] {
  return (
    Array.isArray(value) &&
    value.every(
      (item) =>
        typeof item === 'object' &&
        item !== null &&
        typeof (item as Record<string, unknown>).name === 'string' &&
        typeof (item as Record<string, unknown>).originalName === 'string' &&
        (typeof (item as Record<string, unknown>).year === 'number' ||
          (item as Record<string, unknown>).year === null)
    )
  )
}

function isKnownOrUnknownYear(value: unknown): value is number | null {
  return typeof value === 'number' || value === null
}

function isInitialModelRecommendationArray(value: unknown): value is InitialModelRecommendation[] {
  return (
    Array.isArray(value) &&
    value.every((item) => {
      if (typeof item !== 'object' || item === null) {
        return false
      }

      const record = item as Record<string, unknown>
      return (
        typeof record.index === 'number' &&
        Number.isInteger(record.index) &&
        typeof record.title === 'string' &&
        isKnownOrUnknownYear(record.release_year)
      )
    })
  )
}

function isReplacementModelRecommendationArray(
  value: unknown
): value is ReplacementModelRecommendation[] {
  return (
    Array.isArray(value) &&
    value.every((item) => {
      if (typeof item !== 'object' || item === null) {
        return false
      }

      const record = item as Record<string, unknown>
      return (
        typeof record.replaced_index === 'number' &&
        Number.isInteger(record.replaced_index) &&
        typeof record.title === 'string' &&
        isKnownOrUnknownYear(record.release_year)
      )
    })
  )
}

function isRecommendationObjectResponse(value: unknown): value is RecommendationObjectResponse {
  return typeof value === 'object' && value !== null && 'recommendations' in value
}

function normalizeRecommendationPayload(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value
  }

  if (isRecommendationObjectResponse(value)) {
    return value.recommendations
  }

  return value
}

function createParseFailureLogExtra(
  raw: string,
  responseSchema: Record<string, unknown>,
  responseSchemaName: string
): Record<string, unknown> {
  return {
    providedResponse: raw.slice(0, AI_RESPONSE_LOG_PREVIEW_LENGTH),
    providedResponseLength: raw.length,
    providedResponseTruncated: raw.length > AI_RESPONSE_LOG_PREVIEW_LENGTH,
    expectedResponseSchemaName: responseSchemaName,
    expectedResponseSchema: responseSchema,
  }
}

function parseJsonRecommendationResponse(
  raw: string,
  responseSchema: Record<string, unknown>,
  responseSchemaName: string,
  userId?: string,
  event?: H3Event
): unknown {
  let parsed: unknown

  try {
    parsed = JSON.parse(raw)
  } catch (error) {
    throwPlatformAiRecommendationError(error, 'recommendation.ai_provider_parse_failed', {
      event,
      userId,
      statusCode: 502,
      extra: createParseFailureLogExtra(raw, responseSchema, responseSchemaName),
    })
  }

  return normalizeRecommendationPayload(parsed)
}

function throwRecommendationSchemaError(userId?: string, event?: H3Event): never {
  throwPlatformAiRecommendationError(
    new Error('AI provider response did not match the expected recommendation schema.'),
    'recommendation.ai_provider_schema_failed',
    {
      event,
      userId,
      statusCode: 502,
    }
  )
}

export function parseInitialRecommendationResponse(
  raw: string,
  userId?: string,
  event?: H3Event
): InitialModelRecommendation[] {
  const normalized = parseJsonRecommendationResponse(
    raw,
    RECOMMENDATION_RESPONSE_SCHEMA,
    'movie_recommendations',
    userId,
    event
  )

  if (!isInitialModelRecommendationArray(normalized)) {
    throwRecommendationSchemaError(userId, event)
  }

  return normalized
}

export function parseReplacementRecommendationResponse(
  raw: string,
  userId?: string,
  event?: H3Event
): ReplacementModelRecommendation[] {
  const normalized = parseJsonRecommendationResponse(
    raw,
    REPLACEMENT_RESPONSE_SCHEMA,
    'movie_recommendation_replacements',
    userId,
    event
  )

  if (!isReplacementModelRecommendationArray(normalized)) {
    throwRecommendationSchemaError(userId, event)
  }

  return normalized
}
