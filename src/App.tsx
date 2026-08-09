import { useCallback, useEffect, useRef, useState } from 'react'
import { gameReducer, initialState } from './game/engine'
import { fetchLeaderboard, loadGame, onlineLeaderboardEnabled, saveGame, submitFallenHero } from './game/storage'
import type { GameAction, GameState, View } from './game/types'
import { HeroSidebar } from './components/game/HeroSidebar'
import { DeathScreen, Notice, PerkModal } from './components/game/Overlays'
import { RightSidebar } from './components/game/RightSidebar'
import { LoadingScreen, MobileNav, TopBar, WelcomeScreen } from './components/game/Shell'
import { ExpeditionScreen } from './screens/ExpeditionScreen'
import { HallScreen, HubScreen, ShopScreen, TavernScreen } from './screens/HomeScreens'

function App() {
  const [state, setState] = useState<GameState>(initialState)
  const [ready, setReady] = useState(false)
  const previousFallen = useRef(0)
  const dispatch = useCallback((action: GameAction) => setState((value) => gameReducer(value, action)), [])

  useEffect(() => {
    loadGame().then((saved) => {
      if (saved) {
        setState(saved)
        previousFallen.current = saved.fallen.length
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
    window.scrollTo({ top: 0, behavior: 'instant' })
  }, [state.view, state.expedition?.id])

  const openHall = useCallback(async () => {
    dispatch({ type: 'NAVIGATE', view: 'hall' })
    const entries = await fetchLeaderboard(state.fallen)
    dispatch({ type: 'LOAD_LEADERBOARD', entries })
  }, [dispatch, state.fallen])

  const navigate = useCallback((view: View) => dispatch({ type: 'NAVIGATE', view }), [dispatch])

  if (!ready) return <LoadingScreen />
  if (state.view === 'welcome' || !state.hero) return <WelcomeScreen onStart={() => dispatch({ type: 'NEW_HERO' })} />
  if (state.view === 'dead') return <DeathScreen state={state} dispatch={dispatch} onHall={openHall} />

  return (
    <div className="game-shell">
      <TopBar hero={state.hero} online={onlineLeaderboardEnabled()} />
      <div className="game-grid">
        <HeroSidebar hero={state.hero} dispatch={dispatch} />
        <main className="main-stage">
          <MobileNav view={state.view} onNavigate={navigate} onHall={() => void openHall()} />
          {state.view === 'hub' && <HubScreen state={state} dispatch={dispatch} onHall={openHall} />}
          {state.view === 'tavern' && <TavernScreen state={state} dispatch={dispatch} />}
          {state.view === 'shop' && <ShopScreen state={state} dispatch={dispatch} />}
          {state.view === 'hall' && <HallScreen state={state} dispatch={dispatch} />}
          {state.view === 'expedition' && <ExpeditionScreen state={state} dispatch={dispatch} />}
        </main>
        <RightSidebar state={state} dispatch={dispatch} />
      </div>
      {state.perkChoices.length > 0 && <PerkModal state={state} dispatch={dispatch} />}
      {state.notice && <Notice text={state.notice} onClose={() => dispatch({ type: 'DISMISS_NOTICE' })} />}
    </div>
  )
}

export default App
