import { createError } from 'h3'
import { describe, expect, it, vi } from 'vitest'

const { createCompletionMock, openAiConstructorMock, recommendationLimitMock } = vi.hoisted(() => ({
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
  recommendationLimitMock: vi.fn(),
}))

vi.mock('openai', () => ({
  default: openAiConstructorMock,
}))

vi.mock('../../../server/utils/recommendations/rate-limit', () => ({
  recommendationLimiter: {
    limit: recommendationLimitMock,
  },
  RECOMMENDATION_LIMIT: 20,
}))

const { askPlatformAi, createPlatformAiProviderConfig, parseProviderModels } = await import(
  '../../../server/utils/recommendations/ai-client'
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
  recommendationLimitMock.mockReset()
  recommendationLimitMock.mockResolvedValue({
    success: true,
    remaining: 19,
    reset: 0,
  })
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
  it('passes explicit chat history to the provider when messages are supplied', async () => {
    setupRuntimeConfig()
    const messages = [
      { role: 'system' as const, content: 'system instructions' },
      { role: 'user' as const, content: 'initial request' },
      { role: 'assistant' as const, content: '{"recommendations":[]}' },
      { role: 'user' as const, content: 'replacement request' },
    ]
    createCompletionMock.mockResolvedValue({
      choices: [{ message: { content: '{"recommendations":[]}' } }],
    })

    await askPlatformAi({
      messages,
      schema: { type: 'object' },
    })

    expect(createCompletionMock).toHaveBeenCalledWith(
      expect.objectContaining({
        messages,
      })
    )
  })

  it('can skip recommendation rate limiting for internal follow-up rounds', async () => {
    setupRuntimeConfig()
    createCompletionMock.mockResolvedValue({
      choices: [{ message: { content: '{"recommendations":[]}' } }],
    })

    await askPlatformAi({
      systemPrompt: 'system',
      userMessage: 'user',
      userId: 'user-1',
      rateLimit: false,
    })

    expect(recommendationLimitMock).not.toHaveBeenCalled()
  })

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
