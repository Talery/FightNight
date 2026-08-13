import { describe, expect, it } from 'vitest'
import {
  abilityArtSource,
  assetOrFallback,
  assetRegistry,
  biomeArtSource,
  fighterArtSource,
  eventArtSource,
  itemArtSource,
  perkArtSource,
} from './registry'
import type { Item } from '../game/types'

const baseItem: Item = {
  id: 'test-item',
  name: 'Тестовый предмет',
  type: 'equipment',
  rarity: 'common',
  stats: {},
  value: 1,
  description: 'Для проверки реестра.',
}

describe('assetRegistry', () => {
  it('contains every current scene and fighter variant', () => {
    expect(Object.keys(assetRegistry.scenes.locations)).toHaveLength(6)
    expect(Object.keys(assetRegistry.scenes.expedition)).toHaveLength(3)
    expect(assetRegistry.fighters.heroes).toHaveLength(6)
    expect(assetRegistry.fighters.enemies).toHaveLength(6)
    expect(Object.keys(assetRegistry.biomes)).toHaveLength(8)
    expect(Object.keys(assetRegistry.bosses)).toHaveLength(12)
    expect(Object.keys(assetRegistry.events)).toHaveLength(8)
    expect(assetRegistry.items.uniqueRelics).toHaveLength(8)
    expect(Object.keys(assetRegistry.perkIndividuals)).toHaveLength(12)
    expect(new Set(Object.values(assetRegistry.perkIndividuals))).toHaveLength(12)
    expect(new Set(Object.values(assetRegistry.abilities))).toHaveLength(3)
    expect(assetRegistry.audio.music.city).toBeTruthy()
    expect(assetRegistry.audio.music.expedition).toBeTruthy()
    expect(assetRegistry.audio.music.boss).toBeTruthy()
    expect(new Set(Object.values(assetRegistry.biomes.catacombs))).toHaveLength(3)
    expect(new Set(Object.values(assetRegistry.biomes.salt))).toHaveLength(3)
    expect(new Set(Object.values(assetRegistry.biomes.citadel))).toHaveLength(3)
    expect(new Set(Object.values(assetRegistry.biomes.marsh))).toHaveLength(3)
    expect(new Set(Object.values(assetRegistry.biomes.monastery))).toHaveLength(3)
    expect(new Set(Object.values(assetRegistry.biomes.mines))).toHaveLength(3)
    expect(new Set(Object.values(assetRegistry.biomes.coast))).toHaveLength(3)
    expect(new Set(Object.values(assetRegistry.biomes.garden))).toHaveLength(3)
    expect(assetRegistry.biomes.catacombs.routeArt).not.toBe(assetRegistry.scenes.expedition.route)
    expect(assetRegistry.biomes.salt.routeArt).not.toBe(assetRegistry.scenes.expedition.route)
    expect(assetRegistry.biomes.citadel.routeArt).not.toBe(assetRegistry.scenes.expedition.route)
    expect(assetRegistry.biomes.marsh.routeArt).not.toBe(assetRegistry.scenes.expedition.route)
    expect(assetRegistry.biomes.monastery.routeArt).not.toBe(assetRegistry.scenes.expedition.route)
    expect(assetRegistry.biomes.mines.routeArt).not.toBe(assetRegistry.scenes.expedition.route)
    expect(assetRegistry.biomes.coast.routeArt).not.toBe(assetRegistry.scenes.expedition.route)
    expect(assetRegistry.biomes.garden.routeArt).not.toBe(assetRegistry.scenes.expedition.route)
  })

  it('uses an individual icon for unique relic variants', () => {
    const item = { id: 'unique', name: 'Корона без лица', type: 'equipment' as const, slot: 'head' as const, rarity: 'mythic' as const, stats: {}, value: 1, description: '', uniqueId: 'relic-0-strength' }
    expect(itemArtSource(item)).toBe(assetRegistry.items.uniqueRelics[0])
  })

  it('resolves item, perk, ability, and fighter mappings', () => {
    expect(itemArtSource({ ...baseItem, slot: 'weapon', weaponStyle: 'spear' })).toBe(assetRegistry.items.weapons.spear)
    expect(itemArtSource({ ...baseItem, type: 'consumable', effect: 'heal' })).toBe(assetRegistry.items.consumables.heal)
    expect(perkArtSource({ id: 'iron-hide', branch: 'defense' })).toBe(assetRegistry.perkIndividuals['iron-hide'])
    expect(perkArtSource({ id: 'tree-survival-1', branch: 'survival' })).toBe(assetRegistry.perks.survival)
    expect(abilityArtSource('guardBreak')).toBe(assetRegistry.abilities.guardBreak)
    expect(fighterArtSource(7, true)).toBe(assetRegistry.fighters.enemies[1])
    expect(fighterArtSource(7, true, '/boss.webp')).toBe('/boss.webp')
    expect(fighterArtSource(0, true, assetRegistry.bosses['debt-judge'])).toBe(assetRegistry.bosses['debt-judge'])
  })

  it('uses safe fallbacks for absent optional art', () => {
    expect(assetOrFallback(undefined)).toBe(assetRegistry.fallbacks.image)
    expect(assetOrFallback('')).toBe(assetRegistry.fallbacks.image)
    expect(perkArtSource({ id: 'unknown' })).toBe(assetRegistry.fallbacks.icon)
    expect(fighterArtSource(Number.NaN)).toBe(assetRegistry.fallbacks.fighter)
    expect(biomeArtSource('unknown-biome', 'combatArt')).toBe(assetRegistry.fallbacks.scene)
    expect(eventArtSource('unknown', '/fallback.webp')).toBe('/fallback.webp')
    expect(eventArtSource('altar', '/fallback.webp')).toBe(assetRegistry.events.altar)
  })
})
