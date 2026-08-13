import { generateItem } from './items'
import { balance } from './balance'
import { planEnemyIntent } from './enemy-behavior'
import { canReadEnemyIntent, getHeroStats } from './progression'
import { deterministicId, type SeededRng } from './random'
import { contentRegistry } from './registry'
import { addLog, currentNode, modifierTotal, runLuck } from './state'
import type { CombatState, DamageType, Enemy, EnemyBehaviorState, EnemyIntentKind, EventCategory, Expedition, ExpeditionEvent, ExpeditionNode, GameState, Zone } from './types'
import type { OathId } from './types'
import { oathById } from './build-identity'
import { nextWorldMemoryEvent } from './world-memory'

const enemyPortraitByArchetype: Record<string, number> = {
  tank: 0,
  assassin: 1,
  berserker: 2,
  duelist: 3,
  ranger: 4,
  mystic: 5,
}

export function nextEnemyIntent(rng: SeededRng, enemy: Enemy, turn: number, behavior: EnemyBehaviorState | null = null): { zone: Zone; kind: EnemyIntentKind; behavior: EnemyBehaviorState } {
  const playerZones = behavior?.playerAttackZones ?? []
  const planned = planEnemyIntent(rng, enemy, behavior, {
    turn,
    healthRatio: enemy.maxHp > 0 ? enemy.hp / enemy.maxHp : 0,
    phase: enemy.phase,
    enemyMissed: behavior?.lastEnemyMissed ?? false,
    lastAttackGuarded: behavior?.lastAttackGuarded ?? false,
    repeatedPlayerZone: playerZones.length >= 2 && playerZones.at(-1) === playerZones.at(-2),
    phaseChanged: behavior ? behavior.phase !== enemy.phase : false,
  })
  return { zone: planned.zone, kind: planned.kind, behavior: planned.behavior }
}

export function generateEnemy(rng: SeededRng, difficulty: number, depth: number, elite: boolean, boss: boolean): Enemy {
  const scale = 1 + difficulty * 0.16 + depth * 0.055 + (elite ? 0.35 : 0) + (boss ? 0.65 : 0)
  const archetype = rng.pick(contentRegistry.enemyArchetypes)
  const bossTemplate = boss ? rng.pick(contentRegistry.bosses) : null
  const faction = bossTemplate ? contentRegistry.enemyFactions.find((candidate) => candidate.id === bossTemplate.faction)! : rng.pick(contentRegistry.enemyFactions)
  const trait = rng.pick([...contentRegistry.enemyTraits, ...contentRegistry.expandedEnemyTraits])
  const name = bossTemplate?.name ?? `${rng.pick(contentRegistry.enemyNames)} ${rng.pick(contentRegistry.epithets)}`
  const maxHp = Math.round((balance.enemyBaseHp + rng.int(-7, 10)) * scale * archetype.hpMultiplier)
  const enemy: Enemy = {
    id: deterministicId(rng, 'foe'), name, title: bossTemplate?.title ?? rng.pick(contentRegistry.enemyTitles),
    hp: maxHp, maxHp, power: Math.round((7 + difficulty * 1.25 + depth * 0.42) * (elite ? 1.15 : 1) * archetype.powerMultiplier),
    armor: Math.round(difficulty * 0.55 + depth * 0.3 + (elite ? 2 : 0)) + archetype.armorBonus,
    agility: 4 + Math.round(difficulty * 0.45 + rng.int(-1, 2)) + archetype.agilityBonus, damageType: archetype.id === 'mystic' ? 'mystic' : rng.pick(['slash', 'crush', 'pierce', 'mystic'] as DamageType[]),
    trait: trait[0], traitDescription: trait[1], mutations: [], portrait: enemyPortraitByArchetype[archetype.id] ?? 0, elite, boss, phase: 1, faction: faction.name, archetype: archetype.name, bossId: bossTemplate?.id, portraitAsset: bossTemplate?.portraitAsset, bossAura: bossTemplate?.aura, visualPalette: faction.id as Enemy['visualPalette'],
  }
  const mutationCount = difficulty >= 8 ? rng.int(1, 2) : difficulty >= 5 || elite ? 1 : 0
  const pool = [...contentRegistry.expandedEnemyMutations]
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

function makeNodes(rng: SeededRng, condition: string): ExpeditionNode[] {
  const length = rng.int(6, 10)
  const stages: ExpeditionNode['type'][][] = [['battle']]
  const standard: ExpeditionNode['type'][] = ['battle', 'event', 'treasure', 'trap', 'secret', 'merchant', 'forge', 'ally', 'camp', 'shrine']
  for (let depth = 1; depth < length - 2; depth += 1) {
    const count = rng.int(2, 3)
    const pool = [...standard]
    const stage: ExpeditionNode['type'][] = []
    while (stage.length < count && pool.length) stage.push(pool.splice(rng.int(0, pool.length - 1), 1)[0])
    stages.push(stage)
  }
  stages.push(condition === 'Звон цепей' ? ['elite', 'elite'] : ['elite', 'battle'])
  stages.push(['boss'])
  const titles = { battle: 'Засада', elite: 'Именной боец', event: 'Неизвестность', camp: 'Тихое место', shrine: 'Чужой алтарь', treasure: 'Забытый схрон', boss: 'Сердце пути', trap: 'Старая ловушка', secret: 'Тайный проход', merchant: 'Странствующий торговец', forge: 'Походная кузня', ally: 'Незнакомец у огня' }
  const subtitles = { battle: 'Звон оружия впереди', elite: 'Опасная добыча', event: 'Решение изменит поход', camp: 'Редкая передышка', shrine: 'Дар всегда требует цену', treasure: 'Подозрительно лёгкая добыча', boss: 'Назад дороги нет', trap: 'Лёгкой дороги не будет', secret: 'Не всё, что скрыто, опасно', merchant: 'Цена всегда есть', forge: 'Сталь можно изменить', ally: 'Чужая помощь не бесплатна' }
  return stages.flatMap((types, depth) => types.map((type, lane) => ({
    id: deterministicId(rng, 'node'), type, title: titles[type], subtitle: subtitles[type], depth, lane,
    state: depth === 0 ? 'available' : 'locked',
  })))
}

export function createExpedition(rng: SeededRng, difficulty: number, daily = false, oathId: OathId = 'iron'): Expedition {
  const condition = rng.pick(contentRegistry.expeditionConditions)
  const biome = rng.pick(contentRegistry.biomes)
  const seedCode = Math.floor(rng.next() * 0xffffffff).toString(36).toUpperCase()
  const victoryCondition = rng.chance(0.28) ? 'sigils' : 'boss'
  return {
    id: deterministicId(rng, 'run'), difficulty, name: rng.pick(contentRegistry.expeditionPlaces), condition: condition[0],
    conditionDescription: condition[1], biome, seedCode, daily, oathId, victoryCondition, sigils: 0, sigilsRequired: victoryCondition === 'sigils' ? 2 : 0, nodes: makeNodes(rng, condition[0]), current: 0, selectedNodeId: null,
    modifiers: oathById(oathId).modifiers.map((modifier) => ({ ...modifier })), combat: null, event: null, reward: null, rewardChoices: [], irrelevantRewardStreak: 0, rewardSalvageAvailable: true, earnedGold: 0, earnedScore: 0, complete: false,
  }
}

function eventFromTemplate(rng: SeededRng, state: GameState): ExpeditionEvent {
  const memoryEvent = nextWorldMemoryEvent(state.hero!, rng)
  if (memoryEvent) return memoryEvent
  const template = rng.pick(contentRegistry.eventTemplates)
  const category = (contentRegistry.eventCategories as readonly EventCategory[]).includes(template.category) ? template.category : 'unknown'
  return {
    title: template.title, description: template.description, icon: template.icon, category: category as EventCategory,
    choices: template.choices.map(([label, hint, kind, value]) => ({ label, hint, kind, value })),
  }
}

export function enterCurrentNode(state: GameState, rng: SeededRng): void {
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
    expedition.event = eventFromTemplate(rng, state)
    addLog(state, `Событие: ${expedition.event.title}.`)
    return
  }
  if (node.type === 'trap') {
    expedition.event = { title: 'Старая ловушка', icon: '⚠', category: 'trap', description: 'Под камнем щёлкает пружина. Времени думать почти нет.', choices: [{ label: 'Рвануть вперёд', hint: 'Рискнуть здоровьем ради очков', kind: 'hurt', value: 10 }, { label: 'Разобрать механизм', hint: 'Получить материалы', kind: 'material', value: 3 }] }
    return
  }
  if (node.type === 'secret') {
    expedition.event = { title: 'Тайный проход', icon: '◈', category: 'cache', description: 'За рыхлой кладкой лежит забытая ниша.', choices: [{ label: 'Забрать припасы', hint: 'Получить материалы', kind: 'material', value: 4 }, { label: expedition.victoryCondition === 'sigils' ? 'Взять печать пути' : 'Открыть шкатулку', hint: expedition.victoryCondition === 'sigils' ? 'Приблизить альтернативную победу' : 'Получить предмет', kind: expedition.victoryCondition === 'sigils' ? 'sigil' : 'item', value: 1 }] }
    return
  }
  if (node.type === 'merchant') {
    expedition.event = { title: 'Странствующий торговец', icon: '¤', category: 'trade', description: 'Торговец принимает золото, молчание и иногда чужие зубы.', choices: [{ label: 'Купить припасы', hint: 'Потратить золото, восстановить здоровье', kind: 'heal', value: 16 }, { label: 'Купить обломки', hint: 'Получить кузнечные материалы', kind: 'material', value: 5 }] }
    return
  }
  if (node.type === 'forge') {
    expedition.event = { title: 'Походная кузня', icon: '⚒', category: 'strange-place', description: 'Горн ещё тёплый. Можно укрепить запас материалов.', choices: [{ label: 'Собрать шлак', hint: 'Получить обломки', kind: 'material', value: 6 }, { label: 'Принести клятву горну', hint: 'Получить благословение', kind: 'boon', value: 1 }] }
    return
  }
  if (node.type === 'ally') {
    expedition.event = { title: 'Незнакомец у огня', icon: '♧', category: 'traveler', description: 'Путник предлагает вести по безопасной тропе, но его руки в старой крови.', choices: [{ label: 'Принять помощь', hint: 'Получить благословение', kind: 'boon', value: 1 }, { label: 'Идти одному', hint: 'Получить очки за осторожность', kind: 'score', value: 18 }] }
    return
  }
  if (node.type === 'shrine') {
    expedition.event = {
      title: 'Алтарь двух голосов', icon: '◇', category: 'altar', description: 'Один голос обещает силу без цены. Второй честно обещает силу и цену. Лжёт, вероятно, первый.',
      choices: [
        { label: 'Принять тихий знак', hint: 'Получить случайное благословение', kind: 'boon', value: 1 },
        { label: 'Коснуться чёрного камня', hint: 'Получить дар вместе с проклятием', kind: 'curse', value: 1 },
      ],
    }
    return
  }
  if (node.type === 'treasure') {
    expedition.reward = generateItem(rng, expedition.difficulty + 1, runLuck(state.hero!, expedition, getHeroStats(state.hero!).luck))
    addLog(state, `В забытом схроне найдено: ${expedition.reward.name}.`, 'good')
    return
  }
  if (node.type === 'camp') {
    expedition.event = {
      title: 'Потухший костёр', icon: '♨', category: 'strange-place', description: 'Кто-то ушёл отсюда совсем недавно. Угли ещё помнят тепло.',
      choices: [
        { label: 'Передохнуть', hint: 'Восстановить 22 здоровья', kind: 'heal', value: 22 },
        { label: 'Обыскать стоянку', hint: 'Найти немного золота', kind: 'gold', value: 14 },
      ],
    }
    return
  }
  const biomeNemeses = state.hero!.nemeses.filter((candidate) => !candidate.biomeId || candidate.biomeId === expedition.biome.id)
  const nemesis = !node.type.includes('boss') && biomeNemeses.length && rng.chance(0.18) ? rng.pick(biomeNemeses) : null
  const enemy = generateEnemy(rng, expedition.difficulty, expedition.current, node.type === 'elite', node.type === 'boss')
  if (nemesis) {
    enemy.id = nemesis.id
    enemy.name = `${nemesis.name}${nemesis.epithet ? ` ${nemesis.epithet}` : ''}`
    enemy.faction = nemesis.faction
    enemy.archetype = nemesis.archetype
    const nemesisFaction = contentRegistry.enemyFactions.find((candidate) => candidate.name === nemesis.faction)
    const nemesisArchetype = contentRegistry.enemyArchetypes.find((candidate) => candidate.name === nemesis.archetype)
    if (nemesisFaction) enemy.visualPalette = nemesisFaction.id as Enemy['visualPalette']
    if (nemesisArchetype) enemy.portrait = enemyPortraitByArchetype[nemesisArchetype.id] ?? enemy.portrait
    enemy.power = nemesis.power + Math.min(4, nemesis.encounters)
    enemy.armor = nemesis.armor + Math.min(2, Math.floor(nemesis.encounters / 2))
    if (nemesis.counterMutation === 'guarded') { enemy.armor += 1; enemy.mutations.push('Память блока') }
    if (nemesis.counterMutation === 'relentless') { enemy.power += 1; enemy.mutations.push('Неотступность') }
    if (nemesis.counterMutation === 'watchful') { enemy.agility += 1; enemy.mutations.push('Зоркость мести') }
    const record = state.hero!.nemeses.find((candidate) => candidate.id === nemesis.id)
    if (record) record.encounters = Math.min(4, record.encounters + 1)
    enemy.elite = true
    enemy.maxHp = Math.round(enemy.maxHp * 1.2)
    enemy.hp = enemy.maxHp
  }
  enemy.maxHp = Math.round(enemy.maxHp * expedition.biome.enemyHpMultiplier)
  enemy.hp = enemy.maxHp
  enemy.power = Math.round(enemy.power * expedition.biome.enemyPowerMultiplier)
  if (expedition.condition === 'Долгая ночь') { enemy.maxHp = Math.round(enemy.maxHp * 1.15); enemy.hp = enemy.maxHp }
  if (expedition.condition === 'Кровавая луна') enemy.power = Math.round(enemy.power * 1.12)
  const extraHp = modifierTotal(expedition, 'enemyHp')
  if (extraHp) { enemy.maxHp = Math.max(1, Math.round(enemy.maxHp * (1 + extraHp))); enemy.hp = enemy.maxHp }
  if (expedition.condition === 'Пепельный дождь') state.hero!.hp = Math.max(1, state.hero!.hp - 4)
  const openingIntent = nextEnemyIntent(rng, enemy, 1)
  const combat: CombatState = {
    enemy, attackZone: null, blockZone: null, technique: 'quick', selectedAbility: null, abilityCooldowns: { bloodletter: 0, guardBreak: 0, secondWind: 0 }, stamina: 3, turn: 1,
    enemyIntent: openingIntent.zone,
    enemyIntentKind: openingIntent.kind,
    scouting: false,
    enemyBehavior: openingIntent.behavior,
    enemyIntentHistory: [],
    enemyIntentRevealed: canReadEnemyIntent(rng, state.hero!, enemy.agility), heroStatuses: [], enemyStatuses: [],
    message: `${nemesis ? `Немезида возвращается ${nemesis.scar ?? 'со старой раной'}. «${nemesis.origin === 'mercy' ? 'Твоя пощада была оскорблением' : 'Я помню тот бой'}». Любимый приём: ${nemesis.favoriteIntent ?? 'strike'}. ` : ''}${enemy.name} преграждает путь. ${enemy.trait}: ${enemy.traitDescription}${enemy.mutations.length ? ` Мутации: ${enemy.mutations.join(', ')}.` : ''}`,
  }
  expedition.combat = combat
  addLog(state, `${enemy.name}, ${enemy.title}, выходит навстречу.`, 'bad')
}
