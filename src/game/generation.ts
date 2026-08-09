import { generateItem } from './items'
import { canReadEnemyIntent, getHeroStats } from './progression'
import { deterministicId, type SeededRng } from './random'
import { contentRegistry } from './registry'
import { addLog, currentNode, modifierTotal, runLuck } from './state'
import type { CombatState, Enemy, Expedition, ExpeditionEvent, ExpeditionNode, GameState, Zone } from './types'

export function generateEnemy(rng: SeededRng, difficulty: number, depth: number, elite: boolean, boss: boolean): Enemy {
  const scale = 1 + difficulty * 0.16 + depth * 0.055 + (elite ? 0.35 : 0) + (boss ? 0.65 : 0)
  const trait = rng.pick(contentRegistry.enemyTraits)
  const name = boss ? `Судья ${rng.pick(contentRegistry.enemyNames)}` : `${rng.pick(contentRegistry.enemyNames)} ${rng.pick(contentRegistry.epithets)}`
  const maxHp = Math.round((52 + rng.int(-7, 10)) * scale)
  const enemy: Enemy = {
    id: deterministicId(rng, 'foe'), name, title: boss ? 'хозяин этого пути' : rng.pick(contentRegistry.enemyTitles),
    hp: maxHp, maxHp, power: Math.round((7 + difficulty * 1.25 + depth * 0.42) * (elite ? 1.15 : 1)),
    armor: Math.round(difficulty * 0.55 + depth * 0.3 + (elite ? 2 : 0)),
    agility: 4 + Math.round(difficulty * 0.45 + rng.int(-1, 2)),
    trait: trait[0], traitDescription: trait[1], mutations: [], portrait: rng.int(0, 5), elite, boss,
  }
  const mutationCount = difficulty >= 8 ? rng.int(1, 2) : difficulty >= 5 || elite ? 1 : 0
  const pool = [...contentRegistry.enemyMutations]
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
    id: deterministicId(rng, 'node'), type, title: titles[type], subtitle: subtitles[type], depth, lane,
    state: depth === 0 ? 'available' : 'locked',
  })))
}

export function createExpedition(rng: SeededRng, difficulty: number): Expedition {
  const condition = rng.pick(contentRegistry.expeditionConditions)
  return {
    id: deterministicId(rng, 'run'), difficulty, name: rng.pick(contentRegistry.expeditionPlaces), condition: condition[0],
    conditionDescription: condition[1], nodes: makeNodes(rng, condition[0]), current: 0, selectedNodeId: null,
    modifiers: [], combat: null, event: null, reward: null, earnedGold: 0, earnedScore: 0, complete: false,
  }
}

function eventFromTemplate(rng: SeededRng): ExpeditionEvent {
  const template = rng.pick(contentRegistry.eventTemplates)
  return {
    title: template.title, description: template.description, icon: template.icon,
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
    expedition.event = eventFromTemplate(rng)
    addLog(state, `Событие: ${expedition.event.title}.`)
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
    expedition.reward = generateItem(rng, expedition.difficulty + 1, runLuck(state.hero!, expedition, getHeroStats(state.hero!).luck))
    addLog(state, `В забытом схроне найдено: ${expedition.reward.name}.`, 'good')
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
    enemyIntentRevealed: canReadEnemyIntent(rng, state.hero!, enemy.agility),
    message: `${enemy.name} преграждает путь. ${enemy.trait}: ${enemy.traitDescription}${enemy.mutations.length ? ` Мутации: ${enemy.mutations.join(', ')}.` : ''}`,
  }
  expedition.combat = combat
  addLog(state, `${enemy.name}, ${enemy.title}, выходит навстречу.`, 'bad')
}
