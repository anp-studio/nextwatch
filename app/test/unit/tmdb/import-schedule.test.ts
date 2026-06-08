import { describe, expect, it } from 'vitest'
import { monthlyImportRunAt } from '../../../server/utils/tmdb/import-schedule'

describe('monthlyImportRunAt', () => {
  it('returns the first day of the current month at 08:00 UTC', () => {
    const now = new Date('2026-05-10T08:00:00.000Z')
    const result = monthlyImportRunAt(now)
    expect(result).toEqual(new Date('2026-05-01T08:00:00.000Z'))
  })

  it('handles the december to january boundary', () => {
    const now = new Date('2026-12-20T08:00:00.000Z')
    const result = monthlyImportRunAt(now)
    expect(result).toEqual(new Date('2026-12-01T08:00:00.000Z'))
  })
})
