import { describe, expect, it } from 'vitest'
import { findResearchIdentityConflicts } from './research-identity'

describe('research identity conflicts', () => {
  it('flags a different surname attached to the same first name', () => {
    const conflicts = findResearchIdentityConflicts('Tucker Atkinson', [
      {
        url: 'https://example.com/tucker-connelly',
        title: 'Tucker Connelly resume',
        detail: 'Tucker Connelly worked at another company.',
      },
      {
        url: 'https://subgraph.tech/about',
        title: 'Tucker Atkinson at Subgraph',
        detail: 'Tucker Atkinson is the CTO of Subgraph.',
      },
    ])

    expect(conflicts).toHaveLength(1)
    expect(conflicts[0]).toMatchObject({
      sourceUrl: 'https://example.com/tucker-connelly',
      conflictingName: 'Tucker Connelly',
    })
  })

  it('flags a conflicting camel-cased social handle', () => {
    const conflicts = findResearchIdentityConflicts('Tucker Atkinson', [{
      url: 'https://x.com/TuckerConnelly',
      title: 'Tucker Atkinson (@TuckerConnelly) on X',
      detail: '',
    }])

    expect(conflicts.map(conflict => conflict.conflictingName)).toContain('Tucker Connelly')
  })
})
