import { describe, expect, it } from 'vitest'
import { createInitialState, gameReducer } from './engine'
import { exportGame, importGame, migrateGame, recoverGame } from './storage'

function playableState() {
  return gameReducer(createInitialState(987654321), { type: 'NEW_HERO' })
}

describe('save migrations and recovery', () => {
  it('migrates v2 sequentially without losing hero or inventory', () => {
    const current = playableState()
    const legacy = structuredClone(current) as unknown as Record<string, unknown>
    legacy.version = 2
    delete legacy.actionSequence
    const migrated = migrateGame(legacy)
    expect(migrated?.version).toBe(3)
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

  it('recovers a valid backup when the primary save is corrupt', () => {
    const backup = playableState()
    const result = recoverGame({ version: 3, broken: true }, backup)
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
})
