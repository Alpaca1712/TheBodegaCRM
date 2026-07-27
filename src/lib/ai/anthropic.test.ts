import { describe, expect, it } from 'vitest'
import {
  buildOutreachFactsFromCitedPassages,
  ModelJSONParseError,
  parseModelJSON,
  parseModelJSONMatching,
} from './anthropic'

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

describe('parseModelJSONMatching', () => {
  const matchSubject = (value: unknown) => {
    if (
      typeof value === 'object'
      && value !== null
      && !Array.isArray(value)
      && typeof (value as { subject?: unknown }).subject === 'string'
    ) {
      return value as { subject: string }
    }
    return undefined
  }

  it('skips an earlier JSON array and selects the matching top-level object', () => {
    const response = [
      'Sources: [{"url":"https://example.com"}]',
      'Research: {"subject":"Verified result"}',
    ].join('\n')

    expect(parseModelJSONMatching(response, matchSubject)).toEqual({
      subject: 'Verified result',
    })
  })

  it('does not select a nested object from an ambiguous array', () => {
    const response = '[{"subject":"First person"},{"subject":"Second person"}]'

    expect(() => parseModelJSONMatching(response, matchSubject)).toThrow(ModelJSONParseError)
  })
})

describe('buildOutreachFactsFromCitedPassages', () => {
  it('stores the verbatim cited product excerpt instead of an unsupported paraphrase', () => {
    const facts = buildOutreachFactsFromCitedPassages([{
      text: 'Subgraph automates recruiting outreach and candidate delivery.',
      url: 'https://subgraph.tech/product',
      title: 'Subgraph product',
      citedText: 'The agent reads candidate profiles, sends outreach, and submits interested candidates directly to Slack.',
    }])

    expect(facts).toEqual([{
      fact: 'The agent reads candidate profiles, sends outreach, and submits interested candidates directly to Slack.',
      evidence_quote: 'The agent reads candidate profiles, sends outreach, and submits interested candidates directly to Slack.',
      source_url: 'https://subgraph.tech/product',
      use_as_hook: true,
    }])
  })
})
