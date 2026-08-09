import { describe, expect, it } from 'vitest'
import { contentRegistry, validateContentRegistry } from './registry'

describe('content registry', () => {
  it('validates the shipped content', () => {
    expect(validateContentRegistry()).toBe(true)
  })

  it('rejects duplicate perk ids at runtime', () => {
    const invalid = {
      ...contentRegistry,
      perks: [contentRegistry.perks[0], contentRegistry.perks[0]],
    } as typeof contentRegistry
    expect(() => validateContentRegistry(invalid)).toThrow(/perk ids/i)
  })
})
