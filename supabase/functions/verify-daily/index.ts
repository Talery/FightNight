import {
  DAILY_RULESET_VERSION, dailyIdempotencyKey, dailySeedForDay,
  isDailyReplayJournal, isDailySubmission, replayDailyJournal, sha256Hex, type DailyReplayJournal, type DailySubmission,
} from '../../../src/game/daily-protocol.ts'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } })
}

function currentDay(): string { return new Date().toISOString().slice(0, 10) }
function seasonFor(day: string): string { return day.slice(0, 7) }
function validPlayerId(value: unknown): value is string { return typeof value === 'string' && /^[a-zA-Z0-9_-]{12,100}$/.test(value) }

async function serviceRequest(path: string, init: RequestInit): Promise<Response> {
  const url = Deno.env.get('SUPABASE_URL')?.replace(/\/$/, '')
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!url || !key) throw new Error('backend-not-configured')
  return fetch(`${url}/rest/v1/${path}`, { ...init, headers: { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json', ...(init.headers ?? {}) } })
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: cors })
  const day = currentDay()
  if (request.method === 'GET') return json({ schemaVersion: 1, day, seed: dailySeedForDay(day), rulesetVersion: DAILY_RULESET_VERSION, seasonId: seasonFor(day) })
  if (request.method !== 'POST') return json({ verified: false, reason: 'method-not-allowed' }, 405)
  const length = Number(request.headers.get('content-length') ?? 0)
  if (length > 300_000) return json({ verified: false, reason: 'payload-too-large' }, 413)
  let body: unknown
  try { body = await request.json() } catch { return json({ verified: false, reason: 'invalid-json' }, 400) }
  if (!isDailySubmission(body)) return json({ verified: false, reason: 'invalid-payload' }, 400)
  const candidate = body as DailySubmission
  const journal: DailyReplayJournal = { schemaVersion: candidate.schemaVersion as 1, rulesetVersion: String(candidate.rulesetVersion ?? ''), day: String(candidate.day ?? ''), seed: Number(candidate.seed), actions: candidate.actions ?? [] }
  if (!isDailyReplayJournal(journal) || !validPlayerId(candidate.playerId)) return json({ verified: false, reason: 'invalid-payload' }, 400)
  if (journal.day !== day || journal.seed !== dailySeedForDay(day)) return json({ verified: false, reason: 'daily-mismatch' }, 409)
  const unsigned = { ...journal, playerId: candidate.playerId, claimedScore: Number(candidate.claimedScore) }
  if (candidate.idempotencyKey !== await dailyIdempotencyKey(unsigned)) return json({ verified: false, reason: 'idempotency-mismatch' }, 400)
  const existing = await serviceRequest(`verified_daily_runs?select=score,outcome,action_count,ruleset_version&idempotency_key=eq.${candidate.idempotencyKey}&limit=1`, { method: 'GET' })
  if (existing.ok) {
    const rows = await existing.json() as Array<{ score: number; outcome: string; action_count: number; ruleset_version: string }>
    if (rows[0]) return json({ verified: true, score: rows[0].score, outcome: rows[0].outcome, actionCount: rows[0].action_count, rulesetVersion: rows[0].ruleset_version, idempotencyKey: candidate.idempotencyKey, duplicate: true })
  }
  const rate = await serviceRequest('rpc/claim_daily_verification_slot', { method: 'POST', body: JSON.stringify({ p_player_id: candidate.playerId, p_limit: 8 }) })
  if (!rate.ok || await rate.json() !== true) return json({ verified: false, reason: 'rate-limit' }, 429)
  const replay = replayDailyJournal(journal)
  if (!replay.accepted || replay.outcome === 'invalid' || replay.outcome === 'incomplete') return json({ verified: false, reason: replay.error ?? 'replay-failed' }, 422)
  if (replay.score !== candidate.claimedScore) return json({ verified: false, reason: 'score-mismatch', serverScore: replay.score }, 422)
  const journalHash = await sha256Hex(JSON.stringify(journal))
  const insert = await serviceRequest('verified_daily_runs?on_conflict=idempotency_key', {
    method: 'POST', headers: { Prefer: 'resolution=ignore-duplicates,return=representation' },
    body: JSON.stringify({ idempotency_key: candidate.idempotencyKey, player_id: candidate.playerId, day, season_id: seasonFor(day), ruleset_version: DAILY_RULESET_VERSION, seed: journal.seed, journal_hash: journalHash, score: replay.score, outcome: replay.outcome, action_count: replay.actionCount }),
  })
  if (!insert.ok) return json({ verified: false, reason: 'storage-failed' }, 503)
  return json({ verified: true, score: replay.score, outcome: replay.outcome, actionCount: replay.actionCount, rulesetVersion: DAILY_RULESET_VERSION, idempotencyKey: candidate.idempotencyKey })
})
