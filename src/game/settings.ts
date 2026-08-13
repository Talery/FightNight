export type TextScale = 'normal' | 'large' | 'xlarge'
export type ContrastMode = 'default' | 'high'
export type UiTheme = 'ashen' | 'win95'

export type AccessibilitySettings = {
  textScale: TextScale
  contrast: ContrastMode
  theme: UiTheme
  reducedMotion: boolean
  effectsVolume: number
  musicVolume: number
  muted: boolean
}

const SETTINGS_KEY = 'ashen-ring-accessibility'
const defaults: AccessibilitySettings = { textScale: 'normal', contrast: 'default', theme: 'ashen', reducedMotion: false, effectsVolume: 0.35, musicVolume: 0.28, muted: false }

function volume(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : fallback
}

export function loadAccessibilitySettings(): AccessibilitySettings {
  try {
    const raw = typeof localStorage === 'undefined' ? null : localStorage.getItem(SETTINGS_KEY)
    if (!raw) return defaults
    const value = JSON.parse(raw) as Partial<AccessibilitySettings>
    return {
      textScale: value.textScale === 'large' || value.textScale === 'xlarge' ? value.textScale : 'normal',
      contrast: value.contrast === 'high' ? 'high' : 'default',
      theme: value.theme === 'win95' ? 'win95' : 'ashen',
      reducedMotion: Boolean(value.reducedMotion),
      effectsVolume: volume(value.effectsVolume, defaults.effectsVolume),
      musicVolume: volume(value.musicVolume, defaults.musicVolume),
      muted: Boolean(value.muted),
    }
  } catch { return defaults }
}

export function applyAccessibilitySettings(settings: AccessibilitySettings): void {
  const root = document.documentElement
  root.dataset.textScale = settings.textScale
  root.dataset.contrast = settings.contrast
  root.dataset.theme = settings.theme
  root.dataset.reducedMotion = String(settings.reducedMotion)
  try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings)) } catch { /* Private mode still gets the current-session setting. */ }
}
