import { createInterface } from 'node:readline'
import { Readable } from 'node:stream'
import { createGunzip } from 'node:zlib'
import pLimit from 'p-limit'
import { createServiceSupabaseClient } from './auth'
import { throwImportError } from './api-error'

const TMDB_EXPORT_BASE_URL = 'https://files.tmdb.org/p/exports'
const MOVIES_TABLE = 'movies'
const IMPORT_BATCH_SIZE = 1000
const MAX_CONCURRENT_BATCH_REQUESTS = 5
const MIN_POPULARITY = 0.25
const MIN_EXPECTED_EXPORT_ROWS = 100_000

interface TmdbExportRow {
  id: number
  original_title: string
  popularity: number
  adult: boolean
}

interface TmdbImportRow {
  tmdb_id: number
  original_title: string
  popularity: number
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

  const candidate = value as Record<string, unknown>
  return (
    typeof candidate.id === 'number' &&
    typeof candidate.original_title === 'string' &&
    typeof candidate.popularity === 'number' &&
    typeof candidate.adult === 'boolean'
  )
}

function buildExportUrl(): string {
  const date = new Date()
  date.setUTCDate(date.getUTCDate() - 1)

  const month = String(date.getUTCMonth() + 1).padStart(2, '0')
  const day = String(date.getUTCDate()).padStart(2, '0')
  const year = date.getUTCFullYear()

  return `${TMDB_EXPORT_BASE_URL}/movie_ids_${month}_${day}_${year}.json.gz`
}

async function downloadAndDecompress(url: string, onLine: (line: string) => void): Promise<void> {
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`TMDB export download failed: ${response.status} ${response.statusText}`)
  }

  if (!response.body) {
    throw new Error('TMDB export download failed: response body is missing')
  }

  const nodeStream = Readable.fromWeb(response.body as import('node:stream/web').ReadableStream)
  const decompressedStream = nodeStream.pipe(createGunzip())
  const lineReader = createInterface({ input: decompressedStream, crlfDelay: Infinity })

  for await (const line of lineReader) {
    onLine(line)
  }
}

function toImportRow(row: TmdbExportRow): TmdbImportRow {
  return {
    tmdb_id: row.id,
    original_title: row.original_title,
    popularity: row.popularity,
  }
}

async function importBatch(
  supabase: ReturnType<typeof createServiceSupabaseClient>,
  rows: TmdbImportRow[]
): Promise<void> {
  if (rows.length === 0) {
    return
  }

  const { error } = await supabase.from(MOVIES_TABLE).upsert(rows, {
    onConflict: 'tmdb_id',
    defaultToNull: false,
  })

  if (error) {
    throw error
  }
}

function toError(value: unknown): Error {
  if (value instanceof Error) {
    return value
  }

  return new Error(String(value))
}

export async function runTmdbImport(
  event: Parameters<typeof createServiceSupabaseClient>[0]
): Promise<TmdbImportResult> {
  const supabase = createServiceSupabaseClient(event)
  const writeLimit = pLimit(MAX_CONCURRENT_BATCH_REQUESTS)
  const pendingWrites: Array<Promise<void>> = []
  const url = buildExportUrl()

  let parsedRowCount = 0
  let totalImported = 0
  let totalSkipped = 0
  let totalAdultExcluded = 0
  let totalLowPopularityExcluded = 0
  let currentBatch: TmdbImportRow[] = []
  let lastError: Error | null = null
  const startTime = Date.now()

  const flushBatch = (): void => {
    if (currentBatch.length === 0) {
      return
    }

    const batchToWrite = currentBatch
    currentBatch = []
    pendingWrites.push(writeLimit(() => importBatch(supabase, batchToWrite)))
  }

  try {
    await downloadAndDecompress(url, (line) => {
      const trimmedLine = line.trim()
      if (!trimmedLine) {
        return
      }

      let parsed: unknown
      try {
        parsed = JSON.parse(trimmedLine)
      } catch {
        totalSkipped++
        return
      }

      if (!isTmdbExportRow(parsed)) {
        totalSkipped++
        return
      }

      parsedRowCount++

      if (parsed.adult) {
        totalAdultExcluded++
        return
      }

      if (parsed.popularity < MIN_POPULARITY) {
        totalLowPopularityExcluded++
        return
      }

      currentBatch.push(toImportRow(parsed))
      totalImported++

      if (currentBatch.length >= IMPORT_BATCH_SIZE) {
        flushBatch()
      }
    })

    flushBatch()
    await Promise.all(pendingWrites)
  } catch (error) {
    lastError = toError(error)
  }

  if (!lastError && parsedRowCount < MIN_EXPECTED_EXPORT_ROWS) {
    lastError = new Error(
      `TMDB export appears truncated: only ${parsedRowCount} valid rows received`
    )
  }

  if (lastError) {
    throwImportError(event, lastError, {
      event: 'tmdb_import.failed',
      publicMessage: 'TMDB import failed',
      statusCode: 502,
      extra: {
        url,
        parsedRowCount,
        imported: totalImported,
        skipped: totalSkipped,
        adultExcluded: totalAdultExcluded,
        lowPopularityExcluded: totalLowPopularityExcluded,
      },
    })
  }

  return {
    imported: totalImported,
    skipped: totalSkipped,
    adultExcluded: totalAdultExcluded,
    lowPopularityExcluded: totalLowPopularityExcluded,
    durationSeconds: ((Date.now() - startTime) / 1000).toFixed(2),
  }
}
