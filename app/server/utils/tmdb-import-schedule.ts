const SKIP_WINDOW_DAYS = 3
const MS_PER_DAY = 24 * 60 * 60 * 1000

export interface ImportScheduleDecision {
  shouldSkip: boolean
  reason: string | null
}

export function isWithinWindowDays(a: Date, b: Date, days: number): boolean {
  return Math.abs(a.getTime() - b.getTime()) <= days * MS_PER_DAY
}

export function monthlyRunDateNear(now: Date): Date {
  const currentMonthRun = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 8, 0, 0, 0)
  )
  const nextMonthRun = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1, 8, 0, 0, 0)
  )

  const distToCurrent = Math.abs(now.getTime() - currentMonthRun.getTime())
  const distToNext = Math.abs(now.getTime() - nextMonthRun.getTime())

  return distToCurrent <= distToNext ? currentMonthRun : nextMonthRun
}

export function shouldSkipWeeklyImport(
  weeklyRunAt: Date,
  monthlyRunAt: Date
): ImportScheduleDecision {
  if (!isWithinWindowDays(weeklyRunAt, monthlyRunAt, SKIP_WINDOW_DAYS)) {
    return { shouldSkip: false, reason: null }
  }

  return {
    shouldSkip: true,
    reason: `Weekly import skipped: monthly full refresh is within the ${SKIP_WINDOW_DAYS}-day window (monthly run: ${monthlyRunAt.toISOString()})`,
  }
}
