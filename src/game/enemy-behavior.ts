import { contentRegistry } from './registry'
import type { SeededRng } from './random'
import type { Enemy, EnemyArchetypeId, EnemyBehaviorPattern, EnemyBehaviorState, EnemyBehaviorTrigger, EnemyIntentKind, Zone } from './types'

export interface EnemyBehaviorContext {
  turn: number
  healthRatio: number
  phase: number
  enemyMissed: boolean
  lastAttackGuarded: boolean
  repeatedPlayerZone: boolean
  phaseChanged: boolean
}

export function enemyArchetypeId(enemy: Pick<Enemy, 'archetype'>): EnemyArchetypeId {
  return contentRegistry.enemyArchetypes.find((archetype) => archetype.name === enemy.archetype)?.id ?? 'duelist'
}

function triggerMatches(trigger: EnemyBehaviorTrigger, context: EnemyBehaviorContext): boolean {
  if (trigger === 'default') return true
  if (trigger === 'opening') return context.turn === 1
  if (trigger === 'low-health') return context.healthRatio <= 0.5
  if (trigger === 'after-miss') return context.enemyMissed
  if (trigger === 'after-guarded') return context.lastAttackGuarded
  if (trigger === 'player-repeat') return context.repeatedPlayerZone
  return context.phaseChanged || context.phase > 1
}

export function eligibleBehaviorPatterns(archetypeId: EnemyArchetypeId, context: EnemyBehaviorContext): EnemyBehaviorPattern[] {
  const profile = contentRegistry.enemyBehaviorProfiles.find((candidate) => candidate.archetypeId === archetypeId)
  if (!profile) throw new Error(`Missing enemy behavior profile: ${archetypeId}`)
  return profile.patterns.filter((pattern) => triggerMatches(pattern.trigger, context))
}

export function selectBehaviorPattern(rng: SeededRng, archetypeId: EnemyArchetypeId, context: EnemyBehaviorContext): EnemyBehaviorPattern {
  const candidates = eligibleBehaviorPatterns(archetypeId, context)
  const totalWeight = candidates.reduce((total, pattern) => total + pattern.weight, 0)
  let roll = rng.next() * totalWeight
  for (const pattern of candidates) {
    roll -= pattern.weight
    if (roll < 0) return pattern
  }
  return candidates[candidates.length - 1]
}

export function patternIntent(pattern: EnemyBehaviorPattern, step: number): EnemyIntentKind {
  return pattern.sequence[Math.max(0, step) % pattern.sequence.length]
}

export function patternZone(pattern: EnemyBehaviorPattern, step: number): Zone {
  return pattern.zones[Math.max(0, step) % pattern.zones.length]
}

export function planEnemyIntent(
  rng: SeededRng,
  enemy: Enemy,
  current: EnemyBehaviorState | null,
  context: EnemyBehaviorContext,
): { zone: Zone; kind: EnemyIntentKind; behavior: EnemyBehaviorState } {
  const profile = contentRegistry.enemyBehaviorProfiles.find((candidate) => candidate.archetypeId === enemyArchetypeId(enemy))!
  const activePattern = current ? profile.patterns.find((pattern) => pattern.id === current.patternId) : undefined
  const nextStep = current ? current.patternStep + 1 : 0
  const continuePattern = activePattern && nextStep < activePattern.sequence.length
  const pattern = continuePattern ? activePattern : selectBehaviorPattern(rng, profile.archetypeId, context)
  const patternStep = continuePattern ? nextStep : 0
  return {
    kind: patternIntent(pattern, patternStep),
    zone: patternZone(pattern, patternStep),
    behavior: {
      patternId: pattern.id,
      patternStep,
      lastEnemyMissed: current?.lastEnemyMissed ?? false,
      lastAttackGuarded: current?.lastAttackGuarded ?? false,
      playerAttackZones: current?.playerAttackZones.slice(-2) ?? [],
      phase: enemy.phase,
    },
  }
}
