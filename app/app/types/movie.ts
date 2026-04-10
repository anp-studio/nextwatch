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
  videos: {
    results: TMDBVideo[]
  }
}

export interface TMDBGenre {
  id: number
  name: string
}

export interface TMDBVideo {
  key: string
  site: string
  type: string
  official: boolean
  published_at: string
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

export interface Movie {
  id: number
  title: string
  poster: string
  rating: number
  year: number
  duration: string
  runtime: number | null
  genres: string[]
  actors: string[]
  description: string
  trailer: string | null
}

export interface MoviePreview {
  id: number
  title: string
  poster: string
  rating: number
  year: number
  genres: string[]
  description: string
}

export interface WatchedMovie {
  tmdbId: number
  title: string
  year: number
  posterPath: string
  genres?: string[]
  runtime?: number | null
}

export interface PendingWatchedMovie {
  id: number
  title: string
  year: number
  posterPath: string
}
