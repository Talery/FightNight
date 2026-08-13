// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import { explainRun } from './RunDebrief'
import type { RunSummary } from '../../game/types'

function summary(): RunSummary {
  return { schemaVersion: 2, runId: 'run-1', seed: 1, seedCode: 'SEED1', difficulty: 3, daily: false, biome: 'catacombs', outcome: 'death', actionCount: 12, roomsEntered: 3, roomsCleared: 2, combatTurns: 8, attackZones: { head: 2, body: 5, legs: 1 }, blockZones: { head: 1, body: 5, legs: 2 }, techniques: { quick: 4, heavy: 2, feint: 2 }, damageTaken: 48, damageBySource: { 'Ядовитый враг': 48 }, unblockedDamageByZone: { head: 0, body: 12, legs: 24 }, statusDamage: 8, healingReceived: 0, selectedRewardIds: [], deathCause: 'пал от ядовитого выпада' }
}

describe('run debrief', () => {
  it('names the recorded cause and explains the damage/healing imbalance', () => {
    expect(explainRun(summary())).toMatch(/ядовитого выпада/i)
    expect(explainRun(summary())).toMatch(/48.*без восстановления/i)
  })

  it('summarizes a victory without inventing a death cause', () => {
    expect(explainRun({ ...summary(), outcome: 'victory', deathCause: null })).toBe('Путь пройден за 8 боевых ходов.')
  })
})
