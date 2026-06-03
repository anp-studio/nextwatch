import { createError } from 'h3'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const { createClientMock } = vi.hoisted(() => ({
  createClientMock: vi.fn(),
}))

vi.mock('@supabase/supabase-js', () => ({
  createClient: createClientMock,
}))

const { fetchTmdbMock } = vi.hoisted(() => ({
  fetchTmdbMock: vi.fn(),
}))

vi.mock('../../server/utils/tmdb', () => ({
  fetchTmdb: fetchTmdbMock,
}))

const { askPlatformAiMock } = vi.hoisted(() => ({
  askPlatformAiMock: vi.fn(),
}))

vi.mock('../../server/utils/ai-client', () => ({
  askPlatformAi: askPlatformAiMock,
}))

const {
  AI_CANDIDATE_RECOMMENDATIONS,
  appendTmdbIds,
  buildUserMessage,
  getRecommendationsFromPlatformAi,
} = await import('../../server/utils/recommendations')

interface SearchRow {
  tmdb_id: number
  original_title: string
  popularity: number
  release_date: string
}

function createBuilder(rowsByQuery: Map<string, SearchRow[]>) {
  let queryValue = ''
  let startDate = ''
  let endDate = ''

  const builder = {
    select() {
      return builder
    },
    filter(_column: string, _operator: string, value: string) {
      queryValue = value
      return builder
    },
    order() {
      return builder
    },
    limit() {
      return Promise.resolve({
        data: rowsByQuery.get(`${queryValue}::${startDate}::${endDate}`) ?? [],
        error: null,
      })
    },
    gte(_column: string, value: string) {
      startDate = value
      return builder
    },
    lte(_column: string, value: string) {
      endDate = value
      return builder
    },
  }

  return builder
}

describe('appendTmdbIds', () => {
  beforeEach(() => {
    Object.assign(globalThis, {
      createError,
      useRuntimeConfig: vi.fn(() => ({
        public: {
          supabaseUrl: 'https://example.supabase.co',
        },
        supabaseServiceRoleKey: 'test-service-role-key',
      })),
    })
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('prefers a result whose cached year matches the Gemini recommendation year', async () => {
    createClientMock.mockReturnValue({
      from: vi.fn().mockImplementation(() =>
        createBuilder(
          new Map([
            [
              'suspiria:*::1977-01-01::1977-12-31',
              [
                {
                  tmdb_id: 11907,
                  original_title: 'Suspiria',
                  popularity: 80,
                  release_date: '1977-02-01',
                },
              ],
            ],
            [
              'suspiria:*::::',
              [
                {
                  tmdb_id: 11906,
                  original_title: 'Suspiria',
                  popularity: 90,
                  release_date: '2018-10-26',
                },
              ],
            ],
          ])
        )
      ),
    })

    const results = await appendTmdbIds([
      { name: 'Suspiria', originalName: 'Suspiria', year: 1977 },
    ])

    expect(results).toEqual({
      recommendations: [
        { name: 'Suspiria', originalName: 'Suspiria', year: 1977, tmdbId: 11907 },
      ],
      tmdbFallbackCount: 0,
    })
  })

  it('falls back to the top result when no cached year matches', async () => {
    createClientMock.mockReturnValue({
      from: vi.fn().mockImplementation(() =>
        createBuilder(
          new Map([
            [
              'suspiria:*::2024-01-01::2024-12-31',
              [],
            ],
            [
              'suspiria:*::::',
              [
                {
                  tmdb_id: 11906,
                  original_title: 'Suspiria',
                  popularity: 90,
                  release_date: '2018-10-26',
                },
                {
                  tmdb_id: 11907,
                  original_title: 'Suspiria',
                  popularity: 80,
                  release_date: '1977-02-01',
                },
              ],
            ],
          ])
        )
      ),
    })

    const results = await appendTmdbIds([
      { name: 'Suspiria', originalName: 'Suspiria', year: 2024 },
    ])

    expect(results).toEqual({
      recommendations: [
        { name: 'Suspiria', originalName: 'Suspiria', year: 2024, tmdbId: 11906 },
      ],
      tmdbFallbackCount: 0,
    })
  })

  it('returns null when Supabase search does not find a match and no event is provided', async () => {
    createClientMock.mockReturnValue({
      from: vi.fn().mockImplementation(() =>
        createBuilder(
          new Map([
            ['stalker:*::1979-01-01::1979-12-31', []],
            ['stalker:*::::', []],
          ])
        )
      ),
    })

    const results = await appendTmdbIds([
      { name: 'Stalker', originalName: 'Stalker', year: 1979 },
    ])

    expect(results).toEqual({
      recommendations: [{ name: 'Stalker', originalName: 'Stalker', year: 1979, tmdbId: null }],
      tmdbFallbackCount: 0,
    })
  })

  it('falls back to TMDB search with year when Supabase search misses a movie', async () => {
    createClientMock.mockReturnValue({
      from: vi.fn().mockImplementation(() =>
        createBuilder(
          new Map([
            ['edge:* & of:* & tomorrow:*::2014-01-01::2014-12-31', []],
            ['edge:* & of:* & tomorrow:*::::', []],
          ])
        )
      ),
    })
    fetchTmdbMock.mockResolvedValue({
      results: [
        {
          id: 137113,
          original_title: 'Edge of Tomorrow',
          title: 'Edge of Tomorrow',
          release_date: '2014-05-27',
        },
      ],
    })

    const results = await appendTmdbIds(
      [{ name: 'Edge of Tomorrow', originalName: 'Edge of Tomorrow', year: 2014 }],
      {} as import('h3').H3Event
    )

    expect(results).toEqual({
      recommendations: [
        {
          name: 'Edge of Tomorrow',
          originalName: 'Edge of Tomorrow',
          year: 2014,
          tmdbId: 137113,
        },
      ],
      tmdbFallbackCount: 1,
    })
    expect(fetchTmdbMock).toHaveBeenCalledTimes(1)
  })

  it('skips a TMDB fallback movie when the TMDB rate limit is reached', async () => {
    createClientMock.mockReturnValue({
      from: vi.fn().mockImplementation(() =>
        createBuilder(new Map([['stalker:*::1979-01-01::1979-12-31', []], ['stalker:*::::', []]]))
      ),
    })
    fetchTmdbMock.mockRejectedValue(createError({ statusCode: 429, statusMessage: 'Rate limited' }))

    const results = await appendTmdbIds(
      [{ name: 'Stalker', originalName: 'Stalker', year: 1979 }],
      {} as import('h3').H3Event
    )

    expect(results).toEqual({
      recommendations: [{ name: 'Stalker', originalName: 'Stalker', year: 1979, tmdbId: null }],
      tmdbFallbackCount: 1,
    })
    expect(fetchTmdbMock).toHaveBeenCalledTimes(1)
  })

  it('hydrates the larger AI candidate pool before final route filtering', async () => {
    createClientMock.mockReturnValue({
      from: vi.fn().mockImplementation(() => createBuilder(new Map())),
    })

    const recommendations = Array.from(
      { length: AI_CANDIDATE_RECOMMENDATIONS + 5 },
      (_, index) => ({
        name: `Candidate ${index + 1}`,
        originalName: `Candidate ${index + 1}`,
        year: 2000 + index,
      })
    )

    const results = await appendTmdbIds(recommendations)

    expect(results.recommendations).toHaveLength(AI_CANDIDATE_RECOMMENDATIONS)
  })
})

describe('getRecommendationsFromPlatformAi', () => {
  beforeEach(() => {
    askPlatformAiMock.mockReset()
  })

  it('accepts a top-level recommendation array payload', async () => {
    askPlatformAiMock.mockResolvedValue(
      JSON.stringify([{ name: 'Stalker', originalName: 'Stalker', year: 1979 }])
    )

    const result = await getRecommendationsFromPlatformAi([{ tmdbId: 1, title: 'Alien', year: 1979 }], [])

    expect(result.recommendations).toEqual([
      { name: 'Stalker', originalName: 'Stalker', year: 1979, tmdbId: null },
    ])
  })

  it('accepts an object payload that wraps recommendations', async () => {
    askPlatformAiMock.mockResolvedValue(
      JSON.stringify({
        recommendations: [{ name: 'Stalker', originalName: 'Stalker', year: 1979 }],
      })
    )

    const result = await getRecommendationsFromPlatformAi([{ tmdbId: 1, title: 'Alien', year: 1979 }], [])

    expect(result.recommendations).toEqual([
      { name: 'Stalker', originalName: 'Stalker', year: 1979, tmdbId: null },
    ])
  })

  it('asks for a larger candidate pool and sends taste-profile context', async () => {
    askPlatformAiMock.mockResolvedValue(
      JSON.stringify([{ name: 'Stalker', originalName: 'Stalker', year: 1979 }])
    )

    await getRecommendationsFromPlatformAi(
      [
        {
          tmdbId: 1,
          title: 'Alien',
          year: 1979,
          genres: ['Science Fiction', 'Horror'],
          popularity: 80,
          voteCount: 20000,
        },
      ],
      [
        {
          tmdbId: 2,
          title: 'Solaris',
          year: 1972,
          genres: ['Science Fiction', 'Drama'],
          popularity: 50,
          voteCount: 10000,
        },
      ]
    )

    expect(askPlatformAiMock).toHaveBeenCalledWith(
      expect.objectContaining({
        systemPrompt: expect.stringContaining(
          `exactly ${AI_CANDIDATE_RECOMMENDATIONS} candidate movies`
        ),
        userMessage: expect.stringContaining('TASTE PROFILE:'),
      })
    )
  })

  it('builds a compact prompt with representative watched, top watched, and My List reminders', () => {
    const message = buildUserMessage(
      [
        {
          tmdbId: 1,
          title: 'Alien',
          year: 1979,
          genres: ['Science Fiction', 'Horror'],
          popularity: 80,
          voteCount: 20000,
        },
      ],
      [{ tmdbId: 2, title: 'Solaris', year: 1972 }],
      [{ name: 'Moon', originalName: 'Moon', year: 2009 }]
    )

    expect(message).toContain('TASTE PROFILE:')
    expect(message).toContain('REPRESENTATIVE WATCHED MOVIES:')
    expect(message).toContain('TOP WATCHED MOVIES:')
    expect(message).toContain('MY LIST REMINDERS:')
    expect(message).toContain('RECENTLY RECOMMENDED (FORBIDDEN)')
    expect(message).toContain(`up to 20 final recommendations`)
  })
})
