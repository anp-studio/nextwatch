import type { MovieListMetadata } from '~/types/movie'

interface MovieListMetadataResponse {
  success: boolean
  movies: MovieListMetadata[]
}

export async function fetchMovieListMetadata(
  accessToken: string,
  tmdbIds: number[]
): Promise<MovieListMetadata[]> {
  if (tmdbIds.length === 0) {
    return []
  }

  const response = await $fetch<MovieListMetadataResponse>('/api/movies/metadata', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    body: { tmdbIds },
  })

  return response.movies
}
