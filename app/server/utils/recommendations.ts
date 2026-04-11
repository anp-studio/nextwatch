import { SchemaType } from '@google/generative-ai'
import type { Schema } from '@google/generative-ai'
import type { SupabaseClient } from '@supabase/supabase-js'

export const WATCHED_MOVIES_TABLE = 'watched_movies'
const MAX_WATCHED_FOR_PROMPT = 50
const MAX_RECOMMENDATIONS = 20

const SYSTEM_PROMPT = `You are a movie recommendation engine.
Analyze the user's watch history to infer their taste: preferred genres, directors, eras, themes, and tone.
Recommend exactly 10 movies they have not yet seen, aiming for variety across genres and release decades while staying true to their taste profile.
Return movie titles in their original release language and script exactly as TMDB original titles — do not transliterate, anglicize, or use localized variants (e.g. use ゴジラ-1.0 not Godzilla Minus One).
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

export interface WatchedMovieRecord {
  tmdbId: number
  title: string
  year: number
}

export interface Recommendation {
  name: string
  originalName: string
  year: number
}

export interface RecommendationWithId extends Recommendation {
  tmdbId: number | null
}

export function isRecommendationArray(value: unknown): value is Recommendation[] {
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

function pickBestMatchId(results: MovieSearchResult[], searchCandidates: string[]): number | null {
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

export async function fetchWatchedMovies(
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

export function buildUserMessage(
  movies: Array<{ title: string; year: number }>,
  excludedMovies: Array<{ name: string; originalName?: string; year: number }> = []
): string {
  const watchedList = movies
    .slice(0, MAX_WATCHED_FOR_PROMPT)
    .map((m) => `- ${m.title} (${m.year})`)
    .join('\n')

  if (excludedMovies.length === 0) {
    return `I have watched the following movies:\n${watchedList}\n\nRecommend 10 movies I would enjoy.`
  }

  const excludedList = excludedMovies
    .map((m) => {
      const originalLabel =
        m.originalName && m.originalName !== m.name ? ` / ${m.originalName}` : ''
      return `- ${m.name}${originalLabel} (${m.year})`
    })
    .join('\n')

  return `I have watched the following movies:\n${watchedList}\n\nThese exact movies were already recommended to me recently. Do not include any of them again (same movie, alternate title, sequel variant, punctuation variant, or localized title):\n${excludedList}\n\nRecommend exactly 10 different movies I would enjoy that are not in the blocked list.`
}

export async function appendTmdbIds(
  recommendations: Recommendation[]
): Promise<RecommendationWithId[]> {
  const limited = recommendations.slice(0, MAX_RECOMMENDATIONS)

  const allCandidates = [...new Set(limited.flatMap(getSearchCandidates))]

  let searchMap: Map<string, MovieSearchResult[]>
  try {
    searchMap = await searchMoviesBatch(allCandidates)
  } catch {
    return limited.map((rec) => ({ ...rec, tmdbId: null }))
  }

  return limited.map((recommendation) => {
    const candidates = getSearchCandidates(recommendation)
    let fallbackId: number | null = null

    for (const candidate of candidates) {
      const results = searchMap.get(candidate) ?? []
      const tmdbId = pickBestMatchId(results, candidates)

      if (tmdbId !== null) return { ...recommendation, tmdbId }

      if (fallbackId === null) {
        fallbackId = results[0]?.tmdb_id ?? null
      }
    }

    return { ...recommendation, tmdbId: fallbackId }
  })
}

export async function getRecommendationsFromGemini(
  watchedMovies: Array<{ title: string; year: number }>,
  userId?: string,
  event?: import('h3').H3Event,
  excludedMovies: RecommendationWithId[] = []
): Promise<RecommendationWithId[]> {
  const raw = await askGemini({
    systemPrompt: SYSTEM_PROMPT,
    userMessage: buildUserMessage(watchedMovies, excludedMovies),
    schema: RECOMMENDATION_SCHEMA,
    userId,
    event,
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

  return appendTmdbIds(parsed)
}
