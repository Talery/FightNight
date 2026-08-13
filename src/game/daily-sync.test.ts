import { describe, expect, it } from 'vitest'
import { createInitialState, gameReducer } from './engine'
import { dailySeedForDay } from './daily-protocol'
import { DAILY_CAPTURE_KEY, DAILY_QUEUE_KEY, loadDailyReceipts, pendingDailySubmissionCount, recordDailyTransition } from './daily-sync'

class MemoryStorage {
  values = new Map<string, string>()
  getItem(key: string) { return this.values.get(key) ?? null }
  setItem(key: string, value: string) { this.values.set(key, value) }
  removeItem(key: string) { this.values.delete(key) }
}

describe('daily offline queue', () => {
  it('persists capture across transitions and queues a terminal replay once', async () => {
    const storage = new MemoryStorage()
    let before = gameReducer(createInitialState(5), { type: 'NEW_HERO' })
    const action = { type: 'START_DAILY_EXPEDITION' as const, seed: dailySeedForDay(new Date().toISOString().slice(0, 10)) }
    let after = gameReducer(before, action)
    await recordDailyTransition(before, action, after, 'player-1234567890', storage)
    expect(storage.getItem(DAILY_CAPTURE_KEY)).toContain('rulesetVersion')
    before = after
    after = structuredClone(before)
    after.expedition = null
    after.dailyReturnHero = null
    after.view = 'hub'
    const submission = await recordDailyTransition(before, { type: 'RETURN_HOME' }, after, 'player-1234567890', storage)
    expect(submission?.idempotencyKey).toMatch(/^[a-f0-9]{64}$/)
    expect(pendingDailySubmissionCount(storage)).toBe(1)
    expect(loadDailyReceipts(storage)[0].state).toBe('pending')
    expect(storage.getItem(DAILY_CAPTURE_KEY)).toBeNull()
    expect(JSON.parse(storage.getItem(DAILY_QUEUE_KEY) ?? '[]')).toHaveLength(1)
  })

  it('drops an abandoned capture without pretending it is verifiable', async () => {
    const storage = new MemoryStorage()
    let before = gameReducer(createInitialState(6), { type: 'NEW_HERO' })
    const start = { type: 'START_DAILY_EXPEDITION' as const, seed: dailySeedForDay(new Date().toISOString().slice(0, 10)) }
    let after = gameReducer(before, start)
    await recordDailyTransition(before, start, after, 'player-1234567890', storage)
    before = after
    after = createInitialState(99)
    const result = await recordDailyTransition(before, { type: 'RESET_SAVE', seed: 99 }, after, 'player-1234567890', storage)
    expect(result).toBeNull()
    expect(pendingDailySubmissionCount(storage)).toBe(0)
    expect(storage.getItem(DAILY_CAPTURE_KEY)).toBeNull()
  })
})
