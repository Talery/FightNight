import { balance } from './balance'
import { contentRegistry } from './registry'
import { deterministicId, type SeededRng } from './random'
import type { EquipSlot, Item, ItemAffix, Rarity, StatBlock, WeaponStyle } from './types'
import type { ItemMaterial, ItemNameAgreement, ItemNoun } from './content'
import { inferItemTags, itemRuleDescriptions } from './build-identity'
import type { ItemRuleModifier } from './types'

const nouns = (agreement: ItemNameAgreement, ...names: string[]): ItemNoun[] => names.map((text) => ({ text, agreement }))

const weaponNames: Record<WeaponStyle, ItemNoun[]> = {
  blade: nouns('masculine', 'клинок', 'секач', 'фальшион'),
  mace: [...nouns('masculine', 'молот'), ...nouns('feminine', 'булава', 'колотушка')],
  spear: [...nouns('neuter', 'копьё'), ...nouns('feminine', 'пика'), ...nouns('masculine', 'шип')],
  dagger: nouns('masculine', 'кинжал', 'стилет', 'нож'),
  relic: nouns('masculine', 'жезл', 'реликварий', 'осколок'),
}

const rarityNames: Record<Rarity, string> = {
  common: 'Обычный', uncommon: 'Добротный', rare: 'Редкий', epic: 'Проклятый', mythic: 'Реликтовый',
}

function withTags(item: Item): Item {
  item.tags = inferItemTags(item)
  return item
}

function pickRarity(rng: SeededRng, difficulty: number, luck = 0): Rarity {
  const roll = rng.next() + difficulty * 0.018 + luck * 0.008
  if (roll > balance.rarityThresholds.mythic) return 'mythic'
  if (roll > balance.rarityThresholds.epic) return 'epic'
  if (roll > balance.rarityThresholds.rare) return 'rare'
  if (roll > balance.rarityThresholds.uncommon) return 'uncommon'
  return 'common'
}

export function assembleItemName(material: ItemMaterial, itemNoun: ItemNoun, suffix: string): string {
  const adjective = material[itemNoun.agreement]
  return `${adjective[0].toUpperCase()}${adjective.slice(1)} ${itemNoun.text} ${suffix}`
}

export function itemIcon(item: Item): string {
  if (item.type === 'consumable') return item.effect === 'heal' ? '✚' : item.effect === 'bomb' ? '✹' : '◇'
  const options = contentRegistry.itemParts[item.slot!].icons
  let value = 0
  for (const char of item.id) value += char.charCodeAt(0)
  return options[value % options.length]
}

export function generateItem(rng: SeededRng, difficulty: number, luck = 0, forceConsumable = false, faction?: string): Item {
  if (forceConsumable || rng.chance(0.2)) {
    const effect = rng.pick(['heal', 'focus', 'bomb'] as const)
    const names = {
      heal: ['Красная настойка', 'Горькая припарка', 'Соль живых'],
      focus: ['Пепельный табак', 'Настой ясного глаза', 'Дым ведьмы'],
      bomb: ['Глиняная громовуха', 'Склянка злого огня', 'Костяная бомба'],
    }
    const amount = effect === 'heal' ? 24 + difficulty * 3 : effect === 'bomb' ? 18 + difficulty * 2 : 2
    return withTags({
      id: deterministicId(rng, 'use'), name: rng.pick(names[effect]), type: 'consumable', rarity: 'common', stats: {},
      value: 10 + difficulty * 3,
      description: effect === 'heal' ? `Восстанавливает ${amount} здоровья.` : effect === 'bomb' ? `Наносит врагу ${amount} урона.` : 'Восстанавливает 2 выносливости.',
      effect, amount,
    })
  }

  const slot = rng.pick(Object.keys(contentRegistry.itemParts) as EquipSlot[])
  const rarity = pickRarity(rng, difficulty, luck)
  const rank = balance.rarityRank[rarity]
  const part = contentRegistry.itemParts[slot]
  const material = rng.pick(contentRegistry.itemMaterials)
  const weaponStyle = slot === 'weapon' ? rng.pick(Object.keys(weaponNames) as WeaponStyle[]) : undefined
  const itemNoun = weaponStyle ? rng.pick(weaponNames[weaponStyle]) : rng.pick(part.nouns)
  const suffix = rng.pick(contentRegistry.itemSuffixes)
  const stats: Partial<StatBlock> = {}
  const primary = rng.pick(['strength', 'agility', 'luck', 'armor', 'maxHp'] as const)
  stats[primary] = primary === 'maxHp' ? 5 + rank * 4 + difficulty : 1 + rank + Math.floor(difficulty / 4)
  if (rank >= 3) {
    const secondary = rng.pick(['strength', 'agility', 'luck', 'armor'] as const)
    stats[secondary] = (stats[secondary] ?? 0) + Math.max(1, rank - 2)
  }
  const perk = rank >= 4 && rng.chance(0.45) ? rng.pick(contentRegistry.perks).id : undefined
  const ruleModifier: ItemRuleModifier | undefined = rank >= 3 && rng.chance(0.18) ? rng.pick(['bloodMomentum', 'perfectGuard', 'freeHeavyOpener'] as ItemRuleModifier[]) : undefined
  const affixes: ItemAffix[] = []
  const affixCount = 1 + (rank >= 3 ? 1 : 0) + (rank >= 4 ? 1 : 0)
  const affixPool = [...contentRegistry.itemAffixes]
  for (let index = 0; index < affixCount && affixPool.length; index += 1) {
    const affix = affixPool.splice(rng.int(0, affixPool.length - 1), 1)[0]
    affixes.push(affix)
    stats[affix.stat] = (stats[affix.stat] ?? 0) + affix.value
  }
  if (rank >= 4 && rng.chance(0.5)) {
    const curse = rng.pick(contentRegistry.cursedAffixes)
    affixes.push(curse)
    stats[curse.stat] = (stats[curse.stat] ?? 0) + curse.value
  }
  const set = rank >= 2 && rng.chance(0.32) ? rng.pick(contentRegistry.itemSets) : undefined
  const relic = rarity === 'mythic' && rng.chance(0.55) ? rng.pick(contentRegistry.uniqueRelics) : undefined
  if (relic) {
    stats[relic.stat] = (stats[relic.stat] ?? 0) + relic.value
    return withTags({
      id: deterministicId(rng, 'relic'), name: relic.name, type: 'equipment', slot, rarity, stats, value: 220 + difficulty * 18,
      description: `${relic.description}${ruleModifier ? ` ${itemRuleDescriptions[ruleModifier]}` : ''}${faction ? ` Трофей фракции «${faction}».` : ''}`, perk: rng.pick(contentRegistry.perks).id, weaponStyle, affixes, setId: set?.id, uniqueId: relic.id, faction, ruleModifier,
    })
  }
  return withTags({
    id: deterministicId(rng, 'gear'),
    name: assembleItemName(material, itemNoun, suffix),
    type: 'equipment', slot, rarity, stats,
    value: 8 + rank * rank * 9 + difficulty * 4,
    description: `${rarityNames[rarity]} трофей. На металле видны следы чужой истории.${ruleModifier ? ` ${itemRuleDescriptions[ruleModifier]}` : ''}`,
    perk, weaponStyle, affixes, setId: set?.id, faction, ruleModifier,
  })
}

export function weaponStyleLabel(style: WeaponStyle): string {
  return { blade: 'Клинок', mace: 'Дробящее', spear: 'Копьё', dagger: 'Кинжал', relic: 'Реликвия' }[style]
}

export function statSummary(item: Item): string {
  const names: Record<keyof StatBlock, string> = { strength: 'Сила', agility: 'Ловкость', luck: 'Удача', armor: 'Броня', maxHp: 'Здоровье' }
  const stats = Object.entries(item.stats).map(([key, value]) => `${names[key as keyof StatBlock]} ${Number(value) >= 0 ? '+' : ''}${value}`).join(' · ')
  const affixes = item.affixes?.map((affix) => `${affix.name} (${names[affix.stat]} ${affix.value >= 0 ? '+' : ''}${affix.value})`).join(' · ') ?? ''
  return [stats, affixes].filter(Boolean).join(' · ')
}
