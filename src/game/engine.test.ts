import { describe, expect, it } from 'vitest'
import { enemyIntentReadChance, gameReducer, getHeroStats, initialState } from './engine'
import type { GameState } from './types'

function freshState(): GameState {
  return gameReducer({ ...initialState, seed: 123456789, fallen: [], logs: [] }, { type: 'NEW_HERO' })
}

function selectFirstNode(state: GameState): GameState {
  const node = state.expedition!.nodes.find((candidate) => candidate.depth === state.expedition!.current)!
  return gameReducer(state, { type: 'SELECT_NODE', nodeId: node.id })
}

describe('game engine', () => {
  it('uses relative agility to reveal enemy intent sometimes', () => {
    expect(enemyIntentReadChance(5, 5)).toBeCloseTo(0.25)
    expect(enemyIntentReadChance(10, 5)).toBeCloseTo(0.5)
    expect(enemyIntentReadChance(-100, 100)).toBeCloseTo(0.08)
    expect(enemyIntentReadChance(100, -100)).toBeCloseTo(0.75)
  })

  it('creates a playable hero with equipment, a shop and a quest offer', () => {
    const state = freshState()
    expect(state.hero).not.toBeNull()
    expect(state.hero!.name.length).toBeGreaterThan(2)
    expect(state.hero!.inventory.length).toBeGreaterThanOrEqual(2)
    expect(state.hero!.equipment.weapon).toBeTruthy()
    expect(state.shop).toHaveLength(7)
    expect(state.questOffer?.goal).toBeGreaterThanOrEqual(3)
    expect(getHeroStats(state.hero!).strength).toBeGreaterThan(state.hero!.base.strength)
  })

  it('generates eight branching depths ending in a boss', () => {
    const state = gameReducer(freshState(), { type: 'START_EXPEDITION', difficulty: 7 })
    expect(state.view).toBe('expedition')
    expect(state.expedition?.difficulty).toBe(7)
    expect(new Set(state.expedition?.nodes.map((node) => node.depth)).size).toBe(8)
    expect(state.expedition!.nodes.length).toBeGreaterThan(8)
    expect(state.expedition?.nodes[0].state).toBe('available')
    expect(state.expedition?.nodes.find((node) => node.depth === 7)?.type).toBe('boss')
    expect(state.expedition?.nodes.filter((node) => node.depth === 2).length).toBe(3)
    expect(state.expedition?.condition.length).toBeGreaterThan(3)
  })

  it('resolves tactical combat and produces loot after victory', () => {
    let state = gameReducer(freshState(), { type: 'START_EXPEDITION', difficulty: 2 })
    state = selectFirstNode(state)
    state = gameReducer(state, { type: 'ENTER_NODE' })
    expect(state.expedition?.combat).not.toBeNull()
    state.hero!.base.strength = 100
    state.expedition!.combat!.enemy.hp = 1
    state.expedition!.combat!.enemy.agility = -100
    state = gameReducer(state, { type: 'SELECT_ATTACK', zone: 'head' })
    state = gameReducer(state, { type: 'SELECT_BLOCK', zone: state.expedition!.combat!.enemyIntent })
    state = gameReducer(state, { type: 'SELECT_TECHNIQUE', technique: 'heavy' })
    state = gameReducer(state, { type: 'FIGHT' })
    expect(state.expedition?.reward).not.toBeNull()
    expect(state.hero!.victories).toBe(1)
    expect(state.hero!.score).toBeGreaterThan(0)
  })

  it('archives a dead hero and does not offer a rollback', () => {
    let state = freshState()
    state.hero!.score = 404
    state.hero!.victories = 9
    state.hero!.hp = 0
    state = gameReducer(state, { type: 'START_EXPEDITION', difficulty: 10 })
    state = selectFirstNode(state)
    state = gameReducer(state, { type: 'ENTER_NODE' })
    state.expedition!.combat!.enemy.power = 1000
    state.expedition!.combat!.enemy.agility = 1000
    state = gameReducer(state, { type: 'SELECT_ATTACK', zone: 'body' })
    state = gameReducer(state, { type: 'SELECT_BLOCK', zone: state.expedition!.combat!.enemyIntent === 'head' ? 'legs' : 'head' })
    state = gameReducer(state, { type: 'FIGHT' })
    expect(state.view).toBe('dead')
    expect(state.fallen[0].score).toBe(404)
    expect(state.expedition).toBeNull()
  })

  it('adds enemy mutations at high difficulty', () => {
    let state = gameReducer(freshState(), { type: 'START_EXPEDITION', difficulty: 8 })
    state = selectFirstNode(state)
    state = gameReducer(state, { type: 'ENTER_NODE' })
    expect(state.expedition?.combat?.enemy.mutations.length).toBeGreaterThanOrEqual(1)
  })

  it('grants a run modifier at a shrine and closes the unchosen route', () => {
    let state = gameReducer(freshState(), { type: 'START_EXPEDITION', difficulty: 4 })
    state.expedition!.current = 3
    state.expedition!.nodes.forEach((node) => { node.state = node.depth === 3 ? 'available' : 'locked' })
    const shrine = state.expedition!.nodes.find((node) => node.depth === 3 && node.type === 'shrine')!
    state = gameReducer(state, { type: 'SELECT_NODE', nodeId: shrine.id })
    state = gameReducer(state, { type: 'ENTER_NODE' })
    expect(state.expedition?.event?.title).toBe('Алтарь двух голосов')
    state = gameReducer(state, { type: 'EVENT_CHOICE', index: 0 })
    expect(state.expedition?.modifiers).toHaveLength(1)
    expect(state.expedition?.modifiers[0].tone).toBe('boon')
    expect(state.expedition?.current).toBe(4)
    expect(state.expedition?.nodes.filter((node) => node.depth === 3 && node.state === 'locked')).toHaveLength(1)
  })
})
