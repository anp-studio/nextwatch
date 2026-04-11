import type { ResultSet } from '@libsql/client'

const MAX_RESULTS = 20
const MIN_QUERY_LENGTH = 2

const SEARCH_SQL = `SELECT m.tmdb_id,
                 m.original_title,
                 m.popularity,
                 bm25(movies_fts) AS relevance_score,
                 CASE
                   WHEN LOWER(m.original_title) = LOWER(?) THEN 0
                   WHEN LOWER(m.original_title) LIKE LOWER(?) || '%' THEN 1
                   WHEN LOWER(m.original_title) LIKE '%' || LOWER(?) || '%' THEN 2
                   ELSE 3
                 END AS title_match_bucket
          FROM movies_fts f
          JOIN movies_index m ON m.tmdb_id = f.rowid
          WHERE movies_fts MATCH ?
          ORDER BY title_match_bucket ASC, relevance_score ASC, m.popularity DESC
          LIMIT ?`

export interface MovieSearchResult {
  tmdb_id: number
  original_title: string
  popularity: number
}

function buildFtsQuery(normalizedQuery: string): string {
  const tokens = normalizedQuery
    .split(/\s+/)
    .map((token) => token.replace(/"/g, '""'))
    .filter((token) => token.length > 0)

  return tokens
    .map((token, index) => {
      const needsQuotes = /[^\p{L}\p{N}_]/u.test(token)
      const wildcardSuffix = index === tokens.length - 1 ? '*' : ''
      return needsQuotes ? `"${token}"${wildcardSuffix}` : `${token}${wildcardSuffix}`
    })
    .join(' ')
}

function buildSearchStatement(query: string): { sql: string; args: (string | number)[] } | null {
  const normalizedQuery = query.trim()
  if (normalizedQuery.length < MIN_QUERY_LENGTH) return null

  return {
    sql: SEARCH_SQL,
    args: [
      normalizedQuery,
      normalizedQuery,
      normalizedQuery,
      buildFtsQuery(normalizedQuery),
      MAX_RESULTS,
    ],
  }
}

function mapRows(resultSet: ResultSet): MovieSearchResult[] {
  return resultSet.rows.map((row) => ({
    tmdb_id: row[0] as number,
    original_title: row[1] as string,
    popularity: row[2] as number,
  }))
}

export async function searchMovies(query: string): Promise<MovieSearchResult[]> {
  const statement = buildSearchStatement(query)
  if (!statement) return []

  const db = useDb()
  const result = await db.execute(statement)
  return mapRows(result)
}

export async function searchMoviesBatch(
  candidates: string[]
): Promise<Map<string, MovieSearchResult[]>> {
  const unique = [
    ...new Set(candidates.map((c) => c.trim()).filter((c) => c.length >= MIN_QUERY_LENGTH)),
  ]
  if (unique.length === 0) return new Map()

  const statements = unique.map((q) => buildSearchStatement(q)!)
  const db = useDb()
  const resultSets = await db.batch(statements)

  const resultMap = new Map<string, MovieSearchResult[]>()
  for (let i = 0; i < unique.length; i++) {
    resultMap.set(unique[i]!, mapRows(resultSets[i]!))
  }
  return resultMap
}
