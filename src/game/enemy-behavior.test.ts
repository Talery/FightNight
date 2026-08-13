import { describe, expect, it } from 'vitest'
import { eligibleBehaviorPatterns, patternIntent, patternZone, selectBehaviorPattern } from './enemy-behavior'
import { SeededRng } from './random'
import type { EnemyArchetypeId } from './types'

const neutral = { turn: 2, healthRatio: 1, phase: 1, enemyMissed: false, lastAttackGuarded: false, repeatedPlayerZone: false, phaseChanged: false }

describe('enemy behavior profiles', () => {
  it('selects patterns deterministically for identical seeds and context', () => {
    const archetypes: EnemyArchetypeId[] = ['tank', 'assassin', 'berserker', 'duelist', 'ranger', 'mystic']
    for (const archetype of archetypes) {
      const first = selectBehaviorPattern(new SeededRng(4242), archetype, neutral)
      const second = selectBehaviorPattern(new SeededRng(4242), archetype, neutral)
      expect(second).toEqual(first)
      expect(patternIntent(first, 0)).toBe(first.sequence[0])
      expect(patternIntent(first, first.sequence.length)).toBe(first.sequence[0])
      expect(patternZone(first, first.zones.length)).toBe(first.zones[0])
    }
  })

  it('activates conditional counter-patterns from combat context', () => {
    expect(eligibleBehaviorPatterns('tank', { ...neutral, lastAttackGuarded: true }).map((pattern) => pattern.id)).toContain('guard-counter')
    expect(eligibleBehaviorPatterns('assassin', { ...neutral, repeatedPlayerZone: true }).map((pattern) => pattern.id)).toContain('marked-cut')
    expect(eligibleBehaviorPatterns('berserker', { ...neutral, enemyMissed: true }).map((pattern) => pattern.id)).toContain('miss-rage')
    expect(eligibleBehaviorPatterns('berserker', { ...neutral, healthRatio: 0.4 }).map((pattern) => pattern.id)).toContain('blood-rush')
    expect(eligibleBehaviorPatterns('mystic', { ...neutral, phaseChanged: true }).map((pattern) => pattern.id)).toContain('phase-ritual')
  })

  it('uses positive weights without starving eligible patterns', () => {
    const seen = new Set(Array.from({ length: 200 }, (_, seed) => selectBehaviorPattern(new SeededRng(seed + 1), 'tank', { ...neutral, lastAttackGuarded: true }).id))
    expect(seen).toEqual(new Set(['guard-counter', 'steady-pressure']))
  })
})
