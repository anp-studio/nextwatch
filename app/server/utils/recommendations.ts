import { SchemaType } from '@google/generative-ai'
import type { Schema } from '@google/generative-ai'
import type { SupabaseClient } from '@supabase/supabase-js'

export const WATCHED_MOVIES_TABLE = 'watched_movies'
export const MY_LIST_TABLE = 'my_list_movies'
export const MIN_RECOMMENDATIONS_TO_CACHE = 5
const MAX_WATCHED_FOR_PROMPT = 100
const MAX_MY_LIST_FOR_PROMPT = 100
const MAX_RECOMMENDATIONS = 20

const SYSTEM_PROMPT = `You are a movie recommendation engine.
Analyze the user's taste profile from their watch history: preferred genres, directors, eras, themes, and tone.

Recommend exactly ${MAX_RECOMMENDATIONS} movies the user has NOT seen, following these strict rules:
1. NEVER recommend any movie from the watched list — those are already seen.
2. The "My List" watchlist contains movies the user is already aware of and intends to watch. Treat them as low-priority candidates:
  - Only include a My List movie if it strongly fits the taste profile AND no comparable undiscovered alternative exists.
  - At most 1 recommendation may come from My List.
  - Always prefer recommending movies the user has NOT yet discovered over My List entries.
3. Aim for variety across genres and release decades while staying true to the inferred taste profile.
4. Return movie titles in their original release language and script exactly as TMDB original titles — do not transliterate, anglicize, or use localized variants (e.g. use ゴジラ-1.0 not Godzilla Minus One).
5. Respond ONLY with a valid JSON array of exactly ${MAX_RECOMMENDATIONS} objects, each with keys "name", "originalName", and "year". No explanation, no markdown, no code fences. Example format:
[{"name": "ゴジラ-1.0", "originalName": "ゴジラ-1.0", "year": 2023}]`

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

export function hasValidTmdbId(
  recommendation: RecommendationWithId
): recommendation is RecommendationWithId & { tmdbId: number } {
  return recommendation.tmdbId !== null
}

export function hasEnoughRecommendationsToCache(recommendations: RecommendationWithId[]): boolean {
  return recommendations.length >= MIN_RECOMMENDATIONS_TO_CACHE
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

export async function fetchMyListMovies(
  supabase: SupabaseClient,
  userId: string
): Promise<WatchedMovieRecord[]> {
  const { data, error } = await supabase
    .from(MY_LIST_TABLE)
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
  watchedMovies: Array<{ title: string; year: number }>,
  myListMovies: Array<{ title: string; year: number }>,
  excludedMovies: Array<{ name: string; originalName?: string; year: number }> = []
): string {
  const watchedList = watchedMovies
    .slice(0, MAX_WATCHED_FOR_PROMPT)
    .map((m) => `- ${m.title} (${m.year})`)
    .join('\n')

  const myListList = myListMovies
    .slice(0, MAX_MY_LIST_FOR_PROMPT)
    .map((m) => `- ${m.title} (${m.year})`)
    .join('\n')

  if (excludedMovies.length === 0) {
    return `I have watched the following movies (DO NOT recommend these):
            ${watchedList}
            I have saved the following movies to my watchlist — I am already aware of them. Only recommend one of these if no better undiscovered alternative exists:
            ${myListList}
            Recommend ${MAX_RECOMMENDATIONS} movies I would enjoy that I have not yet seen.`
  }

  const excludedList = excludedMovies
    .map((m) => {
      const originalLabel =
        m.originalName && m.originalName !== m.name ? ` / ${m.originalName}` : ''
      return `- ${m.name}${originalLabel} (${m.year})`
    })
    .join('\n')

  return `I have watched the following movies (DO NOT recommend these — already seen):
          ${watchedList}

          I have saved the following movies to my watchlist — I am already aware of them. Only recommend one of these if no better undiscovered alternative exists:
          ${myListList}

          The following movies were recently recommended to me. Do NOT include any of them again — this applies to alternate titles, sequel variants, punctuation variants, and localized title variants:
          ${excludedList}

          Recommend exactly ${MAX_RECOMMENDATIONS} movies I would enjoy that appear in none of the above lists.`
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
  myListMovies: Array<{ title: string; year: number }>,
  userId?: string,
  event?: import('h3').H3Event,
  excludedMovies: RecommendationWithId[] = []
): Promise<RecommendationWithId[]> {
  const raw = await askGemini({
    systemPrompt: SYSTEM_PROMPT,
    userMessage: buildUserMessage(watchedMovies, myListMovies, excludedMovies),
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
