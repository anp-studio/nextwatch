export interface TMDBMovie {
  id: number
  title: string
  poster_path: string | null
  backdrop_path: string | null
  vote_average: number
  vote_count: number
  release_date: string
  overview: string
  genre_ids: number[]
  adult: boolean
  popularity: number
  video: boolean
}

export interface TMDBMovieDetails {
  id: number
  imdb_id: string | null
  title: string
  poster_path: string | null
  backdrop_path: string | null
  vote_average: number
  vote_count: number
  release_date: string
  overview: string
  runtime: number | null
  genres: TMDBGenre[]
  credits: {
    cast: Array<{
      name: string
    }>
  }
  adult: boolean
  budget: number
  revenue: number
}

export interface TMDBGenre {
  id: number
  name: string
}

export interface TMDBPopularResponse {
  page: number
  results: TMDBMovie[]
  total_pages: number
  total_results: number
}

export interface TMDBGenreListResponse {
  genres: TMDBGenre[]
}
