import { describe, expect, it, vi } from 'vitest'

vi.mock('../../server/utils/ratelimit', () => ({
  recommendationLimiter: {
    limit: vi.fn(),
  },
  RECOMMENDATION_LIMIT: 20,
}))

const { createPlatformAiProviderConfig, parseProviderModels } = await import(
  '../../server/utils/ai-client'
)

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
