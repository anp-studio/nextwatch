import { GoogleGenerativeAI } from '@google/generative-ai'
import type { Schema } from '@google/generative-ai'
import type { H3Event } from 'h3'
import { createRateLimiter, RECOMMENDATION_LIMIT } from './ratelimit'

const GEMINI_DEFAULT_MODEL = 'gemini-flash-lite-latest'
const FALLBACK_MODELS = ['gemini-2.5-flash-lite', 'gemini-2.0-flash'] as const

interface GeminiOptions {
  systemPrompt: string
  userMessage: string
  model?: string
  schema?: Schema
  userId?: string
  event?: H3Event
}

function isH3Error(error: unknown): error is { statusCode: number; statusMessage?: string } {
  return !!error && typeof error === 'object' && 'statusCode' in (error as object)
}

function getErrorStatusCode(error: unknown): number | null {
  if (!error || typeof error !== 'object') return null

  const statusCodeCandidates = [
    (error as { statusCode?: unknown }).statusCode,
    (error as { status?: unknown }).status,
    (error as { httpErrorCode?: unknown }).httpErrorCode,
  ]

  for (const statusCodeCandidate of statusCodeCandidates) {
    if (
      typeof statusCodeCandidate === 'number' &&
      statusCodeCandidate >= 100 &&
      statusCodeCandidate <= 599
    ) {
      return statusCodeCandidate
    }
  }

  return null
}

export async function askGemini({
  systemPrompt,
  userMessage,
  model = GEMINI_DEFAULT_MODEL,
  schema,
  userId,
  event,
}: GeminiOptions): Promise<string> {
  const config = useRuntimeConfig()
  const apiKey = config.geminiApiKey || process.env.NUXT_GEMINI_API_KEY || ''

  if (!apiKey) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Gemini API key is not configured. Set NUXT_GEMINI_API_KEY.',
    })
  }

  const rateLimiter = userId ? createRateLimiter() : null

  if (userId && rateLimiter) {
    const { success, remaining, reset } = await rateLimiter.recommednationLimiter.limit(userId)
    if (event) {
      setResponseHeaders(event, {
        'X-RateLimit-Limit': String(RECOMMENDATION_LIMIT),
        'X-RateLimit-Remaining': String(remaining),
        'X-RateLimit-Reset': String(reset),
      })
    }
    if (!success) {
      throw createError({
        statusCode: 429,
        statusMessage: 'Daily recommendation limit reached. Please try again tomorrow.',
      })
    }
  }

  const genAI = new GoogleGenerativeAI(apiKey)
  const modelsToTry = [model, ...FALLBACK_MODELS]
  let text: string | null = null
  let lastError: unknown = null

  for (const modelName of modelsToTry) {
    try {
      const geminiModel = genAI.getGenerativeModel({
        model: modelName,
        systemInstruction: systemPrompt,
        ...(schema && {
          generationConfig: {
            responseMimeType: 'application/json',
            responseSchema: schema,
          },
        }),
      })
      const result = await geminiModel.generateContent(userMessage)
      text = result.response.text() || null
      if (!text) {
        lastError = createError({
          statusCode: 500,
          statusMessage: 'Gemini returned an empty response.',
        })
        continue
      }
      break
    } catch (error: unknown) {
      lastError = error
    }
  }

  if (text) return text

  if (!lastError) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to get a response from Gemini.',
    })
  }

  if (isH3Error(lastError)) throw lastError
  const statusCode = getErrorStatusCode(lastError)
  const statusMessage =
    lastError instanceof Error ? lastError.message : 'Failed to get a response from Gemini.'
  throw createError({
    statusCode: statusCode === 503 ? 503 : 500,
    statusMessage,
  })
}
