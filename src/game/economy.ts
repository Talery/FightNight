import { generateItem } from './items'
import { deterministicId, type SeededRng } from './random'
import { contentRegistry } from './registry'
import type { Item, Quest } from './types'

export function createQuest(rng: SeededRng, level: number): Quest {
  const goal = rng.int(3, 5) + Math.floor(level / 4)
  const minDifficulty = Math.min(10, Math.max(1, rng.int(1, Math.ceil(level / 2) + 2)))
  return {
    id: deterministicId(rng, 'quest'),
    name: rng.pick(contentRegistry.questVerbs),
    description: `Победить ${goal} противников в походах сложности ${minDifficulty} или выше.`,
    goal, progress: 0, minDifficulty,
    rewardGold: 20 + goal * 9 + minDifficulty * 4,
    rewardScore: 35 + goal * 12 + minDifficulty * 8,
    complete: false,
  }
}

export function createShop(rng: SeededRng, level: number): Item[] {
  return Array.from({ length: 7 }, (_, index) => generateItem(rng, Math.max(1, Math.ceil(level / 2)), 0, index > 4))
}
