import type { SearchDisplayMovie, SearchMovie } from '../types/movie'

const TMDB_GENRE_MAP: Record<number, string> = {
  28: 'Action',
  12: 'Adventure',
  16: 'Animation',
  35: 'Comedy',
  80: 'Crime',
  99: 'Documentary',
  18: 'Drama',
  10751: 'Family',
  14: 'Fantasy',
  36: 'History',
  27: 'Horror',
  10402: 'Music',
  9648: 'Mystery',
  10749: 'Romance',
  878: 'Sci-Fi',
  10770: 'TV Movie',
  53: 'Thriller',
  10752: 'War',
  37: 'Western',
}

const RELEASE_YEAR_INDEX = 0
const FALLBACK_RELEASE_YEAR = 0
function getMovieGenreNames(movie: SearchMovie): string[] {
  if (movie.genres?.length) {
    return movie.genres
  }

  return movie.genre_ids
    .map((id) => TMDB_GENRE_MAP[id])
    .filter((name): name is string => Boolean(name))
}

function getReleaseYear(movie: SearchMovie): number {
  const releaseYear = movie.release_date.split('-')[RELEASE_YEAR_INDEX]
  return releaseYear ? Number.parseInt(releaseYear, 10) : FALLBACK_RELEASE_YEAR
}

export function normalizeSearchMovie(movie: SearchMovie): SearchDisplayMovie {
  return {
    ...movie,
    genres: getMovieGenreNames(movie),
    rating: movie.vote_average,
    year: getReleaseYear(movie),
  }
}
