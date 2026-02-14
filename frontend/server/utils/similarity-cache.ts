import { downloadSimilarities } from './storage'

export type SimilarityEntry = {
  id: number
  type: number
  score: number
}

type SimilarityMap = Map<number, SimilarityEntry[]>

let cachedSimilarities: SimilarityMap | null = null
let cacheLoadedAt = 0
const CACHE_DURATION_MS = 24 * 60 * 60 * 1000 // 24 hours

function isCacheValid() {
  return cachedSimilarities && Date.now() - cacheLoadedAt < CACHE_DURATION_MS
}

function parseCSVToSimilarityMap(csvBuffer: Buffer): SimilarityMap {
  const csv = csvBuffer.toString('utf-8')
  const lines = csv.trim().split('\n')

  const dataLines = lines.slice(1)

  const similarityMap = new Map<number, SimilarityEntry[]>()

  for (const line of dataLines) {
    const [idStr, similarIdStr, typeStr, scoreStr] = line.split(',')

    const id = parseInt(idStr.trim(), 10)
    const similarId = parseInt(similarIdStr.trim(), 10)
    const type = parseInt(typeStr.trim(), 10)
    const score = parseFloat(scoreStr.trim())

    if (!similarityMap.has(id)) {
      similarityMap.set(id, [])
    }

    similarityMap.get(id)!.push({ id: similarId, type, score })
  }

  return similarityMap
}

export async function getOrLoadSimilarities(): Promise<SimilarityMap> {
  if (isCacheValid()) {
    console.log('Returning cached similarities')
    return cachedSimilarities!
  }

  console.log('Loading similarities from storage...')
  const buffer = await downloadSimilarities('similarity_matrix_optimized.csv.gz')
  cachedSimilarities = parseCSVToSimilarityMap(buffer as Buffer)
  cacheLoadedAt = Date.now()
  console.log(`Loaded similarities for ${cachedSimilarities.size} items`)

  return cachedSimilarities
}

export async function getSimilaritiesForId(id: number): Promise<SimilarityEntry[] | null> {
  const similarities = await getOrLoadSimilarities()
  return similarities.get(id) || null
}

export function invalidateCache() {
  console.log('Invalidating similarity cache')
  cachedSimilarities = null
}
