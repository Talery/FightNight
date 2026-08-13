import { describe, expect, it } from 'vitest'
import { createInitialState, gameReducer } from './engine'
import { SeededRng } from './random'
import { nextWorldMemoryEvent, recordWorldMemoryChoice, worldMemoryJournal } from './world-memory'

function hero() {
  return gameReducer(createInitialState(15151), { type: 'NEW_HERO' }).hero!
}

describe('world memory', () => {
  it('chooses recurring events deterministically from hero history', () => {
    const left = hero()
    const right = structuredClone(left)
    const first = nextWorldMemoryEvent(left, new SeededRng(44))
    const second = nextWorldMemoryEvent(right, new SeededRng(44))
    expect(second).toEqual(first)
  })

  it('continues and completes a saved two-step chain with an explicit causal note', () => {
    const current = hero()
    const opening = recordWorldMemoryChoice(current, 'Долг Мары', 0)
    expect(opening).toMatch(/запомнит/i)
    expect(worldMemoryJournal(current)).toContainEqual({ id: 'mara-debt', state: 'open' })
    const followup = recordWorldMemoryChoice(current, 'Караван Мары', 1)
    expect(followup).toMatch(/прямое следствие/i)
    expect(worldMemoryJournal(current)).toContainEqual({ id: 'mara-debt', state: 'complete' })
    expect(current.npcRelations.mara).toBe(0)
  })
})
