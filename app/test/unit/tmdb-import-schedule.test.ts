// test for tmdb import schedule utilities

import { describe, expect, it } from 'vitest'
import {
  isWithinWindowDays,
  monthlyRunDateNear,
  shouldSkipWeeklyImport,
} from '../../server/utils/tmdb-import-schedule'

describe('isWithinWindowDays', () => {
  it('returns true when dates are exactly equal', () => {
    const d = new Date('2026-05-01T08:00:00.000Z')
    expect(isWithinWindowDays(d, d, 3)).toBe(true)
  })

  it('returns true when dates are within the window', () => {
    const a = new Date('2026-05-01T08:00:00.000Z')
    const b = new Date('2026-05-03T08:00:00.000Z')
    expect(isWithinWindowDays(a, b, 3)).toBe(true)
  })

  it('returns true when dates are exactly at the window boundary', () => {
    const a = new Date('2026-05-01T08:00:00.000Z')
    const b = new Date('2026-05-04T08:00:00.000Z')
    expect(isWithinWindowDays(a, b, 3)).toBe(true)
  })

  it('returns false when dates are outside the window', () => {
    const a = new Date('2026-05-01T08:00:00.000Z')
    const b = new Date('2026-05-05T08:00:00.000Z')
    expect(isWithinWindowDays(a, b, 3)).toBe(false)
  })
})

describe('monthlyRunDateNear', () => {
  it('returns current month when now is before the midpoint of the month', () => {
    const now = new Date('2026-05-10T08:00:00.000Z')
    const result = monthlyRunDateNear(now)
    expect(result).toEqual(new Date('2026-05-01T08:00:00.000Z'))
  })

  it('returns next month when now is after the midpoint of the month', () => {
    const now = new Date('2026-05-20T08:00:00.000Z')
    const result = monthlyRunDateNear(now)
    expect(result).toEqual(new Date('2026-06-01T08:00:00.000Z'))
  })

  it('returns correct date at month boundaries (Dec → Jan)', () => {
    const now = new Date('2026-12-20T08:00:00.000Z')
    const result = monthlyRunDateNear(now)
    expect(result).toEqual(new Date('2027-01-01T08:00:00.000Z'))
  })
})

describe('shouldSkipWeeklyImport', () => {
  it('skips when weekly run is on the same day as monthly run (1st of month)', () => {
    const weeklyRun = new Date('2026-05-01T08:00:00.000Z')
    const monthlyRun = new Date('2026-05-01T08:00:00.000Z')
    const result = shouldSkipWeeklyImport(weeklyRun, monthlyRun)
    expect(result.shouldSkip).toBe(true)
    expect(result.reason).not.toBeNull()
  })

  it('skips when weekly run is 2 days before monthly run', () => {
    const weeklyRun = new Date('2026-04-29T08:00:00.000Z')
    const monthlyRun = new Date('2026-05-01T08:00:00.000Z')
    const result = shouldSkipWeeklyImport(weeklyRun, monthlyRun)
    expect(result.shouldSkip).toBe(true)
  })

  it('skips when weekly run is 2 days after monthly run', () => {
    const weeklyRun = new Date('2026-05-03T08:00:00.000Z')
    const monthlyRun = new Date('2026-05-01T08:00:00.000Z')
    const result = shouldSkipWeeklyImport(weeklyRun, monthlyRun)
    expect(result.shouldSkip).toBe(true)
  })

  it('runs when weekly run is 4 days after monthly run (outside window)', () => {
    const weeklyRun = new Date('2026-05-05T08:00:00.000Z')
    const monthlyRun = new Date('2026-05-01T08:00:00.000Z')
    const result = shouldSkipWeeklyImport(weeklyRun, monthlyRun)
    expect(result.shouldSkip).toBe(false)
    expect(result.reason).toBeNull()
  })

  it('runs when weekly run is 5 days before monthly run (outside window)', () => {
    const weeklyRun = new Date('2026-04-26T08:00:00.000Z')
    const monthlyRun = new Date('2026-05-01T08:00:00.000Z')
    const result = shouldSkipWeeklyImport(weeklyRun, monthlyRun)
    expect(result.shouldSkip).toBe(false)
  })

  it('includes the monthly run date in the skip reason', () => {
    const weeklyRun = new Date('2026-05-01T08:00:00.000Z')
    const monthlyRun = new Date('2026-05-01T08:00:00.000Z')
    const result = shouldSkipWeeklyImport(weeklyRun, monthlyRun)
    expect(result.reason).toContain('2026-05-01T08:00:00.000Z')
  })
})
