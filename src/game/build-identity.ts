import { contentRegistry } from './registry'
import type { Expedition, Hero, Item, ItemRuleModifier, OathId, RunModifier, SynergyTag } from './types'

export interface OathDefinition {
  id: OathId
  name: string
  promise: string
  price: string
  tags: SynergyTag[]
  modifiers: RunModifier[]
}

export const synergyNames: Record<SynergyTag, string> = {
  blood: 'Кровь', poison: 'Яд', heavy: 'Тяжёлый удар', counter: 'Контратака',
  evasion: 'Уклонение', relics: 'Реликвии', survival: 'Выживание', trade: 'Торговля',
}

export const itemRuleDescriptions: Record<ItemRuleModifier, string> = {
  bloodMomentum: 'Кровавый разгон: быстрый удар наносит на 25% больше урона цели с кровотечением.',
  perfectGuard: 'Идеальный ответ: точный блок восстанавливает 1 выносливость.',
  freeHeavyOpener: 'Первый приговор: первый тяжёлый удар боя не тратит выносливость.',
}

export function equippedRuleModifiers(hero: Hero): Set<ItemRuleModifier> {
  return new Set(Object.values(hero.equipment).map((id) => hero.inventory.find((item) => item.id === id)?.ruleModifier).filter((rule): rule is ItemRuleModifier => Boolean(rule)))
}

export const oathDefinitions: OathDefinition[] = [
  {
    id: 'scarlet', name: 'Багряная клятва', promise: '+15% урона героя', price: 'Лечение слабее на 25%', tags: ['blood', 'heavy'],
    modifiers: [
      { id: 'oath-scarlet-power', name: 'Багряная сила', description: 'Урон героя +15%.', tone: 'boon', stat: 'heroPower', value: .15 },
      { id: 'oath-scarlet-heal', name: 'Цена крови', description: 'Лечение −25%.', tone: 'curse', stat: 'healing', value: -.25 },
    ],
  },
  {
    id: 'iron', name: 'Железная клятва', promise: '+2 брони', price: 'Враги наносят на 10% больше урона', tags: ['counter', 'survival'],
    modifiers: [
      { id: 'oath-iron-armor', name: 'Железная стойка', description: 'Броня героя +2.', tone: 'boon', stat: 'heroArmor', value: 2 },
      { id: 'oath-iron-enemy', name: 'Звон вызова', description: 'Урон врагов +10%.', tone: 'curse', stat: 'enemyPower', value: .1 },
    ],
  },
  {
    id: 'wanderer', name: 'Клятва странника', promise: '+2 удачи', price: 'Здоровье врагов выше на 12%', tags: ['trade', 'relics'],
    modifiers: [
      { id: 'oath-wanderer-luck', name: 'Глаз странника', description: 'Удача +2.', tone: 'boon', stat: 'luck', value: 2 },
      { id: 'oath-wanderer-enemy', name: 'Долгая дорога', description: 'Здоровье врагов +12%.', tone: 'curse', stat: 'enemyHp', value: .12 },
    ],
  },
]

export function oathById(id: OathId | undefined): OathDefinition {
  return oathDefinitions.find((oath) => oath.id === id) ?? oathDefinitions[1]
}

export function inferItemTags(item: Item): SynergyTag[] {
  const tags = new Set<SynergyTag>(item.tags ?? [])
  if (item.effect === 'heal') tags.add('survival')
  if (item.effect === 'focus') tags.add('evasion')
  if (item.effect === 'bomb') tags.add('relics')
  if (item.weaponStyle === 'blade') tags.add('blood')
  if (item.weaponStyle === 'mace') tags.add('heavy')
  if (item.weaponStyle === 'spear') tags.add('counter')
  if (item.weaponStyle === 'dagger') { tags.add('poison'); tags.add('evasion') }
  if (item.weaponStyle === 'relic') tags.add('relics')
  if ((item.stats.strength ?? 0) > 0) tags.add('heavy')
  if ((item.stats.agility ?? 0) > 0) tags.add('evasion')
  if ((item.stats.armor ?? 0) > 0 || (item.stats.maxHp ?? 0) > 0) tags.add('survival')
  if ((item.stats.luck ?? 0) > 0) tags.add('trade')
  return [...tags].slice(0, 3)
}

function tagsFromText(text: string): SynergyTag[] {
  const source = text.toLowerCase()
  const tags: SynergyTag[] = []
  if (/кров|ран|bleed/.test(source)) tags.push('blood')
  if (/яд|poison/.test(source)) tags.push('poison')
  if (/тяж|сил|брон.*слом/.test(source)) tags.push('heavy')
  if (/блок|контр|ответ/.test(source)) tags.push('counter')
  if (/уклон|ловк|финт/.test(source)) tags.push('evasion')
  if (/релик|мист|эссен/.test(source)) tags.push('relics')
  if (/здоров|леч|выжив|брон/.test(source)) tags.push('survival')
  if (/золот|торг|лавк|награ/.test(source)) tags.push('trade')
  return tags
}

export function buildSynergies(hero: Hero, expedition: Expedition | null): Array<{ tag: SynergyTag; name: string; count: number; state: 'active' | 'near' | 'seed' }> {
  const counts = new Map<SynergyTag, number>()
  const add = (tags: SynergyTag[]) => tags.forEach((tag) => counts.set(tag, (counts.get(tag) ?? 0) + 1))
  Object.values(hero.equipment).forEach((id) => { const item = hero.inventory.find((candidate) => candidate.id === id); if (item) add(inferItemTags(item)) })
  hero.perks.forEach((id) => { const perk = contentRegistry.perks.find((candidate) => candidate.id === id); if (perk) add(tagsFromText(`${perk.name} ${perk.description}`)) })
  hero.mutations.forEach((id) => { const mutation = contentRegistry.heroMutations.find((candidate) => candidate.id === id); if (mutation) add(tagsFromText(`${mutation.name} ${mutation.description}`)) })
  if (expedition?.oathId) add(oathById(expedition.oathId).tags)
  return [...counts.entries()].map(([tag, count]) => ({ tag, name: synergyNames[tag], count, state: count >= 3 ? 'active' as const : count === 2 ? 'near' as const : 'seed' as const })).sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, 'ru'))
}
