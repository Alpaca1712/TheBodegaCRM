import type { SendWindow } from '@/types'

export const DEFAULT_SEND_WINDOW: SendWindow = {
  days: [1, 2, 3, 4, 5],
  start_hour: 8,
  end_hour: 17,
  timezone: 'America/New_York',
}

function zonedParts(date: Date, timeZone: string) {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone,
    weekday: 'short',
    hour: 'numeric',
    minute: 'numeric',
    hour12: false,
  })
  const parts = Object.fromEntries(formatter.formatToParts(date).map((part) => [part.type, part.value]))
  const weekdayIndex = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(parts.weekday)
  return { weekday: weekdayIndex, hour: Number(parts.hour) % 24, minute: Number(parts.minute) }
}

export function normalizeSendWindow(window: Partial<SendWindow> | null | undefined): SendWindow {
  return {
    days: window?.days?.length ? window.days : DEFAULT_SEND_WINDOW.days,
    start_hour: window?.start_hour ?? DEFAULT_SEND_WINDOW.start_hour,
    end_hour: window?.end_hour ?? DEFAULT_SEND_WINDOW.end_hour,
    timezone: window?.timezone || DEFAULT_SEND_WINDOW.timezone,
  }
}

export function isWithinSendWindow(window: SendWindow, now = new Date()): boolean {
  const { weekday, hour } = zonedParts(now, window.timezone)
  if (!window.days.includes(weekday)) return false
  return hour >= window.start_hour && hour < window.end_hour
}

/**
 * Returns the given instant if it's inside the window, otherwise the next
 * instant the window opens (checked at 15 minute granularity, up to 14 days).
 */
export function nextSendableTime(window: SendWindow, from = new Date()): Date {
  if (isWithinSendWindow(window, from)) return from
  const step = 15 * 60 * 1000
  const cursor = new Date(Math.ceil(from.getTime() / step) * step)
  for (let i = 0; i < (14 * 24 * 60) / 15; i += 1) {
    if (isWithinSendWindow(window, cursor)) return cursor
    cursor.setTime(cursor.getTime() + step)
  }
  return from
}
