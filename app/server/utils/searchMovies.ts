import { createClient } from '@supabase/supabase-js'
import type { SupabaseClient } from '@supabase/supabase-js'

const MAX_RESULTS = 20
const SEARCH_CANDIDATE_LIMIT = 50
const MIN_QUERY_LENGTH = 2
const MOVIES_TABLE = 'movies'
const SEARCH_COLUMNS = 'tmdb_id, original_title, popularity, release_date'
const PREFIX_SUFFIX = ':*'
const SEARCH_TOKEN_SEPARATOR = ' & '
const EXACT_MATCH_BUCKET = 0
const PREFIX_MATCH_BUCKET = 1
const CONTAINS_MATCH_BUCKET = 2
const FALLBACK_MATCH_BUCKET = 3
const MIN_SIGNIFICANT_TOKEN_LENGTH = 2

interface MovieSearchRow {
  tmdb_id: number
  original_title: string
  popularity: number
  release_date: string
}

export interface MovieSearchResult {
  tmdb_id: number
  original_title: string
  popularity: number
  year: number
}

function createSearchSupabaseClient(): SupabaseClient {
  const config = useRuntimeConfig()
  const { supabaseUrl } = config.public
  const serviceRoleKey = config.supabaseServiceRoleKey

  if (!supabaseUrl || !serviceRoleKey) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Supabase service role is not configured.',
    })
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  })
}

function parseYear(releaseDate: string): number {
  const year = Number.parseInt(releaseDate.split('-')[0] || '0', 10)
  return Number.isFinite(year) ? year : 0
}

function normalizeQuery(query: string): string {
  return query.trim().toLowerCase()
}

function buildSearchTokens(query: string): string[] {
  return normalizeQuery(query).match(/[\p{L}\p{N}]+/gu) ?? []
}

function buildFtsQuery(query: string): string | null {
  const tokens = buildSearchTokens(query)
  if (tokens.length === 0) {
    return null
  }

  return tokens
    .map((token, index) => `${token}${index === tokens.length - 1 ? PREFIX_SUFFIX : ''}`)
    .join(SEARCH_TOKEN_SEPARATOR)
}

function buildComparableTokens(query: string): string[] {
  const tokens = buildSearchTokens(query).filter(
    (token) => token.length >= MIN_SIGNIFICANT_TOKEN_LENGTH
  )

  return tokens.length > 0 ? tokens : buildSearchTokens(query)
}

function getTitleMatchBucket(title: string, normalizedQuery: string): number {
  const normalizedTitle = title.trim().toLowerCase()

  if (normalizedTitle === normalizedQuery) {
    return EXACT_MATCH_BUCKET
  }

  if (normalizedTitle.startsWith(normalizedQuery)) {
    return PREFIX_MATCH_BUCKET
  }

  if (normalizedTitle.includes(normalizedQuery)) {
    return CONTAINS_MATCH_BUCKET
  }

  return FALLBACK_MATCH_BUCKET
}

function isStrictTitleMatch(title: string, query: string): boolean {
  const normalizedTitle = title.trim().toLowerCase()
  const comparableTokens = buildComparableTokens(query)

  return comparableTokens.every((token) => normalizedTitle.includes(token))
}

function sortSearchResults(rows: MovieSearchRow[], normalizedQuery: string): MovieSearchResult[] {
  return rows
    .slice()
    .filter((row) => isStrictTitleMatch(row.original_title, normalizedQuery))
    .sort((left, right) => {
      const bucketDifference =
        getTitleMatchBucket(left.original_title, normalizedQuery) -
        getTitleMatchBucket(right.original_title, normalizedQuery)

      if (bucketDifference !== 0) {
        return bucketDifference
      }

      return right.popularity - left.popularity
    })
    .slice(0, MAX_RESULTS)
    .map((row) => ({
      tmdb_id: row.tmdb_id,
      original_title: row.original_title,
      popularity: row.popularity,
      year: parseYear(row.release_date),
    }))
}

async function executeSearch(
  supabase: SupabaseClient,
  query: string
): Promise<MovieSearchResult[]> {
  const normalizedQuery = normalizeQuery(query)
  if (normalizedQuery.length < MIN_QUERY_LENGTH) {
    return []
  }

  const ftsQuery = buildFtsQuery(normalizedQuery)
  if (!ftsQuery) {
    return []
  }

  const { data, error } = await supabase
    .from(MOVIES_TABLE)
    .select(SEARCH_COLUMNS)
    .filter('fts_vector', 'fts', ftsQuery)
    .order('popularity', { ascending: false })
    .limit(SEARCH_CANDIDATE_LIMIT)

  if (error) {
    throw createError({ statusCode: 500, statusMessage: error.message })
  }

  return sortSearchResults((data ?? []) as MovieSearchRow[], normalizedQuery)
}

export async function searchMovies(query: string): Promise<MovieSearchResult[]> {
  return executeSearch(createSearchSupabaseClient(), query)
}

export async function searchMoviesBatch(
  candidates: string[]
): Promise<Map<string, MovieSearchResult[]>> {
  const uniqueCandidates = [
    ...new Set(
      candidates
        .map((candidate) => candidate.trim())
        .filter((candidate) => candidate.length >= MIN_QUERY_LENGTH)
    ),
  ]
  if (uniqueCandidates.length === 0) {
    return new Map()
  }

  const supabase = createSearchSupabaseClient()
  // retun structured response
  // ex. { "the matrix": [{ tmdb_id: 603, original_title: "The Matrix", popularity: 80.0, year: 1999 }, ...]}
  const searchResults = await Promise.all(
    uniqueCandidates.map(
      async (candidate) => [candidate, await executeSearch(supabase, candidate)] as const
    )
  )

  return new Map(searchResults)
}
