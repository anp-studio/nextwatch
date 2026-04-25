interface TMDBMovieDetails {
  id: number
  title: string
  poster_path: string | null
  backdrop_path: string | null
  vote_average: number
  vote_count: number
  release_date: string
  overview: string
  runtime: number | null
  genres: Array<{ id: number; name: string }>
  credits: {
    cast: Array<{ name: string }>
    crew: Array<{ name: string; job: string }>
  }
  videos: {
    results: Array<{
      key: string
      site: string
      type: string
      official: boolean
      published_at: string
    }>
  }
}

interface MovieResponse {
  id: number
  title: string
  poster: string
  rating: number
  year: number
  duration: string
  runtime: number | null
  genres: string[]
  actors: string[]
  directors?: string[]
  description: string
  trailer: string | null
}

const CACHE_TTL_MONTHS = 3
const CACHE_TTL_SECONDS = CACHE_TTL_MONTHS * 30 * 24 * 60 * 60
const YOUTUBE_BASE = 'https://www.youtube.com/watch?v='

export default defineEventHandler(async (event): Promise<MovieResponse> => {
  const id = parseInt(getRouterParam(event, 'id') ?? '', 10)

  if (!Number.isInteger(id) || id <= 0) {
    throw createError({ statusCode: 400, message: 'Invalid movie id' })
  }

  const db = useDb()
  const now = Math.floor(Date.now() / 1000)
  const freshThreshold = now - CACHE_TTL_SECONDS

  const cached = await db.execute({
    sql: 'SELECT * FROM movies_metadata WHERE tmdb_id = ? AND cached_at > ?',
    args: [id, freshThreshold],
  })

  const [row] = cached.rows

  if (row) {
    const genres = row.genres ? (JSON.parse(row.genres as string) as string[]) : []
    const actors = row.cast ? (JSON.parse(row.cast as string) as string[]) : []
    const directors = row.directors ? (JSON.parse(row.directors as string) as string[]) : []
    const trailerKey = row.trailer_key as string | null

    return {
      id: row.tmdb_id as number,
      title: row.title as string,
      poster: row.poster_path ? `${IMAGE_BASE}${row.poster_path as string}` : '',
      rating: Math.round((row.vote_average as number) * 10) / 10,
      year: parseInt(((row.release_date as string) ?? '').split('-')[0] || '0'),
      duration: row.runtime
        ? `${Math.floor((row.runtime as number) / 60)}h ${(row.runtime as number) % 60}m`
        : 'N/A',
      runtime: (row.runtime as number | null) ?? null,
      genres,
      actors,
      directors,
      description: (row.overview as string) ?? '',
      trailer: trailerKey ? `${YOUTUBE_BASE}${trailerKey}` : null,
    }
  }

  const data = (await fetchTmdb(event, `/movie/${id}`, {
    append_to_response: 'credits,videos',
  })) as TMDBMovieDetails

  const trailer = data.videos.results
    .filter((v) => v.site === 'YouTube' && v.type === 'Trailer' && v.official)
    .sort((a, b) => b.published_at.localeCompare(a.published_at))[0]

  const genres = data.genres.map((g) => g.name)
  const actors = data.credits.cast.slice(0, 5).map((actor) => actor.name)
  const directors = data.credits.crew.filter((c) => c.job === 'Director').map((c) => c.name)
  const trailerKey = trailer?.key ?? null
  const voteAverage = data.vote_average > 0 ? data.vote_average : 5

  db.execute({
    sql: `INSERT OR REPLACE INTO movies_metadata
        (tmdb_id, title, overview, poster_path, backdrop_path, release_date, runtime,
         vote_average, vote_count, genres, cast, directors, trailer_key, cached_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      data.id,
      data.title,
      data.overview,
      data.poster_path,
      data.backdrop_path,
      data.release_date,
      data.runtime,
      voteAverage,
      data.vote_count,
      JSON.stringify(genres),
      JSON.stringify(actors),
      JSON.stringify(directors),
      trailerKey,
      now,
    ],
  }).catch(() => {})

  return {
    id: data.id,
    title: data.title,
    poster: data.poster_path ? `${IMAGE_BASE}${data.poster_path}` : '',
    rating: Math.round(voteAverage * 10) / 10,
    year: parseInt(data.release_date?.split('-')[0] || '0'),
    duration: data.runtime ? `${Math.floor(data.runtime / 60)}h ${data.runtime % 60}m` : 'N/A',
    runtime: data.runtime ?? null,
    genres,
    actors,
    directors,
    description: data.overview,
    trailer: trailerKey ? `${YOUTUBE_BASE}${trailerKey}` : null,
  }
})
