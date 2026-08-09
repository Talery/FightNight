import { createRandomSeed } from './random'
import type { FallenHero, GameState, LeaderboardEntry } from './types'

const DB_NAME = 'ashen-ring'
const STORE = 'game'
export const SAVE_KEY = 'current-v1'
export const SAVE_BACKUP_KEY = 'current-v1-backup'
export const SAVE_VERSION = 3

type UnknownRecord = Record<string, unknown>

function isRecord(value: unknown): value is UnknownRecord {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
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
  return ['strength', 'agility', 'luck', 'armor', 'maxHp'].every((stat) => isFiniteNumber(base[stat]))
    && ['level', 'xp', 'xpToNext', 'hp', 'gold', 'score', 'victories', 'deepest'].every((key) => isFiniteNumber(value[key]))
    && Array.isArray(value.perks)
}

function isExpedition(value: unknown): boolean {
  if (!isRecord(value) || typeof value.id !== 'string' || !isFiniteNumber(value.difficulty) || !isFiniteNumber(value.current)) return false
  if (!Array.isArray(value.nodes) || !value.nodes.every((node) => isRecord(node) && typeof node.id === 'string' && typeof node.type === 'string' && typeof node.state === 'string' && isFiniteNumber(node.depth))) return false
  if (!Array.isArray(value.modifiers)) return false
  if (value.reward !== null && !isItem(value.reward)) return false
  if (value.combat !== null) {
    if (!isRecord(value.combat) || !isRecord(value.combat.enemy) || !isFiniteNumber(value.combat.enemy.hp) || !isFiniteNumber(value.combat.enemy.maxHp)) return false
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
  return isRecord(value) && typeof value.id === 'string' && typeof value.name === 'string' && isFiniteNumber(value.score) && isFiniteNumber(value.level)
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

function normalizeGameState(saved: UnknownRecord): GameState | null {
  if (saved.version !== SAVE_VERSION) return null
  if (typeof saved.seed !== 'number' || !Number.isFinite(saved.seed)) return null
  if (typeof saved.actionSequence !== 'number' || !Number.isSafeInteger(saved.actionSequence) || saved.actionSequence < 0) return null
  const views = new Set(['welcome', 'hub', 'tavern', 'shop', 'expedition', 'dead', 'hall'])
  if (typeof saved.view !== 'string' || !views.has(saved.view)) return null
  if (!Array.isArray(saved.shop) || !saved.shop.every(isItem)) return null
  if (!Array.isArray(saved.logs) || !saved.logs.every((entry) => isRecord(entry) && typeof entry.id === 'string' && typeof entry.text === 'string')) return null
  if (!Array.isArray(saved.fallen) || !saved.fallen.every(isFallen)) return null
  if (!Array.isArray(saved.leaderboard) || !saved.leaderboard.every(isFallen)) return null
  if (!Array.isArray(saved.perkChoices) || !saved.perkChoices.every((entry) => typeof entry === 'string')) return null
  if (saved.hero !== null && !isHero(saved.hero)) return null
  if (saved.expedition !== null && !isExpedition(saved.expedition)) return null
  if (saved.quest !== null && !isQuest(saved.quest)) return null
  if (saved.questOffer !== null && !isQuest(saved.questOffer)) return null
  if (saved.notice !== null && typeof saved.notice !== 'string') return null
  if (saved.view !== 'welcome' && saved.hero === null) return null
  if (saved.view === 'expedition' && saved.expedition === null) return null
  return saved as unknown as GameState
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

export async function fetchLeaderboard(local: FallenHero[]): Promise<LeaderboardEntry[]> {
  const localEntries: LeaderboardEntry[] = local.map((entry) => ({ ...entry, isLocal: true }))
  if (!onlineLeaderboardEnabled()) return localEntries.sort((a, b) => b.score - a.score).slice(0, 25)
  try {
    const response = await fetch(`${supabaseUrl}/rest/v1/leaderboard?select=id,name,epithet,level,score,victories,died_at&order=score.desc&limit=25`, { headers: headers() })
    if (!response.ok) throw new Error('leaderboard unavailable')
    const data = await response.json() as Array<Record<string, string | number>>
    return data.map((row, index) => ({
      id: String(row.id), name: String(row.name), epithet: String(row.epithet), level: Number(row.level),
      score: Number(row.score), victories: Number(row.victories), diedAt: new Date(String(row.died_at)).getTime(),
      rank: index + 1,
    }))
  } catch {
    return localEntries.sort((a, b) => b.score - a.score).slice(0, 25)
  }
}

export async function submitFallenHero(hero: FallenHero): Promise<void> {
  if (!onlineLeaderboardEnabled()) return
  try {
    await fetch(`${supabaseUrl}/rest/v1/leaderboard`, {
      method: 'POST', headers: { ...headers(), Prefer: 'resolution=merge-duplicates' },
      body: JSON.stringify({
        id: hero.id, name: hero.name, epithet: hero.epithet, level: hero.level,
        score: hero.score, victories: hero.victories, died_at: new Date(hero.diedAt).toISOString(),
      }),
    })
  } catch {
    // Offline-first: the result remains local when synchronization fails.
  }
}
