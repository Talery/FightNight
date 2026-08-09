import {
  enemyNames,
  enemyMutations,
  enemyTitles,
  enemyTraits,
  epithets,
  eventTemplates,
  expeditionConditions,
  expeditionPlaces,
  firstNames,
  funnyNames,
  itemMaterials,
  itemParts,
  itemSuffixes,
  perks,
  questVerbs,
  runBoons,
  runCurses,
} from './content'
import type {
  Attribute,
  CombatState,
  Enemy,
  EquipSlot,
  Expedition,
  ExpeditionEvent,
  ExpeditionNode,
  FallenHero,
  GameAction,
  GameState,
  Hero,
  Item,
  LogEntry,
  Quest,
  Rarity,
  RunModifier,
  StatBlock,
  Zone,
} from './types'

class Rng {
  state: number
  constructor(seed: number) {
    this.state = seed || 0x6d2b79f5
  }
  next() {
    let t = (this.state += 0x6d2b79f5)
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
  int(min: number, max: number) {
    return Math.floor(this.next() * (max - min + 1)) + min
  }
  pick<T>(list: readonly T[]): T {
    return list[Math.floor(this.next() * list.length)]
  }
  chance(value: number) {
    return this.next() < value
  }
}

const rarityRank: Record<Rarity, number> = { common: 1, uncommon: 2, rare: 3, epic: 4, mythic: 5 }
const rarityNames: Record<Rarity, string> = {
  common: 'Обычный', uncommon: 'Добротный', rare: 'Редкий', epic: 'Проклятый', mythic: 'Реликтовый',
}

const uid = (rng: Rng, prefix: string) => `${prefix}-${Date.now().toString(36)}-${rng.int(10000, 99999)}`

function pickRarity(rng: Rng, difficulty: number, luck = 0): Rarity {
  const roll = rng.next() + difficulty * 0.018 + luck * 0.008
  if (roll > 1.2) return 'mythic'
  if (roll > 1.02) return 'epic'
  if (roll > 0.78) return 'rare'
  if (roll > 0.42) return 'uncommon'
  return 'common'
}

export function itemIcon(item: Item): string {
  if (item.type === 'consumable') return item.effect === 'heal' ? '✚' : item.effect === 'bomb' ? '✹' : '◇'
  const options = itemParts[item.slot!].icons
  let value = 0
  for (const char of item.id) value += char.charCodeAt(0)
  return options[value % options.length]
}

export function generateItem(rng: Rng, difficulty: number, luck = 0, forceConsumable = false): Item {
  if (forceConsumable || rng.chance(0.2)) {
    const effect = rng.pick(['heal', 'focus', 'bomb'] as const)
    const names = {
      heal: ['Красная настойка', 'Горькая припарка', 'Соль живых'],
      focus: ['Пепельный табак', 'Настой ясного глаза', 'Дым ведьмы'],
      bomb: ['Глиняная громовуха', 'Склянка злого огня', 'Костяная бомба'],
    }
    const amount = effect === 'heal' ? 24 + difficulty * 3 : effect === 'bomb' ? 18 + difficulty * 2 : 2
    return {
      id: uid(rng, 'use'), name: rng.pick(names[effect]), type: 'consumable', rarity: 'common', stats: {},
      value: 10 + difficulty * 3, description: effect === 'heal' ? `Восстанавливает ${amount} здоровья.` : effect === 'bomb' ? `Наносит врагу ${amount} урона.` : 'Восстанавливает 2 выносливости.',
      effect, amount,
    }
  }

  const slot = rng.pick(Object.keys(itemParts) as EquipSlot[])
  const rarity = pickRarity(rng, difficulty, luck)
  const rank = rarityRank[rarity]
  const part = itemParts[slot]
  const material = rng.pick(itemMaterials)
  const noun = rng.pick(part.nouns)
  const suffix = rng.pick(itemSuffixes)
  const stats: Partial<StatBlock> = {}
  const primary = rng.pick(['strength', 'agility', 'luck', 'armor', 'maxHp'] as const)
  stats[primary] = primary === 'maxHp' ? 5 + rank * 4 + difficulty : 1 + rank + Math.floor(difficulty / 4)
  if (rank >= 3) {
    const secondary = rng.pick(['strength', 'agility', 'luck', 'armor'] as const)
    stats[secondary] = (stats[secondary] ?? 0) + Math.max(1, rank - 2)
  }
  const perk = rank >= 4 && rng.chance(0.45) ? rng.pick(perks).id : undefined
  return {
    id: uid(rng, 'gear'),
    name: `${material[0].toUpperCase()}${material.slice(1)} ${noun} ${suffix}`,
    type: 'equipment', slot, rarity, stats,
    value: 8 + rank * rank * 9 + difficulty * 4,
    description: `${rarityNames[rarity]} трофей. На металле видны следы чужой истории.`,
    perk,
  }
}

function createQuest(rng: Rng, level: number): Quest {
  const goal = rng.int(3, 5) + Math.floor(level / 4)
  const minDifficulty = Math.min(10, Math.max(1, rng.int(1, Math.ceil(level / 2) + 2)))
  return {
    id: uid(rng, 'quest'),
    name: rng.pick(questVerbs),
    description: `Победить ${goal} противников в походах сложности ${minDifficulty} или выше.`,
    goal, progress: 0, minDifficulty,
    rewardGold: 20 + goal * 9 + minDifficulty * 4,
    rewardScore: 35 + goal * 12 + minDifficulty * 8,
    complete: false,
  }
}

function createShop(rng: Rng, level: number): Item[] {
  return Array.from({ length: 7 }, (_, index) => generateItem(rng, Math.max(1, Math.ceil(level / 2)), 0, index > 4))
}

function log(state: GameState, text: string, tone: LogEntry['tone'] = 'plain') {
  state.logs = [{ id: `${Date.now()}-${state.logs.length}`, time: Date.now(), text, tone }, ...state.logs].slice(0, 80)
}

export const initialState: GameState = {
  version: 2,
  view: 'welcome',
  seed: (Date.now() ^ 0xa53c9e17) >>> 0,
  hero: null,
  expedition: null,
  quest: null,
  questOffer: null,
  shop: [],
  logs: [],
  fallen: [],
  leaderboard: [],
  perkChoices: [],
  notice: null,
}

function createHero(state: GameState): GameState {
  const rng = new Rng(state.seed ^ Date.now())
  const joke = rng.chance(0.07)
  const hero: Hero = {
    id: uid(rng, 'hero'),
    name: joke ? rng.pick(funnyNames) : rng.pick(firstNames),
    epithet: joke ? 'по ошибке допущенный к Кругу' : rng.pick(epithets),
    level: 1, xp: 0, xpToNext: 70, hp: 82,
    base: { strength: 5, agility: 5, luck: 3, armor: 0, maxHp: 82 },
    unspent: 0, pendingPerks: 0, perks: [], inventory: [], equipment: {},
    gold: 28, score: 0, victories: 0, deepest: 0, createdAt: Date.now(), lastWordUsed: false,
  }
  const starter = generateItem(rng, 1, 0)
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
    ...state, seed: rng.state, view: 'hub', hero, expedition: null,
    quest: null, questOffer: createQuest(rng, 1), shop: createShop(rng, 1), perkChoices: [], notice: null,
    logs: [],
  }
  log(next, `${hero.name} ${hero.epithet} входит в Пепельный Круг.`, 'gold')
  log(next, 'Смотритель выдаёт ржавый клинок и советует не привыкать к имени.', 'plain')
  return next
}

export function getHeroStats(hero: Hero): StatBlock {
  const total = { ...hero.base }
  for (const itemId of Object.values(hero.equipment)) {
    const item = hero.inventory.find((candidate) => candidate.id === itemId)
    if (!item) continue
    for (const [key, value] of Object.entries(item.stats) as [keyof StatBlock, number][]) total[key] += value
  }
  const activePerks = new Set(hero.perks)
  for (const itemId of Object.values(hero.equipment)) {
    const item = hero.inventory.find((candidate) => candidate.id === itemId)
    if (item?.perk) activePerks.add(item.perk)
  }
  if (activePerks.has('iron-hide')) total.armor += 2
  if (activePerks.has('grave-luck')) total.luck += 2
  if (activePerks.has('wolf-sinew')) total.strength += 2
  if (activePerks.has('rat-step')) total.agility += 2
  if (activePerks.has('thick-blood')) total.maxHp += 18
  return total
}

export function enemyIntentReadChance(heroAgility: number, enemyAgility: number): number {
  return Math.max(0.08, Math.min(0.75, 0.25 + (heroAgility - enemyAgility) * 0.05))
}

function canReadEnemyIntent(rng: Rng, hero: Hero, enemy: Enemy): boolean {
  return rng.chance(enemyIntentReadChance(getHeroStats(hero).agility, enemy.agility))
}

export function getActivePerks(hero: Hero): Set<string> {
  const result = new Set(hero.perks)
  Object.values(hero.equipment).forEach((id) => {
    const item = hero.inventory.find((candidate) => candidate.id === id)
    if (item?.perk) result.add(item.perk)
  })
  return result
}

function generateEnemy(rng: Rng, difficulty: number, depth: number, elite: boolean, boss: boolean): Enemy {
  const scale = 1 + difficulty * 0.16 + depth * 0.055 + (elite ? 0.35 : 0) + (boss ? 0.65 : 0)
  const trait = rng.pick(enemyTraits)
  const name = boss ? `Судья ${rng.pick(enemyNames)}` : `${rng.pick(enemyNames)} ${rng.pick(epithets)}`
  const maxHp = Math.round((52 + rng.int(-7, 10)) * scale)
  const enemy: Enemy = {
    id: uid(rng, 'foe'), name, title: boss ? 'хозяин этого пути' : rng.pick(enemyTitles),
    hp: maxHp, maxHp, power: Math.round((7 + difficulty * 1.25 + depth * 0.42) * (elite ? 1.15 : 1)),
    armor: Math.round(difficulty * 0.55 + depth * 0.3 + (elite ? 2 : 0)),
    agility: 4 + Math.round(difficulty * 0.45 + rng.int(-1, 2)),
    trait: trait[0], traitDescription: trait[1], mutations: [], portrait: rng.int(0, 5), elite, boss,
  }
  const mutationCount = difficulty >= 8 ? rng.int(1, 2) : difficulty >= 5 || elite ? 1 : 0
  const pool = [...enemyMutations]
  for (let index = 0; index < mutationCount && pool.length; index += 1) {
    const picked = pool.splice(rng.int(0, pool.length - 1), 1)[0]
    enemy.mutations.push(picked[0])
    if (picked[2] === 'hp') { enemy.maxHp = Math.round(enemy.maxHp * 1.22); enemy.hp = enemy.maxHp }
    if (picked[2] === 'armor') enemy.armor += 2
    if (picked[2] === 'power') enemy.power += 2
    if (picked[2] === 'agility') enemy.agility += 2
    if (picked[2] === 'frenzy') enemy.power = Math.round(enemy.power * 1.12)
    if (picked[2] === 'hollow') { enemy.maxHp = Math.round(enemy.maxHp * 1.1); enemy.hp = enemy.maxHp; enemy.armor += 1 }
  }
  return enemy
}

function makeNodes(rng: Rng, condition: string): ExpeditionNode[] {
  const stages: ExpeditionNode['type'][][] = [
    ['battle'],
    rng.chance(0.5) ? ['battle', 'event'] : ['event', 'battle'],
    ['battle', 'treasure', 'event'],
    ['camp', 'shrine'],
    condition === 'Звон цепей' ? ['elite', 'elite'] : ['elite', 'battle'],
    rng.chance(0.5) ? ['event', 'battle', 'treasure'] : ['battle', 'event', 'battle'],
    ['elite', 'camp'],
    ['boss'],
  ]
  const titles = { battle: 'Засада', elite: 'Именной боец', event: 'Неизвестность', camp: 'Тихое место', shrine: 'Чужой алтарь', treasure: 'Забытый схрон', boss: 'Сердце пути' }
  const subtitles = { battle: 'Звон оружия впереди', elite: 'Опасная добыча', event: 'Решение изменит поход', camp: 'Редкая передышка', shrine: 'Дар всегда требует цену', treasure: 'Подозрительно лёгкая добыча', boss: 'Назад дороги нет' }
  return stages.flatMap((types, depth) => types.map((type, lane) => ({
    id: uid(rng, 'node'), type, title: titles[type], subtitle: subtitles[type], depth, lane,
    state: depth === 0 ? 'available' : 'locked',
  })))
}

function createExpedition(rng: Rng, difficulty: number): Expedition {
  const condition = rng.pick(expeditionConditions)
  const expedition: Expedition = {
    id: uid(rng, 'run'), difficulty, name: rng.pick(expeditionPlaces), condition: condition[0],
    conditionDescription: condition[1], nodes: makeNodes(rng, condition[0]), current: 0, selectedNodeId: null, modifiers: [], combat: null, event: null,
    reward: null, earnedGold: 0, earnedScore: 0, complete: false,
  }
  return expedition
}

function modifierTotal(expedition: Expedition, stat: RunModifier['stat']) {
  return expedition.modifiers.filter((modifier) => modifier.stat === stat).reduce((sum, modifier) => sum + modifier.value, 0)
}

function addRandomModifier(expedition: Expedition, rng: Rng, tone: RunModifier['tone']): RunModifier {
  const source = tone === 'boon' ? runBoons : runCurses
  const available = source.filter((candidate) => !expedition.modifiers.some((modifier) => modifier.id === candidate.id))
  const picked = rng.pick(available.length ? available : source)
  const modifier = { ...picked } as RunModifier
  expedition.modifiers.push(modifier)
  return modifier
}

function currentNode(expedition: Expedition) {
  return expedition.nodes.find((node) => node.id === expedition.selectedNodeId) ?? null
}

function runLuck(hero: Hero, expedition: Expedition) {
  const conditionBonus = expedition.condition === 'Благословение ворона' ? 3 : 0
  return getHeroStats(hero).luck + modifierTotal(expedition, 'luck') + conditionBonus
}

function runScore(expedition: Expedition, base: number) {
  return Math.max(0, Math.round(base * (1 + modifierTotal(expedition, 'score'))))
}

function eventFromTemplate(rng: Rng): ExpeditionEvent {
  const template = rng.pick(eventTemplates)
  return {
    title: template.title, description: template.description, icon: template.icon,
    choices: template.choices.map(([label, hint, kind, value]) => ({ label, hint, kind, value })),
  }
}

function rollPerkChoices(state: GameState, rng: Rng) {
  if (!state.hero || state.hero.pendingPerks <= 0 || state.perkChoices.length) return
  const pool = perks.filter((perk) => !state.hero!.perks.includes(perk.id))
  const choices: string[] = []
  while (pool.length && choices.length < 3) {
    const index = rng.int(0, pool.length - 1)
    choices.push(pool.splice(index, 1)[0].id)
  }
  state.perkChoices = choices
}

function gainExperience(state: GameState, amount: number, rng: Rng) {
  const hero = state.hero!
  const active = getActivePerks(hero)
  if (active.has('hard-lesson') && (state.expedition?.difficulty ?? 0) >= 6) amount = Math.round(amount * 1.2)
  hero.xp += amount
  while (hero.xp >= hero.xpToNext) {
    hero.xp -= hero.xpToNext
    hero.level += 1
    hero.xpToNext = Math.round(70 * Math.pow(hero.level, 1.22))
    hero.unspent += 3
    hero.base.maxHp += 5
    hero.hp = Math.min(getHeroStats(hero).maxHp, hero.hp + 18)
    if (hero.level % 3 === 0) hero.pendingPerks += 1
    log(state, `Новый уровень: ${hero.level}. Получено 3 очка характеристик.`, 'gold')
  }
  rollPerkChoices(state, rng)
}

function killHero(state: GameState, cause: string) {
  const hero = state.hero!
  const active = getActivePerks(hero)
  if (active.has('last-word') && !hero.lastWordUsed) {
    hero.lastWordUsed = true
    hero.hp = 1
    log(state, 'Последнее слово удерживает бойца на границе смерти.', 'gold')
    return false
  }
  const fallen: FallenHero = {
    id: hero.id, name: hero.name, epithet: hero.epithet, level: hero.level,
    score: hero.score, victories: hero.victories, diedAt: Date.now(),
  }
  state.fallen = [fallen, ...state.fallen].sort((a, b) => b.score - a.score).slice(0, 50)
  state.view = 'dead'
  state.expedition = null
  log(state, `${hero.name} погибает: ${cause}. Пепельный Круг запоминает результат.`, 'bad')
  return true
}

function advanceNode(state: GameState) {
  const expedition = state.expedition!
  const node = currentNode(expedition)
  if (!node) return
  node.state = 'cleared'
  expedition.nodes.forEach((candidate) => {
    if (candidate.depth === expedition.current && candidate.id !== node.id) candidate.state = 'locked'
  })
  expedition.combat = null
  expedition.event = null
  expedition.reward = null
  const lastDepth = Math.max(...expedition.nodes.map((candidate) => candidate.depth))
  if (expedition.current >= lastDepth) {
    expedition.complete = true
    const finishScore = runScore(expedition, expedition.difficulty * 35)
    state.hero!.score += finishScore
    expedition.earnedScore += finishScore
    log(state, `${expedition.name} пройдены. Круг присуждает ${finishScore} очков.`, 'gold')
    return
  }
  expedition.current += 1
  expedition.selectedNodeId = null
  expedition.nodes.forEach((candidate) => {
    if (candidate.depth === expedition.current) candidate.state = 'available'
  })
  state.hero!.deepest = Math.max(state.hero!.deepest, expedition.current + 1)
}

function winCombat(state: GameState, rng: Rng) {
  const hero = state.hero!
  const expedition = state.expedition!
  const enemy = expedition.combat!.enemy
  const node = currentNode(expedition)!
  const mult = expedition.difficulty
  const goldBase = rng.int(5, 10) + mult * 3 + (enemy.elite ? 12 : 0) + (enemy.boss ? 24 : 0)
  const gold = Math.round(goldBase * (expedition.condition === 'Кровавая луна' ? 1.2 : 1))
  const score = runScore(expedition, 12 + mult * 9 + expedition.current * 3 + enemy.mutations.length * 12 + (enemy.elite ? 30 : 0) + (enemy.boss ? 65 : 0))
  const xp = 22 + mult * 7 + (enemy.elite ? 25 : 0) + (enemy.boss ? 50 : 0)
  hero.gold += gold
  hero.score += score
  hero.victories += 1
  expedition.earnedGold += gold
  expedition.earnedScore += score
  if (getActivePerks(hero).has('second-breath')) hero.hp = Math.min(getHeroStats(hero).maxHp, hero.hp + 8)
  if (state.quest && expedition.difficulty >= state.quest.minDifficulty && !state.quest.complete) {
    state.quest.progress += 1
    state.quest.complete = state.quest.progress >= state.quest.goal
    if (state.quest.complete) log(state, `Задание «${state.quest.name}» выполнено. Награда ждёт в таверне.`, 'gold')
  }
  gainExperience(state, xp, rng)
  expedition.reward = generateItem(rng, mult + (enemy.elite ? 2 : 0) + (enemy.boss ? 3 : 0), runLuck(hero, expedition))
  node.state = 'current'
  log(state, `${enemy.name} повержен: +${xp} опыта, +${gold} золота, +${score} очков.`, 'good')
}

function resolveFight(state: GameState, rng: Rng) {
  const hero = state.hero!
  const expedition = state.expedition!
  const combat = expedition.combat!
  if (!combat.attackZone || !combat.blockZone) {
    state.notice = 'Выбери зону удара и зону защиты.'
    return
  }
  const costs = { quick: 0, heavy: 2, feint: 1 }
  if (combat.stamina < costs[combat.technique]) {
    state.notice = 'Не хватает выносливости для этого приёма.'
    return
  }
  const stats = getHeroStats(hero)
  const effectiveLuck = runLuck(hero, expedition)
  const effectiveArmor = stats.armor + modifierTotal(expedition, 'heroArmor')
  const active = getActivePerks(hero)
  const enemy = combat.enemy
  combat.stamina -= costs[combat.technique]
  const enemyBlock = rng.pick(['head', 'body', 'legs'] as Zone[])
  let hitChance = 0.82 + (stats.agility - enemy.agility) * 0.025
  let multiplier = 1
  if (combat.technique === 'quick') hitChance += 0.09
  if (combat.technique === 'heavy') { hitChance -= 0.12; multiplier = 1.65 }
  if (combat.technique === 'feint') { multiplier = 0.82; hitChance += enemyBlock === combat.attackZone ? 0.35 : 0 }
  let playerDamage = 0
  if (rng.chance(Math.max(0.25, Math.min(0.97, hitChance)))) {
    const blocked = enemyBlock === combat.attackZone && combat.technique !== 'feint'
    const zoneBonus = combat.attackZone === 'head' ? 1.22 : combat.attackZone === 'legs' ? 0.9 : 1
    const lowHpBonus = active.has('blood-price') && hero.hp <= stats.maxHp / 3 ? 1.3 : 1
    let critChance = 0.04 + effectiveLuck * 0.012 + (active.has('executioner') && combat.attackZone === 'head' ? 0.12 : 0)
    const crit = rng.chance(critChance)
    playerDamage = Math.max(1, Math.round((5 + stats.strength * 1.45 - enemy.armor * 0.7) * (1 + modifierTotal(expedition, 'heroPower')) * multiplier * zoneBonus * lowHpBonus * (crit ? 1.7 : 1) * (blocked ? 0.25 : 1)))
    enemy.hp = Math.max(0, enemy.hp - playerDamage)
    combat.message = `${blocked ? 'Защита смягчает удар. ' : ''}${crit ? 'Критический удар! ' : ''}${enemy.name} получает ${playerDamage} урона.`
  } else {
    combat.message = `${enemy.name} уходит с линии удара.`
  }
  if (enemy.hp <= 0) {
    winCombat(state, rng)
    return
  }

  let enemyPower = enemy.power
  enemyPower *= 1 + modifierTotal(expedition, 'enemyPower')
  if (enemy.trait === 'Берсерк' && enemy.hp <= enemy.maxHp / 2) enemyPower *= 1.3
  if (enemy.trait === 'Кровопускатель' && combat.turn === 1) enemyPower *= 1.25
  const guarded = combat.blockZone === combat.enemyIntent
  const evade = Math.min(0.28, Math.max(0.02, (stats.agility - enemy.agility) * 0.018 + effectiveLuck * 0.004))
  let enemyDamage = 0
  if (!rng.chance(evade)) {
    enemyDamage = Math.max(0, Math.round((enemyPower + rng.int(-2, 3) - effectiveArmor * 0.75) * (guarded ? 0.22 : 1)))
    hero.hp = Math.max(0, hero.hp - enemyDamage)
  }
  combat.message += enemyDamage === 0 ? ' Ответный выпад не достигает цели.' : guarded ? ` Блок удержан: получено ${enemyDamage}.` : ` Ответный удар: −${enemyDamage} здоровья.`
  log(state, combat.message, enemyDamage > playerDamage ? 'bad' : 'plain')
  if (hero.hp <= 0 && killHero(state, `пал от руки ${enemy.name}`)) return
  combat.turn += 1
  combat.stamina = Math.min(4, combat.stamina + 1)
  combat.enemyIntent = rng.pick(['head', 'body', 'legs'] as Zone[])
  combat.enemyIntentRevealed = canReadEnemyIntent(rng, hero, enemy)
  combat.attackZone = null
  combat.blockZone = null
}

function enterCurrentNode(state: GameState, rng: Rng) {
  const expedition = state.expedition!
  const node = currentNode(expedition)
  if (!node) {
    state.notice = 'Сначала выбери одну из доступных дорог.'
    return
  }
  node.state = 'current'
  expedition.nodes.forEach((candidate) => {
    if (candidate.depth === expedition.current && candidate.id !== node.id) candidate.state = 'locked'
  })
  if (node.type === 'event') {
    expedition.event = eventFromTemplate(rng)
    log(state, `Событие: ${expedition.event.title}.`, 'plain')
    return
  }
  if (node.type === 'shrine') {
    expedition.event = {
      title: 'Алтарь двух голосов', icon: '◇', description: 'Один голос обещает силу без цены. Второй честно обещает силу и цену. Лжёт, вероятно, первый.',
      choices: [
        { label: 'Принять тихий знак', hint: 'Получить случайное благословение', kind: 'boon', value: 1 },
        { label: 'Коснуться чёрного камня', hint: 'Получить дар вместе с проклятием', kind: 'curse', value: 1 },
      ],
    }
    return
  }
  if (node.type === 'treasure') {
    expedition.reward = generateItem(rng, expedition.difficulty + 1, runLuck(state.hero!, expedition))
    log(state, `В забытом схроне найдено: ${expedition.reward.name}.`, 'good')
    return
  }
  if (node.type === 'camp') {
    expedition.event = {
      title: 'Потухший костёр', icon: '♨', description: 'Кто-то ушёл отсюда совсем недавно. Угли ещё помнят тепло.',
      choices: [
        { label: 'Передохнуть', hint: 'Восстановить 22 здоровья', kind: 'heal', value: 22 },
        { label: 'Обыскать стоянку', hint: 'Найти немного золота', kind: 'gold', value: 14 },
      ],
    }
    return
  }
  const enemy = generateEnemy(rng, expedition.difficulty, expedition.current, node.type === 'elite', node.type === 'boss')
  if (expedition.condition === 'Долгая ночь') { enemy.maxHp = Math.round(enemy.maxHp * 1.15); enemy.hp = enemy.maxHp }
  if (expedition.condition === 'Кровавая луна') enemy.power = Math.round(enemy.power * 1.12)
  const extraHp = modifierTotal(expedition, 'enemyHp')
  if (extraHp) { enemy.maxHp = Math.max(1, Math.round(enemy.maxHp * (1 + extraHp))); enemy.hp = enemy.maxHp }
  if (expedition.condition === 'Пепельный дождь') state.hero!.hp = Math.max(1, state.hero!.hp - 4)
  const combat: CombatState = {
    enemy, attackZone: null, blockZone: null, technique: 'quick', stamina: 3, turn: 1,
    enemyIntent: rng.pick(['head', 'body', 'legs'] as Zone[]),
    enemyIntentRevealed: canReadEnemyIntent(rng, state.hero!, enemy),
    message: `${enemy.name} преграждает путь. ${enemy.trait}: ${enemy.traitDescription}${enemy.mutations.length ? ` Мутации: ${enemy.mutations.join(', ')}.` : ''}`,
  }
  expedition.combat = combat
  log(state, `${enemy.name}, ${enemy.title}, выходит навстречу.`, 'bad')
}

function resolveEvent(state: GameState, index: number, rng: Rng) {
  const expedition = state.expedition!
  const choice = expedition.event?.choices[index]
  if (!choice) return
  const hero = state.hero!
  const stats = getHeroStats(hero)
  let result = ''
  switch (choice.kind) {
    case 'heal': {
      const penalty = expedition.condition === 'Гнилой воздух' ? 0.55 : 1
      const amount = Math.max(1, Math.round(choice.value * penalty * (1 + modifierTotal(expedition, 'healing'))))
      hero.hp = Math.min(stats.maxHp, hero.hp + amount)
      result = `Восстановлено ${amount} здоровья.`
      break
    }
    case 'hurt':
      hero.hp = Math.max(0, hero.hp - choice.value)
      {
        const gained = runScore(expedition, choice.value * 2)
        hero.score += gained
        expedition.earnedScore += gained
        result = `Потеряно ${choice.value} здоровья, но получено ${gained} очков.`
      }
      break
    case 'gold':
      hero.gold += choice.value + expedition.difficulty * 2
      expedition.earnedGold += choice.value + expedition.difficulty * 2
      result = `Найдено ${choice.value + expedition.difficulty * 2} золота.`
      break
    case 'score':
      if (hero.gold >= 8) hero.gold -= 8
      {
        const gained = runScore(expedition, choice.value)
        hero.score += gained
        expedition.earnedScore += gained
        result = `Круг запомнил решение: +${gained} очков.`
      }
      break
    case 'item':
      hero.inventory.push(generateItem(rng, expedition.difficulty, runLuck(hero, expedition)))
      result = 'Найден новый предмет.'
      break
    case 'gamble': {
      const lucky = rng.chance(0.43 + runLuck(hero, expedition) * 0.025 + (getActivePerks(hero).has('loaded-dice') ? 0.16 : 0))
      if (lucky) {
        const gained = runScore(expedition, choice.value)
        hero.gold += choice.value
        hero.score += gained
        expedition.earnedGold += choice.value
        expedition.earnedScore += gained
        result = `Риск оправдан: +${choice.value} золота и +${gained} очков.`
      } else {
        const damage = Math.ceil(choice.value * 0.55)
        hero.hp = Math.max(0, hero.hp - damage)
        result = `Неудача: −${damage} здоровья.`
      }
      break
    }
    case 'boon': {
      const boon = addRandomModifier(expedition, rng, 'boon')
      result = `Получено благословение «${boon.name}»: ${boon.description}`
      break
    }
    case 'curse': {
      const boon = addRandomModifier(expedition, rng, 'boon')
      const curse = addRandomModifier(expedition, rng, 'curse')
      hero.inventory.push(generateItem(rng, expedition.difficulty + 3, runLuck(hero, expedition)))
      result = `Дар «${boon.name}» принят вместе с проклятием «${curse.name}». В сумке появился сильный предмет.`
      break
    }
  }
  log(state, `${expedition.event!.title}: ${result}`, hero.hp <= 0 ? 'bad' : 'plain')
  if (hero.hp <= 0 && killHero(state, 'не пережил опасную встречу')) return
  advanceNode(state)
}

export function gameReducer(current: GameState, action: GameAction): GameState {
  if (action.type === 'RESET_SAVE') return { ...initialState, seed: (Date.now() ^ 0x51f15e) >>> 0, fallen: current.fallen }
  if (action.type === 'LOAD_LEADERBOARD') return { ...current, leaderboard: action.entries }
  if (action.type === 'NEW_HERO') return createHero(current)
  const state = structuredClone(current) as GameState
  const rng = new Rng(state.seed)
  const hero = state.hero
  if (!hero) return current

  switch (action.type) {
    case 'NAVIGATE':
      state.view = action.view
      if (action.view === 'shop' && !state.shop.length) state.shop = createShop(rng, hero.level)
      break
    case 'SET_DIFFICULTY_NOTICE': state.notice = action.notice; break
    case 'START_EXPEDITION':
      state.expedition = createExpedition(rng, Math.max(1, Math.min(10, action.difficulty)))
      state.view = 'expedition'
      log(state, `${hero.name} отправляется в ${state.expedition.name}. Сложность: ${state.expedition.difficulty}.`, 'gold')
      break
    case 'SELECT_NODE':
      if (state.expedition && !state.expedition.combat && !state.expedition.event && !state.expedition.reward) {
        const candidate = state.expedition.nodes.find((node) => node.id === action.nodeId && node.depth === state.expedition!.current && (node.state === 'available' || node.state === 'current'))
        if (candidate) {
          state.expedition.nodes.forEach((node) => {
            if (node.depth === state.expedition!.current && node.state === 'current') node.state = 'available'
          })
          candidate.state = 'current'
          state.expedition.selectedNodeId = candidate.id
        }
      }
      break
    case 'ENTER_NODE':
      if (state.expedition && !state.expedition.complete && !state.expedition.combat && !state.expedition.event && !state.expedition.reward) enterCurrentNode(state, rng)
      break
    case 'SELECT_ATTACK': if (state.expedition?.combat) state.expedition.combat.attackZone = action.zone; break
    case 'SELECT_BLOCK': if (state.expedition?.combat) state.expedition.combat.blockZone = action.zone; break
    case 'SELECT_TECHNIQUE': if (state.expedition?.combat) state.expedition.combat.technique = action.technique; break
    case 'FIGHT': if (state.expedition?.combat) resolveFight(state, rng); break
    case 'USE_ITEM': {
      const item = hero.inventory.find((candidate) => candidate.id === action.itemId)
      if (!item || item.type !== 'consumable') break
      if (item.effect === 'heal') {
        const healing = state.expedition ? Math.max(0.1, 1 + modifierTotal(state.expedition, 'healing')) : 1
        hero.hp = Math.min(getHeroStats(hero).maxHp, hero.hp + Math.max(1, Math.round((item.amount ?? 20) * healing)))
      }
      if (item.effect === 'focus' && state.expedition?.combat) state.expedition.combat.stamina = Math.min(4, state.expedition.combat.stamina + (item.amount ?? 2))
      if (item.effect === 'bomb' && state.expedition?.combat) {
        state.expedition.combat.enemy.hp = Math.max(0, state.expedition.combat.enemy.hp - (item.amount ?? 15))
        if (state.expedition.combat.enemy.hp <= 0) winCombat(state, rng)
      }
      hero.inventory = hero.inventory.filter((candidate) => candidate.id !== item.id)
      log(state, `${hero.name} использует «${item.name}».`, 'good')
      break
    }
    case 'EVENT_CHOICE': if (state.expedition?.event) resolveEvent(state, action.index, rng); break
    case 'TAKE_REWARD':
      if (state.expedition?.reward) {
        hero.inventory.push(state.expedition.reward)
        log(state, `Добыча отправлена в сумку: ${state.expedition.reward.name}.`, 'good')
        advanceNode(state)
      }
      break
    case 'LEAVE_REWARD': if (state.expedition?.reward) advanceNode(state); break
    case 'RETURN_HOME':
      if (state.expedition?.complete) {
        log(state, `${hero.name} возвращается в убежище с новым грузом историй.`, 'plain')
        state.expedition = null
        state.view = 'hub'
        state.shop = createShop(rng, hero.level)
      }
      break
    case 'REST': {
      const missing = getHeroStats(hero).maxHp - hero.hp
      const price = Math.max(4, Math.ceil(missing / 4))
      if (missing <= 0) state.notice = 'Ты и так цел. Трактирщик разочарован.'
      else if (hero.gold < price) state.notice = `Нужно ${price} золота.`
      else {
        hero.gold -= price
        hero.hp = getHeroStats(hero).maxHp
        log(state, `Ночь, горячая вода и грубая нить возвращают силы. −${price} золота.`, 'good')
      }
      break
    }
    case 'ROLL_QUEST':
      if (hero.gold < 3) state.notice = 'Слухи стоят 3 золота.'
      else { hero.gold -= 3; state.questOffer = createQuest(rng, hero.level) }
      break
    case 'ACCEPT_QUEST':
      if (state.questOffer) { state.quest = state.questOffer; state.questOffer = null; log(state, `Принято задание: ${state.quest.name}.`, 'gold') }
      break
    case 'CLAIM_QUEST':
      if (state.quest?.complete) {
        hero.gold += state.quest.rewardGold
        hero.score += state.quest.rewardScore
        log(state, `Награда за «${state.quest.name}»: +${state.quest.rewardGold} золота, +${state.quest.rewardScore} очков.`, 'gold')
        state.quest = null
        state.questOffer = createQuest(rng, hero.level)
      }
      break
    case 'BUY': {
      const item = state.shop.find((candidate) => candidate.id === action.itemId)
      if (!item) break
      const price = Math.ceil(item.value * 1.35)
      if (hero.gold < price) state.notice = `Не хватает ${price - hero.gold} золота.`
      else { hero.gold -= price; hero.inventory.push(item); state.shop = state.shop.filter((candidate) => candidate.id !== item.id); log(state, `Куплено: ${item.name}.`, 'plain') }
      break
    }
    case 'SELL': {
      const item = hero.inventory.find((candidate) => candidate.id === action.itemId)
      if (!item || Object.values(hero.equipment).includes(item.id)) { state.notice = 'Сначала сними предмет.'; break }
      const value = Math.ceil(item.value * (getActivePerks(hero).has('scavenger') ? 0.8 : 0.6))
      hero.gold += value
      hero.inventory = hero.inventory.filter((candidate) => candidate.id !== item.id)
      log(state, `Продано: ${item.name}. +${value} золота.`, 'plain')
      break
    }
    case 'EQUIP': {
      const item = hero.inventory.find((candidate) => candidate.id === action.itemId)
      if (item?.type === 'equipment' && item.slot) { hero.equipment[item.slot] = item.id; log(state, `Надето: ${item.name}.`, 'good') }
      break
    }
    case 'UNEQUIP': delete hero.equipment[action.slot]; break
    case 'ADD_ATTRIBUTE':
      if (hero.unspent > 0) { hero.base[action.attribute] += 1; hero.unspent -= 1 }
      break
    case 'CHOOSE_PERK':
      if (hero.pendingPerks > 0 && state.perkChoices.includes(action.perkId)) {
        hero.perks.push(action.perkId); hero.pendingPerks -= 1; state.perkChoices = []
        log(state, `Открыт перк: ${perks.find((perk) => perk.id === action.perkId)?.name}.`, 'gold')
        rollPerkChoices(state, rng)
      }
      break
    case 'DISMISS_NOTICE': state.notice = null; break
  }
  state.seed = rng.state
  return state
}

export function statSummary(item: Item): string {
  const names: Record<keyof StatBlock, string> = { strength: 'Сила', agility: 'Ловкость', luck: 'Удача', armor: 'Броня', maxHp: 'Здоровье' }
  return Object.entries(item.stats).map(([key, value]) => `${names[key as keyof StatBlock]} +${value}`).join(' · ')
}

export function attributeName(attribute: Attribute) {
  return { strength: 'Сила', agility: 'Ловкость', luck: 'Удача' }[attribute]
}
