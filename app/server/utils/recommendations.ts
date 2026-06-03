import type { SupabaseClient } from '@supabase/supabase-js'
import type { H3Event } from 'h3'
import { askPlatformAi } from './ai-client'
import { searchMoviesBatch } from './searchMovies'
import { fetchTmdb } from './tmdb'
import { logPrivateError, throwAiProviderError, throwSupabaseError } from './api-error'
import { buildTasteProfile } from './recommendation-taste-profile'

export const WATCHED_MOVIES_TABLE = 'user_watched_movies'
export const MY_LIST_TABLE = 'user_my_list'
const MOVIES_TABLE = 'movies'
export const MIN_RECOMMENDATIONS_TO_CACHE = 5
export const TARGET_RECOMMENDATIONS = 20
export const AI_CANDIDATE_RECOMMENDATIONS = 50
const LOAD_RECOMMENDATIONS_MESSAGE = 'Unable to load recommendations right now.'
const GENERATE_RECOMMENDATIONS_MESSAGE = 'Unable to generate recommendations right now.'

const SYSTEM_PROMPT = `You are a movie recommendation engine.
Analyze the user's taste profile from their watch history: preferred genres, directors, eras, themes, and tone.

Recommend exactly ${AI_CANDIDATE_RECOMMENDATIONS} candidate movies, obeying these rules:
1. HARD PROHIBITION — watched and recently recommended lists: Never recommend any movie from the WATCHED list or the RECENTLY RECOMMENDED list. Not even sequels, remakes, or alternate cuts of those exact titles. This constraint is absolute and overrides everything else. If you are unsure whether a movie is on these lists, do not include it.
2. WATCHLIST (My List): The user already knows about these movies and has deliberately saved them. Your default should be 0 recommendations from this list. Only include a My List movie when it is the single best possible match for the user's taste AND no comparable undiscovered film exists. Prefer 0; the server will enforce the final My List limit.
3. Aim for variety across genres and decades while staying true to the inferred taste profile.
4. Return movie titles in their original release language and script exactly as TMDB original_title. Do not transliterate, anglicize, or use localized variants (e.g. ゴジラ-1.0 not Godzilla Minus One).
5. Respond ONLY with a valid JSON array of exactly ${AI_CANDIDATE_RECOMMENDATIONS} objects with keys "name", "originalName", and "year". No explanation, no markdown, no code fences. Example:
[{"name": "ゴジラ-1.0", "originalName": "ゴジラ-1.0", "year": 2023}]`

const RECOMMENDATION_RESPONSE_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    recommendations: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          name: {
            type: 'string',
            description: 'Movie title in original release language/script',
          },
          originalName: {
            type: 'string',
            description: 'Exact original TMDB title in original release language/script',
          },
          year: { type: 'integer', description: 'Release year' },
        },
        required: ['name', 'originalName', 'year'],
      },
    },
  },
  required: ['recommendations'],
} satisfies Record<string, unknown>

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
  genres?: string[]
  popularity?: number
  voteCount?: number
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
  genres?: string[]
  popularity?: number
  vote_count?: number
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

interface RecommendationErrorContext {
  event?: H3Event
  userId?: string
}

interface RecommendationObjectResponse {
  recommendations: unknown
}

function throwRecommendationSupabaseError(
  cause: unknown,
  publicMessage: string,
  logEvent: string,
  extra: Record<string, unknown>,
  context: RecommendationErrorContext = {}
): never {
  const { event, userId } = context

  if (event) {
    throwSupabaseError(event, cause, {
      event: logEvent,
      userId,
      publicMessage,
      extra,
    })
  }

  logPrivateError({
    cause,
    event: logEvent,
    source: 'supabase',
    statusCode: 500,
    userId,
    extra,
  })

  throw createError({
    statusCode: 500,
    statusMessage: publicMessage,
  })
}

function throwPlatformAiRecommendationError(
  cause: unknown,
  logEvent: string,
  context: RecommendationErrorContext & { statusCode: number }
): never {
  const { event, userId, statusCode } = context

  if (event) {
    throwAiProviderError(event, cause, {
      event: logEvent,
      userId,
      publicMessage: GENERATE_RECOMMENDATIONS_MESSAGE,
      statusCode,
    })
  }

  logPrivateError({
    cause,
    event: logEvent,
    source: 'ai_provider',
    statusCode,
    userId,
  })

  throw createError({
    statusCode,
    statusMessage: GENERATE_RECOMMENDATIONS_MESSAGE,
  })
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

function isRecommendationObjectResponse(value: unknown): value is RecommendationObjectResponse {
  return typeof value === 'object' && value !== null && 'recommendations' in value
}

function normalizeRecommendationPayload(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value
  }

  if (isRecommendationObjectResponse(value)) {
    return value.recommendations
  }

  return value
}

function parseRecommendationResponse(
  raw: string,
  userId?: string,
  event?: H3Event
): Recommendation[] {
  let parsed: unknown

  try {
    parsed = JSON.parse(raw)
  } catch (error) {
    throwPlatformAiRecommendationError(error, 'recommendation.ai_provider_parse_failed', {
      event,
      userId,
      statusCode: 502,
    })
  }

  const normalized = normalizeRecommendationPayload(parsed)

  if (!isRecommendationArray(normalized)) {
    throwPlatformAiRecommendationError(
      new Error('AI provider response did not match the expected recommendation schema.'),
      'recommendation.ai_provider_schema_failed',
      {
        event,
        userId,
        statusCode: 502,
      }
    )
  }

  return normalized
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

  // accept only titles if no year match
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
  columns: string,
  context: RecommendationErrorContext = {}
): Promise<T[]> {
  if (tmdbIds.length === 0) {
    return []
  }

  const { data, error } = await supabase.from(MOVIES_TABLE).select(columns).in('tmdb_id', tmdbIds)

  if (error) {
    throwRecommendationSupabaseError(
      error,
      LOAD_RECOMMENDATIONS_MESSAGE,
      'recommendation.movie_rows_fetch_failed',
      {
        table: MOVIES_TABLE,
        operation: 'select',
      },
      context
    )
  }

  return (data ?? []) as unknown as T[]
}

async function hydratePromptMovies(
  supabase: SupabaseClient,
  tmdbIds: number[],
  context: RecommendationErrorContext = {}
): Promise<WatchedMovieRecord[]> {
  const rows = await fetchMovieRowsByIds<MoviePromptRow>(
    supabase,
    tmdbIds,
    'tmdb_id, title, release_date, genres, popularity, vote_count',
    context
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
        genres: row.genres ?? [],
        popularity: row.popularity ?? 0,
        voteCount: row.vote_count ?? 0,
      },
    ]
  })
}

export async function hydrateRecommendationsByTmdbIds(
  supabase: SupabaseClient,
  tmdbIds: number[],
  context: RecommendationErrorContext = {}
): Promise<RecommendationWithId[]> {
  const rows = await fetchMovieRowsByIds<RecommendationMovieRow>(
    supabase,
    tmdbIds,
    'tmdb_id, title, original_title, release_date',
    context
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
  userId: string,
  context: RecommendationErrorContext = {}
): Promise<WatchedMovieRecord[]> {
  const { data, error } = await supabase
    .from(WATCHED_MOVIES_TABLE)
    .select('tmdb_id')
    .eq('user_id', userId)

  if (error) {
    throwRecommendationSupabaseError(
      error,
      LOAD_RECOMMENDATIONS_MESSAGE,
      'recommendation.watched_fetch_failed',
      {
        table: WATCHED_MOVIES_TABLE,
        operation: 'select',
      },
      {
        ...context,
        userId,
      }
    )
  }

  const tmdbIds = ((data ?? []) as Array<{ tmdb_id: number }>).map((movie) => movie.tmdb_id)
  return hydratePromptMovies(supabase, tmdbIds, {
    ...context,
    userId,
  })
}

export async function fetchMyListMovies(
  supabase: SupabaseClient,
  userId: string,
  context: RecommendationErrorContext = {}
): Promise<WatchedMovieRecord[]> {
  const { data, error } = await supabase
    .from(MY_LIST_TABLE)
    .select('tmdb_ids')
    .eq('user_id', userId)
    .limit(1)
    .maybeSingle()

  if (error) {
    throwRecommendationSupabaseError(
      error,
      LOAD_RECOMMENDATIONS_MESSAGE,
      'recommendation.my_list_fetch_failed',
      {
        table: MY_LIST_TABLE,
        operation: 'select',
      },
      {
        ...context,
        userId,
      }
    )
  }

  const tmdbIds = Array.isArray(data?.tmdb_ids) ? (data.tmdb_ids as number[]) : []
  return hydratePromptMovies(supabase, tmdbIds, {
    ...context,
    userId,
  })
}

function formatPromptMovies(movies: WatchedMovieRecord[], includeGenres: boolean): string {
  if (movies.length === 0) {
    return '- None'
  }

  return movies
    .map((movie) => {
      const genreLabel =
        includeGenres && movie.genres && movie.genres.length > 0
          ? ` - ${movie.genres.join(', ')}`
          : ''

      return `- ${movie.title} (${movie.year})${genreLabel}`
    })
    .join('\n')
}

export function buildUserMessage(
  watchedMovies: WatchedMovieRecord[],
  myListMovies: WatchedMovieRecord[],
  excludedMovies: Array<{ name: string; originalName?: string; year: number }> = []
): string {
  const tasteProfile = buildTasteProfile(watchedMovies, myListMovies)
  const topGenres = tasteProfile.topGenres.length > 0 ? tasteProfile.topGenres.join(', ') : 'None'
  const favoriteDecades =
    tasteProfile.favoriteDecades.length > 0 ? tasteProfile.favoriteDecades.join(', ') : 'None'
  const excludedList = excludedMovies
    .map((m) => {
      const originalLabel =
        m.originalName && m.originalName !== m.name ? ` / ${m.originalName}` : ''
      return `- ${m.name}${originalLabel} (${m.year})`
    })
    .join('\n')
  const excludedSection =
    excludedMovies.length === 0
      ? ''
      : `
RECENTLY RECOMMENDED (FORBIDDEN) - do NOT repeat any of these:
${excludedList}
`

  return `TASTE PROFILE:
- Top genres: ${topGenres}
- Favorite decades/eras: ${favoriteDecades}

REPRESENTATIVE WATCHED MOVIES:
${formatPromptMovies(tasteProfile.representativeWatchedMovies, true)}

TOP WATCHED MOVIES:
${formatPromptMovies(tasteProfile.topWatchedMovies, false)}

MY LIST REMINDERS:
${formatPromptMovies(tasteProfile.myListReminderMovies, false)}
${excludedSection}
Recommend exactly ${AI_CANDIDATE_RECOMMENDATIONS} candidate movies I would enjoy. These are candidates, not final output: the server will remove watched movies, recently recommended movies, unresolved titles, duplicates, and excess My List matches before keeping up to ${TARGET_RECOMMENDATIONS} final recommendations.
Prefer undiscovered movies over My List reminders.`
}
export async function appendTmdbIds(
  recommendations: Recommendation[],
  event?: import('h3').H3Event
): Promise<{ recommendations: RecommendationWithId[]; tmdbFallbackCount: number }> {
  const limited = recommendations.slice(0, AI_CANDIDATE_RECOMMENDATIONS)

  const allCandidates = limited.flatMap((recommendation) =>
    getSearchCandidates(recommendation).map((query) => ({
      query,
      year: recommendation.year,
    }))
  )

  let searchMap: Map<string, MovieSearchResult[]>
  try {
    searchMap = await searchMoviesBatch(allCandidates)
  } catch (error) {
    logPrivateError({
      cause: error,
      event: 'recommendation.search_batch_failed',
      source: 'supabase',
      statusCode: 500,
      extra: {
        candidates: allCandidates,
        candidateCount: allCandidates.length,
      },
    })

    return {
      recommendations: limited.map((rec) => ({ ...rec, tmdbId: null })),
      tmdbFallbackCount: 0,
    }
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

export async function getRecommendationsFromPlatformAi(
  watchedMovies: WatchedMovieRecord[],
  myListMovies: WatchedMovieRecord[],
  userId?: string,
  event?: import('h3').H3Event,
  excludedMovies: RecommendationWithId[] = []
): Promise<{
  recommendations: RecommendationWithId[]
  tmdbFallbackCount: number
  systemPrompt: string
  userMessage: string
}> {
  const systemPrompt = `${SYSTEM_PROMPT}\n${EXACT_ORIGINAL_TITLE_PROMPT_SUFFIX}\n${POPULAR_MOVIE_PROMPT_SUFFIX}`
  const userMessage = buildUserMessage(watchedMovies, myListMovies, excludedMovies)

  const raw = await askPlatformAi({
    systemPrompt,
    userMessage,
    schema: RECOMMENDATION_RESPONSE_SCHEMA,
    schemaName: 'movie_recommendations',
    userId,
    event,
  })

  const parsed = parseRecommendationResponse(raw, userId, event)
  const result = await appendTmdbIds(parsed, event)
  return { ...result, systemPrompt, userMessage }
}
