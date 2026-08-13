import type { GameAction, GameState, RunSummary, Technique, Zone } from './types'

type UnknownRecord = Record<string, unknown>
type RunSummaryDraft = Omit<RunSummary, 'outcome' | 'deathCause'>

export interface RunSummaryCollector {
  active: RunSummaryDraft | null
}

export interface RunSummaryCollection {
  collector: RunSummaryCollector
  completed: RunSummary | null
}

const BIOMES = ['catacombs', 'salt', 'citadel', 'marsh', 'monastery', 'mines', 'coast', 'garden'] as const
const OUTCOMES = ['victory', 'death', 'abandoned'] as const
const ZONES = ['head', 'body', 'legs'] as const
const TECHNIQUES = ['quick', 'heavy', 'feint'] as const
const RUN_ACTIONS = new Set<GameAction['type']>([
  'SELECT_NODE',
  'ENTER_NODE',
  'SELECT_ATTACK',
  'SELECT_BLOCK',
  'SELECT_TECHNIQUE',
  'SELECT_ABILITY',
  'FIGHT',
  'SPARE_ENEMY',
  'USE_ITEM',
  'EVENT_CHOICE',
  'CONTINUE_EVENT',
  'TAKE_REWARD',
  'LEAVE_REWARD',
  'RETURN_HOME',
])
const SUMMARY_KEYS = [
  'schemaVersion',
  'runId',
  'seed',
  'seedCode',
  'difficulty',
  'daily',
  'biome',
  'outcome',
  'actionCount',
  'roomsEntered',
  'roomsCleared',
  'combatTurns',
  'attackZones',
  'blockZones',
  'techniques',
  'damageTaken',
  'damageBySource',
  'unblockedDamageByZone',
  'statusDamage',
  'healingReceived',
  'selectedRewardIds',
  'deathCause',
] as const satisfies readonly (keyof RunSummary)[]

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function hasExactKeys(value: UnknownRecord, expected: readonly string[]): boolean {
  const actual = Object.keys(value)
  return actual.length === expected.length && actual.every((key) => expected.includes(key))
}

function isNonNegativeInteger(value: unknown): value is number {
  return Number.isSafeInteger(value) && Number(value) >= 0
}

function isCounter<T extends string>(value: unknown, keys: readonly T[]): value is Record<T, number> {
  if (!isRecord(value) || !hasExactKeys(value, keys)) return false
  return keys.every((key) => isNonNegativeInteger(value[key]))
}

function isOneOf<T extends string>(value: unknown, values: readonly T[]): value is T {
  return typeof value === 'string' && values.includes(value as T)
}

function emptyCounter<T extends string>(keys: readonly T[]): Record<T, number> {
  return Object.fromEntries(keys.map((key) => [key, 0])) as Record<T, number>
}

function startDraft(action: GameAction, after: GameState): RunSummaryDraft | null {
  const expedition = after.expedition
  if (!expedition || (action.type !== 'START_EXPEDITION' && action.type !== 'START_DAILY_EXPEDITION')) return null
  return {
    schemaVersion: 2,
    runId: expedition.id,
    seed: action.type === 'START_DAILY_EXPEDITION' ? action.seed >>> 0 : after.seed >>> 0,
    seedCode: expedition.seedCode,
    difficulty: expedition.difficulty,
    daily: expedition.daily,
    biome: expedition.biome.id,
    actionCount: 0,
    roomsEntered: 0,
    roomsCleared: 0,
    combatTurns: 0,
    attackZones: emptyCounter(ZONES),
    blockZones: emptyCounter(ZONES),
    techniques: emptyCounter(TECHNIQUES),
    damageTaken: 0,
    damageBySource: {},
    unblockedDamageByZone: emptyCounter(ZONES),
    statusDamage: 0,
    healingReceived: 0,
    selectedRewardIds: [],
  }
}

function completedRoomCount(before: GameState, after: GameState, runId: string): number {
  if (before.expedition?.id !== runId || after.expedition?.id !== runId) return 0
  const beforeById = new Map(before.expedition.nodes.map((node) => [node.id, node.state]))
  return after.expedition.nodes.filter((node) => node.state === 'cleared' && beforeById.get(node.id) !== 'cleared').length
}

function enteredRoom(before: GameState, action: GameAction, after: GameState, runId: string): boolean {
  if (action.type !== 'ENTER_NODE' || before.expedition?.id !== runId || after.expedition?.id !== runId) return false
  if (before.expedition.combat || before.expedition.event || before.expedition.reward) return false
  return Boolean(after.expedition.combat || after.expedition.event || after.expedition.reward)
}

function resolvedCombatTurn(before: GameState, action: GameAction, after: GameState, runId: string): boolean {
  const combat = before.expedition?.id === runId ? before.expedition.combat : null
  if (action.type !== 'FIGHT' || !combat?.attackZone || !combat.blockZone) return false
  if (after.expedition?.id !== runId) return true
  if (!after.expedition.combat || after.expedition.reward) return true
  return after.expedition.combat.turn !== combat.turn
    || after.expedition.combat.lastExchange?.hero !== combat.lastExchange?.hero
    || after.expedition.combat.lastExchange?.enemy !== combat.lastExchange?.enemy
}

function runHeroHp(state: GameState, runId: string, fallbackToDeadHero = false): number | null {
  if (state.expedition?.id === runId) return state.hero?.hp ?? null
  if (fallbackToDeadHero && state.view === 'dead') return state.hero?.hp ?? 0
  return null
}

function deathCause(before: GameState, after: GameState): string {
  const newFallen = after.fallen.find((fallen) => !before.fallen.some((candidate) => candidate.id === fallen.id))
  if (newFallen?.cause.trim()) return newFallen.cause.trim().slice(0, 160)
  const daily = after.notice?.match(/^Ежедневный забег завершён поражением: (.+?)\. Кампания бойца не затронута\.$/)
  return (daily?.[1] ?? 'поход завершился гибелью').trim().slice(0, 160)
}

function outcomeFor(before: GameState, after: GameState, runId: string): Pick<RunSummary, 'outcome' | 'deathCause'> | null {
  if (after.expedition?.id === runId && after.expedition.complete) return { outcome: 'victory', deathCause: null }
  if (before.expedition?.id !== runId || after.expedition?.id === runId) return null
  const died = after.view === 'dead' || Boolean(before.expedition.daily && before.dailyReturnHero && after.dailyReturnHero === null && after.notice?.startsWith('Ежедневный забег завершён поражением:'))
  return died ? { outcome: 'death', deathCause: deathCause(before, after) } : { outcome: 'abandoned', deathCause: null }
}

export function createRunSummaryCollector(): RunSummaryCollector {
  return { active: null }
}

export function isRunSummaryCollector(value: unknown): value is RunSummaryCollector {
  if (!isRecord(value) || !hasExactKeys(value, ['active'])) return false
  if (value.active === null) return true
  if (!isRecord(value.active)) return false
  return isRunSummary({ ...value.active, outcome: 'abandoned', deathCause: null })
}

/**
 * Pure transition collector. The caller owns the returned collector and may persist
 * only completed summaries; no identity, device or wall-clock data is inspected.
 */
export function collectRunSummary(
  collector: RunSummaryCollector,
  before: GameState,
  action: GameAction,
  after: GameState,
): RunSummaryCollection {
  const started = startDraft(action, after)
  if (started) return { collector: { active: started }, completed: null }
  if (!collector.active) return { collector, completed: null }

  const active = structuredClone(collector.active)
  const runId = active.runId
  if (before.expedition?.id !== runId) return { collector: { active }, completed: null }

  if (RUN_ACTIONS.has(action.type)) active.actionCount += 1
  if (enteredRoom(before, action, after, runId)) active.roomsEntered += 1
  active.roomsCleared += completedRoomCount(before, after, runId)

  const combat = before.expedition.combat
  if (resolvedCombatTurn(before, action, after, runId) && combat?.attackZone && combat.blockZone) {
    active.combatTurns += 1
    active.attackZones[combat.attackZone as Zone] += 1
    active.blockZones[combat.blockZone as Zone] += 1
    active.techniques[combat.technique as Technique] += 1
  }

  const hpBefore = runHeroHp(before, runId)
  const terminal = outcomeFor(before, after, runId)
  const hpAfter = terminal?.outcome === 'death' && before.expedition.daily
    ? 0
    : runHeroHp(after, runId, terminal?.outcome === 'death')
  if (hpBefore !== null && hpAfter !== null) {
    if (hpAfter < hpBefore) {
      const damage = hpBefore - hpAfter
      active.damageTaken += damage
      const source = combat?.enemy.name.slice(0, 80) ?? 'неизвестный источник'
      active.damageBySource[source] = (active.damageBySource[source] ?? 0) + damage
      const directDamage = after.expedition?.id === runId ? after.expedition.combat?.lastExchange?.enemyDamage ?? 0 : 0
      active.statusDamage += Math.max(0, damage - directDamage)
      if (combat && combat.blockZone !== combat.enemyIntent) active.unblockedDamageByZone[combat.enemyIntent] += damage
    }
    if (hpAfter > hpBefore) active.healingReceived += hpAfter - hpBefore
  }

  if (action.type === 'TAKE_REWARD' && before.expedition.reward
    && after.expedition?.reward?.id !== before.expedition.reward.id
    && after.hero?.inventory.some((item) => item.id === before.expedition!.reward!.id)) {
    active.selectedRewardIds.push(before.expedition.reward.id)
  }

  if (!terminal) return { collector: { active }, completed: null }
  const completed: RunSummary = { ...active, ...terminal }
  return { collector: { active: null }, completed }
}

/**
 * Strict allowlist validation prevents accidental identity, save or device fields
 * from entering exported playtest data.
 */
export function isRunSummary(value: unknown): value is RunSummary {
  if (!isRecord(value) || !hasExactKeys(value, SUMMARY_KEYS)) return false
  if (value.schemaVersion !== 2) return false
  if (typeof value.runId !== 'string' || !/^[a-z0-9_-]{1,80}$/i.test(value.runId)) return false
  if (!isNonNegativeInteger(value.seed) || Number(value.seed) > 0xffffffff) return false
  if (typeof value.seedCode !== 'string' || !/^[0-9A-Z]{1,16}$/.test(value.seedCode)) return false
  if (!Number.isInteger(value.difficulty) || Number(value.difficulty) < 1 || Number(value.difficulty) > 10) return false
  if (typeof value.daily !== 'boolean') return false
  if (!isOneOf(value.biome, BIOMES) || !isOneOf(value.outcome, OUTCOMES)) return false
  if (!isNonNegativeInteger(value.actionCount)) return false
  if (!isNonNegativeInteger(value.roomsEntered) || !isNonNegativeInteger(value.roomsCleared)) return false
  if (Number(value.roomsCleared) > Number(value.roomsEntered)) return false
  if (!isNonNegativeInteger(value.combatTurns)) return false
  if (!isCounter(value.attackZones, ZONES) || !isCounter(value.blockZones, ZONES)) return false
  if (!isCounter(value.techniques, TECHNIQUES)) return false
  if (!isNonNegativeInteger(value.damageTaken) || !isNonNegativeInteger(value.healingReceived)) return false
  if (!isRecord(value.damageBySource) || Object.keys(value.damageBySource).length > 50 || !Object.entries(value.damageBySource).every(([key, amount]) => key.length > 0 && key.length <= 80 && isNonNegativeInteger(amount))) return false
  if (!isCounter(value.unblockedDamageByZone, ZONES) || !isNonNegativeInteger(value.statusDamage)) return false
  if (!Array.isArray(value.selectedRewardIds)) return false
  if (!value.selectedRewardIds.every((id) => typeof id === 'string' && /^[a-z0-9_-]{1,120}$/i.test(id))) return false
  if (value.outcome === 'death') return typeof value.deathCause === 'string' && value.deathCause.trim().length > 0 && value.deathCause.length <= 160
  return value.deathCause === null
}
