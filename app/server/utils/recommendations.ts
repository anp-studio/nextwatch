import { SchemaType } from '@google/generative-ai'
import type { Schema } from '@google/generative-ai'
import type { SupabaseClient } from '@supabase/supabase-js'
import { searchMoviesBatch } from './searchMovies'
import { fetchTmdb } from './tmdb'

export const WATCHED_MOVIES_TABLE = 'user_watched_movies'
export const MY_LIST_TABLE = 'user_my_list'
const MOVIES_TABLE = 'movies'
export const MIN_RECOMMENDATIONS_TO_CACHE = 5
const MAX_WATCHED_FOR_PROMPT = 100
const MAX_MY_LIST_FOR_PROMPT = 100
const MAX_RECOMMENDATIONS = 20

const SYSTEM_PROMPT = `You are a movie recommendation engine.
Analyze the user's taste profile from their watch history: preferred genres, directors, eras, themes, and tone.

Recommend exactly ${MAX_RECOMMENDATIONS} movies, obeying these rules:
1. HARD PROHIBITION — watched list: Never recommend any movie from the WATCHED list. Not even sequels, remakes, or alternate cuts of those exact titles. This constraint is absolute and overrides everything else. If you are unsure whether a movie is on the watched list, do not include it.
2. WATCHLIST (My List): The user already knows about these movies and has deliberately saved them. Your default should be 0 recommendations from this list. Only include a My List movie when it is the single best possible match for the user's taste AND no comparable undiscovered film exists. Maximum: 1. Prefer 0.
3. Aim for variety across genres and decades while staying true to the inferred taste profile.
4. Return movie titles in their original release language and script exactly as TMDB original_title. Do not transliterate, anglicize, or use localized variants (e.g. ゴジラ-1.0 not Godzilla Minus One).
5. Respond ONLY with a valid JSON array of exactly ${MAX_RECOMMENDATIONS} objects with keys "name", "originalName", and "year". No explanation, no markdown, no code fences. Example:
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

const EXACT_ORIGINAL_TITLE_PROMPT_SUFFIX = `
Additional hard requirements:
- "originalName" must be the exact TMDB "original_title" value, character-for-character, in the original release language and script.
- Never translate, localize, anglicize, transliterate, simplify accents, or substitute an alternate marketing title in "originalName".
- Set "name" to the same exact value as "originalName". Do not use an English alias there either.
- Example: for The Fifth Element, use "Le Cinquième Élément" if that is the TMDB original title; do not output "The Fifth Element" as "name" or "originalName".`

const POPULAR_MOVIE_PROMPT_SUFFIX = `
Additional recommendation guidance:
- Do not avoid popular movies, mainstream movies, franchise movies, blockbuster movies, or movies from large studios when they genuinely fit the user's taste.
- If the watched history suggests the user likes Marvel, DC, Star Wars, Pixar, Disney, DreamWorks, major action franchises, or other studio-driven movies, include matches from those spaces when appropriate.
- Do not force obscure, arthouse, indie, or low-profile picks just to seem more sophisticated or diverse.
- Prefer the best taste match, whether it is a major studio release or a lesser-known movie.`

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

interface MoviePromptRow {
  tmdb_id: number
  title: string
  release_date: string
}

interface RecommendationMovieRow extends MoviePromptRow {
  original_title: string
}

interface TmdbSearchMovieResult {
  id: number
  original_title: string
  title: string
  release_date?: string
}

interface TmdbSearchResponse {
  results?: TmdbSearchMovieResult[]
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

function getSearchCandidates(recommendation: Recommendation): string[] {
  const candidates = [recommendation.originalName, recommendation.name]
    .map((title) => title.trim())
    .filter((title) => title.length > 0)

  return [...new Set(candidates)]
}

function normalizeTitleForComparison(title: string): string {
  return title.trim().toLowerCase()
}

function pickBestMatchId(
  candidates: string[],
  results: MovieSearchResult[],
  recommendationYear: number
): number | null {
  if (results.length === 0) return null

  const normalizedCandidates = candidates.map(normalizeTitleForComparison)

  const titleAndYearMatch = results.find(
    (r) =>
      r.year === recommendationYear &&
      normalizedCandidates.some((c) => c === normalizeTitleForComparison(r.original_title))
  )
  if (titleAndYearMatch) return titleAndYearMatch.tmdb_id

  // Accept title-only match to handle Gemini year discrepancies
  const titleOnlyMatch = results.find((r) =>
    normalizedCandidates.some((c) => c === normalizeTitleForComparison(r.original_title))
  )
  if (titleOnlyMatch) return titleOnlyMatch.tmdb_id

  return null
}

function pickBestTmdbSearchResult(
  candidates: string[],
  results: TmdbSearchMovieResult[],
  recommendationYear: number
): TmdbSearchMovieResult | null {
  if (results.length === 0) {
    return null
  }

  const normalizedCandidates = candidates.map(normalizeTitleForComparison)
  const exactYearMatch = results.find((result) => {
    const resultYear = parseYear(result.release_date ?? '')
    const normalizedOriginalTitle = normalizeTitleForComparison(result.original_title)
    const normalizedTitle = normalizeTitleForComparison(result.title)

    return (
      resultYear === recommendationYear &&
      normalizedCandidates.some(
        (candidate) => candidate === normalizedOriginalTitle || candidate === normalizedTitle
      )
    )
  })

  if (exactYearMatch) {
    return exactYearMatch
  }

  const yearMatchedResult = results.find(
    (result) => parseYear(result.release_date ?? '') === recommendationYear
  )
  if (yearMatchedResult) {
    return yearMatchedResult
  }

  return results[0] ?? null
}

function isErrorWithStatusCode(error: unknown, statusCode: number): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'statusCode' in error &&
    typeof (error as { statusCode?: unknown }).statusCode === 'number' &&
    (error as { statusCode: number }).statusCode === statusCode
  )
}

async function searchTmdbMovieId(
  event: import('h3').H3Event,
  recommendation: Recommendation
): Promise<number | null> {
  const candidates = getSearchCandidates(recommendation)

  for (const candidate of candidates) {
    try {
      const payload = (await fetchTmdb(event, '/search/movie', {
        query: candidate,
        year: recommendation.year,
      })) as TmdbSearchResponse
      const bestMatch = pickBestTmdbSearchResult(
        candidates,
        payload.results ?? [],
        recommendation.year
      )

      if (bestMatch) {
        return bestMatch.id
      }
    } catch (error) {
      if (isErrorWithStatusCode(error, 429)) {
        return null
      }
    }
  }

  return null
}

function parseYear(releaseDate: string): number {
  return parseInt(releaseDate.split('-')[0] || '0', 10)
}

async function fetchMovieRowsByIds<T extends MoviePromptRow>(
  supabase: SupabaseClient,
  tmdbIds: number[],
  columns: string
): Promise<T[]> {
  if (tmdbIds.length === 0) {
    return []
  }

  const { data, error } = await supabase.from(MOVIES_TABLE).select(columns).in('tmdb_id', tmdbIds)

  if (error) {
    throw createError({ statusCode: 500, statusMessage: error.message })
  }

  return (data ?? []) as unknown as T[]
}

async function hydratePromptMovies(
  supabase: SupabaseClient,
  tmdbIds: number[]
): Promise<WatchedMovieRecord[]> {
  const rows = await fetchMovieRowsByIds<MoviePromptRow>(
    supabase,
    tmdbIds,
    'tmdb_id, title, release_date'
  )
  const rowById = new Map(rows.map((row) => [row.tmdb_id, row]))

  return tmdbIds.flatMap((tmdbId) => {
    const row = rowById.get(tmdbId)

    if (!row || row.title.trim().length === 0) {
      return []
    }

    return [
      {
        tmdbId,
        title: row.title,
        year: parseYear(row.release_date),
      },
    ]
  })
}

export async function hydrateRecommendationsByTmdbIds(
  supabase: SupabaseClient,
  tmdbIds: number[]
): Promise<RecommendationWithId[]> {
  const rows = await fetchMovieRowsByIds<RecommendationMovieRow>(
    supabase,
    tmdbIds,
    'tmdb_id, title, original_title, release_date'
  )
  const rowById = new Map(rows.map((row) => [row.tmdb_id, row]))

  return tmdbIds.map((tmdbId) => {
    const row = rowById.get(tmdbId)
    const title = row?.title ?? ''
    const originalTitle = row?.original_title || title

    return {
      name: title,
      originalName: originalTitle,
      year: row ? parseYear(row.release_date) : 0,
      tmdbId,
    }
  })
}

export async function fetchWatchedMovies(
  supabase: SupabaseClient,
  userId: string
): Promise<WatchedMovieRecord[]> {
  const { data, error } = await supabase
    .from(WATCHED_MOVIES_TABLE)
    .select('tmdb_id')
    .eq('user_id', userId)

  if (error) {
    throw createError({ statusCode: 500, statusMessage: error.message })
  }

  const tmdbIds = ((data ?? []) as Array<{ tmdb_id: number }>).map((movie) => movie.tmdb_id)
  return hydratePromptMovies(supabase, tmdbIds)
}

export async function fetchMyListMovies(
  supabase: SupabaseClient,
  userId: string
): Promise<WatchedMovieRecord[]> {
  const { data, error } = await supabase
    .from(MY_LIST_TABLE)
    .select('tmdb_ids')
    .eq('user_id', userId)
    .limit(1)
    .maybeSingle()

  if (error) {
    throw createError({ statusCode: 500, statusMessage: error.message })
  }

  const tmdbIds = Array.isArray(data?.tmdb_ids) ? (data.tmdb_ids as number[]) : []
  return hydratePromptMovies(supabase, tmdbIds)
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
    return `WATCHED (FORBIDDEN — do NOT recommend any of these):
${watchedList}

WATCHLIST — I already know about these; include at most 1 only if it is an exceptional taste match, otherwise skip all of them:
${myListList}

Recommend exactly ${MAX_RECOMMENDATIONS} movies I would enjoy that do not appear in either list above.
Before outputting, verify that every recommended movie is absent from the WATCHED list.`
  }

  const excludedList = excludedMovies
    .map((m) => {
      const originalLabel =
        m.originalName && m.originalName !== m.name ? ` / ${m.originalName}` : ''
      return `- ${m.name}${originalLabel} (${m.year})`
    })
    .join('\n')

  return `WATCHED (FORBIDDEN — do NOT recommend any of these):
${watchedList}

WATCHLIST — I already know about these; include at most 1 only if it is an exceptional taste match, otherwise skip all of them:
${myListList}

RECENTLY RECOMMENDED — do NOT repeat any of these (includes alternate titles, sequel variants, and localized title variants):
${excludedList}

Recommend exactly ${MAX_RECOMMENDATIONS} movies I would enjoy that do not appear in any of the three lists above.
Before outputting, verify that every recommended movie is absent from the WATCHED list.`
}

export async function appendTmdbIds(
  recommendations: Recommendation[],
  event?: import('h3').H3Event
): Promise<{ recommendations: RecommendationWithId[]; tmdbFallbackCount: number }> {
  const limited = recommendations.slice(0, MAX_RECOMMENDATIONS)

  const allCandidates = limited.flatMap((recommendation) =>
    getSearchCandidates(recommendation).map((query) => ({
      query,
      year: recommendation.year,
    }))
  )

  let searchMap: Map<string, MovieSearchResult[]>
  try {
    searchMap = await searchMoviesBatch(allCandidates)
  } catch {
    return { recommendations: limited.map((rec) => ({ ...rec, tmdbId: null })), tmdbFallbackCount: 0 }
  }

  let tmdbFallbackCount = 0

  const results = await Promise.all(
    limited.map(async (recommendation) => {
      const candidates = getSearchCandidates(recommendation)

      for (const candidate of candidates) {
        const searchResults = searchMap.get(`${candidate}::${recommendation.year}`) ?? []
        const tmdbId = pickBestMatchId(candidates, searchResults, recommendation.year)
        if (tmdbId !== null) return { ...recommendation, tmdbId }
      }

      if (!event) {
        return { ...recommendation, tmdbId: null }
      }

      tmdbFallbackCount++
      return {
        ...recommendation,
        tmdbId: await searchTmdbMovieId(event, recommendation),
      }
    })
  )

  return { recommendations: results, tmdbFallbackCount }
}

export async function getRecommendationsFromGemini(
  watchedMovies: Array<{ title: string; year: number }>,
  myListMovies: Array<{ title: string; year: number }>,
  userId?: string,
  event?: import('h3').H3Event,
  excludedMovies: RecommendationWithId[] = []
): Promise<{ recommendations: RecommendationWithId[]; tmdbFallbackCount: number; systemPrompt: string; userMessage: string }> {
  const systemPrompt = `${SYSTEM_PROMPT}\n${EXACT_ORIGINAL_TITLE_PROMPT_SUFFIX}\n${POPULAR_MOVIE_PROMPT_SUFFIX}`
  const userMessage = buildUserMessage(watchedMovies, myListMovies, excludedMovies)

  const raw = await askGemini({
    systemPrompt,
    userMessage,
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

  const result = await appendTmdbIds(parsed, event)
  return { ...result, systemPrompt, userMessage }
}
