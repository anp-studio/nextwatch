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

function is503(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false
  const e = error as Record<string, unknown>
  if (e.statusCode === 503 || e.status === 503 || e.httpErrorCode === 503) return true
  const msg = String(e.message ?? '').toLowerCase()
  return msg.includes('503') || msg.includes('service unavailable') || msg.includes('overloaded')
}

function isH3Error(error: unknown): error is { statusCode: number; statusMessage?: string } {
  return !!error && typeof error === 'object' && 'statusCode' in (error as object)
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
    const { remaining, reset } = await rateLimiter.recommednationLimiter.getRemaining(userId)
    if (event) {
      setResponseHeaders(event, {
        'X-RateLimit-Limit': String(RECOMMENDATION_LIMIT),
        'X-RateLimit-Remaining': String(remaining),
        'X-RateLimit-Reset': String(reset),
      })
    }
    if (remaining === 0) {
      throw createError({
        statusCode: 429,
        statusMessage: 'Daily recommendation limit reached. Please try again tomorrow.',
      })
    }
  }

  const genAI = new GoogleGenerativeAI(apiKey)
  const modelsToTry = [model, ...FALLBACK_MODELS]
  let text: string | null = null
  let lastNon503Error: unknown = null

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
        lastNon503Error = createError({
          statusCode: 500,
          statusMessage: 'Gemini returned an empty response.',
        })
      }
      break
    } catch (error: unknown) {
      if (is503(error)) continue
      lastNon503Error = error
      break
    }
  }

  const hadNon503Outcome = text !== null || lastNon503Error !== null

  // consume only when model responds
  if (hadNon503Outcome && userId && rateLimiter) {
    await rateLimiter.recommednationLimiter.limit(userId)
  }

  if (text) return text

  if (!hadNon503Outcome) {
    throw createError({
      statusCode: 503,
      statusMessage:
        'Gemini is temporarily unavailable due to high demand. Please try again in a moment.',
    })
  }

  if (isH3Error(lastNon503Error)) throw lastNon503Error
  const statusMessage =
    lastNon503Error instanceof Error
      ? lastNon503Error.message
      : 'Failed to get a response from Gemini.'
  throw createError({ statusCode: 500, statusMessage })
}
