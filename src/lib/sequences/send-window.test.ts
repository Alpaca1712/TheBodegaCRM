import { describe, expect, it } from 'vitest'
import { isWithinSendWindow, nextSendableTime, normalizeSendWindow } from './send-window'

const window = normalizeSendWindow({ days: [1, 2, 3, 4, 5], start_hour: 9, end_hour: 17, timezone: 'America/New_York' })

describe('isWithinSendWindow', () => {
  it('accepts a weekday inside business hours in the window timezone', () => {
    // Tuesday 2026-09-08 14:00 UTC = 10:00 New York (EDT)
    expect(isWithinSendWindow(window, new Date('2026-09-08T14:00:00Z'))).toBe(true)
  })

  it('rejects evenings and weekends', () => {
    expect(isWithinSendWindow(window, new Date('2026-09-08T23:30:00Z'))).toBe(false) // 19:30 NY
    expect(isWithinSendWindow(window, new Date('2026-09-12T15:00:00Z'))).toBe(false) // Saturday
  })

  it('treats end_hour as exclusive', () => {
    expect(isWithinSendWindow(window, new Date('2026-09-08T21:00:00Z'))).toBe(false) // 17:00 NY
    expect(isWithinSendWindow(window, new Date('2026-09-08T20:59:00Z'))).toBe(true)
  })
})

describe('nextSendableTime', () => {
  it('returns the same instant when already inside the window', () => {
    const now = new Date('2026-09-08T14:00:00Z')
    expect(nextSendableTime(window, now)).toEqual(now)
  })

  it('rolls a Friday evening send to Monday morning', () => {
    const friday = new Date('2026-09-11T23:00:00Z') // Fri 19:00 NY
    const next = nextSendableTime(window, friday)
    expect(next.toISOString()).toBe('2026-09-14T13:00:00.000Z') // Mon 09:00 EDT
  })
})
