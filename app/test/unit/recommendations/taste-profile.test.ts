import { describe, expect, it } from 'vitest'
import {
  buildTasteProfile,
  MY_LIST_REMINDER_LIMIT,
  REPRESENTATIVE_WATCHED_LIMIT,
  TOP_WATCHED_MOVIES_LIMIT,
} from '../../../server/utils/recommendations/taste-profile'
import type { TasteProfileMovie } from '../../../server/utils/recommendations/taste-profile'

function createMovie(
  tmdbId: number,
  title: string,
  year: number,
  genres: string[],
  popularity: number,
  voteCount: number
): TasteProfileMovie {
  return {
    tmdbId,
    title,
    year,
    genres,
    popularity,
    voteCount,
  }
}

describe('buildTasteProfile', () => {
  it('builds top genres and favorite decades from watched movies', () => {
    const watchedMovies = [
      createMovie(1, 'Alien', 1979, ['Science Fiction', 'Horror'], 80, 20000),
      createMovie(2, 'Arrival', 2016, ['Science Fiction', 'Drama'], 70, 18000),
      createMovie(3, 'The Matrix', 1999, ['Science Fiction', 'Action'], 90, 30000),
    ]
    const myListMovies = [
      createMovie(4, 'Paddington 2', 2017, ['Family', 'Comedy'], 60, 10000),
      createMovie(5, 'Fantastic Mr. Fox', 2009, ['Family'], 50, 9000),
      createMovie(6, 'The Iron Giant', 1999, ['Family'], 55, 9500),
      createMovie(7, 'My Neighbor Totoro', 1988, ['Family'], 65, 12000),
    ]

    const profile = buildTasteProfile(watchedMovies, myListMovies)

    expect(profile.topGenres[0]).toBe('Science Fiction')
    expect(profile.topGenres).toContain('Family')
    expect(profile.favoriteDecades).toEqual(['2010s', '1990s', '1970s'])
  })

  it('sorts top watched movies by popularity and vote count', () => {
    const profile = buildTasteProfile(
      [
        createMovie(1, 'Low Risk', 2000, ['Drama'], 10, 50000),
        createMovie(2, 'High Popularity', 2001, ['Drama'], 90, 100),
        createMovie(3, 'High Vote Tie', 2002, ['Drama'], 90, 200),
      ],
      []
    )

    expect(profile.topWatchedMovies.map((movie) => movie.title)).toEqual([
      'High Vote Tie',
      'High Popularity',
      'Low Risk',
    ])
  })

  it('caps representative watched movies, top watched movies, and My List reminders', () => {
    const watchedMovies = Array.from(
      { length: REPRESENTATIVE_WATCHED_LIMIT + TOP_WATCHED_MOVIES_LIMIT + 5 },
      (_, index) =>
        createMovie(index + 1, `Watched ${index + 1}`, 2000 + index, ['Drama'], index, index)
    )
    const myListMovies = Array.from({ length: MY_LIST_REMINDER_LIMIT + 2 }, (_, index) =>
      createMovie(index + 100, `My List ${index + 1}`, 2010 + index, ['Drama'], index, index)
    )

    const profile = buildTasteProfile(watchedMovies, myListMovies)

    expect(profile.representativeWatchedMovies).toHaveLength(REPRESENTATIVE_WATCHED_LIMIT)
    expect(profile.topWatchedMovies).toHaveLength(TOP_WATCHED_MOVIES_LIMIT)
    expect(profile.myListReminderMovies).toHaveLength(MY_LIST_REMINDER_LIMIT)
  })

  it('keeps watched prompt examples compact and unique across sections', () => {
    const watchedMovies = Array.from({ length: 100 }, (_, index) =>
      createMovie(index + 1, `Watched ${index + 1}`, 2000 + index, ['Drama'], 100 - index, index)
    )

    const profile = buildTasteProfile(watchedMovies, [])
    const representativeIds = new Set(profile.representativeWatchedMovies.map((movie) => movie.tmdbId))

    expect(profile.representativeWatchedMovies).toHaveLength(REPRESENTATIVE_WATCHED_LIMIT)
    expect(profile.topWatchedMovies).toHaveLength(TOP_WATCHED_MOVIES_LIMIT)
    expect(profile.topWatchedMovies.every((movie) => !representativeIds.has(movie.tmdbId))).toBe(true)
  })
})
