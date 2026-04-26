import { createServer } from 'node:http'
import type { AddressInfo } from 'node:net'
import type { Server } from 'node:http'
import {
  createApp,
  createError,
  defineEventHandler,
  readBody,
  toNodeListener,
} from 'h3'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

const {
  fetchMyListMoviesMock,
  fetchWatchedMoviesMock,
  getAuthorizedUserMock,
  getRecommendationsFromGeminiMock,
} = vi.hoisted(() => ({
  fetchMyListMoviesMock: vi.fn(),
  fetchWatchedMoviesMock: vi.fn(),
  getAuthorizedUserMock: vi.fn(),
  getRecommendationsFromGeminiMock: vi.fn(),
}))

vi.mock('../../../server/utils/auth', () => ({
  getAuthorizedUser: getAuthorizedUserMock,
}))

vi.mock('../../../server/utils/recommendations', () => ({
  fetchMyListMovies: fetchMyListMoviesMock,
  fetchWatchedMovies: fetchWatchedMoviesMock,
  getRecommendationsFromGemini: getRecommendationsFromGeminiMock,
  hasValidTmdbId: (recommendation: { tmdbId: number | null }) => recommendation.tmdbId !== null,
}))

Object.assign(globalThis, {
  createError,
  defineEventHandler,
  readBody,
})

const { default: geminiRecommendHandler } = await import('../../../server/api/gemini/recommend.post')

async function readJson(response: Response) {
  return response.json() as Promise<Record<string, unknown>>
}

describe('/api/gemini/recommend', () => {
  const app = createApp()
  app.use('/api/gemini/recommend', geminiRecommendHandler)

  let baseUrl = ''
  let server: Server

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
    getAuthorizedUserMock.mockResolvedValue({
      supabase: {},
      user: { id: 'test-user-id' },
    })
    fetchWatchedMoviesMock.mockResolvedValue([{ tmdbId: 1, title: 'Alien', year: 1979 }])
    fetchMyListMoviesMock.mockResolvedValue([])
    getRecommendationsFromGeminiMock.mockResolvedValue([
      { name: 'Stalker', originalName: 'Stalker', year: 1979, tmdbId: 1398 },
      { name: 'Invalid', originalName: 'Invalid', year: 2000, tmdbId: null },
    ])
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('returns debug recommendation objects in non-production mode while filtering invalid matches', async () => {
    const response = await fetch(`${baseUrl}/api/gemini/recommend`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({}),
    })
    const body = await readJson(response)

    expect(response.status).toBe(200)
    expect(body.recommendations).toEqual([
      {
        tmdbId: 1398,
        originalName: 'Stalker',
        year: 1979,
      },
    ])
  })
})
