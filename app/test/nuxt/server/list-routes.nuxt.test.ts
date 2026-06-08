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

const { getAuthorizedUserMock } = vi.hoisted(() => ({
  getAuthorizedUserMock: vi.fn(),
}))

vi.mock('../../../server/utils/auth/authorize-user', () => ({
  getAuthorizedUser: getAuthorizedUserMock,
}))

Object.assign(globalThis, {
  createError,
  defineEventHandler,
  getHeader,
  readBody,
})

const { default: watchedHandler } = await import('../../../server/api/watched/index')
const { default: myListHandler } = await import('../../../server/api/mylist/index')

interface MovieRow {
  tmdb_id: number
  title: string
  poster_path: string
  release_date: string
  runtime: number
  genres: string[]
}

interface SupabaseState {
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
  },
  {
    tmdb_id: 13,
    title: 'Forrest Gump',
    poster_path: '/forrest-gump.jpg',
    release_date: '1994-07-06',
    runtime: 142,
    genres: ['Drama', 'Romance'],
  },
]

function createMockSupabase(state: SupabaseState) {
  return {
    from(table: string) {
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

async function readJson(response: Response) {
  return response.json() as Promise<Record<string, unknown>>
}

describe('normalized list routes', () => {
  const app = createApp()
  app.use('/api/watched', watchedHandler)
  app.use('/api/mylist', myListHandler)

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
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('hydrates watched IDs into the existing frontend movie shape', async () => {
    const response = await fetch(`${baseUrl}/api/watched`)
    const body = await readJson(response)

    expect(response.status).toBe(200)
    expect(body.movies).toEqual([
      {
        tmdbId: 550,
        title: 'Fight Club',
        year: 1999,
        posterPath: '/fight-club.jpg',
        genres: ['Drama'],
        runtime: 139,
      },
    ])
  })

  it('uses duplicate-safe watched inserts for ID-only payloads', async () => {
    const response = await fetch(`${baseUrl}/api/watched`, {
      method: 'POST',
      body: JSON.stringify({ tmdbId: 550 }),
      headers: { 'Content-Type': 'application/json' },
    })
    const body = await readJson(response)

    expect(response.status).toBe(200)
    expect(body.success).toBe(true)
    expect(state.upsertPayloads).toEqual([{ user_id: TEST_USER_ID, tmdb_id: 550 }])
    expect(state.watchedIds).toEqual([550])
  })

  it('rejects invalid watched IDs', async () => {
    const response = await fetch(`${baseUrl}/api/watched`, {
      method: 'POST',
      body: JSON.stringify({ tmdbId: 0 }),
      headers: { 'Content-Type': 'application/json' },
    })

    expect(response.status).toBe(400)
  })

  it('hydrates my-list IDs into the existing frontend movie shape', async () => {
    const response = await fetch(`${baseUrl}/api/mylist`)
    const body = await readJson(response)

    expect(response.status).toBe(200)
    expect(body.movies).toEqual([
      {
        tmdbId: 13,
        title: 'Forrest Gump',
        year: 1994,
        posterPath: '/forrest-gump.jpg',
        genres: ['Drama', 'Romance'],
        runtime: 142,
      },
    ])
  })

  it('uses my-list RPC functions for ID-only mutations', async () => {
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
