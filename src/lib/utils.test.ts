import { describe, it, expect } from 'vitest'
import { cn, formatDate, formatDateTime, truncateText, getInitials } from './utils'

describe('cn', () => {
  it('joins truthy class names', () => {
    expect(cn('a', 'b', 'c')).toBe('a b c')
  })

  it('filters out falsy values', () => {
    expect(cn('a', false, 'b', undefined, null, 'c')).toBe('a b c')
  })

  it('returns empty string for all falsy args', () => {
    expect(cn(false, undefined, null)).toBe('')
  })

  it('handles single class', () => {
    expect(cn('btn')).toBe('btn')
  })
})

describe('formatDate', () => {
  it('formats a date string', () => {
    const result = formatDate('2025-03-15T10:30:00Z')
    expect(result).toMatch(/Mar/)
    expect(result).toMatch(/15/)
    expect(result).toMatch(/2025/)
  })

  it('formats a Date object with time to avoid TZ issues', () => {
    // Use noon UTC to avoid date shifting in negative-UTC-offset timezones
    const result = formatDate(new Date('2025-06-15T12:00:00Z'))
    expect(result).toMatch(/Jun/)
    expect(result).toMatch(/15/)
    expect(result).toMatch(/2025/)
  })

  it('handles ISO date string with time', () => {
    const result = formatDate('2024-12-25T12:00:00Z')
    expect(result).toMatch(/Dec/)
    expect(result).toMatch(/25/)
    expect(result).toMatch(/2024/)
  })
})

describe('formatDateTime', () => {
  it('includes date and time components', () => {
    const result = formatDateTime('2025-06-15T14:30:00Z')
    expect(result).toMatch(/Jun/)
    expect(result).toMatch(/15/)
    expect(result).toMatch(/2025/)
  })

  it('formats a Date object', () => {
    const result = formatDateTime(new Date('2025-03-01T09:00:00Z'))
    expect(result).toMatch(/Mar/)
  })
})

describe('truncateText', () => {
  it('returns text unchanged when shorter than maxLength', () => {
    expect(truncateText('hello', 10)).toBe('hello')
  })

  it('returns text unchanged when equal to maxLength', () => {
    expect(truncateText('hello', 5)).toBe('hello')
  })

  it('truncates text longer than maxLength with ellipsis', () => {
    expect(truncateText('hello world', 5)).toBe('hello...')
  })

  it('handles empty string', () => {
    expect(truncateText('', 5)).toBe('')
  })

  it('handles maxLength of 0', () => {
    expect(truncateText('hello', 0)).toBe('...')
  })
})

describe('getInitials', () => {
  it('returns uppercase initials from first and last name', () => {
    expect(getInitials('John', 'Doe')).toBe('JD')
  })

  it('handles lowercase names', () => {
    expect(getInitials('alice', 'smith')).toBe('AS')
  })

  it('handles single character names', () => {
    expect(getInitials('J', 'D')).toBe('JD')
  })

  it('handles empty strings gracefully', () => {
    expect(getInitials('', '')).toBe('')
  })

  it('handles only first name provided', () => {
    const result = getInitials('John', '')
    expect(result).toBe('J')
  })
})
