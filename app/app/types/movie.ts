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

export interface Movie {
  id: number
  title: string
  poster: string
  backdrop: string
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
  genres?: string[]
  runtime?: number | null
}

export interface WatchedPatchBody {
  tmdbId?: number
  genres?: string[]
  runtime?: number | null
  posterPath?: string
  title?: string
  year?: number
}

export interface MyListMovie {
  tmdbId: number
  title: string
  year: number
  posterPath: string
  rating?: number | null
  genres?: string[]
  runtime?: number | null
}

export interface PendingMyListMovie {
  id: number
  title: string
  year: number
  posterPath: string
  rating?: number | null
  genres?: string[]
  runtime?: number | null
}

export interface MyListPatchBody {
  tmdbId?: number
  rating?: number | null
  genres?: string[]
  runtime?: number | null
  posterPath?: string
  title?: string
  year?: number
}

export interface MovieListMetadata {
  tmdbId: number
  title: string
  year: number
  posterPath: string
  genres: string[]
  runtime: number | null
  rating: number | null
}

export interface SearchMovie {
  id: number
  title: string
  original_title: string
  poster_path: string | null
  backdrop_path: string | null
  release_date: string
  vote_average: number
  genre_ids: number[]
  overview: string
  runtime?: number | null
  genres?: string[]
  rating?: number | null
  year?: number
}

export interface SearchDisplayMovie extends SearchMovie {
  genres: string[]
  rating: number
  year: number
}
