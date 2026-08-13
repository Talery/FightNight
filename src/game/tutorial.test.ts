import { describe, expect, it } from 'vitest'
import { createInitialState, gameReducer } from './engine'

function heroState(seed = 7171) {
  return gameReducer(createInitialState(seed), { type: 'NEW_HERO' })
}

describe('deterministic combat tutorial', () => {
  it('starts the same safe enemy and teaches attack, block and technique in order', () => {
    let state = gameReducer(heroState(), { type: 'START_TUTORIAL' })
    expect(state.expedition?.seedCode).toBe('TUTORIAL')
    expect(state.expedition?.combat?.enemy.name).toBe('Учебный хранитель')
    expect(state.expedition?.combat?.enemyIntentRevealed).toBe(true)

    state = gameReducer(state, { type: 'SELECT_BLOCK', zone: 'head' })
    expect(state.expedition?.combat?.blockZone).toBe('body')
    state = gameReducer(state, { type: 'SELECT_ATTACK', zone: 'body' })
    state = gameReducer(state, { type: 'FIGHT' })
    expect(state.expedition?.combat?.turn).toBe(2)
    expect(state.expedition?.combat?.attackZone).toBe('body')
    expect(state.expedition?.combat?.blockZone).toBeNull()

    state = gameReducer(state, { type: 'SELECT_BLOCK', zone: 'head' })
    state = gameReducer(state, { type: 'FIGHT' })
    expect(state.expedition?.combat?.turn).toBe(3)
    expect(state.expedition?.combat?.enemyIntentKind).toBe('venomousCut')
    const before = state
    state = gameReducer(state, { type: 'FIGHT' })
    expect(state.expedition?.combat?.turn).toBe(before.expedition?.combat?.turn)
    expect(state.notice).toMatch(/приём/i)
    state = gameReducer(state, { type: 'SELECT_TECHNIQUE', technique: 'heavy' })
    expect(state.tutorial.interactionMade).toBe(true)
  })

  it('skips safely without changing the hero or granting a reward', () => {
    const original = heroState()
    let state = gameReducer(original, { type: 'START_TUTORIAL' })
    state = gameReducer(state, { type: 'SKIP_TUTORIAL' })
    expect(state.view).toBe('hub')
    expect(state.expedition).toBeNull()
    expect(state.tutorial.skipped).toBe(true)
    expect(state.hero?.inventory).toEqual(original.hero?.inventory)
    expect(state.hero?.gold).toBe(original.hero?.gold)
  })

  it('records completion only after choosing one real reward', () => {
    let state = gameReducer(heroState(), { type: 'START_TUTORIAL' })
    state.expedition!.combat!.enemy.hp = 1
    state = gameReducer(state, { type: 'SELECT_ATTACK', zone: 'body' })
    state = gameReducer(state, { type: 'FIGHT' })
    expect(state.expedition?.tutorialRewards).toHaveLength(2)
    expect(state.tutorial.completed).toBe(false)
    const beforeCount = state.hero!.inventory.length
    state = gameReducer(state, { type: 'CHOOSE_TUTORIAL_REWARD', itemId: 'tutorial-bandage' })
    expect(state.tutorial.completed).toBe(true)
    expect(state.hero?.inventory).toHaveLength(beforeCount + 1)
    expect(state.view).toBe('hub')
  })
})
