import { SchemaType } from '@google/generative-ai'
import type { Schema } from '@google/generative-ai'
import type { SupabaseClient } from '@supabase/supabase-js'
import { getAuthorizedUser } from '../../utils/auth'

const WATCHED_MOVIES_TABLE = 'watched_movies'
const MAX_WATCHED_FOR_PROMPT = 50
const MAX_RECOMMENDATIONS = 20

const SYSTEM_PROMPT = `You are a movie recommendation engine.
Based on the user's watch history, recommend exactly 10 movies they have not yet seen.
Return movie titles in their original release language and script exactly as TMDB original titles.
Do not transliterate, anglicize, or use localized variants.
For example, use ゴジラ-1.0 instead of Godzilla Minus One.
Respond ONLY with valid JSON — no explanation, no markdown, no code fences.`

const RECOMMENDATION_SCHEMA: Schema = {
  type: SchemaType.ARRAY,
  items: {
    type: SchemaType.OBJECT,
    properties: {
      name: {
        type: SchemaType.STRING,
        description: 'Movie title in original release language/script',
      },
      originalName: {
        type: SchemaType.STRING,
        description: 'Exact original TMDB title in original release language/script',
      },
      year: { type: SchemaType.INTEGER, description: 'Release year' },
    },
    required: ['name', 'originalName', 'year'],
  },
}

interface RecommendBody {
  movies?: Array<{ id: number; title: string; year: number }>
}

interface WatchedMovieRecord {
  tmdbId: number
  title: string
  year: number
}

interface Recommendation {
  name: string
  originalName: string
  year: number
}

interface RecommendationWithId extends Recommendation {
  tmdbId: number | null
}

function isRecommendationArray(value: unknown): value is Recommendation[] {
  return (
    Array.isArray(value) &&
    value.every(
      (item) =>
        typeof item === 'object' &&
        item !== null &&
        typeof (item as Record<string, unknown>).name === 'string' &&
        typeof (item as Record<string, unknown>).originalName === 'string' &&
        typeof (item as Record<string, unknown>).year === 'number'
    )
  )
}

function normalizeTitle(value: string): string {
  return value.trim().toLowerCase()
}

function getSearchCandidates(recommendation: Recommendation): string[] {
  const candidates = [recommendation.originalName, recommendation.name]
    .map((title) => title.trim())
    .filter((title) => title.length > 0)

  return [...new Set(candidates)]
}

async function fetchWatchedMovies(
  supabase: SupabaseClient,
  userId: string
): Promise<WatchedMovieRecord[]> {
  const { data, error } = await supabase
    .from(WATCHED_MOVIES_TABLE)
    .select('movies')
    .eq('user_id', userId)
    .limit(1)
    .maybeSingle()

  if (error) {
    throw createError({ statusCode: 500, statusMessage: error.message })
  }

  return Array.isArray(data?.movies) ? (data.movies as WatchedMovieRecord[]) : []
}

function mergeMovieLists(
  supabaseMovies: WatchedMovieRecord[],
  localMovies: Array<{ id: number; title: string; year: number }>
): Array<{ title: string; year: number }> {
  const seenIds = new Set(supabaseMovies.map((m) => m.tmdbId))
  const merged = supabaseMovies.map(({ title, year }) => ({ title, year }))

  for (const movie of localMovies) {
    if (!seenIds.has(movie.id)) {
      merged.push({ title: movie.title, year: movie.year })
    }
  }

  return merged
}

function buildUserMessage(movies: Array<{ title: string; year: number }>): string {
  const list = movies
    .slice(0, MAX_WATCHED_FOR_PROMPT)
    .map((m) => `- ${m.title} (${m.year})`)
    .join('\n')
  return `I have watched the following movies:\n${list}\n\nRecommend 10 movies I would enjoy.`
}

function pickBestMatchId(
  recommendation: Recommendation,
  results: MovieSearchResult[],
  searchCandidates: string[]
): number | null {
  if (results.length === 0) return null

  const normalizedCandidates = new Set(searchCandidates.map(normalizeTitle))
  const exactTitleMatch = results.find((result) =>
    normalizedCandidates.has(normalizeTitle(result.original_title))
  )

  if (exactTitleMatch) return exactTitleMatch.tmdb_id

  const firstResult = results[0]
  if (!firstResult) return null

  return firstResult.tmdb_id
}

async function appendTmdbIds(recommendations: Recommendation[]): Promise<RecommendationWithId[]> {
  const enriched = await Promise.all(
    recommendations.slice(0, MAX_RECOMMENDATIONS).map(async (recommendation) => {
      try {
        const searchCandidates = getSearchCandidates(recommendation)
        let fallbackId: number | null = null

        for (const candidate of searchCandidates) {
          const results = await searchMovies(candidate)
          const tmdbId = pickBestMatchId(recommendation, results, searchCandidates)

          if (tmdbId !== null) return { ...recommendation, tmdbId }

          if (fallbackId === null) {
            const firstResult = results[0]
            fallbackId = firstResult ? firstResult.tmdb_id : null
          }
        }

        const tmdbId = fallbackId
        return { ...recommendation, tmdbId }
      } catch {
        return { ...recommendation, tmdbId: null }
      }
    })
  )

  return enriched
}

export default defineEventHandler(async (event) => {
  const { supabase, user } = await getAuthorizedUser(event)
  const body = (await readBody<RecommendBody>(event)) ?? {}

  const supabaseMovies = await fetchWatchedMovies(supabase, user.id)
  const localMovies = body.movies ?? []
  const watchedMovies = mergeMovieLists(supabaseMovies, localMovies)

  if (watchedMovies.length === 0) {
    throw createError({
      statusCode: 400,
      statusMessage: 'No watched movies found. Watch some movies first.',
    })
  }

  const raw = await askGemini({
    systemPrompt: SYSTEM_PROMPT,
    userMessage: buildUserMessage(watchedMovies),
    schema: RECOMMENDATION_SCHEMA,
  })

  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    throw createError({
      statusCode: 502,
      statusMessage: 'Gemini returned a response that could not be parsed as JSON.',
    })
  }

  if (!isRecommendationArray(parsed)) {
    throw createError({
      statusCode: 502,
      statusMessage: 'Gemini response did not match the expected recommendation schema.',
    })
  }

  const recommendations = await appendTmdbIds(parsed)

  return { recommendations }
})
