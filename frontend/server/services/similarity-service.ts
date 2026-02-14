import { getSimilaritiesForId } from '../utils/similarity-cache'

export async function getSimilaritiesById(
  movieId: number,
  options?: {
    limit?: number
    minScore?: number
  }
) {
  const similarities = await getSimilaritiesForId(movieId)

  if (!similarities) {
    return null
  }

  const sorted = similarities.sort((a, b) => b.score - a.score)

  const filtered = sorted.filter((entry) => {
    if (options?.minScore !== undefined) {
      return entry.score >= options.minScore
    }
    return true
  })

  const limited = options?.limit ? filtered.slice(0, options.limit) : filtered

  const typeMap = {
    0: 'movie',
    1: 'show',
  }

  const transformed = limited.map((entry) => ({
    id: entry.id,
    type: typeMap[entry.type as keyof typeof typeMap] || 'unknown',
    score: entry.score,
  }))

  return {
    movieId,
    count: transformed.length,
    similarities: transformed,
  }
}
