import {
  DAILY_RULESET_VERSION, dailyActionForJournal, dailyIdempotencyKey, dailySeedForDay, type DailyReplayJournal, type DailySubmission,
} from './daily-protocol'
import type { GameAction, GameState } from './types'

export const DAILY_CAPTURE_KEY = 'ashen-ring-daily-capture-v1'
export const DAILY_QUEUE_KEY = 'ashen-ring-daily-queue-v1'
export const DAILY_RECEIPTS_KEY = 'ashen-ring-daily-receipts-v1'
const MAX_QUEUE = 10

type StoragePort = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>
export type DailyReceiptState = 'pending' | 'verified' | 'rejected'
export interface DailyReceipt { idempotencyKey: string; day: string; score: number; state: DailyReceiptState; reason?: string }
export interface DailyConfig { day: string; seed: number; rulesetVersion: string; seasonId: string; source: 'server' | 'local' }
export interface VerifiedDailyRank { playerId: string; score: number; rank: number; outcome?: 'victory' | 'death'; verifiedRuns?: number; rulesetVersion?: string }

function storagePort(): StoragePort | null {
  try { return typeof localStorage === 'undefined' ? null : localStorage } catch { return null }
}

function readJson<T>(storage: StoragePort | null, key: string, fallback: T): T {
  if (!storage) return fallback
  try { return JSON.parse(storage.getItem(key) ?? '') as T } catch { return fallback }
}

function writeJson(storage: StoragePort | null, key: string, value: unknown): void {
  if (!storage) return
  try { storage.setItem(key, JSON.stringify(value)) } catch { /* best effort */ }
}

export function loadDailyReceipts(storage = storagePort()): DailyReceipt[] {
  const value = readJson<unknown>(storage, DAILY_RECEIPTS_KEY, [])
  if (!Array.isArray(value)) return []
  return value.filter((entry): entry is DailyReceipt => Boolean(entry) && typeof entry === 'object' && ['pending', 'verified', 'rejected'].includes(String((entry as DailyReceipt).state))).slice(0, 20)
}

function saveReceipt(receipt: DailyReceipt, storage: StoragePort | null): void {
  writeJson(storage, DAILY_RECEIPTS_KEY, [receipt, ...loadDailyReceipts(storage).filter((entry) => entry.idempotencyKey !== receipt.idempotencyKey)].slice(0, 20))
}

function loadQueue(storage: StoragePort | null): DailySubmission[] {
  const value = readJson<unknown>(storage, DAILY_QUEUE_KEY, [])
  return Array.isArray(value) ? value.filter((entry): entry is DailySubmission => Boolean(entry) && typeof entry === 'object' && typeof (entry as DailySubmission).idempotencyKey === 'string').slice(0, MAX_QUEUE) : []
}

export function pendingDailySubmissionCount(storage = storagePort()): number {
  return loadQueue(storage).length
}

export async function recordDailyTransition(before: GameState, action: GameAction, after: GameState, playerId: string, storage = storagePort()): Promise<DailySubmission | null> {
  if (!storage) return null
  if (action.type === 'START_DAILY_EXPEDITION' && after.expedition?.daily) {
    const capture: DailyReplayJournal = {
      schemaVersion: 1, rulesetVersion: action.rulesetVersion ?? DAILY_RULESET_VERSION, day: action.day ?? new Date().toISOString().slice(0, 10), seed: action.seed >>> 0, actions: [],
    }
    writeJson(storage, DAILY_CAPTURE_KEY, capture)
    return null
  }
  if (!before.expedition?.daily) return null
  const capture = readJson<DailyReplayJournal | null>(storage, DAILY_CAPTURE_KEY, null)
  if (!capture) return null
  const replayAction = dailyActionForJournal(action)
  if (replayAction) capture.actions.push(replayAction)
  if (!replayAction && !after.expedition?.daily) {
    storage.removeItem(DAILY_CAPTURE_KEY)
    return null
  }
  if (after.expedition?.daily) {
    writeJson(storage, DAILY_CAPTURE_KEY, capture)
    return null
  }
  storage.removeItem(DAILY_CAPTURE_KEY)
  const unsigned = { ...capture, playerId, claimedScore: before.hero?.score ?? 0 }
  const submission: DailySubmission = { ...unsigned, idempotencyKey: await dailyIdempotencyKey(unsigned) }
  const queue = loadQueue(storage)
  if (!queue.some((entry) => entry.idempotencyKey === submission.idempotencyKey)) writeJson(storage, DAILY_QUEUE_KEY, [submission, ...queue].slice(0, MAX_QUEUE))
  saveReceipt({ idempotencyKey: submission.idempotencyKey, day: submission.day, score: submission.claimedScore, state: 'pending' }, storage)
  return submission
}

function backendConfig(): { url: string; key: string } | null {
  const url = String(import.meta.env.VITE_SUPABASE_URL ?? '').replace(/\/$/, '')
  const key = String(import.meta.env.VITE_SUPABASE_ANON_KEY ?? '')
  return url && key ? { url, key } : null
}

export function localDailyConfig(now = new Date()): DailyConfig {
  const day = now.toISOString().slice(0, 10)
  return { day, seed: dailySeedForDay(day), rulesetVersion: DAILY_RULESET_VERSION, seasonId: day.slice(0, 7), source: 'local' }
}

export async function fetchDailyConfig(fetcher: typeof fetch = fetch): Promise<DailyConfig> {
  const fallback = localDailyConfig()
  const config = backendConfig()
  if (!config) return fallback
  try {
    const response = await fetcher(`${config.url}/functions/v1/verify-daily`, { headers: { apikey: config.key, Authorization: `Bearer ${config.key}` } })
    const body = await response.json() as Omit<DailyConfig, 'source'>
    if (!response.ok || body.day !== fallback.day || body.rulesetVersion !== DAILY_RULESET_VERSION || body.seed !== dailySeedForDay(body.day)) return fallback
    return { ...body, source: 'server' }
  } catch { return fallback }
}

export async function fetchVerifiedDailyRanks(scope: 'daily' | 'season', fetcher: typeof fetch = fetch): Promise<VerifiedDailyRank[]> {
  const config = backendConfig()
  if (!config) return []
  const daily = localDailyConfig()
  const path = scope === 'daily'
    ? `current_daily_leaderboard?select=player_id,score,rank,outcome,ruleset_version&day=eq.${daily.day}&ruleset_version=eq.${DAILY_RULESET_VERSION}&order=rank.asc&limit=25`
    : `season_leaderboard?select=player_id,score,rank,verified_runs&season_id=eq.${daily.seasonId}&order=rank.asc&limit=25`
  try {
    const response = await fetcher(`${config.url}/rest/v1/${path}`, { headers: { apikey: config.key, Authorization: `Bearer ${config.key}` } })
    if (!response.ok) return []
    const rows = await response.json() as Array<Record<string, unknown>>
    return rows.map((row) => ({ playerId: String(row.player_id), score: Number(row.score), rank: Number(row.rank), outcome: row.outcome as VerifiedDailyRank['outcome'], verifiedRuns: row.verified_runs === undefined ? undefined : Number(row.verified_runs), rulesetVersion: row.ruleset_version === undefined ? undefined : String(row.ruleset_version) }))
  } catch { return [] }
}

export async function flushDailySubmissionQueue(storage = storagePort(), fetcher: typeof fetch = fetch): Promise<void> {
  const config = backendConfig()
  if (!storage || !config) return
  const queue = loadQueue(storage)
  const remaining: DailySubmission[] = []
  for (const submission of queue) {
    try {
      const response = await fetcher(`${config.url}/functions/v1/verify-daily`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', apikey: config.key, Authorization: `Bearer ${config.key}` }, body: JSON.stringify(submission),
      })
      const body = await response.json().catch(() => ({})) as { verified?: boolean; score?: number; reason?: string }
      if (response.ok && body.verified) saveReceipt({ idempotencyKey: submission.idempotencyKey, day: submission.day, score: body.score ?? submission.claimedScore, state: 'verified' }, storage)
      else if (response.status >= 400 && response.status < 500) saveReceipt({ idempotencyKey: submission.idempotencyKey, day: submission.day, score: submission.claimedScore, state: 'rejected', reason: body.reason ?? `HTTP ${response.status}` }, storage)
      else remaining.push(submission)
    } catch { remaining.push(submission) }
  }
  writeJson(storage, DAILY_QUEUE_KEY, remaining)
}
