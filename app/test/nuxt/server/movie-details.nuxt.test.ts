import { createServer } from 'node:http'
import type { AddressInfo } from 'node:net'
import type { Server } from 'node:http'
import { createApp, createError, defineEventHandler, getRouterParam, toNodeListener } from 'h3'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

const { fetchTmdbMock, getServiceSupabaseMock } = vi.hoisted(() => ({
  fetchTmdbMock: vi.fn(),
  getServiceSupabaseMock: vi.fn(),
}))

vi.mock('../../../server/utils/tmdb', () => ({
  fetchTmdb: fetchTmdbMock,
}))

vi.mock('../../../server/utils/auth', () => ({
  createServiceSupabaseClient: getServiceSupabaseMock,
}))

Object.assign(globalThis, {
  createError,
  defineEventHandler,
  getRouterParam,
})

const { default: movieDetailsHandler } = await import('../../../server/api/movies/[id].get')

interface MovieRow {
  tmdb_id: number
  original_title: string
  title: string
  overview: string
  poster_path: string
  backdrop_path: string
  release_date: string
  trailer_key: string
  runtime: number
  vote_average: number
  vote_count: number
  popularity: number
  genres: string[]
  cast: string[]
  directors: string[]
  cached_at: string | null
}

interface MovieState {
  row: MovieRow | null
  upsertPayload: Record<string, unknown> | null
}

const FRESH_DATE = '2026-04-01T00:00:00.000Z'

const completeRow: MovieRow = {
  tmdb_id: 550,
  original_title: 'Fight Club',
  title: 'Fight Club',
  overview: 'An insomniac office worker forms an underground club.',
  poster_path: '/fight-club.jpg',
  backdrop_path: '/fight-club-backdrop.jpg',
  release_date: '1999-10-15',
  trailer_key: 'trailer-key',
  runtime: 139,
  vote_average: 8.4,
  vote_count: 30000,
  popularity: 90,
  genres: ['Drama'],
  cast: ['Edward Norton', 'Brad Pitt'],
  directors: ['David Fincher'],
  cached_at: FRESH_DATE,
}

function createMockSupabase(state: MovieState) {
  return {
    from(table: string) {
      expect(table).toBe('movies')

      const builder = {
        select() {
          return builder
        },
        eq() {
          return builder
        },
        async maybeSingle() {
          return { data: state.row, error: null }
        },
        async upsert(payload: Record<string, unknown>) {
          state.upsertPayload = payload
          return { error: null }
        },
      }

      return builder
    },
  }
}

function createTmdbDetails() {
  return {
    id: 550,
    title: 'Fight Club',
    original_title: 'Fight Club',
    poster_path: '/fight-club.jpg',
    backdrop_path: '/fight-club-backdrop.jpg',
    vote_average: 8.4,
    vote_count: 30000,
    popularity: 90,
    release_date: '1999-10-15',
    overview: 'An insomniac office worker forms an underground club.',
    runtime: 139,
    genres: [{ id: 18, name: 'Drama' }],
    credits: {
      cast: [{ name: 'Edward Norton' }, { name: 'Brad Pitt' }],
      crew: [{ name: 'David Fincher', job: 'Director' }],
    },
    videos: {
      results: [
        {
          key: 'trailer-key',
          site: 'YouTube',
          type: 'Trailer',
          official: true,
          published_at: '1999-01-01T00:00:00.000Z',
        },
      ],
    },
  }
}

async function readJson(response: Response) {
  return response.json() as Promise<Record<string, unknown>>
}

describe('/api/movies/:id', () => {
  const app = createApp()
  app.use(
    '/api/movies/550',
    defineEventHandler((event) => {
      event.context.params = { id: '550' }
      return movieDetailsHandler(event)
    })
  )

  let baseUrl = ''
  let server: Server
  let state: MovieState

  beforeAll(async () => {
    server = createServer(toNodeListener(app))
    await new Promise<void>((resolve) => {
      server.listen(0, '127.0.0.1', () => resolve())
    })
    const address = server.address() as AddressInfo
    baseUrl = `http://127.0.0.1:${address.port}`
  })

  afterAll(async () => {
    await new Promise<void>((resolve, reject) => {
      server.close((error) => {
        if (error) {
          reject(error)
          return
        }

        resolve()
      })
    })
  })

  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-04-26T00:00:00.000Z'))
    state = {
      row: { ...completeRow },
      upsertPayload: null,
    }
    getServiceSupabaseMock.mockReturnValue(createMockSupabase(state))
    fetchTmdbMock.mockResolvedValue(createTmdbDetails())
  })

  afterEach(() => {
    vi.clearAllMocks()
    vi.useRealTimers()
  })

  it('returns a complete fresh Supabase cache row without fetching TMDB', async () => {
    const response = await fetch(`${baseUrl}/api/movies/550`)
    const body = await readJson(response)

    expect(response.status).toBe(200)
    expect(body.title).toBe('Fight Club')
    expect(body.poster).toBe('https://image.tmdb.org/t/p/w500/fight-club.jpg')
    expect(body.runtime).toBe(139)
    expect(fetchTmdbMock).not.toHaveBeenCalled()
    expect(state.upsertPayload).toBeNull()
  })

  it('refreshes the cache when cached_at is null', async () => {
    state.row = { ...completeRow, cached_at: null }

    const response = await fetch(`${baseUrl}/api/movies/550`)

    expect(response.status).toBe(200)
    expect(fetchTmdbMock).toHaveBeenCalledWith(expect.anything(), '/movie/550', {
      append_to_response: 'credits,videos',
    })
    expect(state.upsertPayload).toMatchObject({
      tmdb_id: 550,
      title: 'Fight Club',
      runtime: 139,
      genres: ['Drama'],
      cached_at: '2026-04-26T00:00:00.000Z',
    })
  })

  it('refreshes the cache when required sentinel fields are missing', async () => {
    state.row = { ...completeRow, title: '', poster_path: '', genres: [], runtime: 0 }

    const response = await fetch(`${baseUrl}/api/movies/550`)

    expect(response.status).toBe(200)
    expect(fetchTmdbMock).toHaveBeenCalledTimes(1)
    expect(state.upsertPayload).toMatchObject({
      title: 'Fight Club',
      poster_path: '/fight-club.jpg',
      runtime: 139,
      genres: ['Drama'],
    })
  })
})
