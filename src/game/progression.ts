import { balance, xpTargetForLevel } from './balance'
import { createQuest, createShop } from './economy'
import { generateItem } from './items'
import { deterministicId, type SeededRng } from './random'
import { contentRegistry } from './registry'
import { addLog } from './state'
import type { Attribute, FallenHero, GameState, Hero, StatBlock } from './types'

export function getHeroStats(hero: Hero): StatBlock {
  const total = { ...hero.base }
  for (const itemId of Object.values(hero.equipment)) {
    const item = hero.inventory.find((candidate) => candidate.id === itemId)
    if (!item) continue
    for (const [key, value] of Object.entries(item.stats) as [keyof StatBlock, number][]) total[key] += value
  }
  const activePerks = getActivePerks(hero)
  if (activePerks.has('iron-hide')) total.armor += 2
  if (activePerks.has('grave-luck')) total.luck += 2
  if (activePerks.has('wolf-sinew')) total.strength += 2
  if (activePerks.has('rat-step')) total.agility += 2
  if (activePerks.has('thick-blood')) total.maxHp += 18
  return total
}

export function getActivePerks(hero: Hero): Set<string> {
  const result = new Set(hero.perks)
  Object.values(hero.equipment).forEach((id) => {
    const item = hero.inventory.find((candidate) => candidate.id === id)
    if (item?.perk) result.add(item.perk)
  })
  return result
}

export function enemyIntentReadChance(heroAgility: number, enemyAgility: number): number {
  return Math.max(0.08, Math.min(0.75, 0.25 + (heroAgility - enemyAgility) * 0.05))
}

export function canReadEnemyIntent(rng: SeededRng, hero: Hero, enemyAgility: number): boolean {
  return rng.chance(enemyIntentReadChance(getHeroStats(hero).agility, enemyAgility))
}

export function rollPerkChoices(state: GameState, rng: SeededRng): void {
  if (!state.hero || state.hero.pendingPerks <= 0 || state.perkChoices.length) return
  const pool = contentRegistry.perks.filter((perk) => !state.hero!.perks.includes(perk.id))
  const choices: string[] = []
  while (pool.length && choices.length < 3) {
    choices.push(pool.splice(rng.int(0, pool.length - 1), 1)[0].id)
  }
  state.perkChoices = choices
}

export function gainExperience(state: GameState, amount: number, rng: SeededRng): void {
  const hero = state.hero!
  if (getActivePerks(hero).has('hard-lesson') && (state.expedition?.difficulty ?? 0) >= 6) amount = Math.round(amount * 1.2)
  hero.xp += amount
  while (hero.xp >= hero.xpToNext) {
    hero.xp -= hero.xpToNext
    hero.level += 1
    hero.xpToNext = xpTargetForLevel(hero.level)
    hero.unspent += balance.attributesPerLevel
    hero.base.maxHp += balance.levelHpGain
    hero.hp = Math.min(getHeroStats(hero).maxHp, hero.hp + balance.levelHeal)
    if (hero.level % balance.perkLevelInterval === 0) hero.pendingPerks += 1
    addLog(state, `Новый уровень: ${hero.level}. Получено ${balance.attributesPerLevel} очка характеристик.`, 'gold')
  }
  rollPerkChoices(state, rng)
}

export function killHero(state: GameState, cause: string): boolean {
  const hero = state.hero!
  if (getActivePerks(hero).has('last-word') && !hero.lastWordUsed) {
    hero.lastWordUsed = true
    hero.hp = 1
    addLog(state, 'Последнее слово удерживает бойца на границе смерти.', 'gold')
    return false
  }
  const fallen: FallenHero = {
    id: hero.id, name: hero.name, epithet: hero.epithet, level: hero.level,
    score: hero.score, victories: hero.victories, diedAt: state.actionSequence,
  }
  state.fallen = [fallen, ...state.fallen].sort((a, b) => b.score - a.score).slice(0, balance.maxFallenHeroes)
  state.view = 'dead'
  state.expedition = null
  addLog(state, `${hero.name} погибает: ${cause}. Пепельный Круг запоминает результат.`, 'bad')
  return true
}

export function createHero(state: GameState, rng: SeededRng): GameState {
  const joke = rng.chance(0.07)
  const hero: Hero = {
    id: deterministicId(rng, 'hero'),
    name: joke ? rng.pick(contentRegistry.funnyNames) : rng.pick(contentRegistry.firstNames),
    epithet: joke ? 'по ошибке допущенный к Кругу' : rng.pick(contentRegistry.epithets),
    level: 1, xp: 0, xpToNext: balance.startingXpTarget, hp: balance.startingHp,
    base: { strength: 5, agility: 5, luck: 3, armor: 0, maxHp: balance.startingHp },
    unspent: 0, pendingPerks: 0, perks: [], inventory: [], equipment: {},
    gold: balance.startingGold, score: 0, victories: 0, deepest: 0,
    createdAt: state.actionSequence, lastWordUsed: false,
  }
  const starter = generateItem(rng, 1)
  starter.type = 'equipment'
  starter.slot = 'weapon'
  delete starter.effect
  delete starter.amount
  starter.name = 'Зазубренный меч должника'
  starter.stats = { strength: 1 }
  starter.value = 6
  hero.inventory.push(starter, generateItem(rng, 1, 0, true))
  hero.equipment.weapon = starter.id
  const next: GameState = {
    ...state, view: 'hub', hero, expedition: null,
    quest: null, questOffer: createQuest(rng, 1), shop: createShop(rng, 1), perkChoices: [], notice: null,
    logs: [],
  }
  addLog(next, `${hero.name} ${hero.epithet} входит в Пепельный Круг.`, 'gold')
  addLog(next, 'Смотритель выдаёт ржавый клинок и советует не привыкать к имени.', 'plain')
  return next
}

export function attributeName(attribute: Attribute): string {
  return { strength: 'Сила', agility: 'Ловкость', luck: 'Удача' }[attribute]
}
