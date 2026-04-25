import { IMAGE_BASE } from '~/constants'

/** Full poster URL from a TMDB relative path */
export const posterUrl = (path: string | null): string =>
  path ? `${IMAGE_BASE}${path}` : ''

/** Strip IMAGE_BASE to get relative path for storage */
export const posterPath = (fullUrl: string): string =>
  fullUrl.startsWith(IMAGE_BASE) ? fullUrl.slice(IMAGE_BASE.length) : fullUrl
