import type { SupabaseClient } from '@supabase/supabase-js'
import type { H3Event } from 'h3'
import { askPlatformAi } from './ai-client'
import type { PlatformAiMessage } from './ai-client'
import { searchMoviesBatch } from './searchMovies'
import { fetchTmdb } from './tmdb'
import { logPrivateError, throwAiProviderError, throwSupabaseError } from './api-error'
import { buildTasteProfile } from './recommendation-taste-profile'

export const WATCHED_MOVIES_TABLE = 'user_watched_movies'
export const MY_LIST_TABLE = 'user_my_list'
const MOVIES_TABLE = 'movies'
export const MIN_RECOMMENDATIONS_TO_CACHE = 5
export const TARGET_RECOMMENDATIONS = 20
export const INITIAL_RECOMMENDATION_COUNT = 100
export const AI_CANDIDATE_RECOMMENDATIONS = INITIAL_RECOMMENDATION_COUNT
export const MAX_RECOMMENDATION_ROUNDS = 3
export const MAX_MY_LIST_RECOMMENDATIONS = 2
const LOAD_RECOMMENDATIONS_MESSAGE = 'Unable to load recommendations right now.'
const GENERATE_RECOMMENDATIONS_MESSAGE = 'Unable to generate recommendations right now.'
const UNKNOWN_YEAR_LABEL = 'unknown year'
const HIGH_BLOCKED_GUIDANCE_THRESHOLD = 0.5

const SYSTEM_PROMPT = `You are a movie recommendation engine.
Analyze the user's taste profile from their watch history: preferred genres, directors, eras, themes, and tone.

Recommend exactly ${INITIAL_RECOMMENDATION_COUNT} candidate movies, obeying these rules:
1. Backend validation is the source of truth. You suggest candidates; the server will remove watched movies, repeated recommendations, unresolved titles, duplicate TMDB matches, and excess My List matches.
2. WATCHLIST (My List): The user already knows about these movies and has deliberately saved them. Prefer undiscovered movies; the server will keep at most ${MAX_MY_LIST_RECOMMENDATIONS} My List matches.
3. Aim for variety across genres and decades while staying true to the inferred taste profile.
4. Return movie titles in their original release language and script exactly as TMDB original_title. Do not transliterate, anglicize, or use localized variants (e.g. ゴジラ-1.0 not Godzilla Minus One).
5. Every item must include a stable "index" inside the response, "title", "release_year" when known or null when unknown, and "short_reason".
6. Respond ONLY with structured recommendations. No explanation, no markdown, no code fences.`

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
          index: {
            type: 'integer',
            description: 'Stable item index inside this response',
          },
          title: {
            type: 'string',
            description: 'Movie title in original release language/script',
          },
          release_year: {
            anyOf: [{ type: 'integer' }, { type: 'null' }],
            description: 'Release year when known, otherwise null',
          },
          short_reason: {
            type: 'string',
            description: 'Brief reason this movie fits the taste profile',
          },
        },
        required: ['index', 'title', 'release_year', 'short_reason'],
      },
    },
  },
  required: ['recommendations'],
} satisfies Record<string, unknown>

const REPLACEMENT_RESPONSE_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    recommendations: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          replaced_index: {
            type: 'integer',
            description: 'Blocked index from the previous assistant response this item replaces',
          },
          title: {
            type: 'string',
            description: 'Movie title in original release language/script',
          },
          release_year: {
            anyOf: [{ type: 'integer' }, { type: 'null' }],
            description: 'Release year when known, otherwise null',
          },
          short_reason: {
            type: 'string',
            description: 'Brief reason this replacement fits the taste profile',
          },
        },
        required: ['replaced_index', 'title', 'release_year', 'short_reason'],
      },
    },
  },
  required: ['recommendations'],
} satisfies Record<string, unknown>

const EXACT_ORIGINAL_TITLE_PROMPT_SUFFIX = `
Additional hard requirements:
- "title" must be the exact TMDB "original_title" value, character-for-character, in the original release language and script.
- Never translate, localize, anglicize, transliterate, simplify accents, or substitute an alternate marketing title in "title".
- Example: for The Fifth Element, use "Le Cinquième Élément" if that is the TMDB original title; do not output "The Fifth Element" as "title".`

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
  year: number | null
  shortReason?: string
}

export interface RecommendationWithId extends Recommendation {
  tmdbId: number | null
}

export interface IndexedRecommendationWithId extends RecommendationWithId {
  index: number
}

export type BlockedRecommendationReason =
  | 'watched'
  | 'watchlist'
  | 'duplicate'
  | 'unresolved'
  | 'already_blocked'
  | 'already_accepted'

export interface BlockedRecommendation {
  index: number
  title: string
  release_year: number | null
  tmdb_id: number | null
  reason: BlockedRecommendationReason
}

export interface RecommendationValidationState {
  watchedIds: Set<number>
  myListIds: Set<number>
  acceptedIds: Set<number>
  blockedIds: Set<number>
  blockedTitleKeys: Set<string>
  myListAcceptedCount: number
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

interface InitialModelRecommendation {
  index: number
  title: string
  release_year: number | null
  short_reason: string
}

interface ReplacementModelRecommendation {
  replaced_index: number
  title: string
  release_year: number | null
  short_reason: string
}

interface ValidationBatchResult {
  accepted: IndexedRecommendationWithId[]
  blocked: BlockedRecommendation[]
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
        (typeof (item as Record<string, unknown>).year === 'number' ||
          (item as Record<string, unknown>).year === null)
    )
  )
}

function isKnownOrUnknownYear(value: unknown): value is number | null {
  return typeof value === 'number' || value === null
}

function isInitialModelRecommendationArray(value: unknown): value is InitialModelRecommendation[] {
  return (
    Array.isArray(value) &&
    value.every((item) => {
      if (typeof item !== 'object' || item === null) {
        return false
      }

      const record = item as Record<string, unknown>
      return (
        typeof record.index === 'number' &&
        Number.isInteger(record.index) &&
        typeof record.title === 'string' &&
        isKnownOrUnknownYear(record.release_year) &&
        typeof record.short_reason === 'string'
      )
    })
  )
}

function isReplacementModelRecommendationArray(
  value: unknown
): value is ReplacementModelRecommendation[] {
  return (
    Array.isArray(value) &&
    value.every((item) => {
      if (typeof item !== 'object' || item === null) {
        return false
      }

      const record = item as Record<string, unknown>
      return (
        typeof record.replaced_index === 'number' &&
        Number.isInteger(record.replaced_index) &&
        typeof record.title === 'string' &&
        isKnownOrUnknownYear(record.release_year) &&
        typeof record.short_reason === 'string'
      )
    })
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

function parseJsonRecommendationResponse(raw: string, userId?: string, event?: H3Event): unknown {
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

  return normalizeRecommendationPayload(parsed)
}

function throwRecommendationSchemaError(userId?: string, event?: H3Event): never {
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

function parseInitialRecommendationResponse(
  raw: string,
  userId?: string,
  event?: H3Event
): InitialModelRecommendation[] {
  const normalized = parseJsonRecommendationResponse(raw, userId, event)

  if (!isInitialModelRecommendationArray(normalized)) {
    throwRecommendationSchemaError(userId, event)
  }

  return normalized
}

function parseReplacementRecommendationResponse(
  raw: string,
  userId?: string,
  event?: H3Event
): ReplacementModelRecommendation[] {
  const normalized = parseJsonRecommendationResponse(raw, userId, event)

  if (!isReplacementModelRecommendationArray(normalized)) {
    throwRecommendationSchemaError(userId, event)
  }

  return normalized
}

function toRecommendation(
  recommendation: InitialModelRecommendation | ReplacementModelRecommendation
): Recommendation {
  const title = recommendation.title.trim()

  return {
    name: title,
    originalName: title,
    year: recommendation.release_year,
    shortReason: recommendation.short_reason,
  }
}

function toIndexedRecommendation(
  recommendation: InitialModelRecommendation,
  resolvedRecommendation: RecommendationWithId
): IndexedRecommendationWithId {
  return {
    ...resolvedRecommendation,
    index: recommendation.index,
  }
}

function toIndexedReplacementRecommendation(
  recommendation: ReplacementModelRecommendation,
  resolvedRecommendation: RecommendationWithId
): IndexedRecommendationWithId {
  return {
    ...resolvedRecommendation,
    index: recommendation.replaced_index,
  }
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

function getSearchYear(recommendation: Recommendation): number | undefined {
  if (
    typeof recommendation.year === 'number' &&
    Number.isInteger(recommendation.year) &&
    recommendation.year > 0
  ) {
    return recommendation.year
  }

  return undefined
}

function formatRecommendationYear(year: number | null): string {
  return year === null ? UNKNOWN_YEAR_LABEL : year.toString()
}

function pickBestMatchId(
  candidates: string[],
  results: MovieSearchResult[],
  recommendationYear?: number
): number | null {
  if (results.length === 0) return null

  const normalizedCandidates = candidates.map(normalizeTitleForComparison)

  if (recommendationYear) {
    const titleAndYearMatch = results.find(
      (r) =>
        r.year === recommendationYear &&
        normalizedCandidates.some((c) => c === normalizeTitleForComparison(r.original_title))
    )
    if (titleAndYearMatch) return titleAndYearMatch.tmdb_id
  }

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
  recommendationYear?: number
): TmdbSearchMovieResult | null {
  if (results.length === 0) {
    return null
  }

  const normalizedCandidates = candidates.map(normalizeTitleForComparison)
  if (recommendationYear) {
    // exact is stricter. Might not be needed but I have no will to test removing it
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
  const searchYear = getSearchYear(recommendation)

  for (const candidate of candidates) {
    try {
      const payload = (await fetchTmdb(event, '/search/movie', {
        query: candidate,
        ...(searchYear && { year: searchYear }),
      })) as TmdbSearchResponse
      const bestMatch = pickBestTmdbSearchResult(candidates, payload.results ?? [], searchYear)

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
  excludedMovies: Array<{ name: string; originalName?: string; year: number | null }> = []
): string {
  const tasteProfile = buildTasteProfile(watchedMovies, myListMovies)
  const topGenres = tasteProfile.topGenres.length > 0 ? tasteProfile.topGenres.join(', ') : 'None'
  const favoriteDecades =
    tasteProfile.favoriteDecades.length > 0 ? tasteProfile.favoriteDecades.join(', ') : 'None'
  const excludedList = excludedMovies
    .map((m) => {
      const originalLabel =
        m.originalName && m.originalName !== m.name ? ` / ${m.originalName}` : ''
      return `- ${m.name}${originalLabel} (${formatRecommendationYear(m.year)})`
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
Recommend exactly ${INITIAL_RECOMMENDATION_COUNT} candidate movies I would enjoy. These are candidates, not final output: the server will remove watched movies, recently recommended movies, unresolved titles, duplicates, and excess My List matches before keeping up to ${TARGET_RECOMMENDATIONS} final recommendations. At most ${MAX_MY_LIST_RECOMMENDATIONS} final recommendations may come from My List.
Prefer undiscovered movies over My List reminders.`
}

function toRecommendationTitleKey(recommendation: Pick<Recommendation, 'name' | 'year'>): string {
  return `${normalizeTitleForComparison(recommendation.name)}::${formatRecommendationYear(recommendation.year)}`
}

function toBlockedTitleKey(recommendation: BlockedRecommendation): string {
  return `${normalizeTitleForComparison(recommendation.title)}::${formatRecommendationYear(recommendation.release_year)}`
}

export function createRecommendationValidationState(
  watchedMovies: WatchedMovieRecord[],
  myListMovies: WatchedMovieRecord[],
  blockedRecommendations: BlockedRecommendation[] = []
): RecommendationValidationState {
  const blockedIds = new Set<number>()
  const blockedTitleKeys = new Set<string>()

  for (const recommendation of blockedRecommendations) {
    if (recommendation.tmdb_id !== null) {
      blockedIds.add(recommendation.tmdb_id)
    }

    blockedTitleKeys.add(toBlockedTitleKey(recommendation))
  }

  return {
    watchedIds: new Set(watchedMovies.map((movie) => movie.tmdbId)),
    myListIds: new Set(myListMovies.map((movie) => movie.tmdbId)),
    acceptedIds: new Set(),
    blockedIds,
    blockedTitleKeys,
    myListAcceptedCount: 0,
  }
}

function createBlockedRecommendation(
  recommendation: IndexedRecommendationWithId,
  reason: BlockedRecommendationReason
): BlockedRecommendation {
  return {
    index: recommendation.index,
    title: recommendation.name,
    release_year: recommendation.year,
    tmdb_id: recommendation.tmdbId,
    reason,
  }
}

function blockRecommendation(
  recommendation: IndexedRecommendationWithId,
  reason: BlockedRecommendationReason,
  state: RecommendationValidationState,
  blocked: BlockedRecommendation[]
): void {
  const blockedRecommendation = createBlockedRecommendation(recommendation, reason)

  if (recommendation.tmdbId !== null) {
    state.blockedIds.add(recommendation.tmdbId)
  }

  state.blockedTitleKeys.add(toBlockedTitleKey(blockedRecommendation))
  blocked.push(blockedRecommendation)
}

function acceptRecommendation(
  recommendation: IndexedRecommendationWithId,
  state: RecommendationValidationState,
  accepted: IndexedRecommendationWithId[]
): void {
  if (recommendation.tmdbId === null) {
    return
  }

  state.acceptedIds.add(recommendation.tmdbId)

  if (state.myListIds.has(recommendation.tmdbId)) {
    state.myListAcceptedCount++
  }

  accepted.push(recommendation)
}

function getBlockReason(
  recommendation: IndexedRecommendationWithId,
  state: RecommendationValidationState,
  currentIds: Set<number>,
  currentTitleKeys: Set<string>
): BlockedRecommendationReason | null {
  const titleKey = toRecommendationTitleKey(recommendation)

  if (currentTitleKeys.has(titleKey)) {
    return 'duplicate'
  }
  currentTitleKeys.add(titleKey)

  if (recommendation.tmdbId === null) {
    return state.blockedTitleKeys.has(titleKey) ? 'already_blocked' : 'unresolved'
  }

  if (currentIds.has(recommendation.tmdbId)) {
    return 'duplicate'
  }
  currentIds.add(recommendation.tmdbId)

  if (state.acceptedIds.has(recommendation.tmdbId)) {
    return 'already_accepted'
  }

  if (state.blockedIds.has(recommendation.tmdbId) || state.blockedTitleKeys.has(titleKey)) {
    return 'already_blocked'
  }

  if (state.watchedIds.has(recommendation.tmdbId)) {
    return 'watched'
  }

  if (
    state.myListIds.has(recommendation.tmdbId) &&
    state.myListAcceptedCount >= MAX_MY_LIST_RECOMMENDATIONS
  ) {
    return 'watchlist'
  }

  return null
}

export function validateRecommendationBatch(
  recommendations: IndexedRecommendationWithId[],
  state: RecommendationValidationState
): ValidationBatchResult {
  const accepted: IndexedRecommendationWithId[] = []
  const blocked: BlockedRecommendation[] = []
  const currentIds = new Set<number>()
  const currentTitleKeys = new Set<string>()

  for (const recommendation of recommendations) {
    const blockReason = getBlockReason(recommendation, state, currentIds, currentTitleKeys)

    if (blockReason) {
      blockRecommendation(recommendation, blockReason, state, blocked)
      continue
    }

    acceptRecommendation(recommendation, state, accepted)
  }

  return {
    accepted,
    blocked,
  }
}

export async function appendTmdbIds(
  recommendations: Recommendation[],
  event?: import('h3').H3Event
): Promise<{ recommendations: RecommendationWithId[]; tmdbFallbackCount: number }> {
  const limited = recommendations.slice(0, AI_CANDIDATE_RECOMMENDATIONS)

  const allCandidates = limited.flatMap((recommendation) =>
    getSearchCandidates(recommendation).map((query) => ({
      query,
      year: getSearchYear(recommendation),
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
      const searchYear = getSearchYear(recommendation)

      for (const candidate of candidates) {
        const searchResults = searchMap.get(`${candidate}::${searchYear ?? ''}`) ?? []
        const tmdbId = pickBestMatchId(candidates, searchResults, searchYear)
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

function toIndexedRecommendations(
  modelRecommendations: InitialModelRecommendation[],
  resolvedRecommendations: RecommendationWithId[]
): IndexedRecommendationWithId[] {
  const recommendations: IndexedRecommendationWithId[] = []

  for (const [index, modelRecommendation] of modelRecommendations.entries()) {
    const resolvedRecommendation = resolvedRecommendations[index]

    if (!resolvedRecommendation) {
      continue
    }

    recommendations.push(toIndexedRecommendation(modelRecommendation, resolvedRecommendation))
  }

  return recommendations
}

function toIndexedReplacementRecommendations(
  modelRecommendations: ReplacementModelRecommendation[],
  resolvedRecommendations: RecommendationWithId[]
): IndexedRecommendationWithId[] {
  const recommendations: IndexedRecommendationWithId[] = []

  for (const [index, modelRecommendation] of modelRecommendations.entries()) {
    const resolvedRecommendation = resolvedRecommendations[index]

    if (!resolvedRecommendation) {
      continue
    }

    recommendations.push(
      toIndexedReplacementRecommendation(modelRecommendation, resolvedRecommendation)
    )
  }

  return recommendations
}

async function resolveInitialRecommendations(
  modelRecommendations: InitialModelRecommendation[],
  event?: import('h3').H3Event
): Promise<{ recommendations: IndexedRecommendationWithId[]; tmdbFallbackCount: number }> {
  const result = await appendTmdbIds(modelRecommendations.map(toRecommendation), event)

  return {
    recommendations: toIndexedRecommendations(modelRecommendations, result.recommendations),
    tmdbFallbackCount: result.tmdbFallbackCount,
  }
}

async function resolveReplacementRecommendations(
  modelRecommendations: ReplacementModelRecommendation[],
  event?: import('h3').H3Event
): Promise<{ recommendations: IndexedRecommendationWithId[]; tmdbFallbackCount: number }> {
  const result = await appendTmdbIds(modelRecommendations.map(toRecommendation), event)

  return {
    recommendations: toIndexedReplacementRecommendations(
      modelRecommendations,
      result.recommendations
    ),
    tmdbFallbackCount: result.tmdbFallbackCount,
  }
}

function toIndexes(recommendations: Array<{ index: number }>): number[] {
  return recommendations.map((recommendation) => recommendation.index)
}

function shouldAskForDeeperCuts(result: ValidationBatchResult): boolean {
  const total = result.accepted.length + result.blocked.length

  return total > 0 && result.blocked.length / total >= HIGH_BLOCKED_GUIDANCE_THRESHOLD
}

function buildReplacementUserMessage(
  acceptedIndexes: number[],
  blockedIndexes: number[],
  replacementsNeeded: number,
  useDeeperCutGuidance: boolean
): string {
  const deeperCutGuidance = useDeeperCutGuidance
    ? `
Many recommendations were blocked. Go less obvious, avoid mainstream repeats, vary decades, directors, and genres, and suggest deeper cuts that still fit the taste profile.`
    : ''

  return `Backend validation completed for your previous assistant response.
accepted_indexes: ${JSON.stringify(acceptedIndexes)}
blocked_indexes: ${JSON.stringify(blockedIndexes)}
new_replacements_needed: ${replacementsNeeded}

You already know which titles those indexes refer to from your previous assistant response.
Generate only ${replacementsNeeded} replacement recommendations for blocked indexes.
Do not repeat accepted or blocked recommendations from earlier rounds.
Each item must include replaced_index, title, release_year, and short_reason.${deeperCutGuidance}`
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
  const messages: PlatformAiMessage[] = [
    {
      role: 'system',
      content: systemPrompt,
    },
    {
      role: 'user',
      content: userMessage,
    },
  ]
  const validationState = createRecommendationValidationState(watchedMovies, myListMovies)
  const acceptedRecommendations: IndexedRecommendationWithId[] = []
  let tmdbFallbackCount = 0

  const raw = await askPlatformAi({
    systemPrompt,
    userMessage,
    messages: [...messages],
    schema: RECOMMENDATION_RESPONSE_SCHEMA,
    schemaName: 'movie_recommendations',
    userId,
    event,
  })
  messages.push({
    role: 'assistant',
    content: raw,
  })

  const parsed = parseInitialRecommendationResponse(raw, userId, event)
  const initialResult = await resolveInitialRecommendations(parsed, event)
  tmdbFallbackCount += initialResult.tmdbFallbackCount

  let validationResult = validateRecommendationBatch(initialResult.recommendations, validationState)
  acceptedRecommendations.push(...validationResult.accepted)

  for (
    let round = 2;
    round <= MAX_RECOMMENDATION_ROUNDS &&
    acceptedRecommendations.length < TARGET_RECOMMENDATIONS &&
    validationResult.blocked.length > 0;
    round++
  ) {
    const replacementsNeeded = TARGET_RECOMMENDATIONS - acceptedRecommendations.length
    const followUpMessage = buildReplacementUserMessage(
      toIndexes(validationResult.accepted),
      toIndexes(validationResult.blocked),
      replacementsNeeded,
      shouldAskForDeeperCuts(validationResult)
    )

    messages.push({
      role: 'user',
      content: followUpMessage,
    })

    const replacementRaw = await askPlatformAi({
      systemPrompt,
      userMessage,
      messages: [...messages],
      schema: REPLACEMENT_RESPONSE_SCHEMA,
      schemaName: 'movie_recommendation_replacements',
      userId,
      event,
      rateLimit: false,
    })
    messages.push({
      role: 'assistant',
      content: replacementRaw,
    })

    const replacements = parseReplacementRecommendationResponse(replacementRaw, userId, event)
    const replacementResult = await resolveReplacementRecommendations(replacements, event)
    tmdbFallbackCount += replacementResult.tmdbFallbackCount
    validationResult = validateRecommendationBatch(
      replacementResult.recommendations,
      validationState
    )
    acceptedRecommendations.push(...validationResult.accepted)
  }

  return {
    recommendations: acceptedRecommendations.slice(0, TARGET_RECOMMENDATIONS),
    tmdbFallbackCount,
    systemPrompt,
    userMessage,
  }
}
