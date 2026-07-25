import { describe, expect, it } from 'vitest'
import { ModelJSONParseError, parseModelJSON } from './anthropic'

describe('parseModelJSON', () => {
  it('parses a clean JSON response', () => {
    expect(parseModelJSON<{ subject: string }>('{"subject":"Hello"}')).toEqual({
      subject: 'Hello',
    })
  })

  it('parses fenced JSON', () => {
    expect(parseModelJSON<{ subject: string }>('```json\n{"subject":"Hello"}\n```')).toEqual({
      subject: 'Hello',
    })
  })

  it('extracts JSON when the model puts prose around it', () => {
    const response = 'I need to return the requested structure.\n{"subject":"Hello","body":"Hi there"}\nDone.'

    expect(parseModelJSON<{ subject: string; body: string }>(response)).toEqual({
      subject: 'Hello',
      body: 'Hi there',
    })
  })

  it('handles braces and escaped quotes inside strings', () => {
    const response = 'Result: {"body":"Use {{first_name}} and say \\"hello\\"."}'

    expect(parseModelJSON<{ body: string }>(response)).toEqual({
      body: 'Use {{first_name}} and say "hello".',
    })
  })

  it('returns a safe error instead of exposing a raw JSON parser message', () => {
    expect(() => parseModelJSON('I need to ask a question first.')).toThrow(ModelJSONParseError)
    expect(() => parseModelJSON('I need to ask a question first.')).toThrow(
      'The AI returned an invalid structured response. Please retry.',
    )
  })
})
