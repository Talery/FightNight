import type { FallenHero, GameState, LeaderboardEntry } from './types'

const DB_NAME = 'ashen-ring'
const STORE = 'game'
const SAVE_KEY = 'current-v1'

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

function migrateGame(raw: unknown): GameState | null {
  if (!raw || typeof raw !== 'object') return null
  const saved = raw as GameState & { version: number }
  if (saved.version === 2) return saved
  if (saved.version === 1) {
    return {
      ...saved,
      version: 2,
      view: saved.view === 'expedition' ? 'hub' : saved.view,
      expedition: null,
      notice: saved.view === 'expedition' ? 'Старый линейный поход завершён: теперь дороги ветвятся. Герой и добыча сохранены.' : saved.notice,
    } as GameState
  }
  return null
}

export async function loadGame(): Promise<GameState | null> {
  try {
    const db = await openDb()
    return await new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE, 'readonly')
      const request = transaction.objectStore(STORE).get(SAVE_KEY)
      request.onsuccess = () => resolve(migrateGame(request.result))
      request.onerror = () => reject(request.error)
    })
  } catch {
    const fallback = localStorage.getItem(SAVE_KEY)
    return fallback ? migrateGame(JSON.parse(fallback)) : null
  }
}

export async function saveGame(state: GameState) {
  try {
    const db = await openDb()
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction(STORE, 'readwrite')
      transaction.objectStore(STORE).put(state, SAVE_KEY)
      transaction.oncomplete = () => resolve()
      transaction.onerror = () => reject(transaction.error)
    })
  } catch {
    localStorage.setItem(SAVE_KEY, JSON.stringify(state))
  }
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

export function onlineLeaderboardEnabled() {
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

export async function submitFallenHero(hero: FallenHero) {
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
    // Offline-first: the next visit keeps the result locally even when sync fails.
  }
}
