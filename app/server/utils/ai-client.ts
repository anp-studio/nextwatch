import type { H3Event } from 'h3'
import OpenAI from 'openai'
import { logPrivateError, throwConfigError } from './api-error'
import { recommendationLimiter, RECOMMENDATION_LIMIT } from './ratelimit'

const GOOGLE_AI_STUDIO_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta/openai/'
const OPENROUTER_BASE_URL = 'https://openrouter.ai/api/v1'
const GENERATE_RECOMMENDATIONS_MESSAGE = 'Unable to generate recommendations right now.'

export interface PlatformAiRequest {
  systemPrompt: string
  userMessage: string
  schema?: Record<string, unknown>
  schemaName?: string
  userId?: string
  event?: H3Event
}

interface PlatformAiProviderConfig {
  provider: 'google' | 'openrouter'
  baseUrl: string
  apiKey: string
  models: string[]
  defaultHeaders?: Record<string, string>
}

interface PlatformAiConfig {
  googleApiKey: string
  googleModels: string
  openRouterApiKey: string
  openRouterModels: string
}

export function parseProviderModels(value: string): string[] {
  return value
    .split(',')
    .map((model) => model.trim())
    .filter((model) => model.length > 0)
}

function createOpenAIClient(config: PlatformAiProviderConfig) {
  return new OpenAI({
    apiKey: config.apiKey,
    baseURL: config.baseUrl,
    defaultHeaders: config.defaultHeaders,
  })
}

export function createPlatformAiProviderConfig(
  platformAiConfig: PlatformAiConfig
): PlatformAiProviderConfig[] {
  const providers: PlatformAiProviderConfig[] = []
  const googleModels = parseProviderModels(platformAiConfig.googleModels)
  const openRouterModels = parseProviderModels(platformAiConfig.openRouterModels)

  if (platformAiConfig.googleApiKey.length && googleModels.length > 0) {
    providers.push({
      provider: 'google',
      baseUrl: GOOGLE_AI_STUDIO_BASE_URL,
      apiKey: platformAiConfig.googleApiKey,
      models: googleModels,
    })
  }

  if (platformAiConfig.openRouterApiKey.length && openRouterModels.length > 0) {
    providers.push({
      provider: 'openrouter',
      baseUrl: OPENROUTER_BASE_URL,
      apiKey: platformAiConfig.openRouterApiKey,
      models: openRouterModels,
    })
  }

  return providers
}

function getPlatformAiProviderConfig(event?: H3Event, userId?: string): PlatformAiProviderConfig[] {
  const config = useRuntimeConfig()
  const providers = createPlatformAiProviderConfig({
    googleApiKey: config.googleApiKey || process.env.NUXT_GOOGLE_API_KEY || '',
    googleModels: config.googleModels || process.env.NUXT_GOOGLE_MODELS || '',
    openRouterApiKey: config.openRouterApiKey || process.env.NUXT_OPENROUTER_API_KEY || '',
    openRouterModels: config.openRouterModels || process.env.NUXT_OPENROUTER_MODELS || '',
  })

  if (providers.length === 0) {
    const cause = new Error('Missing platform AI provider configuration')

    if (event) {
      throwConfigError(event, cause, {
        event: 'recommendation.ai_provider_misconfigured',
        userId,
      })
    }

    logPrivateError({
      cause,
      event: 'recommendation.ai_provider_misconfigured',
      source: 'config',
      statusCode: 503,
      userId,
    })

    throw createError({
      statusCode: 503,
      statusMessage: 'Service is temporarily unavailable.',
    })
  }

  return providers
}

function getProviderErrorStatusCode(error: unknown): number | null {
  if (!error || typeof error !== 'object') {
    return null
  }

  const status = (error as { status?: number }).status

  if (typeof status === 'number' && status >= 400 && status < 600) {
    return status
  }

  return null
}

function createProviderError(error: unknown): Error {
  const statusCode = getProviderErrorStatusCode(error)

  return createError({
    statusCode: statusCode === 429 ? 429 : 502,
    statusMessage: GENERATE_RECOMMENDATIONS_MESSAGE,
  })
}

async function createChatCompletion(
  provider: PlatformAiProviderConfig,
  model: string,
  request: PlatformAiRequest
): Promise<string> {
  try {
    const completion = await createOpenAIClient(provider).chat.completions.create({
      model,
      messages: [
        {
          role: 'system',
          content: request.systemPrompt,
        },
        {
          role: 'user',
          content: request.userMessage,
        },
      ],
      temperature: 0.4,
      ...(request.schema && {
        response_format: {
          type: 'json_schema',
          json_schema: {
            name: request.schemaName || 'structured_response',
            strict: true,
            schema: request.schema,
          },
        },
      }),
    })

    const content = completion.choices[0]?.message?.content

    if (!content) {
      throw createError({
        statusCode: 502,
        statusMessage: GENERATE_RECOMMENDATIONS_MESSAGE,
      })
    }

    return content
  } catch (error) {
    throw createProviderError(error)
  }
}

export async function askPlatformAi(request: PlatformAiRequest): Promise<string> {
  const providers = getPlatformAiProviderConfig(request.event, request.userId)

  if (request.userId) {
    const { success, remaining, reset } = await recommendationLimiter.limit(request.userId)

    if (request.event) {
      request.event.node.res.setHeader('X-RateLimit-Limit', RECOMMENDATION_LIMIT.toString())
      request.event.node.res.setHeader('X-RateLimit-Remaining', remaining.toString())
      request.event.node.res.setHeader('X-RateLimit-Reset', reset.toString())
    }

    if (!success) {
      throw createError({
        statusCode: 429,
        statusMessage: 'Rate limit exceeded. Please try again later.',
      })
    }
  }

  let lastError: unknown = null

  for (const provider of providers) {
    for (const model of provider.models) {
      try {
        return await createChatCompletion(provider, model, request)
      } catch (error) {
        lastError = error
      }
    }
  }

  if (lastError) {
    throw lastError
  }

  throw createError({
    statusCode: 503,
    statusMessage: 'Service is temporarily unavailable.',
  })
}
