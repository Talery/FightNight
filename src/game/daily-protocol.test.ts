import { describe, expect, it } from 'vitest'
import {
  DAILY_RULESET_VERSION, canonicalDailySubmission, dailyIdempotencyKey, dailySeedForDay, isDailyReplayJournal, isDailySubmission, replayDailyJournal,
  type DailyReplayJournal,
} from './daily-protocol'
import { createInitialState, gameReducer } from './engine'
import { nextBotAction } from './simulation'

function journal(actions: DailyReplayJournal['actions'] = []): DailyReplayJournal {
  return { schemaVersion: 1, rulesetVersion: DAILY_RULESET_VERSION, day: '2026-08-13', seed: dailySeedForDay('2026-08-13'), actions }
}

describe('verified daily protocol', () => {
  it('derives one public seed from day and ruleset', () => {
    expect(dailySeedForDay('2026-08-13')).toBe(dailySeedForDay('2026-08-13'))
    expect(dailySeedForDay('2026-08-13')).not.toBe(dailySeedForDay('2026-08-14'))
    expect(dailySeedForDay('2026-08-13', 'other')).not.toBe(dailySeedForDay('2026-08-13'))
  })

  it('rejects client-only or oversized actions', () => {
    expect(isDailyReplayJournal({ ...journal(), actions: [{ type: 'IMPORT_SAVE', state: {} }] })).toBe(false)
    expect(isDailyReplayJournal({ ...journal(), actions: Array.from({ length: 10_001 }, () => ({ type: 'FIGHT' })) })).toBe(false)
  })

  it('does not accept an incomplete replay as a verified result', () => {
    expect(replayDailyJournal(journal())).toMatchObject({ accepted: false, outcome: 'incomplete', error: 'incomplete-run' })
  })

  it('hashes canonical payloads idempotently and includes claimed score', async () => {
    const base = { ...journal(), playerId: 'player-1234567890', claimedScore: 10 }
    expect(canonicalDailySubmission(base)).toBe(canonicalDailySubmission(structuredClone(base)))
    expect(await dailyIdempotencyKey(base)).toBe(await dailyIdempotencyKey(structuredClone(base)))
    expect(await dailyIdempotencyKey(base)).not.toBe(await dailyIdempotencyKey({ ...base, claimedScore: 11 }))
    const idempotencyKey = await dailyIdempotencyKey(base)
    expect(isDailySubmission({ ...base, idempotencyKey })).toBe(true)
    expect(isDailySubmission({ ...base, idempotencyKey, forgedScore: 999 })).toBe(false)
  })

  it('replays a complete client journal to the same server score', () => {
    const seed = dailySeedForDay('2026-08-13')
    let state = gameReducer(createInitialState(seed), { type: 'NEW_HERO' })
    state = gameReducer(state, { type: 'START_DAILY_EXPEDITION', seed })
    const actions: DailyReplayJournal['actions'] = []
    let terminalScore = 0
    for (let step = 0; step < 600 && state.expedition?.daily; step += 1) {
      const action = state.expedition.complete ? { type: 'RETURN_HOME' as const } : nextBotAction(state, step)
      if (!action) break
      terminalScore = state.hero?.score ?? terminalScore
      actions.push(action as DailyReplayJournal['actions'][number])
      state = gameReducer(state, action)
    }
    const replay = replayDailyJournal(journal(actions))
    expect(replay.accepted).toBe(true)
    expect(replay.score).toBe(terminalScore)
    expect(replay.outcome).toMatch(/victory|death/)
  })
})
