import { createRandomSeed } from './random'
import { createRunSummaryCollector, isRunSummary, isRunSummaryCollector } from './run-summary'
import type { RunSummaryCollector } from './run-summary'
import type { FallenHero, GameState, LeaderboardEntry, RunSummary } from './types'
import { DAILY_RULESET_VERSION } from './daily-protocol'

const DB_NAME = 'ashen-ring'
const STORE = 'game'
export const SAVE_KEY = 'current-v1'
export const SAVE_BACKUP_KEY = 'current-v1-backup'
export const SAVE_VERSION = 18
export const MAX_RUN_SUMMARIES = 20
export const RUN_SUMMARIES_KEY = 'ashen-ring-run-summaries-v1'
export const RUN_SUMMARY_COLLECTOR_KEY = 'ashen-ring-run-summary-active-v1'

type LocalStoragePort = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>

type UnknownRecord = Record<string, unknown>

function isRecord(value: unknown): value is UnknownRecord {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function browserStorage(): LocalStoragePort | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage
  } catch {
    return null
  }
}

export function loadRunSummaries(storage: LocalStoragePort | null = browserStorage()): RunSummary[] {
  if (!storage) return []
  try {
    const parsed: unknown = JSON.parse(storage.getItem(RUN_SUMMARIES_KEY) ?? '[]')
    if (!Array.isArray(parsed)) return []
    return parsed.map((entry) => isRecord(entry) && entry.schemaVersion === 1 ? {
      ...entry, schemaVersion: 2, damageBySource: {}, unblockedDamageByZone: { head: 0, body: 0, legs: 0 }, statusDamage: 0,
    } : entry).filter(isRunSummary).slice(0, MAX_RUN_SUMMARIES)
  } catch {
    return []
  }
}

export function saveRunSummary(summary: RunSummary, storage: LocalStoragePort | null = browserStorage()): RunSummary[] {
  if (!storage || !isRunSummary(summary)) return loadRunSummaries(storage)
  const summaries = [structuredClone(summary), ...loadRunSummaries(storage).filter((entry) => entry.runId !== summary.runId)].slice(0, MAX_RUN_SUMMARIES)
  try { storage.setItem(RUN_SUMMARIES_KEY, JSON.stringify(summaries)) } catch { return loadRunSummaries(storage) }
  return summaries
}

export function exportRunSummaries(summaries: readonly RunSummary[] = loadRunSummaries()): string {
  const reports = summaries.filter(isRunSummary).slice(0, MAX_RUN_SUMMARIES).map((summary) => structuredClone(summary))
  return JSON.stringify({ schemaVersion: 2, kind: 'ashen-ring-run-summaries', reports }, null, 2)
}

export function loadRunSummaryCollector(storage: LocalStoragePort | null = browserStorage()): RunSummaryCollector {
  if (!storage) return createRunSummaryCollector()
  try {
    const parsed: unknown = JSON.parse(storage.getItem(RUN_SUMMARY_COLLECTOR_KEY) ?? '{"active":null}')
    return isRunSummaryCollector(parsed) ? parsed : createRunSummaryCollector()
  } catch {
    return createRunSummaryCollector()
  }
}

export function saveRunSummaryCollector(collector: RunSummaryCollector, storage: LocalStoragePort | null = browserStorage()): void {
  if (!storage || !isRunSummaryCollector(collector)) return
  try {
    if (collector.active) storage.setItem(RUN_SUMMARY_COLLECTOR_KEY, JSON.stringify(collector))
    else storage.removeItem(RUN_SUMMARY_COLLECTOR_KEY)
  } catch {
    // Metrics storage is best-effort and must never block the game save.
  }
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

function isStatus(value: unknown): boolean {
  return isRecord(value) && ['bleed', 'poison', 'burn', 'stun', 'fear', 'weaken', 'brokenArmor'].includes(String(value.kind))
    && isFiniteNumber(value.turns) && isFiniteNumber(value.potency)
}

function isEnemyIntent(value: unknown): boolean {
  return isRecord(value) && ['head', 'body', 'legs'].includes(String(value.zone)) && ['strike', 'crushingBlow', 'venomousCut', 'arcaneBurst'].includes(String(value.kind))
}

function isEnemyBehavior(value: unknown): boolean {
  return isRecord(value) && typeof value.patternId === 'string' && isFiniteNumber(value.patternStep)
    && typeof value.lastEnemyMissed === 'boolean' && typeof value.lastAttackGuarded === 'boolean'
    && Array.isArray(value.playerAttackZones) && value.playerAttackZones.every((zone) => ['head', 'body', 'legs'].includes(String(zone)))
    && isFiniteNumber(value.phase)
}

function isItem(value: unknown): boolean {
  return isRecord(value)
    && typeof value.id === 'string'
    && typeof value.name === 'string'
    && (value.type === 'equipment' || value.type === 'consumable')
    && typeof value.rarity === 'string'
    && isRecord(value.stats)
    && isFiniteNumber(value.value)
    && typeof value.description === 'string'
}

function isHero(value: unknown): boolean {
  if (!isRecord(value) || typeof value.id !== 'string' || typeof value.name !== 'string') return false
  if (!Array.isArray(value.inventory) || !value.inventory.every(isItem) || !isRecord(value.equipment) || !isRecord(value.base)) return false
  const base = value.base
  if (!isRecord(value.materials)) return false
  const materials = value.materials
  return ['strength', 'agility', 'luck', 'armor', 'maxHp'].every((stat) => isFiniteNumber(base[stat]))
    && ['level', 'xp', 'xpToNext', 'hp', 'gold', 'score', 'victories', 'deepest'].every((key) => isFiniteNumber(value[key]))
    && ['scrap', 'ember', 'essence'].every((key) => isFiniteNumber(materials[key]))
    && Array.isArray(value.perks) && Array.isArray(value.mutations) && value.mutations.every((mutation) => typeof mutation === 'string') && Array.isArray(value.nemeses) && isRecord(value.reputation)
    && isRecord(value.decisionFlags) && isRecord(value.npcRelations)
}

function isExpedition(value: unknown): boolean {
  if (!isRecord(value) || typeof value.id !== 'string' || !isFiniteNumber(value.difficulty) || !isFiniteNumber(value.current) || typeof value.seedCode !== 'string' || typeof value.daily !== 'boolean' || !['boss', 'sigils'].includes(String(value.victoryCondition)) || !isFiniteNumber(value.sigils) || !isFiniteNumber(value.sigilsRequired) || !isRecord(value.biome) || typeof value.biome.id !== 'string') return false
  if (!Array.isArray(value.nodes) || !value.nodes.every((node) => isRecord(node) && typeof node.id === 'string' && typeof node.type === 'string' && typeof node.state === 'string' && isFiniteNumber(node.depth))) return false
  if (!Array.isArray(value.modifiers)) return false
  if (value.reward !== null && !isItem(value.reward)) return false
  if (value.tutorial !== undefined && typeof value.tutorial !== 'boolean') return false
  if (value.tutorialRewards !== undefined && (!Array.isArray(value.tutorialRewards) || !value.tutorialRewards.every(isItem))) return false
  if (value.combat !== null) {
    if (!isRecord(value.combat)) return false
    const combat = value.combat
    if (!isRecord(combat.enemy) || !isFiniteNumber(combat.enemy.hp) || !isFiniteNumber(combat.enemy.maxHp) || !isFiniteNumber(combat.enemy.phase) || typeof combat.enemy.faction !== 'string' || typeof combat.enemy.archetype !== 'string' || !['slash', 'crush', 'pierce', 'mystic'].includes(String(combat.enemy.damageType)) || !Array.isArray(combat.heroStatuses) || !combat.heroStatuses.every(isStatus) || !Array.isArray(combat.enemyStatuses) || !combat.enemyStatuses.every(isStatus) || !isRecord(combat.abilityCooldowns) || !['strike', 'crushingBlow', 'venomousCut', 'arcaneBurst'].includes(String(combat.enemyIntentKind)) || typeof combat.scouting !== 'boolean' || !isEnemyBehavior(combat.enemyBehavior) || !Array.isArray(combat.enemyIntentHistory) || !combat.enemyIntentHistory.every(isEnemyIntent) || combat.enemyIntentHistory.length > 3) return false
    const cooldowns = combat.abilityCooldowns
    if (!['bloodletter', 'guardBreak', 'secondWind'].every((key) => isFiniteNumber(cooldowns[key]))) return false
  }
  if (value.event !== null) {
    if (!isRecord(value.event) || typeof value.event.title !== 'string' || !Array.isArray(value.event.choices)) return false
  }
  return true
}

function isQuest(value: unknown): boolean {
  return isRecord(value) && typeof value.id === 'string' && typeof value.name === 'string' && isFiniteNumber(value.goal) && isFiniteNumber(value.progress)
}

function isFallen(value: unknown): boolean {
  return isRecord(value) && typeof value.id === 'string' && typeof value.name === 'string' && isFiniteNumber(value.score) && isFiniteNumber(value.level) && (value.cause === undefined || typeof value.cause === 'string') && (value.perks === undefined || Array.isArray(value.perks)) && (value.mutations === undefined || Array.isArray(value.mutations)) && (value.epitaph === undefined || typeof value.epitaph === 'string')
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1)
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE)) request.result.createObjectStore(STORE)
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

function migrateV1ToV2(saved: UnknownRecord): UnknownRecord {
  const wasExpedition = saved.view === 'expedition'
  return {
    ...saved,
    version: 2,
    view: wasExpedition ? 'hub' : saved.view,
    expedition: null,
    notice: wasExpedition ? 'Старый линейный поход завершён: теперь дороги ветвятся. Герой и добыча сохранены.' : saved.notice,
  }
}

function migrateV2ToV3(saved: UnknownRecord): UnknownRecord {
  return {
    ...saved,
    version: 3,
    seed: typeof saved.seed === 'number' && Number.isFinite(saved.seed) ? saved.seed >>> 0 : createRandomSeed(),
    actionSequence: typeof saved.actionSequence === 'number' && Number.isSafeInteger(saved.actionSequence) ? Math.max(0, saved.actionSequence) : 0,
    expedition: saved.expedition ?? null,
    quest: saved.quest ?? null,
    questOffer: saved.questOffer ?? null,
    shop: Array.isArray(saved.shop) ? saved.shop : [],
    logs: Array.isArray(saved.logs) ? saved.logs : [],
    fallen: Array.isArray(saved.fallen) ? saved.fallen : [],
    leaderboard: Array.isArray(saved.leaderboard) ? saved.leaderboard : [],
    perkChoices: Array.isArray(saved.perkChoices) ? saved.perkChoices : [],
    notice: typeof saved.notice === 'string' ? saved.notice : null,
  }
}

function migrateV3ToV4(saved: UnknownRecord): UnknownRecord {
  const expedition = isRecord(saved.expedition) ? { ...saved.expedition } : saved.expedition
  if (isRecord(expedition) && isRecord(expedition.combat)) {
    const combat = { ...expedition.combat }
    combat.heroStatuses = Array.isArray(combat.heroStatuses) ? combat.heroStatuses : []
    combat.enemyStatuses = Array.isArray(combat.enemyStatuses) ? combat.enemyStatuses : []
    if (isRecord(combat.enemy) && !['slash', 'crush', 'pierce', 'mystic'].includes(String(combat.enemy.damageType))) combat.enemy = { ...combat.enemy, damageType: 'slash' }
    expedition.combat = combat
  }
  return { ...saved, version: 4, expedition }
}

function migrateV4ToV5(saved: UnknownRecord): UnknownRecord {
  const expedition = isRecord(saved.expedition) ? { ...saved.expedition } : saved.expedition
  if (isRecord(expedition) && isRecord(expedition.combat)) {
    const combat = { ...expedition.combat }
    combat.selectedAbility = null
    combat.abilityCooldowns = isRecord(combat.abilityCooldowns) ? combat.abilityCooldowns : { bloodletter: 0, guardBreak: 0, secondWind: 0 }
    combat.enemyIntentKind = ['strike', 'crushingBlow', 'venomousCut', 'arcaneBurst'].includes(String(combat.enemyIntentKind)) ? combat.enemyIntentKind : 'strike'
    if (isRecord(combat.enemy) && !isFiniteNumber(combat.enemy.phase)) combat.enemy = { ...combat.enemy, phase: 1 }
    expedition.combat = combat
  }
  return { ...saved, version: 5, expedition }
}

function migrateV5ToV6(saved: UnknownRecord): UnknownRecord {
  const expedition = isRecord(saved.expedition) ? { ...saved.expedition } : saved.expedition
  if (isRecord(expedition) && isRecord(expedition.combat) && isRecord(expedition.combat.enemy) && !isFiniteNumber(expedition.combat.enemy.phase)) {
    expedition.combat = { ...expedition.combat, enemy: { ...expedition.combat.enemy, phase: 1 } }
  }
  return { ...saved, version: 6, expedition }
}

function migrateV6ToV7(saved: UnknownRecord): UnknownRecord {
  const hero = isRecord(saved.hero) ? { ...saved.hero } : saved.hero
  if (isRecord(hero) && !isRecord(hero.materials)) hero.materials = { scrap: 0, ember: 0, essence: 0 }
  return { ...saved, version: 7, hero }
}

function migrateV7ToV8(saved: UnknownRecord): UnknownRecord {
  const hero = isRecord(saved.hero) ? { ...saved.hero } : saved.hero
  if (isRecord(hero) && !Array.isArray(hero.mutations)) hero.mutations = []
  return { ...saved, version: 8, hero }
}

function migrateV8ToV9(saved: UnknownRecord): UnknownRecord {
  const expedition = isRecord(saved.expedition) ? { ...saved.expedition } : saved.expedition
  if (isRecord(expedition)) {
    if (!isRecord(expedition.biome)) expedition.biome = { id: 'catacombs', name: 'Катакомбы', description: 'Старый поход до эпохи биомов.', enemyHpMultiplier: 1, enemyPowerMultiplier: 1, healingMultiplier: 1 }
    if (typeof expedition.seedCode !== 'string') expedition.seedCode = String(saved.seed ?? 'LEGACY')
    if (typeof expedition.daily !== 'boolean') expedition.daily = false
  }
  return { ...saved, version: 9, expedition }
}

function migrateV9ToV10(saved: UnknownRecord): UnknownRecord {
  const expedition = isRecord(saved.expedition) ? { ...saved.expedition } : saved.expedition
  if (isRecord(expedition)) {
    if (!['boss', 'sigils'].includes(String(expedition.victoryCondition))) expedition.victoryCondition = 'boss'
    if (!isFiniteNumber(expedition.sigils)) expedition.sigils = 0
    if (!isFiniteNumber(expedition.sigilsRequired)) expedition.sigilsRequired = expedition.victoryCondition === 'sigils' ? 2 : 0
  }
  return { ...saved, version: 10, expedition }
}

function migrateV10ToV11(saved: UnknownRecord): UnknownRecord {
  const expedition = isRecord(saved.expedition) ? { ...saved.expedition } : saved.expedition
  if (isRecord(expedition) && isRecord(expedition.combat) && isRecord(expedition.combat.enemy)) {
    const enemy = expedition.combat.enemy
    expedition.combat = { ...expedition.combat, enemy: { ...enemy, faction: typeof enemy.faction === 'string' ? enemy.faction : 'Безродные', archetype: typeof enemy.archetype === 'string' ? enemy.archetype : 'Боец' } }
  }
  return { ...saved, version: 11, expedition }
}

function migrateV11ToV12(saved: UnknownRecord): UnknownRecord {
  const hero = isRecord(saved.hero) ? { ...saved.hero } : saved.hero
  if (isRecord(hero) && !Array.isArray(hero.nemeses)) hero.nemeses = []
  return { ...saved, version: 12, hero }
}

function migrateV12ToV13(saved: UnknownRecord): UnknownRecord {
  const hero = isRecord(saved.hero) ? { ...saved.hero } : saved.hero
  if (isRecord(hero) && !isRecord(hero.reputation)) hero.reputation = {}
  return { ...saved, version: 13, hero }
}

function migrateV13ToV14(saved: UnknownRecord): UnknownRecord {
  const fallen = Array.isArray(saved.fallen) ? saved.fallen.map((entry) => isRecord(entry) ? { ...entry, cause: typeof entry.cause === 'string' ? entry.cause : 'причина затерялась во времени', perks: Array.isArray(entry.perks) ? entry.perks : [], mutations: Array.isArray(entry.mutations) ? entry.mutations : [], epitaph: typeof entry.epitaph === 'string' ? entry.epitaph : 'Пепел помнит имя.' } : entry) : saved.fallen
  const leaderboard = Array.isArray(saved.leaderboard) ? saved.leaderboard.map((entry) => isRecord(entry) ? { ...entry, cause: typeof entry.cause === 'string' ? entry.cause : 'неизвестно', perks: Array.isArray(entry.perks) ? entry.perks : [], mutations: Array.isArray(entry.mutations) ? entry.mutations : [], epitaph: typeof entry.epitaph === 'string' ? entry.epitaph : 'Пепел помнит имя.' } : entry) : saved.leaderboard
  return { ...saved, version: 14, fallen, leaderboard }
}

function migrateV14ToV15(saved: UnknownRecord): UnknownRecord {
  return { ...saved, version: 15, dailyReturnHero: null }
}

function migrateV15ToV16(saved: UnknownRecord): UnknownRecord {
  const expedition = isRecord(saved.expedition) ? { ...saved.expedition } : saved.expedition
  if (isRecord(expedition) && isRecord(expedition.combat)) {
    const combat = { ...expedition.combat }
    const enemy = isRecord(combat.enemy) ? combat.enemy : null
    combat.enemyBehavior = {
      patternId: 'legacy-pattern', patternStep: 0, lastEnemyMissed: false, lastAttackGuarded: false,
      playerAttackZones: [], phase: enemy && isFiniteNumber(enemy.phase) ? enemy.phase : 1,
    }
    combat.enemyIntentHistory = []
    combat.scouting = false
    expedition.combat = combat
  }
  return { ...saved, version: 16, expedition }
}

function migrateV16ToV17(saved: UnknownRecord): UnknownRecord {
  return { ...saved, version: 17, tutorial: { completed: false, skipped: false, interactionMade: false } }
}

function migrateV17ToV18(saved: UnknownRecord): UnknownRecord {
  const hero = isRecord(saved.hero) ? { ...saved.hero, decisionFlags: {}, npcRelations: {} } : saved.hero
  const dailyReturnHero = isRecord(saved.dailyReturnHero) ? { ...saved.dailyReturnHero, decisionFlags: {}, npcRelations: {} } : saved.dailyReturnHero
  return { ...saved, version: 18, hero, dailyReturnHero }
}

function normalizeGameState(saved: UnknownRecord): GameState | null {
  if (saved.version !== SAVE_VERSION) return null
  if (typeof saved.seed !== 'number' || !Number.isFinite(saved.seed)) return null
  if (typeof saved.actionSequence !== 'number' || !Number.isSafeInteger(saved.actionSequence) || saved.actionSequence < 0) return null
  const views = new Set(['welcome', 'hub', 'tavern', 'shop', 'talents', 'expedition', 'dead', 'hall'])
  if (typeof saved.view !== 'string' || !views.has(saved.view)) return null
  if (!Array.isArray(saved.shop) || !saved.shop.every(isItem)) return null
  if (!Array.isArray(saved.logs) || !saved.logs.every((entry) => isRecord(entry) && typeof entry.id === 'string' && typeof entry.text === 'string')) return null
  if (!Array.isArray(saved.fallen) || !saved.fallen.every(isFallen)) return null
  if (!Array.isArray(saved.leaderboard) || !saved.leaderboard.every(isFallen)) return null
  if (!Array.isArray(saved.perkChoices) || !saved.perkChoices.every((entry) => typeof entry === 'string')) return null
  if (saved.hero !== null && !isHero(saved.hero)) return null
  if (saved.dailyReturnHero !== null && !isHero(saved.dailyReturnHero)) return null
  if (saved.expedition !== null && !isExpedition(saved.expedition)) return null
  if (saved.quest !== null && !isQuest(saved.quest)) return null
  if (saved.questOffer !== null && !isQuest(saved.questOffer)) return null
  if (saved.notice !== null && typeof saved.notice !== 'string') return null
  if (!isRecord(saved.tutorial) || typeof saved.tutorial.completed !== 'boolean' || typeof saved.tutorial.skipped !== 'boolean' || typeof saved.tutorial.interactionMade !== 'boolean') return null
  if (saved.view !== 'welcome' && saved.hero === null) return null
  if (saved.view === 'expedition' && saved.expedition === null) return null
  const state = saved as unknown as GameState
  if (state.hero && state.fallen.some((fallen) => fallen.id === state.hero!.id)) {
    state.expedition = null
    if (state.view !== 'hall') state.view = 'dead'
  }
  return state
}

export function migrateGame(raw: unknown): GameState | null {
  if (!isRecord(raw)) return null
  let saved: UnknownRecord = structuredClone(raw)
  let version = Number(saved.version)
  if (version === 1) {
    saved = migrateV1ToV2(saved)
    version = 2
  }
  if (version === 2) {
    saved = migrateV2ToV3(saved)
    version = 3
  }
  if (version === 3) {
    saved = migrateV3ToV4(saved)
    version = 4
  }
  if (version === 4) {
    saved = migrateV4ToV5(saved)
    version = 5
  }
  if (version === 5) {
    saved = migrateV5ToV6(saved)
    version = 6
  }
  if (version === 6) {
    saved = migrateV6ToV7(saved)
    version = 7
  }
  if (version === 7) {
    saved = migrateV7ToV8(saved)
    version = 8
  }
  if (version === 8) {
    saved = migrateV8ToV9(saved)
    version = 9
  }
  if (version === 9) {
    saved = migrateV9ToV10(saved)
    version = 10
  }
  if (version === 10) {
    saved = migrateV10ToV11(saved)
    version = 11
  }
  if (version === 11) {
    saved = migrateV11ToV12(saved)
    version = 12
  }
  if (version === 12) {
    saved = migrateV12ToV13(saved)
    version = 13
  }
  if (version === 13) {
    saved = migrateV13ToV14(saved)
    version = 14
  }
  if (version === 14) {
    saved = migrateV14ToV15(saved)
    version = 15
  }
  if (version === 15) {
    saved = migrateV15ToV16(saved)
    version = 16
  }
  if (version === 16) {
    saved = migrateV16ToV17(saved)
    version = 17
  }
  if (version === 17) {
    saved = migrateV17ToV18(saved)
    version = 18
  }
  if (version !== SAVE_VERSION) return null
  return normalizeGameState(saved)
}

export interface SaveRecoveryResult {
  state: GameState | null
  recovered: boolean
}

export function recoverGame(primary: unknown, backup: unknown): SaveRecoveryResult {
  const current = migrateGame(primary)
  if (current) return { state: current, recovered: false }
  const recovered = migrateGame(backup)
  if (!recovered) return { state: null, recovered: false }
  return {
    state: {
      ...recovered,
      notice: 'Основное сохранение было повреждено. Игра восстановлена из резервной копии.',
    },
    recovered: true,
  }
}

function readDbValue(db: IDBDatabase, key: string): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE, 'readonly')
    const request = transaction.objectStore(STORE).get(key)
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

function safeLocalValue(key: string): unknown {
  try {
    const value = localStorage.getItem(key)
    return value ? JSON.parse(value) : null
  } catch {
    return null
  }
}

export async function loadGame(): Promise<GameState | null> {
  let primary: unknown = null
  let backup: unknown = null
  try {
    const db = await openDb()
    ;[primary, backup] = await Promise.all([readDbValue(db, SAVE_KEY), readDbValue(db, SAVE_BACKUP_KEY)])
  } catch {
    primary = safeLocalValue(SAVE_KEY)
    backup = safeLocalValue(SAVE_BACKUP_KEY)
  }

  let result = recoverGame(primary, backup)
  if (!result.state && typeof localStorage !== 'undefined') {
    result = recoverGame(safeLocalValue(SAVE_KEY), safeLocalValue(SAVE_BACKUP_KEY))
  }
  if (result.recovered && result.state) void saveGame(result.state)
  return result.state
}

export async function saveGame(state: GameState): Promise<void> {
  if (!normalizeGameState(state as unknown as UnknownRecord)) throw new Error('Refusing to persist an invalid game state')
  try {
    const db = await openDb()
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction(STORE, 'readwrite')
      const store = transaction.objectStore(STORE)
      store.put(state, SAVE_KEY)
      store.put(state, SAVE_BACKUP_KEY)
      transaction.oncomplete = () => resolve()
      transaction.onerror = () => reject(transaction.error)
    })
  } catch {
    localStorage.setItem(SAVE_KEY, JSON.stringify(state))
    localStorage.setItem(SAVE_BACKUP_KEY, JSON.stringify(state))
  }
}

function checksum(value: string): string {
  let hash = 0x811c9dc5
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index)
    hash = Math.imul(hash, 0x01000193)
  }
  return (hash >>> 0).toString(16).padStart(8, '0')
}

export function exportGame(state: GameState): string {
  const payload = JSON.stringify(state)
  return JSON.stringify({ format: 'ashen-ring-save', formatVersion: 1, checksum: checksum(payload), state }, null, 2)
}

export function importGame(source: string): GameState {
  let parsed: unknown
  try {
    parsed = JSON.parse(source)
  } catch {
    throw new Error('Файл сохранения не является корректным JSON.')
  }
  let rawState = parsed
  if (isRecord(parsed) && parsed.format === 'ashen-ring-save') {
    if (parsed.formatVersion !== 1 || !('state' in parsed)) throw new Error('Версия файла экспорта не поддерживается.')
    const payload = JSON.stringify(parsed.state)
    if (typeof parsed.checksum !== 'string' || checksum(payload) !== parsed.checksum) throw new Error('Контрольная сумма не совпала: файл повреждён.')
    rawState = parsed.state
  }
  const migrated = migrateGame(rawState)
  if (!migrated) throw new Error('Сохранение повреждено или создано несовместимой версией игры.')
  return migrated
}

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined
const DEVICE_ID_KEY = 'ashen-ring-device-id'
const SYNC_QUEUE_KEY = 'ashen-ring-leaderboard-queue'
const memoryStorage = new Map<string, string>()

function clientStorage(): Pick<Storage, 'getItem' | 'setItem' | 'removeItem'> {
  if (typeof localStorage !== 'undefined') return localStorage
  return {
    getItem: (key) => memoryStorage.get(key) ?? null,
    setItem: (key, value) => { memoryStorage.set(key, value) },
    removeItem: (key) => { memoryStorage.delete(key) },
  }
}

function headers() {
  return {
    apikey: supabaseKey ?? '',
    Authorization: `Bearer ${supabaseKey ?? ''}`,
    'Content-Type': 'application/json',
  }
}

export function onlineLeaderboardEnabled(): boolean {
  return Boolean(supabaseUrl && supabaseKey)
}

export function anonymousPlayerId(): string {
  const storage = clientStorage()
  const existing = storage.getItem(DEVICE_ID_KEY)
  if (existing) return existing
  const value = `player-${createRandomSeed().toString(36)}-${Date.now().toString(36)}`
  storage.setItem(DEVICE_ID_KEY, value)
  return value
}

function readSyncQueue(): FallenHero[] {
  try { const saved = JSON.parse(clientStorage().getItem(SYNC_QUEUE_KEY) ?? '[]'); return Array.isArray(saved) ? saved.filter(isFallen) as FallenHero[] : [] } catch { return [] }
}

function writeSyncQueue(entries: FallenHero[]): void {
  clientStorage().setItem(SYNC_QUEUE_KEY, JSON.stringify(entries.slice(-50)))
}

export function pendingLeaderboardSyncCount(): number {
  return readSyncQueue().length
}

export async function fetchLeaderboard(local: FallenHero[]): Promise<LeaderboardEntry[]> {
  const localEntries: LeaderboardEntry[] = local.map((entry) => ({ ...entry, isLocal: true }))
  if (!onlineLeaderboardEnabled()) return localEntries.sort((a, b) => b.score - a.score).slice(0, 25)
  try {
    const response = await fetch(`${supabaseUrl}/rest/v1/leaderboard?select=id,name,epithet,level,score,victories,died_at&order=score.desc&limit=25`, { headers: headers() })
    if (!response.ok) throw new Error('leaderboard unavailable')
    const data = await response.json() as Array<Record<string, string | number>>
    return data.map((row, index) => ({
      id: String(row.id), name: String(row.name), epithet: String(row.epithet), level: Number(row.level),
      score: Number(row.score), victories: Number(row.victories), diedAt: new Date(String(row.died_at)).getTime(), cause: 'неизвестно', perks: [], mutations: [], epitaph: 'Запись из общего зала.',
      rank: index + 1,
    }))
  } catch {
    return localEntries.sort((a, b) => b.score - a.score).slice(0, 25)
  }
}

async function postFallenHero(hero: FallenHero): Promise<boolean> {
  if (!onlineLeaderboardEnabled()) return false
  try {
    const response = await fetch(`${supabaseUrl}/rest/v1/leaderboard`, {
      method: 'POST', headers: { ...headers(), Prefer: 'resolution=merge-duplicates' },
      body: JSON.stringify({
        id: hero.id, name: hero.name, epithet: hero.epithet, level: hero.level,
        score: hero.score, victories: hero.victories, died_at: new Date(hero.diedAt).toISOString(), player_id: anonymousPlayerId(),
        verification_state: 'unverified', balance_version: DAILY_RULESET_VERSION,
      }),
    })
    return response.ok
  } catch {
    return false
  }
}

export async function submitFallenHero(hero: FallenHero): Promise<void> {
  if (!(await postFallenHero(hero))) {
    const queued = readSyncQueue()
    if (!queued.some((entry) => entry.id === hero.id)) writeSyncQueue([...queued, hero])
  }
}

export async function flushLeaderboardQueue(): Promise<void> {
  const queued = readSyncQueue()
  if (!queued.length || !onlineLeaderboardEnabled()) return
  const remaining: FallenHero[] = []
  for (const hero of queued) if (!(await postFallenHero(hero))) remaining.push(hero)
  writeSyncQueue(remaining)
}
