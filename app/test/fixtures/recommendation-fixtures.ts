export interface RecommendationFixture {
  name: string
  originalName: string
  year: number
  tmdbId: number | null
}

export interface WatchedMovieFixture {
  tmdbId: number
  title: string
  year: number
}

export interface RecommendationResponseFixture {
  recommendations: RecommendationFixture[] | null
  cached: boolean
  stale: false
  regenerationError: {
    statusCode: number
    statusMessage: string
    retryable: boolean
  } | null
  staleRecommendations: RecommendationFixture[] | null
}

export const TEST_AUTH_TOKEN = 'test-access-token'
export const TEST_USER_ID = 'user-1'
export const RETRYABLE_REGENERATION_STATUS_CODE = 503
export const LIMIT_REACHED_STATUS_CODE = 429

export const WATCHED_MOVIES: WatchedMovieFixture[] = [
  { tmdbId: 11, title: 'Alien', year: 1979 },
  { tmdbId: 12, title: 'Arrival', year: 2016 },
]

export const MY_LIST_MOVIES: WatchedMovieFixture[] = [
  { tmdbId: 21, title: 'Solaris', year: 1972 },
]

export const FRESH_CACHE_RECOMMENDATIONS: RecommendationFixture[] = [
  { name: 'Stalker', originalName: 'Stalker', year: 1979, tmdbId: 1398 },
  { name: 'Moon', originalName: 'Moon', year: 2009, tmdbId: 17431 },
  { name: 'Primer', originalName: 'Primer', year: 2004, tmdbId: 14337 },
  { name: 'Sunshine', originalName: 'Sunshine', year: 2007, tmdbId: 1272 },
  { name: 'Gattaca', originalName: 'Gattaca', year: 1997, tmdbId: 782 },
]

export const GENERATED_RECOMMENDATIONS: RecommendationFixture[] = [
  { name: 'Contact', originalName: 'Contact', year: 1997, tmdbId: 686 },
  { name: 'Pi', originalName: 'Pi', year: 1998, tmdbId: 473 },
  { name: 'Coherence', originalName: 'Coherence', year: 2013, tmdbId: 220289 },
  { name: 'Ex Machina', originalName: 'Ex Machina', year: 2015, tmdbId: 264660 },
  { name: 'Aniara', originalName: 'Aniara', year: 2018, tmdbId: 496743 },
]

export const STALE_RECOMMENDATIONS: RecommendationFixture[] = [
  { name: 'The Vast of Night', originalName: 'The Vast of Night', year: 2019, tmdbId: 599281 },
  { name: 'Prospect', originalName: 'Prospect', year: 2018, tmdbId: 516486 },
  { name: 'Europa Report', originalName: 'Europa Report', year: 2013, tmdbId: 193613 },
  { name: 'Timecrimes', originalName: 'Los cronocrimenes', year: 2007, tmdbId: 14139 },
  { name: 'Upstream Color', originalName: 'Upstream Color', year: 2013, tmdbId: 153351 },
]

export const INSUFFICIENT_VALID_RECOMMENDATIONS: RecommendationFixture[] = [
  { name: 'The Congress', originalName: 'The Congress', year: 2013, tmdbId: 152795 },
  { name: 'Another Earth', originalName: 'Another Earth', year: 2011, tmdbId: 55420 },
  { name: 'Beyond the Black Rainbow', originalName: 'Beyond the Black Rainbow', year: 2010, tmdbId: 50037 },
  { name: 'Invalid One', originalName: 'Invalid One', year: 2020, tmdbId: null },
  { name: 'Invalid Two', originalName: 'Invalid Two', year: 2021, tmdbId: null },
]

export function cloneRecommendations(
  recommendations: RecommendationFixture[]
): RecommendationFixture[] {
  return recommendations.map((recommendation) => ({ ...recommendation }))
}

export function cloneWatchedMovies(movies: WatchedMovieFixture[]): WatchedMovieFixture[] {
  return movies.map((movie) => ({ ...movie }))
}

export function createSuccessResponse(
  recommendations: RecommendationFixture[],
  cached: boolean
): RecommendationResponseFixture {
  return {
    recommendations: cloneRecommendations(recommendations),
    cached,
    stale: false,
    regenerationError: null,
    staleRecommendations: null,
  }
}

export function createFallbackResponse(
  statusCode: number,
  statusMessage: string,
  retryable: boolean,
  staleRecommendations: RecommendationFixture[]
): RecommendationResponseFixture {
  return {
    recommendations: null,
    cached: false,
    stale: false,
    regenerationError: {
      statusCode,
      statusMessage,
      retryable,
    },
    staleRecommendations: cloneRecommendations(staleRecommendations),
  }
}
