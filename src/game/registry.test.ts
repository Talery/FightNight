import { describe, expect, it } from 'vitest'
import { contentRegistry, validateContentRegistry } from './registry'
import { previewContent } from './content-preview'

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

  it('ships at least 500 reusable name and item parts', () => {
    const parts = contentRegistry.firstNames.length + contentRegistry.epithets.length + contentRegistry.enemyNames.length + contentRegistry.enemyTitles.length
      + contentRegistry.itemMaterials.length + contentRegistry.itemSuffixes.length + Object.values(contentRegistry.itemParts).reduce((total, part) => total + part.nouns.length, 0)
    expect(parts).toBeGreaterThanOrEqual(500)
  })

  it('produces a deterministic editorial content preview', () => {
    expect(previewContent(4242)).toEqual(previewContent(4242))
    expect(previewContent(4242).items).toHaveLength(8)
    expect(previewContent(4242).enemies.every((enemy) => enemy.faction && enemy.archetype)).toBe(true)
  })

  it('defines two distinct short behavior patterns for every enemy archetype', () => {
    const profiles = contentRegistry.enemyBehaviorProfiles
    expect(profiles.map((profile) => profile.archetypeId).sort()).toEqual(contentRegistry.enemyArchetypes.map((archetype) => archetype.id).sort())
    for (const profile of profiles) {
      expect(profile.patterns.length).toBeGreaterThanOrEqual(2)
      expect(new Set(profile.patterns.map((pattern) => pattern.sequence.join('>'))).size).toBeGreaterThanOrEqual(2)
      expect(profile.patterns.every((pattern) => pattern.sequence.length >= 2 && pattern.sequence.length <= 3)).toBe(true)
    }
  })

  it('rejects incomplete enemy behavior coverage at runtime', () => {
    const invalid = {
      ...contentRegistry,
      enemyBehaviorProfiles: contentRegistry.enemyBehaviorProfiles.slice(1),
    } as typeof contentRegistry
    expect(() => validateContentRegistry(invalid)).toThrow(/behavior profiles must cover/i)
  })
})
