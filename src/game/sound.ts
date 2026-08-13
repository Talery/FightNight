import type { GameAction, GameState } from './types'
import type { AccessibilitySettings } from './settings'

let context: AudioContext | null = null
let music: HTMLAudioElement | null = null
let musicSource = ''
let soundSettings: Pick<AccessibilitySettings, 'effectsVolume' | 'musicVolume' | 'muted'> = { effectsVolume: 0.35, musicVolume: 0.28, muted: false }

const actionFiles: Partial<Record<GameAction['type'], string>> = {}
export type SoundCue = 'click' | 'buy' | 'sell' | 'reward' | 'perk' | 'error' | 'light-hit' | 'heavy-hit' | 'feint' | 'block' | 'critical' | 'status' | 'victory' | 'death' | 'event' | 'expedition'

const cueSynth: Record<SoundCue, { start: number; duration: number; end: number; wave: OscillatorType }> = {
  click: { start: 260, duration: 0.035, end: 340, wave: 'square' },
  buy: { start: 420, duration: 0.1, end: 690, wave: 'triangle' },
  sell: { start: 370, duration: 0.09, end: 230, wave: 'triangle' },
  reward: { start: 560, duration: 0.14, end: 880, wave: 'sine' },
  perk: { start: 680, duration: 0.16, end: 1040, wave: 'triangle' },
  error: { start: 150, duration: 0.13, end: 82, wave: 'sawtooth' },
  'light-hit': { start: 130, duration: 0.07, end: 88, wave: 'square' },
  'heavy-hit': { start: 92, duration: 0.13, end: 44, wave: 'sawtooth' },
  feint: { start: 520, duration: 0.11, end: 180, wave: 'triangle' },
  block: { start: 480, duration: 0.075, end: 210, wave: 'square' },
  critical: { start: 760, duration: 0.17, end: 1240, wave: 'sawtooth' },
  status: { start: 290, duration: 0.18, end: 150, wave: 'sine' },
  victory: { start: 440, duration: 0.24, end: 940, wave: 'triangle' },
  death: { start: 130, duration: 0.38, end: 42, wave: 'sawtooth' },
  event: { start: 320, duration: 0.09, end: 430, wave: 'triangle' },
  expedition: { start: 175, duration: 0.16, end: 250, wave: 'triangle' },
}

const actionCues: Partial<Record<GameAction['type'], SoundCue>> = {
  BUY: 'buy', HAGGLE_BUY: 'buy', SELL: 'sell', TAKE_REWARD: 'reward', CHOOSE_PERK: 'perk',
  EVENT_CHOICE: 'event', START_EXPEDITION: 'expedition', START_DAILY_EXPEDITION: 'expedition',
  NAVIGATE: 'click', SELECT_NODE: 'click', ENTER_NODE: 'click', SELECT_ATTACK: 'click', SELECT_BLOCK: 'click',
  SELECT_TECHNIQUE: 'click', SELECT_ABILITY: 'click', EQUIP: 'click', UNEQUIP: 'click', USE_ITEM: 'click',
  REST: 'click', RISKY_REST: 'click', ACCEPT_QUEST: 'click', CLAIM_QUEST: 'reward', REFRESH_SHOP: 'click',
  ROLL_QUEST: 'click', RETURN_HOME: 'click', CONTINUE_EVENT: 'click', LEAVE_REWARD: 'click', UPGRADE_ITEM: 'buy',
  REFORGE_ITEM: 'buy', DISMANTLE_ITEM: 'sell', ADD_ATTRIBUTE: 'perk', NEW_HERO: 'click', SPARE_ENEMY: 'click',
  SCOUT_INTENT: 'click', REPEAT_COMBAT_SELECTION: 'click',
}

function audioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null
  const AudioContextConstructor = window.AudioContext ?? (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
  if (!AudioContextConstructor) return null
  context ??= new AudioContextConstructor()
  return context
}

export function playSoundCue(cue: SoundCue, volume = soundSettings.effectsVolume): void {
  if (volume <= 0 || soundSettings.muted) return
  const config = cueSynth[cue]
  try {
    const audio = audioContext()
    if (!audio) return
    if (audio.state === 'suspended') void audio.resume()
    const oscillator = audio.createOscillator()
    const gain = audio.createGain()
    oscillator.type = config.wave
    oscillator.frequency.setValueAtTime(config.start, audio.currentTime)
    oscillator.frequency.exponentialRampToValueAtTime(config.end, audio.currentTime + config.duration)
    gain.gain.setValueAtTime(Math.min(0.12, volume * 0.12), audio.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + config.duration)
    oscillator.connect(gain).connect(audio.destination)
    oscillator.start()
    oscillator.stop(audio.currentTime + config.duration)
  } catch { /* Sound is an enhancement; unsupported audio must never block the game. */ }
}

export function configureSound(settings: Pick<AccessibilitySettings, 'effectsVolume' | 'musicVolume' | 'muted'>): void {
  soundSettings = { effectsVolume: Math.max(0, Math.min(1, settings.effectsVolume)), musicVolume: Math.max(0, Math.min(1, settings.musicVolume)), muted: settings.muted }
  if (music) {
    music.muted = soundSettings.muted
    music.volume = soundSettings.musicVolume
  }
}

export function loadAudioFile(source: string, volume: number, loop = false): Promise<HTMLAudioElement | null> {
  if (!source || typeof Audio === 'undefined') return Promise.resolve(null)
  return new Promise((resolve) => {
    try {
      const audio = new Audio()
      audio.preload = 'auto'
      audio.loop = loop
      audio.volume = Math.max(0, Math.min(1, volume))
      const finish = (value: HTMLAudioElement | null) => { audio.oncanplaythrough = null; audio.onerror = null; resolve(value) }
      audio.oncanplaythrough = () => finish(audio)
      audio.onerror = () => finish(null)
      audio.src = source
      audio.load()
    } catch { resolve(null) }
  })
}

async function playFileEffect(source: string, volume: number): Promise<boolean> {
  const audio = await loadAudioFile(source, volume)
  if (!audio || soundSettings.muted) return false
  try { await audio.play(); return true } catch { return false }
}

export function playActionSound(action: GameAction, volume = soundSettings.effectsVolume): void {
  const effectiveVolume = soundSettings.muted ? 0 : volume
  if (effectiveVolume <= 0) return
  const cue = actionCues[action.type]
  if (!cue) return
  const source = actionFiles[action.type]
  if (!source) { playSoundCue(cue, effectiveVolume); return }
  void playFileEffect(source, effectiveVolume).then((played) => { if (!played) playSoundCue(cue, effectiveVolume) })
}

export function playCombatResultSound(before: GameState, after: GameState, action: GameAction): void {
  if (action.type !== 'FIGHT') return
  if (after.view === 'dead' && before.view !== 'dead') { playSoundCue('death'); return }
  const previousCombat = before.expedition?.combat
  if (!previousCombat) return
  if (after.expedition?.reward && after.expedition.reward !== before.expedition?.reward) { playSoundCue('victory'); return }
  const exchange = after.expedition?.combat?.lastExchange
  if (!exchange) return
  const statusCountBefore = previousCombat.heroStatuses.length + previousCombat.enemyStatuses.length
  const statusCountAfter = (after.expedition?.combat?.heroStatuses.length ?? 0) + (after.expedition?.combat?.enemyStatuses.length ?? 0)
  if (exchange.hero.includes('КРИТ')) { playSoundCue('critical'); return }
  if (exchange.hero.includes('заблокировал') || exchange.enemy.includes('заблокировали')) { playSoundCue('block'); return }
  if (statusCountAfter > statusCountBefore || exchange.hero.includes('Эффект:')) { playSoundCue('status'); return }
  playSoundCue(previousCombat.technique === 'heavy' ? 'heavy-hit' : previousCombat.technique === 'feint' ? 'feint' : 'light-hit')
}

export async function setMusicTrack(source?: string): Promise<boolean> {
  if (!source) {
    music?.pause()
    music = null
    musicSource = ''
    return true
  }
  if (music && musicSource === source) {
    music.muted = soundSettings.muted
    music.volume = soundSettings.musicVolume
    if (!soundSettings.muted && music.paused) { try { await music.play() } catch { return false } }
    return true
  }
  const next = await loadAudioFile(source, soundSettings.musicVolume, true)
  if (!next) return false
  music?.pause()
  music = next
  musicSource = source
  music.muted = soundSettings.muted
  if (soundSettings.muted) return true
  try { await music.play(); return true } catch { return false }
}

export function unlockAudio(): void {
  try {
    const audio = audioContext()
    if (audio?.state === 'suspended') void audio.resume().catch(() => undefined)
    if (music && music.paused && !soundSettings.muted) void music.play().catch(() => undefined)
  } catch { /* Browser audio permission is optional. */ }
}
