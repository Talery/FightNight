import { describe, expect, it } from 'vitest'
import { createInitialState, gameReducer } from './engine'
import { anonymousPlayerId, exportGame, exportRunSummaries, importGame, loadRunSummaries, loadRunSummaryCollector, MAX_RUN_SUMMARIES, migrateGame, pendingLeaderboardSyncCount, recoverGame, RUN_SUMMARIES_KEY, saveRunSummary, saveRunSummaryCollector, submitFallenHero } from './storage'
import type { RunSummary } from './types'

class MemoryStorage {
  private values = new Map<string, string>()
  getItem(key: string) { return this.values.get(key) ?? null }
  setItem(key: string, value: string) { this.values.set(key, value) }
  removeItem(key: string) { this.values.delete(key) }
}

function runSummary(index: number): RunSummary {
  return {
    schemaVersion: 2,
    runId: `run-${index}`,
    seed: index,
    seedCode: `SEED${index}`,
    difficulty: 3,
    daily: false,
    biome: 'catacombs',
    outcome: 'victory',
    actionCount: index,
    roomsEntered: 1,
    roomsCleared: 1,
    combatTurns: 1,
    attackZones: { head: 1, body: 0, legs: 0 },
    blockZones: { head: 0, body: 1, legs: 0 },
    techniques: { quick: 1, heavy: 0, feint: 0 },
    damageTaken: 0,
    damageBySource: {},
    unblockedDamageByZone: { head: 0, body: 0, legs: 0 },
    statusDamage: 0,
    healingReceived: 0,
    selectedRewardIds: [],
    deathCause: null,
  }
}

function playableState() {
  return gameReducer(createInitialState(987654321), { type: 'NEW_HERO' })
}

function activeCombatState() {
  let state = gameReducer(playableState(), { type: 'START_EXPEDITION', difficulty: 2 })
  const node = state.expedition!.nodes.find((candidate) => candidate.depth === 0)!
  state = gameReducer(state, { type: 'SELECT_NODE', nodeId: node.id })
  return gameReducer(state, { type: 'ENTER_NODE' })
}

function representativeLegacySave(version: number, activeCombat = false): Record<string, unknown> {
  const legacy = structuredClone(activeCombat ? activeCombatState() : playableState()) as unknown as Record<string, unknown>
  legacy.version = version
  if (version <= 2) delete legacy.actionSequence

  const hero = legacy.hero as Record<string, unknown>
  if (version <= 6) delete hero.materials
  if (version <= 7) delete hero.mutations
  if (version <= 11) delete hero.nemeses
  if (version <= 12) delete hero.reputation
  if (version <= 17) {
    delete hero.decisionFlags
    delete hero.npcRelations
  }
  if (version <= 14) delete legacy.dailyReturnHero
  if (version <= 16) delete legacy.tutorial

  const expedition = legacy.expedition as Record<string, unknown> | null
  if (!expedition) return legacy
  if (version <= 8) {
    delete expedition.biome
    delete expedition.seedCode
    delete expedition.daily
  }
  if (version <= 9) {
    delete expedition.victoryCondition
    delete expedition.sigils
    delete expedition.sigilsRequired
  }
  const combat = expedition.combat as Record<string, unknown> | null
  if (!combat) return legacy
  const enemy = combat.enemy as Record<string, unknown>
  if (version <= 3) {
    delete combat.heroStatuses
    delete combat.enemyStatuses
    delete enemy.damageType
  }
  if (version <= 4) {
    delete combat.selectedAbility
    delete combat.abilityCooldowns
    delete combat.enemyIntentKind
  }
  if (version <= 5) delete enemy.phase
  if (version <= 10) {
    delete enemy.faction
    delete enemy.archetype
  }
  if (version <= 15) {
    delete combat.enemyBehavior
    delete combat.enemyIntentHistory
    delete combat.scouting
  }
  return legacy
}

describe('save migrations and recovery', () => {
  it.each(Array.from({ length: 18 }, (_, index) => index + 1))('migrates representative hub save v%i without losing the hero', (version) => {
    const legacy = representativeLegacySave(version)
    const hero = legacy.hero as { id: string; inventory: unknown[] }
    const migrated = migrateGame(legacy)
    expect(migrated?.version).toBe(18)
    expect(migrated?.hero?.id).toBe(hero.id)
    expect(migrated?.hero?.inventory).toEqual(hero.inventory)
    expect(migrated?.hero?.materials).toEqual(expect.objectContaining({ scrap: expect.any(Number), ember: expect.any(Number), essence: expect.any(Number) }))
  })

  it.each(Array.from({ length: 16 }, (_, index) => index + 2))('migrates representative active combat v%i into a playable state', (version) => {
    const migrated = migrateGame(representativeLegacySave(version, true))
    expect(migrated?.version).toBe(18)
    expect(migrated?.view).toBe('expedition')
    expect(migrated?.expedition?.combat).not.toBeNull()
    expect(migrated?.expedition?.combat?.enemyBehavior.patternId).toEqual(expect.any(String))
    expect(migrated?.expedition?.combat?.enemyIntentHistory).toEqual(expect.any(Array))
  })

  it('migrates v2 sequentially without losing hero or inventory', () => {
    const current = playableState()
    const legacy = structuredClone(current) as unknown as Record<string, unknown>
    legacy.version = 2
    delete legacy.actionSequence
    const migrated = migrateGame(legacy)
    expect(migrated?.version).toBe(18)
    expect(migrated?.actionSequence).toBe(0)
    expect(migrated?.hero?.id).toBe(current.hero?.id)
    expect(migrated?.hero?.inventory).toEqual(current.hero?.inventory)
  })

  it('applies the v1 expedition migration before the v3 migration', () => {
    const current = playableState()
    const legacy = structuredClone(current) as unknown as Record<string, unknown>
    legacy.version = 1
    legacy.view = 'expedition'
    legacy.expedition = { obsolete: true }
    const migrated = migrateGame(legacy)
    expect(migrated?.view).toBe('hub')
    expect(migrated?.expedition).toBeNull()
    expect(migrated?.hero?.inventory).toEqual(current.hero?.inventory)
  })

  it('migrates an active v15 combat with behavior history defaults', () => {
    let current = gameReducer(playableState(), { type: 'START_EXPEDITION', difficulty: 2 })
    const node = current.expedition!.nodes.find((candidate) => candidate.depth === 0)!
    current = gameReducer(current, { type: 'SELECT_NODE', nodeId: node.id })
    current = gameReducer(current, { type: 'ENTER_NODE' })
    const legacy = structuredClone(current) as unknown as Record<string, unknown>
    legacy.version = 15
    const expedition = legacy.expedition as { combat: Record<string, unknown> }
    delete expedition.combat.enemyBehavior
    delete expedition.combat.enemyIntentHistory
    const migrated = migrateGame(legacy)
    expect(migrated?.version).toBe(18)
    expect(migrated?.tutorial).toEqual({ completed: false, skipped: false, interactionMade: false })
    expect(migrated?.expedition?.combat?.enemyIntentHistory).toEqual([])
    expect(migrated?.expedition?.combat?.enemyBehavior.patternId).toBe('legacy-pattern')
  })

  it('adds an empty personal decision journal when migrating v17', () => {
    const legacy = structuredClone(playableState()) as unknown as Record<string, unknown>
    legacy.version = 17
    const hero = legacy.hero as Record<string, unknown>
    delete hero.decisionFlags
    delete hero.npcRelations
    const migrated = migrateGame(legacy)
    expect(migrated?.version).toBe(18)
    expect(migrated?.hero?.decisionFlags).toEqual({})
    expect(migrated?.hero?.npcRelations).toEqual({})
  })

  it('recovers a valid backup when the primary save is corrupt', () => {
    const backup = playableState()
    const result = recoverGame({ version: 4, broken: true }, backup)
    expect(result.recovered).toBe(true)
    expect(result.state?.hero?.id).toBe(backup.hero?.id)
    expect(result.state?.notice).toMatch(/резервной копии/i)
  })

  it('rejects a nested expedition shape that would crash the UI', () => {
    const corrupt = playableState() as unknown as Record<string, unknown>
    corrupt.view = 'expedition'
    corrupt.expedition = { id: 'broken-run' }
    expect(migrateGame(corrupt)).toBeNull()
  })

  it('repairs a save that tries to resume a fallen hero in an expedition', () => {
    const saved = gameReducer(playableState(), { type: 'START_EXPEDITION', difficulty: 1 })
    const hero = saved.hero!
    saved.fallen.push({
      id: hero.id, name: hero.name, epithet: hero.epithet, level: hero.level,
      score: hero.score, victories: hero.victories, diedAt: saved.actionSequence,
      cause: 'test defeat', perks: [], mutations: [], epitaph: 'test',
    })

    const migrated = migrateGame(saved)

    expect(migrated?.view).toBe('dead')
    expect(migrated?.expedition).toBeNull()
  })

  it('exports, verifies and imports a save', () => {
    const state = playableState()
    expect(importGame(exportGame(state))).toEqual(state)
    const tampered = exportGame(state).replace(state.hero!.name, `${state.hero!.name}-changed`)
    expect(() => importGame(tampered)).toThrow(/контрольная сумма/i)
  })

  it('rejects malformed save text without crashing', () => {
    expect(() => importGame('{nope')).toThrow(/JSON/i)
    expect(migrateGame(null)).toBeNull()
  })

  it('keeps an anonymous identity and queues a result while offline', async () => {
    const first = anonymousPlayerId()
    expect(anonymousPlayerId()).toBe(first)
    await submitFallenHero({ id: 'offline-hero', name: 'Оффлайн', epithet: 'тест', level: 1, score: 1, victories: 0, diedAt: 1, cause: 'test', perks: [], mutations: [], epitaph: 'test' })
    expect(pendingLeaderboardSyncCount()).toBeGreaterThan(0)
  })
})

describe('local RunSummary storage', () => {
  it('keeps only the newest 20 reports and deduplicates by runId', () => {
    const storage = new MemoryStorage()
    for (let index = 0; index < 25; index += 1) saveRunSummary(runSummary(index), storage)

    expect(loadRunSummaries(storage)).toHaveLength(MAX_RUN_SUMMARIES)
    expect(loadRunSummaries(storage)[0].runId).toBe('run-24')
    expect(loadRunSummaries(storage).at(-1)?.runId).toBe('run-5')

    const updated = { ...runSummary(10), actionCount: 999 }
    saveRunSummary(updated, storage)
    expect(loadRunSummaries(storage)[0]).toMatchObject({ runId: 'run-10', actionCount: 999 })
    expect(loadRunSummaries(storage).filter((entry) => entry.runId === 'run-10')).toHaveLength(1)
  })

  it('drops corrupt or privacy-violating reports while loading', () => {
    const storage = new MemoryStorage()
    storage.setItem(RUN_SUMMARIES_KEY, JSON.stringify([
      runSummary(1),
      { ...runSummary(2), playerId: 'must-not-cross-boundary' },
      { ...runSummary(3), roomsEntered: -1 },
    ]))

    expect(loadRunSummaries(storage)).toEqual([runSummary(1)])
  })

  it('round-trips only a valid active collector and clears it explicitly', () => {
    const storage = new MemoryStorage()
    const { outcome: _outcome, deathCause: _deathCause, ...active } = runSummary(7)
    saveRunSummaryCollector({ active }, storage)
    expect(loadRunSummaryCollector(storage)).toEqual({ active })

    saveRunSummaryCollector({ active: null }, storage)
    expect(loadRunSummaryCollector(storage)).toEqual({ active: null })
  })

  it('exports a bounded explicit JSON package without identity metadata', () => {
    const reports = Array.from({ length: 25 }, (_, index) => runSummary(index))
    const exported = exportRunSummaries(reports)
    const parsed = JSON.parse(exported) as { schemaVersion: number; kind: string; reports: RunSummary[] }

    expect(parsed).toMatchObject({ schemaVersion: 2, kind: 'ashen-ring-run-summaries' })
    expect(parsed.reports).toHaveLength(MAX_RUN_SUMMARIES)
    expect(exported).not.toMatch(/playerId|heroId|heroName|device|timestamp/i)
  })
})
