import { createError } from 'h3'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const { createClientMock } = vi.hoisted(() => ({
  createClientMock: vi.fn(),
}))

vi.mock('@supabase/supabase-js', () => ({
  createClient: createClientMock,
}))

const { appendTmdbIds } = await import('../../server/utils/recommendations')

interface SearchRow {
  tmdb_id: number
  original_title: string
  popularity: number
  release_date: string
}

function createBuilder(rowsByQuery: Map<string, SearchRow[]>) {
  let queryValue = ''

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
        data: rowsByQuery.get(queryValue) ?? [],
        error: null,
      })
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
      from: vi.fn().mockReturnValue(
        createBuilder(
          new Map([
            [
              'suspiria:*',
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
      { name: 'Suspiria', originalName: 'Suspiria', year: 1977 },
    ])

    expect(results).toEqual([
      { name: 'Suspiria', originalName: 'Suspiria', year: 1977, tmdbId: 11907 },
    ])
  })

  it('falls back to the top result when no cached year matches', async () => {
    createClientMock.mockReturnValue({
      from: vi.fn().mockReturnValue(
        createBuilder(
          new Map([
            [
              'suspiria:*',
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

    expect(results).toEqual([
      { name: 'Suspiria', originalName: 'Suspiria', year: 2024, tmdbId: 11906 },
    ])
  })

  it('returns null when search only finds a weak unrelated FTS match', async () => {
    createClientMock.mockReturnValue({
      from: vi.fn().mockReturnValue(
        createBuilder(
          new Map([
            [
              'stalker:*',
              [
                {
                  tmdb_id: 77,
                  original_title: 'Star Trek',
                  popularity: 90,
                  release_date: '2009-05-08',
                },
              ],
            ],
          ])
        )
      ),
    })

    const results = await appendTmdbIds([
      { name: 'Stalker', originalName: 'Stalker', year: 1979 },
    ])

    expect(results).toEqual([
      { name: 'Stalker', originalName: 'Stalker', year: 1979, tmdbId: null },
    ])
  })
})
