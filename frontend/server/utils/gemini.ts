import { GoogleGenerativeAI } from '@google/generative-ai'
import type { Schema } from '@google/generative-ai'

const GEMINI_DEFAULT_MODEL = 'gemini-flash-lite-latest'

interface GeminiOptions {
  systemPrompt: string
  userMessage: string
  model?: string
  schema?: Schema
}

export async function askGemini({
  systemPrompt,
  userMessage,
  model = GEMINI_DEFAULT_MODEL,
  schema,
}: GeminiOptions): Promise<string> {
  const config = useRuntimeConfig()
  const apiKey = config.geminiApiKey || process.env.NUXT_GEMINI_API_KEY || ''

  if (!apiKey) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Gemini API key is not configured. Set NUXT_GEMINI_API_KEY.',
    })
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
