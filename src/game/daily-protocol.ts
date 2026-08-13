import { createInitialState, gameReducer } from './engine'
import type { GameAction, GameState, OathId } from './types'

export const DAILY_RULESET_VERSION = '0.6.0-r1'
export const DAILY_MAX_ACTIONS = 10_000
export const DAILY_MAX_BYTES = 256_000
export const DAILY_PUBLIC_OATH: OathId = 'wanderer'

export type DailyReplayAction = Extract<GameAction,
  | { type: 'SELECT_NODE' | 'ENTER_NODE' | 'SELECT_ATTACK' | 'SELECT_BLOCK' | 'SELECT_TECHNIQUE' | 'SELECT_ABILITY' }
  | { type: 'SCOUT_INTENT' | 'REPEAT_COMBAT_SELECTION' | 'FIGHT' | 'SPARE_ENEMY' | 'USE_ITEM' }
  | { type: 'EVENT_CHOICE' | 'CONTINUE_EVENT' | 'TAKE_REWARD' | 'SELECT_REWARD' | 'SALVAGE_REWARD' | 'LEAVE_REWARD' | 'RETURN_HOME' }
>

export interface DailyReplayJournal {
  schemaVersion: 1
  rulesetVersion: string
  day: string
  seed: number
  actions: DailyReplayAction[]
}

export interface DailySubmission extends DailyReplayJournal {
  playerId: string
  claimedScore: number
  idempotencyKey: string
}

export interface DailyReplayResult {
  accepted: boolean
  score: number
  outcome: 'victory' | 'death' | 'incomplete' | 'invalid'
  actionCount: number
  error?: string
}

const allowed = new Set<DailyReplayAction['type']>([
  'SELECT_NODE', 'ENTER_NODE', 'SELECT_ATTACK', 'SELECT_BLOCK', 'SELECT_TECHNIQUE', 'SELECT_ABILITY',
  'SCOUT_INTENT', 'REPEAT_COMBAT_SELECTION', 'FIGHT', 'SPARE_ENEMY', 'USE_ITEM', 'EVENT_CHOICE',
  'CONTINUE_EVENT', 'TAKE_REWARD', 'SELECT_REWARD', 'SALVAGE_REWARD', 'LEAVE_REWARD', 'RETURN_HOME',
])

function record(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function exactKeys(value: Record<string, unknown>, keys: string[]): boolean {
  const actual = Object.keys(value)
  return actual.length === keys.length && actual.every((key) => keys.includes(key))
}

export function isDailyReplayAction(value: unknown): value is DailyReplayAction {
  if (!record(value) || typeof value.type !== 'string' || !allowed.has(value.type as DailyReplayAction['type'])) return false
  switch (value.type) {
    case 'SELECT_NODE': return exactKeys(value, ['type', 'nodeId']) && typeof value.nodeId === 'string' && value.nodeId.length <= 120
    case 'SELECT_ATTACK':
    case 'SELECT_BLOCK': return exactKeys(value, ['type', 'zone']) && ['head', 'body', 'legs'].includes(String(value.zone))
    case 'SELECT_TECHNIQUE': return exactKeys(value, ['type', 'technique']) && ['quick', 'heavy', 'feint'].includes(String(value.technique))
    case 'SELECT_ABILITY': return exactKeys(value, ['type', 'abilityId']) && (value.abilityId === null || ['bloodletter', 'guardBreak', 'secondWind'].includes(String(value.abilityId)))
    case 'USE_ITEM':
    case 'SELECT_REWARD': return exactKeys(value, ['type', 'itemId']) && typeof value.itemId === 'string' && value.itemId.length <= 120
    case 'EVENT_CHOICE': return exactKeys(value, ['type', 'index']) && Number.isSafeInteger(value.index) && Number(value.index) >= 0 && Number(value.index) <= 20
    default: return exactKeys(value, ['type'])
  }
}

export function isDailyReplayJournal(value: unknown): value is DailyReplayJournal {
  if (!record(value) || !exactKeys(value, ['schemaVersion', 'rulesetVersion', 'day', 'seed', 'actions'])) return false
  if (value.schemaVersion !== 1 || value.rulesetVersion !== DAILY_RULESET_VERSION) return false
  if (typeof value.day !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value.day)) return false
  if (!Number.isSafeInteger(value.seed) || Number(value.seed) < 0 || Number(value.seed) > 0xffffffff) return false
  if (!Array.isArray(value.actions) || value.actions.length > DAILY_MAX_ACTIONS || !value.actions.every(isDailyReplayAction)) return false
  return new TextEncoder().encode(JSON.stringify(value)).byteLength <= DAILY_MAX_BYTES
}

export function isDailySubmission(value: unknown): value is DailySubmission {
  if (!record(value) || !exactKeys(value, ['schemaVersion', 'rulesetVersion', 'day', 'seed', 'actions', 'playerId', 'claimedScore', 'idempotencyKey'])) return false
  const journal = { schemaVersion: value.schemaVersion, rulesetVersion: value.rulesetVersion, day: value.day, seed: value.seed, actions: value.actions }
  return isDailyReplayJournal(journal)
    && typeof value.playerId === 'string' && /^[a-zA-Z0-9_-]{12,100}$/.test(value.playerId)
    && Number.isSafeInteger(value.claimedScore) && Number(value.claimedScore) >= 0 && Number(value.claimedScore) <= 2147483647
    && typeof value.idempotencyKey === 'string' && /^[a-f0-9]{64}$/.test(value.idempotencyKey)
}

export function dailyActionForJournal(action: GameAction): DailyReplayAction | null {
  return isDailyReplayAction(action) ? structuredClone(action) : null
}

export function replayDailyJournal(journal: DailyReplayJournal): DailyReplayResult {
  if (!isDailyReplayJournal(journal)) return { accepted: false, score: 0, outcome: 'invalid', actionCount: 0, error: 'invalid-journal' }
  let state = gameReducer(createInitialState(journal.seed), { type: 'NEW_HERO' })
  state = gameReducer(state, { type: 'START_DAILY_EXPEDITION', seed: journal.seed })
  let lastDailyScore = state.hero?.score ?? 0
  for (let index = 0; index < journal.actions.length; index += 1) {
    const action = journal.actions[index]
    if (!state.expedition?.daily) return { accepted: false, score: lastDailyScore, outcome: 'invalid', actionCount: index, error: 'action-after-terminal' }
    lastDailyScore = state.hero?.score ?? lastDailyScore
    const before = state
    state = gameReducer(state, action)
    if (before.expedition?.daily) lastDailyScore = before.hero?.score ?? lastDailyScore
  }
  const ended = !state.expedition?.daily
  const died = ended && Boolean(state.notice?.startsWith('Ежедневный забег завершён поражением:'))
  const won = ended && !died
  return { accepted: ended, score: lastDailyScore, outcome: died ? 'death' : won ? 'victory' : 'incomplete', actionCount: journal.actions.length, error: ended ? undefined : 'incomplete-run' }
}

export function canonicalDailySubmission(value: Omit<DailySubmission, 'idempotencyKey'>): string {
  return JSON.stringify({
    schemaVersion: value.schemaVersion, rulesetVersion: value.rulesetVersion, day: value.day, seed: value.seed,
    playerId: value.playerId, claimedScore: value.claimedScore, actions: value.actions,
  })
}

export async function dailyIdempotencyKey(value: Omit<DailySubmission, 'idempotencyKey'>): Promise<string> {
  return sha256Hex(canonicalDailySubmission(value))
}

export async function sha256Hex(value: string): Promise<string> {
  const bytes = new TextEncoder().encode(value)
  const digest = await crypto.subtle.digest('SHA-256', bytes)
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('')
}

export function dailySeedForDay(day: string, rulesetVersion = DAILY_RULESET_VERSION): number {
  let value = 2166136261
  for (const char of `${day}:${rulesetVersion}`) value = Math.imul(value ^ char.charCodeAt(0), 16777619) >>> 0
  return value >>> 0
}

export function dailyIsActive(state: GameState): boolean {
  return Boolean(state.expedition?.daily)
}
