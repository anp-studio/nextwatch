const MAX_RESULTS = 20
const MIN_QUERY_LENGTH = 2

export interface MovieSearchResult {
  tmdb_id: number
  original_title: string
  popularity: number
}

export async function searchMovies(query: string): Promise<MovieSearchResult[]> {
  const normalizedQuery = query.trim()
  if (normalizedQuery.length < MIN_QUERY_LENGTH) return []

  const ftsQuery =
    normalizedQuery
      .trim()
      .split(/\s+/)
      .map((token) => `"${token.replace(/"/g, '""')}"`)
      .join(' ') + '*'

  const db = useDb()
  const rows = await db.execute({
    sql: `SELECT m.tmdb_id,
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
          LIMIT ?`,
    args: [normalizedQuery, normalizedQuery, normalizedQuery, ftsQuery, MAX_RESULTS],
  })

  return rows.rows.map((row) => ({
    tmdb_id: row[0] as number,
    original_title: row[1] as string,
    popularity: row[2] as number,
  }))
}
