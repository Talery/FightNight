import { generateEnemy } from './generation'
import { generateItem } from './items'
import { SeededRng } from './random'
import { contentRegistry } from './registry'

export type ContentPreview = {
  seed: number
  heroes: Array<{ name: string; epithet: string }>
  enemies: Array<{ name: string; title: string; faction: string; archetype: string }>
  items: Array<{ name: string; rarity: string; description: string }>
  events: Array<{ title: string; description: string }>
}

/** Deterministic sample for balancing and editorial review without starting a run. */
export function previewContent(seed: number, size = 8): ContentPreview {
  const rng = new SeededRng(seed)
  return {
    seed,
    heroes: Array.from({ length: size }, () => ({ name: rng.pick(contentRegistry.firstNames), epithet: rng.pick(contentRegistry.epithets) })),
    enemies: Array.from({ length: size }, (_, index) => {
      const enemy = generateEnemy(rng, 1 + index % 10, index % 8, index % 3 === 0, false)
      return { name: enemy.name, title: enemy.title, faction: enemy.faction, archetype: enemy.archetype }
    }),
    items: Array.from({ length: size }, (_, index) => {
      const item = generateItem(rng, 1 + index % 10, index % 5)
      return { name: item.name, rarity: item.rarity, description: item.description }
    }),
    events: Array.from({ length: size }, () => {
      const event = rng.pick(contentRegistry.eventTemplates)
      return { title: event.title, description: event.description }
    }),
  }
}
