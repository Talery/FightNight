import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react'
import { gameReducer, initialState } from './game/engine'
import { anonymousPlayerId, fetchLeaderboard, flushLeaderboardQueue, loadGame, loadRunSummaryCollector, onlineLeaderboardEnabled, saveGame, saveRunSummary, saveRunSummaryCollector, submitFallenHero } from './game/storage'
import { flushDailySubmissionQueue, recordDailyTransition } from './game/daily-sync'
import type { EquipSlot, GameAction, GameState, Item, View } from './game/types'
import { collectRunSummary, createRunSummaryCollector } from './game/run-summary'
import { HeroSidebar } from './components/game/HeroSidebar'
import { ConsumableConfirmModal, DeathScreen, Notice, PerkModal } from './components/game/Overlays'
import { InventoryModal, RightSidebar } from './components/game/RightSidebar'
import { LoadingScreen, MobileNav, TopBar, WelcomeScreen } from './components/game/Shell'
import { applyAccessibilitySettings, loadAccessibilitySettings, type AccessibilitySettings } from './game/settings'
import { configureSound, playActionSound, playCombatResultSound, playSoundCue, setMusicTrack, unlockAudio } from './game/sound'
import { assetRegistry } from './assets/registry'

const ExpeditionScreen = lazy(() => import('./screens/ExpeditionScreen').then((module) => ({ default: module.ExpeditionScreen })))
const HomeScreens = lazy(() => import('./screens/HomeScreens').then((module) => ({ default: function HomeRoute({ view, ...props }: { view: 'hub' | 'tavern' | 'shop' | 'hall'; state: GameState; dispatch: (action: GameAction) => void; onHall: () => void; accessibility: AccessibilitySettings; onAccessibilityChange: (settings: AccessibilitySettings) => void }) {
  if (view === 'hub') return <module.HubScreen {...props} />
  if (view === 'tavern') return <module.TavernScreen state={props.state} dispatch={props.dispatch} />
  if (view === 'shop') return <module.ShopScreen state={props.state} dispatch={props.dispatch} />
  return <module.HallScreen state={props.state} dispatch={props.dispatch} />
} })))
const TalentScreen = lazy(() => import('./screens/TalentScreen').then((module) => ({ default: module.TalentScreen })))

function App() {
  const [state, setState] = useState<GameState>(initialState)
  const [ready, setReady] = useState(false)
  const [accessibility, setAccessibility] = useState<AccessibilitySettings>(loadAccessibilitySettings)
  const [inventorySlot, setInventorySlot] = useState<EquipSlot | 'all' | null>(null)
  const [pendingConsumable, setPendingConsumable] = useState<Item | null>(null)
  const stateRef = useRef<GameState>(initialState)
  const runCollector = useRef(loadRunSummaryCollector())
  const previousFallen = useRef(0)
  const previousNotice = useRef<string | null>(null)
  const dispatch = useCallback((action: GameAction) => {
    unlockAudio()
    playActionSound(action)
    const before = stateRef.current
    const next = gameReducer(before, action)
    const collection = collectRunSummary(runCollector.current, before, action, next)
    runCollector.current = collection.collector
    saveRunSummaryCollector(collection.collector)
    if (collection.completed) saveRunSummary(collection.completed)
    stateRef.current = next
    void recordDailyTransition(before, action, next, anonymousPlayerId()).then((submission) => { if (submission) void flushDailySubmissionQueue() })
    playCombatResultSound(before, next, action)
    setState(next)
  }, [])

  useEffect(() => {
    loadGame().then((saved) => {
      if (saved) {
        stateRef.current = saved
        setState(saved)
        previousFallen.current = saved.fallen.length
        if (runCollector.current.active?.runId !== saved.expedition?.id) {
          runCollector.current = createRunSummaryCollector()
          saveRunSummaryCollector(runCollector.current)
        }
      } else if (runCollector.current.active) {
        runCollector.current = createRunSummaryCollector()
        saveRunSummaryCollector(runCollector.current)
      }
      setReady(true)
    })
  }, [])

  useEffect(() => {
    if (!ready) return
    void saveGame(state)
    if (state.fallen.length > previousFallen.current) {
      void submitFallenHero(state.fallen[0])
      previousFallen.current = state.fallen.length
    }
  }, [ready, state])

  useEffect(() => {
    const sync = () => { void flushLeaderboardQueue(); void flushDailySubmissionQueue() }
    sync()
    window.addEventListener('online', sync)
    return () => window.removeEventListener('online', sync)
  }, [])

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' })
  }, [state.view, state.expedition?.id])

  useEffect(() => { applyAccessibilitySettings(accessibility); configureSound(accessibility) }, [accessibility])

  useEffect(() => {
    if (state.notice && state.notice !== previousNotice.current) playSoundCue('error')
    previousNotice.current = state.notice
  }, [state.notice])

  useEffect(() => {
    const homeViews: View[] = ['hub', 'tavern', 'shop', 'talents', 'hall']
    const inBossFight = Boolean(state.expedition?.combat?.enemy.boss)
    const track = state.hero && homeViews.includes(state.view)
      ? assetRegistry.audio.music.city
      : state.view === 'expedition'
        ? inBossFight ? assetRegistry.audio.music.boss : assetRegistry.audio.music.expedition
        : undefined
    void setMusicTrack(track)
  }, [state.hero, state.view, state.expedition?.combat?.enemy.boss])

  const openHall = useCallback(async () => {
    dispatch({ type: 'NAVIGATE', view: 'hall' })
    const entries = await fetchLeaderboard(state.fallen)
    dispatch({ type: 'LOAD_LEADERBOARD', entries })
  }, [dispatch, state.fallen])

  const navigate = useCallback((view: View) => dispatch({ type: 'NAVIGATE', view }), [dispatch])

  if (!ready) return <LoadingScreen />
  if (state.view === 'welcome' || !state.hero) return <WelcomeScreen onStart={() => { dispatch({ type: 'NEW_HERO' }); dispatch({ type: 'START_TUTORIAL' }) }} />
  if (state.view === 'dead') return <DeathScreen state={state} dispatch={dispatch} onHall={openHall} />

  return (
    <div className="game-shell">
      <TopBar hero={state.hero} online={onlineLeaderboardEnabled()} theme={accessibility.theme} onThemeToggle={() => setAccessibility((value) => ({ ...value, theme: value.theme === 'win95' ? 'ashen' : 'win95' }))} />
      <div className={`game-grid view-${state.view}`}>
        <HeroSidebar hero={state.hero} dispatch={dispatch} inCombat={Boolean(state.expedition?.combat)} onOpenInventory={(slot) => setInventorySlot(slot ?? 'all')} onUseConsumable={setPendingConsumable} />
        <main className="main-stage">
          <MobileNav view={state.view} onNavigate={navigate} onHall={() => void openHall()} />
          <Suspense fallback={<LoadingScreen />}>
            {(['hub', 'tavern', 'shop', 'hall'] as View[]).includes(state.view) && <HomeScreens view={state.view as 'hub' | 'tavern' | 'shop' | 'hall'} state={state} dispatch={dispatch} onHall={openHall} accessibility={accessibility} onAccessibilityChange={setAccessibility} />}
            {state.view === 'talents' && <TalentScreen state={state} dispatch={dispatch} />}
            {state.view === 'expedition' && <ExpeditionScreen state={state} dispatch={dispatch} onOpenInventory={() => setInventorySlot('all')} />}
          </Suspense>
        </main>
        <RightSidebar state={state} />
      </div>
      {inventorySlot && <InventoryModal key={inventorySlot} state={state} dispatch={dispatch} slot={inventorySlot === 'all' ? null : inventorySlot} onClose={() => setInventorySlot(null)} onUseConsumable={setPendingConsumable} />}
      {pendingConsumable && <ConsumableConfirmModal item={pendingConsumable} onClose={() => setPendingConsumable(null)} onConfirm={() => { dispatch({ type: 'USE_ITEM', itemId: pendingConsumable.id }); setPendingConsumable(null) }} />}
      {state.perkChoices.length > 0 && <PerkModal state={state} dispatch={dispatch} />}
      {state.notice && <Notice text={state.notice} onClose={() => dispatch({ type: 'DISMISS_NOTICE' })} />}
    </div>
  )
}

export default App
