import { createError } from 'h3'
import { describe, expect, it, vi } from 'vitest'

const { createCompletionMock, openAiConstructorMock } = vi.hoisted(() => ({
  createCompletionMock: vi.fn(),
  openAiConstructorMock: vi.fn(
    function MockOpenAI() {
      return {
        chat: {
          completions: {
            create: createCompletionMock,
          },
        },
      }
    }
  ),
}))

vi.mock('openai', () => ({
  default: openAiConstructorMock,
}))

vi.mock('../../server/utils/ratelimit', () => ({
  recommendationLimiter: {
    limit: vi.fn(),
  },
  RECOMMENDATION_LIMIT: 20,
}))

const { askPlatformAi, createPlatformAiProviderConfig, parseProviderModels } = await import(
  '../../server/utils/ai-client'
)

function setupRuntimeConfig() {
  Object.assign(globalThis, {
    createError,
    useRuntimeConfig: vi.fn(() => ({
      googleApiKey: 'google-key',
      googleModels: 'gemini-2.5-flash-lite',
      openRouterApiKey: 'openrouter-key',
      openRouterModels: 'google/gemini-2.5-flash-lite',
    })),
  })

  createCompletionMock.mockReset()
  openAiConstructorMock.mockClear()
}

describe('parseProviderModels', () => {
  it('trims configured models and removes empty entries', () => {
    expect(parseProviderModels('gpt-4.1-mini, gpt-4o-mini,')).toEqual([
      'gpt-4.1-mini',
      'gpt-4o-mini',
    ])
  })

  it('returns an empty list when no model is configured', () => {
    expect(parseProviderModels(' , ')).toEqual([])
  })
})

describe('createPlatformAiProviderConfig', () => {
  it('orders Google before OpenRouter', () => {
    expect(
      createPlatformAiProviderConfig({
        googleApiKey: 'google-key',
        googleModels: 'gemini-2.5-flash-lite',
        openRouterApiKey: 'openrouter-key',
        openRouterModels: 'google/gemini-2.5-flash-lite',
      }).map((provider) => provider.provider)
    ).toEqual(['google', 'openrouter'])
  })
})

describe('askPlatformAi', () => {
  it('attaches provider attempt metadata when all configured models fail', async () => {
    setupRuntimeConfig()
    createCompletionMock.mockRejectedValue(
      Object.assign(new Error('Provider schema validation failed'), { status: 400 })
    )

    await expect(
      askPlatformAi({
        systemPrompt: 'system',
        userMessage: 'user',
        schema: { type: 'object' },
      })
    ).rejects.toMatchObject({
      provider: 'openrouter',
      model: 'google/gemini-2.5-flash-lite',
      responseMode: 'json_schema',
      causeMessage: 'Provider schema validation failed',
      originalStatusCode: 400,
      attempts: [
        {
          provider: 'google',
          model: 'gemini-2.5-flash-lite',
          responseMode: 'json_schema',
          statusCode: 400,
          causeMessage: 'Provider schema validation failed',
        },
        {
          provider: 'openrouter',
          model: 'google/gemini-2.5-flash-lite',
          responseMode: 'json_schema',
          statusCode: 400,
          causeMessage: 'Provider schema validation failed',
        },
      ],
    })
  })
})
