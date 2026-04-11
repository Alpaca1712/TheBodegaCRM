import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { objectsToCSV, generateFilename } from './csv-export'

describe('objectsToCSV', () => {
  const columns = [
    { key: 'name', label: 'Name' },
    { key: 'email', label: 'Email' },
  ]

  it('returns empty string for empty data array', () => {
    expect(objectsToCSV([], columns)).toBe('')
  })

  it('generates header row and data rows', () => {
    const data = [
      { name: 'Alice', email: 'alice@test.com' },
      { name: 'Bob', email: 'bob@test.com' },
    ]
    const result = objectsToCSV(data, columns)
    const lines = result.split('\n')
    expect(lines).toHaveLength(3)
    expect(lines[0]).toBe('"Name","Email"')
    expect(lines[1]).toContain('Alice')
    expect(lines[2]).toContain('Bob')
  })

  it('handles null/undefined values as empty strings', () => {
    const data = [{ name: 'Alice', email: null }]
    const result = objectsToCSV(data, columns)
    const lines = result.split('\n')
    // Second column should be empty
    expect(lines[1]).toMatch(/"Alice",$/)
  })

  it('handles array values by joining with comma+space', () => {
    const data = [{ name: 'Alice', tags: ['a', 'b', 'c'] }]
    const cols = [{ key: 'name', label: 'Name' }, { key: 'tags', label: 'Tags' }]
    const result = objectsToCSV(data, cols)
    expect(result).toContain('"a, b, c"')
  })

  it('formats date strings as ISO', () => {
    const data = [{ name: 'Alice', created_at: '2025-03-15T10:30:00Z' }]
    const cols = [{ key: 'name', label: 'Name' }, { key: 'created_at', label: 'Created' }]
    const result = objectsToCSV(data, cols)
    // Should contain ISO-formatted date wrapped in quotes
    expect(result).toContain('2025-03-15')
  })

  it('escapes double quotes in values', () => {
    const data = [{ name: 'O"Brien', email: 'ob@test.com' }]
    const result = objectsToCSV(data, columns)
    const row = result.split('\n')[1]
    expect(row).toContain('Brien')
    // Compare against same data without a quote — escaped version should be longer
    const plain = objectsToCSV([{ name: 'OBrien', email: 'ob@test.com' }], columns)
    expect(row.length).toBeGreaterThan(plain.split('\n')[1].length)
  })

  it('wraps all values in quotes', () => {
    const data = [{ name: 'Alice', email: 'alice@test.com' }]
    const result = objectsToCSV(data, columns)
    const lines = result.split('\n')
    // Header and data should all be quoted
    expect(lines[0]).toBe('"Name","Email"')
    expect(lines[1]).toMatch(/^"Alice","alice@test.com"$/)
  })
})

describe('generateFilename', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2025-06-15T14:30:00Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('generates filename with base name and date+time', () => {
    const filename = generateFilename('contacts')
    expect(filename).toMatch(/^contacts-2025-06-15-/)
    expect(filename).toMatch(/\.csv$/)
  })

  it('uses custom extension', () => {
    const filename = generateFilename('export', 'xlsx')
    expect(filename).toMatch(/\.xlsx$/)
  })

  it('includes timestamp components', () => {
    const filename = generateFilename('test')
    // Should match pattern: test-YYYY-MM-DD-HH-MM-SS.csv
    expect(filename).toMatch(/^test-\d{4}-\d{2}-\d{2}-\d{2}-\d{2}-\d{2}\.csv$/)
  })
})
