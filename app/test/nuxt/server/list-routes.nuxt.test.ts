import { createServer } from 'node:http'
import type { AddressInfo } from 'node:net'
import type { Server } from 'node:http'
import {
  createApp,
  createError,
  defineEventHandler,
  getHeader,
  readBody,
  toNodeListener,
} from 'h3'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

const { getAuthorizedUserMock, metadataLimiterLimitMock, userListReadLimiterLimitMock } = vi.hoisted(() => ({
  getAuthorizedUserMock: vi.fn(),
  metadataLimiterLimitMock: vi.fn(),
  userListReadLimiterLimitMock: vi.fn(),
}))

vi.mock('../../../server/utils/auth/authorize-user', () => ({
  getAuthorizedUser: getAuthorizedUserMock,
}))

vi.mock('../../../server/utils/movies/filter-metadata-rate-limit', () => ({
  filterMetadataLimiter: {
    limit: metadataLimiterLimitMock,
  },
}))

vi.mock('../../../server/utils/user-lists/rate-limit', () => ({
  userListReadLimiter: {
    limit: userListReadLimiterLimitMock,
  },
}))

Object.assign(globalThis, {
  createError,
  defineEventHandler,
  getHeader,
  readBody,
})

const { default: watchedHandler } = await import('../../../server/api/watched/index')
const { default: myListHandler } = await import('../../../server/api/mylist/index')
const { default: metadataHandler } = await import('../../../server/api/movies/metadata.post')

interface MovieRow {
  tmdb_id: number
  title: string
  poster_path: string
  release_date: string
  runtime: number
  genres: string[]
  vote_average: number
}

interface SupabaseState {
  profileCompletedAt: string | null
  watchedIds: number[]
  myListIds: number[]
  movies: MovieRow[]
  upsertPayloads: Array<Record<string, unknown>>
  deleteFilters: Record<string, unknown>
  rpcCalls: Array<{ name: string; payload: Record<string, unknown> }>
}

const TEST_USER_ID = '00000000-0000-0000-0000-000000000001'

const movieRows: MovieRow[] = [
  {
    tmdb_id: 550,
    title: 'Fight Club',
    poster_path: '/fight-club.jpg',
    release_date: '1999-10-15',
    runtime: 139,
    genres: ['Drama'],
    vote_average: 8.4,
  },
  {
    tmdb_id: 13,
    title: 'Forrest Gump',
    poster_path: '/forrest-gump.jpg',
    release_date: '1994-07-06',
    runtime: 142,
    genres: ['Drama', 'Romance'],
    vote_average: 8.8,
  },
]

function createMockSupabase(state: SupabaseState) {
  return {
    from(table: string) {
      if (table === 'profiles') {
        return createProfilesBuilder(state)
      }

      if (table === 'user_watched_movies') {
        return createWatchedBuilder(state)
      }

      if (table === 'user_my_list') {
        return createMyListBuilder(state)
      }

      if (table === 'movies') {
        return createMoviesBuilder(state)
      }

      throw new Error(`Unexpected table: ${table}`)
    },
    async rpc(name: string, payload: Record<string, unknown>) {
      state.rpcCalls.push({ name, payload })
      return { error: null }
    },
  }
}

function createProfilesBuilder(state: SupabaseState) {
  const filters: Record<string, unknown> = {}

  const builder = {
    select() {
      return builder
    },
    eq(key: string, value: unknown) {
      filters[key] = value
      return builder
    },
    limit() {
      return builder
    },
    async maybeSingle() {
      if (filters.id !== TEST_USER_ID) {
        return { data: null, error: null }
      }

      return {
        data: {
          onboarding_completed_at: state.profileCompletedAt,
        },
        error: null,
      }
    },
  }

  return builder
}

function createWatchedBuilder(state: SupabaseState) {
  const filters: Record<string, unknown> = {}

  const builder = {
    select() {
      return builder
    },
    eq(key: string, value: unknown) {
      filters[key] = value
      state.deleteFilters[key] = value
      return builder
    },
    async upsert(payload: Record<string, unknown>) {
      state.upsertPayloads.push(payload)
      const tmdbId = payload.tmdb_id
      if (typeof tmdbId === 'number' && !state.watchedIds.includes(tmdbId)) {
        state.watchedIds.push(tmdbId)
      }
      return { error: null }
    },
    delete() {
      return builder
    },
    async then(resolve: (value: { data: Array<{ tmdb_id: number }>; error: null }) => void) {
      const filteredIds = state.watchedIds.filter((tmdbId) => {
        if (typeof filters.tmdb_id === 'number' && filters.tmdb_id !== tmdbId) {
          return false
        }

        if (typeof filters.user_id === 'string' && filters.user_id !== TEST_USER_ID) {
          return false
        }

        return true
      })

      resolve({
        data: filteredIds.map((tmdbId) => ({ tmdb_id: tmdbId })),
        error: null,
      })
    },
  }

  return builder
}

function createMyListBuilder(state: SupabaseState) {
  const builder = {
    select() {
      return builder
    },
    eq() {
      return builder
    },
    limit() {
      return builder
    },
    async maybeSingle() {
      return { data: { tmdb_ids: state.myListIds }, error: null }
    },
  }

  return builder
}

function createMoviesBuilder(state: SupabaseState) {
  const builder = {
    select() {
      return builder
    },
    in(_key: string, values: number[]) {
      return Promise.resolve({
        data: state.movies.filter((movie) => values.includes(movie.tmdb_id)),
        error: null,
      })
    },
  }

  return builder
}

async function readJson<T>(response: Response) {
  return response.json() as Promise<T>
}

describe('normalized list routes', () => {
  const app = createApp()
  app.use('/api/watched', watchedHandler)
  app.use('/api/mylist', myListHandler)
  app.use('/api/movies/metadata', metadataHandler)

  let baseUrl = ''
  let server: Server
  let state: SupabaseState

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
    state = {
      profileCompletedAt: '2026-06-14T10:00:00.000Z',
      watchedIds: [550],
      myListIds: [13],
      movies: movieRows,
      upsertPayloads: [],
      deleteFilters: {},
      rpcCalls: [],
    }

    getAuthorizedUserMock.mockResolvedValue({
      supabase: createMockSupabase(state),
      user: { id: TEST_USER_ID },
    })
    metadataLimiterLimitMock.mockResolvedValue({
      success: true,
      limit: 5,
      remaining: 4,
      reset: 0,
    })
    userListReadLimiterLimitMock.mockResolvedValue({
      success: true,
      limit: 20,
      remaining: 19,
      reset: 0,
    })
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('returns watched ids only', async () => {
    const response = await fetch(`${baseUrl}/api/watched`)
    const body = await readJson<{ tmdbIds: number[] }>(response)

    expect(response.status).toBe(200)
    expect(body.tmdbIds).toEqual([550])
  })

  it('uses duplicate-safe watched inserts for ID-only payloads', async () => {
    const response = await fetch(`${baseUrl}/api/watched`, {
      method: 'POST',
      body: JSON.stringify({ tmdbId: 550 }),
      headers: { 'Content-Type': 'application/json' },
    })
    const body = await readJson<{ success: boolean }>(response)

    expect(response.status).toBe(200)
    expect(body.success).toBe(true)
    expect(state.upsertPayloads).toEqual([{ user_id: TEST_USER_ID, tmdb_id: 550 }])
    expect(state.watchedIds).toEqual([550])
  })

  it('rejects invalid watched ids', async () => {
    const response = await fetch(`${baseUrl}/api/watched`, {
      method: 'POST',
      body: JSON.stringify({ tmdbId: 0 }),
      headers: { 'Content-Type': 'application/json' },
    })

    expect(response.status).toBe(400)
  })

  it('returns my-list ids only', async () => {
    const response = await fetch(`${baseUrl}/api/mylist`)
    const body = await readJson<{ tmdbIds: number[] }>(response)

    expect(response.status).toBe(200)
    expect(body.tmdbIds).toEqual([13])
  })

  it('returns ordered metadata for requested ids', async () => {
    const response = await fetch(`${baseUrl}/api/movies/metadata`, {
      method: 'POST',
      body: JSON.stringify({ tmdbIds: [13, 550, 999999, 13] }),
      headers: { 'Content-Type': 'application/json' },
    })
    const body = await readJson<{
      movies: Array<{
        tmdbId: number
        title: string
        year: number
        posterPath: string
        genres: string[]
        runtime: number | null
        rating: number | null
      }>
    }>(response)

    expect(response.status).toBe(200)
    expect(body.movies).toEqual([
      {
        tmdbId: 13,
        title: 'Forrest Gump',
        year: 1994,
        posterPath: '/forrest-gump.jpg',
        genres: ['Drama', 'Romance'],
        runtime: 142,
        rating: 8.8,
      },
      {
        tmdbId: 550,
        title: 'Fight Club',
        year: 1999,
        posterPath: '/fight-club.jpg',
        genres: ['Drama'],
        runtime: 139,
        rating: 8.4,
      },
      {
        tmdbId: 999999,
        title: '',
        year: 0,
        posterPath: '',
        genres: [],
        runtime: null,
        rating: null,
      },
    ])
    expect(metadataLimiterLimitMock).toHaveBeenCalledWith(TEST_USER_ID)
  })

  it('rejects invalid metadata ids', async () => {
    const response = await fetch(`${baseUrl}/api/movies/metadata`, {
      method: 'POST',
      body: JSON.stringify({ tmdbIds: [13, 0] }),
      headers: { 'Content-Type': 'application/json' },
    })

    expect(response.status).toBe(400)
  })

  it('rejects unauthenticated metadata requests', async () => {
    getAuthorizedUserMock.mockRejectedValueOnce(
      createError({ statusCode: 401, statusMessage: 'Unauthorized' })
    )

    const response = await fetch(`${baseUrl}/api/movies/metadata`, {
      method: 'POST',
      body: JSON.stringify({ tmdbIds: [13] }),
      headers: { 'Content-Type': 'application/json' },
    })

    expect(response.status).toBe(401)
  })

  it('returns 429 when the metadata endpoint is rate limited', async () => {
    metadataLimiterLimitMock.mockResolvedValueOnce({
      success: false,
      limit: 5,
      remaining: 0,
      reset: 0,
    })

    const response = await fetch(`${baseUrl}/api/movies/metadata`, {
      method: 'POST',
      body: JSON.stringify({ tmdbIds: [13] }),
      headers: { 'Content-Type': 'application/json' },
    })

    expect(response.status).toBe(429)
  })

  it('uses my-list rpc functions for id-only mutations', async () => {
    const addResponse = await fetch(`${baseUrl}/api/mylist`, {
      method: 'POST',
      body: JSON.stringify({ tmdbId: 13 }),
      headers: { 'Content-Type': 'application/json' },
    })
    const removeResponse = await fetch(`${baseUrl}/api/mylist`, {
      method: 'DELETE',
      body: JSON.stringify({ tmdbId: 13 }),
      headers: { 'Content-Type': 'application/json' },
    })

    expect(addResponse.status).toBe(200)
    expect(removeResponse.status).toBe(200)
    expect(state.rpcCalls).toEqual([
      { name: 'append_my_list', payload: { target_tmdb_id: 13 } },
      { name: 'remove_my_list', payload: { target_tmdb_id: 13 } },
    ])
  })

  it('rejects adding a watched movie to my-list', async () => {
    const response = await fetch(`${baseUrl}/api/mylist`, {
      method: 'POST',
      body: JSON.stringify({ tmdbId: 550 }),
      headers: { 'Content-Type': 'application/json' },
    })

    expect(response.status).toBe(409)
    expect(state.rpcCalls).toEqual([])
  })
})
