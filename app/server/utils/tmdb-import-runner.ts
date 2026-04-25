import { createGunzip } from 'node:zlib'
import { createInterface } from 'node:readline'
import { Readable } from 'node:stream'

const TMDB_EXPORT_BASE_URL = 'https://files.tmdb.org/p/exports'
const BATCH_SIZE = 1500
const MAX_IMPORT_ATTEMPTS = 5
const MIN_POPULARITY = 0.25
const MIN_EXPECTED_EXPORT_ROWS = 100_000

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

interface RunTmdbImportOptions {
  fullRefresh?: boolean
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

async function downloadAndDecompress(url: string, onLine: (line: string) => void): Promise<void> {
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`TMDB export download failed: ${response.status} ${response.statusText}`)
  }

  const nodeStream = Readable.fromWeb(response.body as import('stream/web').ReadableStream)
  const gunzip = createGunzip()
  const decompressed = nodeStream.pipe(gunzip)

  const rl = createInterface({ input: decompressed, crlfDelay: Infinity })
  for await (const line of rl) {
    onLine(line)
  }
}

async function importBatch(
  db: ReturnType<typeof useDb>,
  rows: TmdbExportRow[],
  fullRefresh: boolean
): Promise<void> {
  if (rows.length === 0) return

  const placeholders = rows.map(() => '(?, ?)').join(', ')
  const args = rows.flatMap((row) => [row.id, row.original_title])

  const sql = fullRefresh
    ? `INSERT INTO movies_index (tmdb_id, original_title)
       VALUES ${placeholders}
       ON CONFLICT(tmdb_id) DO UPDATE SET
         original_title = excluded.original_title`
    : `INSERT OR IGNORE INTO movies_index (tmdb_id, original_title)
       VALUES ${placeholders}`

  await db.execute({ sql, args })
}

async function importBatchWithRetry(
  db: ReturnType<typeof useDb>,
  rows: TmdbExportRow[],
  fullRefresh: boolean
): Promise<void> {
  for (let attempt = 1; attempt <= MAX_IMPORT_ATTEMPTS; attempt++) {
    try {
      await importBatch(db, rows, fullRefresh)
      return
    } catch (error) {
      const msg = toError(error).message
      if (!msg.includes('SQLITE_BUSY') || attempt === MAX_IMPORT_ATTEMPTS) throw error
      await sleep(200 * attempt)
    }
  }
}

async function getMoviesIndexCount(db: ReturnType<typeof useDb>): Promise<number> {
  const result = await db.execute('SELECT COUNT(*) FROM movies_index')
  const count = result.rows[0]?.[0]
  if (typeof count === 'number') return count
  const parsedCount = Number(count)
  return Number.isFinite(parsedCount) ? parsedCount : 0
}

async function getMaxMovieId(db: ReturnType<typeof useDb>): Promise<number> {
  const result = await db.execute('SELECT tmdb_id FROM movies_index ORDER BY tmdb_id DESC LIMIT 1')
  const id = result.rows[0]?.[0]
  if (typeof id === 'number') return id
  const parsedId = Number(id)
  return Number.isFinite(parsedId) ? parsedId : 0
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function toError(value: unknown): Error {
  if (value instanceof Error) return value
  return new Error(String(value))
}

export async function runTmdbImport(options: RunTmdbImportOptions = {}): Promise<TmdbImportResult> {
  const { fullRefresh = false } = options
  const db = useDb()
  const url = buildExportUrl()

  const existingCountBefore = await getMoviesIndexCount(db)
  const maxMovieId = !fullRefresh ? await getMaxMovieId(db) : 0

  // disable FTS triggers and index during import
  await db.execute('DROP TRIGGER IF EXISTS movies_ai')
  await db.execute('DROP TRIGGER IF EXISTS movies_au')
  await db.execute('DROP TRIGGER IF EXISTS movies_ad')

  let parsedRowCount = 0
  let totalSkipped = 0
  let totalAdultExcluded = 0
  let totalLowPopularityExcluded = 0
  let lastError: Error | null = null
  const startTime = Date.now()

  try {
    let batch: TmdbExportRow[] = []
    let pendingWrite: Promise<void> | null = null

    await downloadAndDecompress(url, (line) => {
      const trimmed = line.trim()
      if (!trimmed) return

      let parsed: unknown
      try {
        parsed = JSON.parse(trimmed)
      } catch {
        totalSkipped++
        return
      }

      if (!isTmdbExportRow(parsed)) {
        totalSkipped++
        return
      }
      parsedRowCount++
      if (parsed.id <= maxMovieId) {
        totalSkipped++
        return
      }
      if (parsed.adult) {
        totalAdultExcluded++
        return
      }
      if (parsed.popularity < MIN_POPULARITY) {
        totalLowPopularityExcluded++
        return
      }

      batch.push(parsed)

      if (batch.length >= BATCH_SIZE) {
        const batchToInsert = batch
        batch = []
        // just reading from stream not awaited
        pendingWrite = (pendingWrite ?? Promise.resolve()).then(() =>
          importBatchWithRetry(db, batchToInsert, fullRefresh)
        )
      }
    })

    if (pendingWrite) await pendingWrite
    if (batch.length > 0) await importBatchWithRetry(db, batch, fullRefresh)
  } catch (error) {
    lastError = toError(error)
  }

  if (!lastError && parsedRowCount < MIN_EXPECTED_EXPORT_ROWS) {
    lastError = new Error(
      `TMDB export appears truncated: only ${parsedRowCount} valid rows received`
    )
  }

  // rebuild FTS and re-enable triggers/index
  await db.execute("INSERT INTO movies_fts(movies_fts) VALUES ('rebuild')")
  await db.execute(
    `CREATE TRIGGER IF NOT EXISTS movies_ai AFTER INSERT ON movies_index BEGIN INSERT INTO movies_fts(rowid, original_title) VALUES (new.tmdb_id, new.original_title); END`
  )
  await db.execute(
    `CREATE TRIGGER IF NOT EXISTS movies_ad AFTER DELETE ON movies_index BEGIN INSERT INTO movies_fts(movies_fts, rowid, original_title) VALUES ('delete', old.tmdb_id, old.original_title); END`
  )
  await db.execute(
    `CREATE TRIGGER IF NOT EXISTS movies_au AFTER UPDATE ON movies_index BEGIN INSERT INTO movies_fts(movies_fts, rowid, original_title) VALUES ('delete', old.tmdb_id, old.original_title); INSERT INTO movies_fts(rowid, original_title) VALUES (new.tmdb_id, new.original_title); END`
  )

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
