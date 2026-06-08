const MONTHLY_IMPORT_DAY = 1
const MONTHLY_IMPORT_HOUR_UTC = 8

export function monthlyImportRunAt(now: Date): Date {
  return new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), MONTHLY_IMPORT_DAY, MONTHLY_IMPORT_HOUR_UTC)
  )
}
