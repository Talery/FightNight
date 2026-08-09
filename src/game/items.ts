import { balance } from './balance'
import { contentRegistry } from './registry'
import { deterministicId, type SeededRng } from './random'
import type { EquipSlot, Item, Rarity, StatBlock } from './types'

const rarityNames: Record<Rarity, string> = {
  common: 'Обычный', uncommon: 'Добротный', rare: 'Редкий', epic: 'Проклятый', mythic: 'Реликтовый',
}

function pickRarity(rng: SeededRng, difficulty: number, luck = 0): Rarity {
  const roll = rng.next() + difficulty * 0.018 + luck * 0.008
  if (roll > balance.rarityThresholds.mythic) return 'mythic'
  if (roll > balance.rarityThresholds.epic) return 'epic'
  if (roll > balance.rarityThresholds.rare) return 'rare'
  if (roll > balance.rarityThresholds.uncommon) return 'uncommon'
  return 'common'
}

export function itemIcon(item: Item): string {
  if (item.type === 'consumable') return item.effect === 'heal' ? '✚' : item.effect === 'bomb' ? '✹' : '◇'
  const options = contentRegistry.itemParts[item.slot!].icons
  let value = 0
  for (const char of item.id) value += char.charCodeAt(0)
  return options[value % options.length]
}

export function generateItem(rng: SeededRng, difficulty: number, luck = 0, forceConsumable = false): Item {
  if (forceConsumable || rng.chance(0.2)) {
    const effect = rng.pick(['heal', 'focus', 'bomb'] as const)
    const names = {
      heal: ['Красная настойка', 'Горькая припарка', 'Соль живых'],
      focus: ['Пепельный табак', 'Настой ясного глаза', 'Дым ведьмы'],
      bomb: ['Глиняная громовуха', 'Склянка злого огня', 'Костяная бомба'],
    }
    const amount = effect === 'heal' ? 24 + difficulty * 3 : effect === 'bomb' ? 18 + difficulty * 2 : 2
    return {
      id: deterministicId(rng, 'use'), name: rng.pick(names[effect]), type: 'consumable', rarity: 'common', stats: {},
      value: 10 + difficulty * 3,
      description: effect === 'heal' ? `Восстанавливает ${amount} здоровья.` : effect === 'bomb' ? `Наносит врагу ${amount} урона.` : 'Восстанавливает 2 выносливости.',
      effect, amount,
    }
  }

  const slot = rng.pick(Object.keys(contentRegistry.itemParts) as EquipSlot[])
  const rarity = pickRarity(rng, difficulty, luck)
  const rank = balance.rarityRank[rarity]
  const part = contentRegistry.itemParts[slot]
  const material = rng.pick(contentRegistry.itemMaterials)
  const noun = rng.pick(part.nouns)
  const suffix = rng.pick(contentRegistry.itemSuffixes)
  const stats: Partial<StatBlock> = {}
  const primary = rng.pick(['strength', 'agility', 'luck', 'armor', 'maxHp'] as const)
  stats[primary] = primary === 'maxHp' ? 5 + rank * 4 + difficulty : 1 + rank + Math.floor(difficulty / 4)
  if (rank >= 3) {
    const secondary = rng.pick(['strength', 'agility', 'luck', 'armor'] as const)
    stats[secondary] = (stats[secondary] ?? 0) + Math.max(1, rank - 2)
  }
  const perk = rank >= 4 && rng.chance(0.45) ? rng.pick(contentRegistry.perks).id : undefined
  return {
    id: deterministicId(rng, 'gear'),
    name: `${material[0].toUpperCase()}${material.slice(1)} ${noun} ${suffix}`,
    type: 'equipment', slot, rarity, stats,
    value: 8 + rank * rank * 9 + difficulty * 4,
    description: `${rarityNames[rarity]} трофей. На металле видны следы чужой истории.`,
    perk,
  }
}

export function statSummary(item: Item): string {
  const names: Record<keyof StatBlock, string> = { strength: 'Сила', agility: 'Ловкость', luck: 'Удача', armor: 'Броня', maxHp: 'Здоровье' }
  return Object.entries(item.stats).map(([key, value]) => `${names[key as keyof StatBlock]} +${value}`).join(' · ')
}
