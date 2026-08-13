import { describe, expect, it } from 'vitest'
import { createInitialState, gameReducer } from './engine'
import { collectRunSummary, createRunSummaryCollector, isRunSummary } from './run-summary'
import type { RunSummaryCollection } from './run-summary'
import type { GameAction, GameState, RunSummary } from './types'

function validSummary(): RunSummary {
  return {
    schemaVersion: 2,
    runId: 'run-test-001',
    seed: 424242,
    seedCode: 'ASH42',
    difficulty: 3,
    daily: false,
    biome: 'catacombs',
    outcome: 'victory',
    actionCount: 38,
    roomsEntered: 7,
    roomsCleared: 7,
    combatTurns: 19,
    attackZones: { head: 5, body: 8, legs: 6 },
    blockZones: { head: 4, body: 9, legs: 6 },
    techniques: { quick: 8, heavy: 7, feint: 4 },
    damageTaken: 46,
    damageBySource: { 'Враг': 46 },
    unblockedDamageByZone: { head: 8, body: 20, legs: 0 },
    statusDamage: 6,
    healingReceived: 25,
    selectedRewardIds: ['reward-blade-1', 'reward-tonic-2'],
    deathCause: null,
  }
}

function freshState(seed: number): GameState {
  return gameReducer(createInitialState(seed), { type: 'NEW_HERO' })
}

function deterministicVictory(seed: number): RunSummary {
  let state = freshState(seed)
  let collector = createRunSummaryCollector()
  const step = (action: GameAction): RunSummaryCollection => {
    const before = state
    const after = gameReducer(before, action)
    const result = collectRunSummary(collector, before, action, after)
    state = after
    collector = result.collector
    return result
  }

  step({ type: 'START_EXPEDITION', difficulty: 4 })
  const lastDepth = Math.max(...state.expedition!.nodes.map((node) => node.depth))
  state.expedition!.current = lastDepth
  state.expedition!.nodes.forEach((node) => { node.state = node.depth === lastDepth ? 'available' : 'locked' })
  const boss = state.expedition!.nodes.find((node) => node.depth === lastDepth)!
  step({ type: 'SELECT_NODE', nodeId: boss.id })
  step({ type: 'ENTER_NODE' })
  state.hero!.base.strength = 100
  state.expedition!.combat!.enemy.hp = 1
  state.expedition!.combat!.enemy.agility = -100
  const blockZone = state.expedition!.combat!.enemyIntent
  step({ type: 'SELECT_ATTACK', zone: 'head' })
  step({ type: 'SELECT_BLOCK', zone: blockZone })
  step({ type: 'SELECT_TECHNIQUE', technique: 'heavy' })
  step({ type: 'FIGHT' })
  const rewardId = state.expedition!.reward!.id
  const result = step({ type: 'TAKE_REWARD' })

  expect(result.completed?.selectedRewardIds).toEqual([rewardId])
  return result.completed!
}

describe('RunSummary privacy contract', () => {
  it('accepts aggregate deterministic run data', () => {
    expect(isRunSummary(validSummary())).toBe(true)
    expect(isRunSummary(structuredClone(validSummary()))).toBe(true)
  })

  it('rejects unknown fields that could cross the privacy boundary', () => {
    const summary = { ...validSummary(), playerId: 'private-player-id' }
    expect(isRunSummary(summary)).toBe(false)
  })

  it('rejects nested counter fields outside the allowlist', () => {
    const summary = validSummary() as unknown as Record<string, unknown>
    summary.attackZones = { head: 5, body: 8, legs: 6, heroName: 1 }
    expect(isRunSummary(summary)).toBe(false)
  })

  it('requires a bounded cause only for death summaries', () => {
    expect(isRunSummary({ ...validSummary(), outcome: 'death', deathCause: null })).toBe(false)
    expect(isRunSummary({ ...validSummary(), outcome: 'death', deathCause: 'пал от руки Пепельного стража' })).toBe(true)
    expect(isRunSummary({ ...validSummary(), deathCause: 'лишний текст' })).toBe(false)
  })

  it('rejects impossible and malformed counters', () => {
    expect(isRunSummary({ ...validSummary(), roomsEntered: 2, roomsCleared: 3 })).toBe(false)
    expect(isRunSummary({ ...validSummary(), damageTaken: -1 })).toBe(false)
    expect(isRunSummary({ ...validSummary(), selectedRewardIds: ['ok', 'contains spaces'] })).toBe(false)
  })
})

describe('RunSummary transition collector', () => {
  it('creates the same completed summary for the same seed and actions', () => {
    const first = deterministicVictory(911_731)
    const second = deterministicVictory(911_731)

    expect(second).toEqual(first)
    expect(isRunSummary(first)).toBe(true)
    expect(first).toMatchObject({
      seed: 911_731,
      difficulty: 4,
      outcome: 'victory',
      actionCount: 7,
      roomsEntered: 1,
      roomsCleared: 1,
      combatTurns: 1,
      attackZones: { head: 1, body: 0, legs: 0 },
      blockZones: { [first.blockZones.head ? 'head' : first.blockZones.body ? 'body' : 'legs']: 1 },
      techniques: { quick: 0, heavy: 1, feint: 0 },
      deathCause: null,
    })
  })

  it('counts only resolved combat turns while retaining deterministic action duration', () => {
    let state = freshState(52_521)
    let collector = createRunSummaryCollector()
    const step = (action: GameAction) => {
      const before = state
      state = gameReducer(before, action)
      const result = collectRunSummary(collector, before, action, state)
      collector = result.collector
      return result
    }

    step({ type: 'START_EXPEDITION', difficulty: 2 })
    const node = state.expedition!.nodes.find((candidate) => candidate.depth === 0)!
    step({ type: 'SELECT_NODE', nodeId: node.id })
    step({ type: 'ENTER_NODE' })
    step({ type: 'FIGHT' })

    expect(collector.active?.actionCount).toBe(3)
    expect(collector.active?.combatTurns).toBe(0)
    expect(collector.active?.attackZones).toEqual({ head: 0, body: 0, legs: 0 })
  })

  it('records healing and damage as health received during run actions', () => {
    let state = freshState(68_211)
    let collector = createRunSummaryCollector()
    const step = (action: GameAction) => {
      const before = state
      state = gameReducer(before, action)
      const result = collectRunSummary(collector, before, action, state)
      collector = result.collector
    }

    step({ type: 'START_EXPEDITION', difficulty: 2 })
    state.hero!.hp = 20
    state.expedition!.condition = 'Нейтральные условия'
    state.expedition!.biome.healingMultiplier = 1
    state.expedition!.event = {
      title: 'Тестовая передышка', description: 'Только детерминированная проверка.', icon: '+', category: 'unknown',
      choices: [{ label: 'Лечение', hint: 'Вернуть здоровье', kind: 'heal', value: 9 }],
    }
    step({ type: 'EVENT_CHOICE', index: 0 })
    expect(collector.active?.healingReceived).toBe(9)

    state.expedition!.event = {
      title: 'Тестовая ловушка', description: 'Только детерминированная проверка.', icon: '-', category: 'trap',
      choices: [{ label: 'Получить урон', hint: 'Потерять здоровье', kind: 'hurt', value: 6 }],
    }
    step({ type: 'EVENT_CHOICE', index: 0 })
    expect(collector.active?.damageTaken).toBe(6)
  })

  it('uses the explicit daily seed and completes death without campaign identity', () => {
    let state = freshState(100)
    let collector = createRunSummaryCollector()
    const step = (action: GameAction) => {
      const before = state
      state = gameReducer(before, action)
      const result = collectRunSummary(collector, before, action, state)
      collector = result.collector
      return result
    }

    step({ type: 'START_DAILY_EXPEDITION', seed: 0xdecafbad })
    const runHeroName = state.hero!.name
    const runHeroId = state.hero!.id
    state.hero!.hp = 1
    state.expedition!.event = {
      title: 'Последняя ловушка', description: 'Фатальная проверка.', icon: '!', category: 'trap',
      choices: [{ label: 'Шагнуть', hint: 'Погибнуть', kind: 'hurt', value: 1 }],
    }
    const result = step({ type: 'EVENT_CHOICE', index: 0 })

    expect(result.completed).toMatchObject({
      seed: 0xdecafbad,
      daily: true,
      outcome: 'death',
      damageTaken: 1,
      deathCause: 'не пережил опасную встречу',
    })
    expect(isRunSummary(result.completed)).toBe(true)
    expect(JSON.stringify(result.completed)).not.toContain(runHeroName)
    expect(JSON.stringify(result.completed)).not.toContain(runHeroId)
    expect(result.collector.active).toBeNull()
  })
})
