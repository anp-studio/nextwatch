import { createError } from 'h3'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const { createClientMock } = vi.hoisted(() => ({
  createClientMock: vi.fn(),
}))

vi.mock('@supabase/supabase-js', () => ({
  createClient: createClientMock,
}))

const { searchMovies, searchMoviesBatch } = await import('../../server/utils/searchMovies')

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

describe('searchMovies', () => {
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

  it('uses Postgres FTS and sorts exact title matches ahead of popularity-only ties', async () => {
    const rowsByQuery = new Map<string, SearchRow[]>([
      [
        'matrix:*',
        [
          {
            tmdb_id: 604,
            original_title: 'The Matrix',
            popularity: 99,
            release_date: '1999-03-31',
          },
          {
            tmdb_id: 605,
            original_title: 'Matrix',
            popularity: 10,
            release_date: '1993-01-01',
          },
        ],
      ],
    ])

    createClientMock.mockReturnValue({
      from: vi.fn().mockReturnValue(createBuilder(rowsByQuery)),
    })

    const results = await searchMovies('Matrix')

    expect(createClientMock).toHaveBeenCalledTimes(1)
    expect(results).toEqual([
      {
        tmdb_id: 605,
        original_title: 'Matrix',
        popularity: 10,
        year: 1993,
      },
      {
        tmdb_id: 604,
        original_title: 'The Matrix',
        popularity: 99,
        year: 1999,
      },
    ])
  })

  it('queries each unique candidate only once in batch mode', async () => {
    const rowsByQuery = new Map<string, SearchRow[]>([
      [
        'matrix:*',
        [
          {
            tmdb_id: 604,
            original_title: 'The Matrix',
            popularity: 99,
            release_date: '1999-03-31',
          },
        ],
      ],
      [
        'alien:*',
        [
          {
            tmdb_id: 348,
            original_title: 'Alien',
            popularity: 88,
            release_date: '1979-05-25',
          },
        ],
      ],
    ])

    const fromMock = vi.fn().mockImplementation(() => createBuilder(rowsByQuery))
    createClientMock.mockReturnValue({
      from: fromMock,
    })

    const results = await searchMoviesBatch(['Matrix', 'Alien', 'Matrix'])

    expect(fromMock).toHaveBeenCalledTimes(2)
    expect(results.get('Matrix')).toEqual([
      {
        tmdb_id: 604,
        original_title: 'The Matrix',
        popularity: 99,
        year: 1999,
      },
    ])
    expect(results.get('Alien')).toEqual([
      {
        tmdb_id: 348,
        original_title: 'Alien',
        popularity: 88,
        year: 1979,
      },
    ])
  })

  it('filters out weak FTS matches whose titles do not actually contain the query tokens', async () => {
    const rowsByQuery = new Map<string, SearchRow[]>([
      [
        'stalker:*',
        [
          {
            tmdb_id: 1,
            original_title: 'Star Trek',
            popularity: 99,
            release_date: '2009-05-08',
          },
        ],
      ],
    ])

    createClientMock.mockReturnValue({
      from: vi.fn().mockReturnValue(createBuilder(rowsByQuery)),
    })

    const results = await searchMovies('Stalker')

    expect(results).toEqual([])
  })
})
