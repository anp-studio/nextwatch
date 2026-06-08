export const TOP_WATCHED_MOVIES_LIMIT = 20
export const REPRESENTATIVE_WATCHED_LIMIT = 30
export const MY_LIST_REMINDER_LIMIT = 3

const TOP_GENRE_LIMIT = 8
const TOP_DECADE_LIMIT = 5
const MY_LIST_TASTE_WEIGHT = 0.25
const UNKNOWN_YEAR = 0
const DECADE_SIZE = 10

export interface TasteProfileMovie {
  tmdbId: number
  title: string
  year: number
  genres?: string[]
  popularity?: number
  voteCount?: number
}

export interface TasteProfile {
  topGenres: string[]
  favoriteDecades: string[]
  representativeWatchedMovies: TasteProfileMovie[]
  topWatchedMovies: TasteProfileMovie[]
  myListReminderMovies: TasteProfileMovie[]
}

function addGenreScores(
  scores: Map<string, number>,
  movies: TasteProfileMovie[],
  weight: number
): void {
  for (const movie of movies) {
    for (const genre of movie.genres ?? []) {
      const normalizedGenre = genre.trim()

      if (normalizedGenre.length === 0) {
        continue
      }

      scores.set(normalizedGenre, (scores.get(normalizedGenre) ?? 0) + weight)
    }
  }
}

function buildTopGenres(
  watchedMovies: TasteProfileMovie[],
  myListMovies: TasteProfileMovie[]
): string[] {
  const scores = new Map<string, number>()

  addGenreScores(scores, watchedMovies, 1)
  addGenreScores(scores, myListMovies, MY_LIST_TASTE_WEIGHT)

  return [...scores.entries()]
    .sort(([leftGenre, leftScore], [rightGenre, rightScore]) => {
      if (rightScore !== leftScore) {
        return rightScore - leftScore
      }

      return leftGenre.localeCompare(rightGenre)
    })
    .slice(0, TOP_GENRE_LIMIT)
    .map(([genre]) => genre)
}

function formatDecade(year: number): string | null {
  if (year <= UNKNOWN_YEAR) {
    return null
  }

  return `${Math.floor(year / DECADE_SIZE) * DECADE_SIZE}s`
}

function buildFavoriteDecades(watchedMovies: TasteProfileMovie[]): string[] {
  const scores = new Map<string, number>()

  for (const movie of watchedMovies) {
    const decade = formatDecade(movie.year)

    if (!decade) {
      continue
    }

    scores.set(decade, (scores.get(decade) ?? 0) + 1)
  }

  return [...scores.entries()]
    .sort(([leftDecade, leftScore], [rightDecade, rightScore]) => {
      if (rightScore !== leftScore) {
        return rightScore - leftScore
      }

      return rightDecade.localeCompare(leftDecade)
    })
    .slice(0, TOP_DECADE_LIMIT)
    .map(([decade]) => decade)
}

function scoreRepresentativeMovie(movie: TasteProfileMovie): number {
  return (movie.genres?.length ?? 0) + (movie.year > UNKNOWN_YEAR ? 1 : 0)
}

function sortByPopularityAndVotes(left: TasteProfileMovie, right: TasteProfileMovie): number {
  const popularityDelta = (right.popularity ?? 0) - (left.popularity ?? 0)

  if (popularityDelta !== 0) {
    return popularityDelta
  }

  return (right.voteCount ?? 0) - (left.voteCount ?? 0)
}

function buildRepresentativeWatchedMovies(watchedMovies: TasteProfileMovie[]): TasteProfileMovie[] {
  return [...watchedMovies]
    .sort((left, right) => {
      const scoreDelta = scoreRepresentativeMovie(right) - scoreRepresentativeMovie(left)

      if (scoreDelta !== 0) {
        return scoreDelta
      }

      return sortByPopularityAndVotes(left, right)
    })
    .slice(0, REPRESENTATIVE_WATCHED_LIMIT)
}

function buildTopWatchedMovies(
  watchedMovies: TasteProfileMovie[],
  representativeWatchedMovies: TasteProfileMovie[]
): TasteProfileMovie[] {
  const representativeIds = new Set(representativeWatchedMovies.map((movie) => movie.tmdbId))
  const nonRepresentativeMovies = watchedMovies.filter(
    (movie) => !representativeIds.has(movie.tmdbId)
  )

  return [...(nonRepresentativeMovies.length > 0 ? nonRepresentativeMovies : watchedMovies)]
    .sort(sortByPopularityAndVotes)
    .slice(0, TOP_WATCHED_MOVIES_LIMIT)
}

export function buildTasteProfile(
  watchedMovies: TasteProfileMovie[],
  myListMovies: TasteProfileMovie[]
): TasteProfile {
  const representativeWatchedMovies = buildRepresentativeWatchedMovies(watchedMovies)

  return {
    topGenres: buildTopGenres(watchedMovies, myListMovies),
    favoriteDecades: buildFavoriteDecades(watchedMovies),
    representativeWatchedMovies,
    topWatchedMovies: buildTopWatchedMovies(watchedMovies, representativeWatchedMovies),
    myListReminderMovies: myListMovies.slice(0, MY_LIST_REMINDER_LIMIT),
  }
}
