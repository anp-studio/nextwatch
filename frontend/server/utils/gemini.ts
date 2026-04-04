import { GoogleGenerativeAI } from '@google/generative-ai'
import type { Schema } from '@google/generative-ai'
import type { H3Event } from 'h3'
import { createRateLimiter } from './ratelimit'

const GEMINI_DEFAULT_MODEL = 'gemini-flash-lite-latest'

interface GeminiOptions {
  systemPrompt: string
  userMessage: string
  model?: string
  schema?: Schema
  userId?: string
  event?: H3Event
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

  if (userId) {
    const { recommednationLimiter } = createRateLimiter()
    const { success, limit, remaining, reset } = await recommednationLimiter.limit(userId)
    if (event) {
      setResponseHeaders(event, {
        'X-RateLimit-Limit': String(limit),
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

  try {
    const genAI = new GoogleGenerativeAI(apiKey)
    const geminiModel = genAI.getGenerativeModel({
      model,
      systemInstruction: systemPrompt,
      ...(schema && {
        generationConfig: {
          responseMimeType: 'application/json',
          responseSchema: schema,
        },
      }),
    })
    const result = await geminiModel.generateContent(userMessage)
    const text = result.response.text()

    if (!text) {
      throw createError({
        statusCode: 500,
        statusMessage: 'Gemini returned an empty response.',
      })
    }

    return text
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'statusCode' in error) throw error

    const statusMessage =
      error instanceof Error ? error.message : 'Failed to get a response from Gemini.'
    throw createError({ statusCode: 500, statusMessage })
  }
}
