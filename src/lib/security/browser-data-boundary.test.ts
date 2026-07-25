import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import { describe, expect, it } from 'vitest'

const sourceRoot = join(process.cwd(), 'src')

function sourceFiles(directory: string): string[] {
  return readdirSync(directory).flatMap((entry) => {
    const path = join(directory, entry)
    if (statSync(path).isDirectory()) return sourceFiles(path)
    return /\.(ts|tsx)$/.test(path) && !/\.test\.(ts|tsx)$/.test(path) ? [path] : []
  })
}

describe('browser data boundary', () => {
  it('keeps Supabase database access out of client modules', () => {
    const violations = sourceFiles(sourceRoot).flatMap((path) => {
      const source = readFileSync(path, 'utf8')
      if (!/^\s*['"]use client['"]/m.test(source)) return []

      const usesSupabaseDataClient =
        source.includes('@/lib/supabase/client')
        || source.includes('createBrowserClient')
        || source.includes('@supabase/supabase-js')

      return usesSupabaseDataClient ? [relative(process.cwd(), path)] : []
    })

    expect(violations).toEqual([])
  })
})
