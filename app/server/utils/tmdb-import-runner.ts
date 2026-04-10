import { gunzip } from 'node:zlib'
import { promisify } from 'node:util'

const gunzipAsync = promisify(gunzip)

const TMDB_EXPORT_BASE_URL = 'http://files.tmdb.org/p/exports'
const BATCH_SIZE = 500
const MAX_IMPORT_ATTEMPTS = 3
const RETRY_DELAY_MS = 1500
const MIN_POPULARITY = 0.5

interface TmdbExportRow {
  id: number
  original_title: string
  popularity: number
  adult: boolean
}

export interface TmdbImportResult {
  imported: number
  skipped: number
  adultExcluded: number
  lowPopularityExcluded: number
  durationSeconds: string
}

function isTmdbExportRow(value: unknown): value is TmdbExportRow {
  if (typeof value !== 'object' || value === null) return false
  const v = value as Record<string, unknown>
  return (
    typeof v.id === 'number' &&
    typeof v.original_title === 'string' &&
    typeof v.popularity === 'number' &&
    typeof v.adult === 'boolean'
  )
}

function buildExportUrl(): string {
  const date = new Date()
  date.setUTCDate(date.getUTCDate() - 1)
  const mm = String(date.getUTCMonth() + 1).padStart(2, '0')
  const dd = String(date.getUTCDate()).padStart(2, '0')
  const yyyy = date.getUTCFullYear()
  return `${TMDB_EXPORT_BASE_URL}/movie_ids_${mm}_${dd}_${yyyy}.json.gz`
}

async function downloadAndDecompress(url: string): Promise<string> {
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`TMDB export download failed: ${response.status} ${response.statusText}`)
  }
  const compressed = await response.arrayBuffer()
  const decompressed = await gunzipAsync(Buffer.from(compressed))
  return decompressed.toString('utf8')
}

async function importBatch(db: ReturnType<typeof useDb>, rows: TmdbExportRow[]): Promise<void> {
  await db.batch(
    rows.map((row) => ({
      sql: `INSERT OR IGNORE INTO movies_index (tmdb_id, original_title, popularity)
            VALUES (?, ?, ?)`,
      args: [row.id, row.original_title, row.popularity],
    }))
  )
}

async function getMoviesIndexCount(db: ReturnType<typeof useDb>): Promise<number> {
  const result = await db.execute('SELECT COUNT(*) FROM movies_index')
  const count = result.rows[0]?.[0]
  if (typeof count === 'number') return count

  const parsedCount = Number(count)
  return Number.isFinite(parsedCount) ? parsedCount : 0
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms)
  })
}

function toError(value: unknown): Error {
  if (value instanceof Error) return value
  return new Error(String(value))
}

export async function runTmdbImport(): Promise<TmdbImportResult> {
  const db = useDb()
  const url = buildExportUrl()
  const existingCountBefore = await getMoviesIndexCount(db)

  let batch: TmdbExportRow[] = []
  let totalSkipped = 0
  let totalAdultExcluded = 0
  let totalLowPopularityExcluded = 0

  const startTime = Date.now()

  let lastError: Error | null = null

  for (let attempt = 1; attempt <= MAX_IMPORT_ATTEMPTS; attempt++) {
    batch = []
    totalSkipped = 0
    totalAdultExcluded = 0
    totalLowPopularityExcluded = 0

    try {
      const content = await downloadAndDecompress(url)

      for (const line of content.split('\n')) {
        const trimmed = line.trim()
        if (!trimmed) continue

        let parsed: unknown
        try {
          parsed = JSON.parse(trimmed)
        } catch {
          totalSkipped++
          continue
        }

        if (!isTmdbExportRow(parsed)) {
          totalSkipped++
          continue
        }

        if (parsed.adult) {
          totalAdultExcluded++
          continue
        }

        if (parsed.popularity < MIN_POPULARITY) {
          totalLowPopularityExcluded++
          continue
        }

        batch.push(parsed)

        if (batch.length >= BATCH_SIZE) {
          await importBatch(db, batch)
          batch = []
        }
      }

      if (batch.length > 0) {
        await importBatch(db, batch)
      }

      lastError = null
      break
    } catch (error) {
      lastError = toError(error)
    }

    if (attempt < MAX_IMPORT_ATTEMPTS) {
      await sleep(RETRY_DELAY_MS)
    }
  }

  if (lastError) {
    throw createError({
      statusCode: 502,
      statusMessage: 'TMDB import failed',
      message: `Unable to complete TMDB export import after ${MAX_IMPORT_ATTEMPTS} attempts: ${lastError.message}`,
    })
  }

  const durationSeconds = ((Date.now() - startTime) / 1000).toFixed(2)
  const existingCountAfter = await getMoviesIndexCount(db)
  const totalImported = Math.max(0, existingCountAfter - existingCountBefore)

  return {
    imported: totalImported,
    skipped: totalSkipped,
    adultExcluded: totalAdultExcluded,
    lowPopularityExcluded: totalLowPopularityExcluded,
    durationSeconds,
  }
}
