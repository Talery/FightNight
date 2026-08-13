import type { CSSProperties } from 'react'
import { Beer, CircleDollarSign, CloudOff, Dices, Footprints, MonitorCog, ShoppingBag, Skull, Sparkles, Trophy, UserRound } from 'lucide-react'
import type { Hero, View } from '../../game/types'
import type { UiTheme } from '../../game/settings'
import { Tooltip } from '../Tooltip'
import { assetRegistry } from '../../assets/registry'

const welcomeArt = assetRegistry.scenes.locations.welcome

const navItems: Array<{ view: View; label: string; icon: typeof Beer }> = [
  { view: 'hub', label: 'Убежище', icon: UserRound },
  { view: 'tavern', label: 'Таверна', icon: Beer },
  { view: 'shop', label: 'Лавка', icon: ShoppingBag },
  { view: 'hall', label: 'Рейтинг', icon: Trophy },
]

export function LoadingScreen() {
  return <div className="loading-screen"><div className="brand-mark small"><span>ПК</span></div><p>Разжигаем угли…</p></div>
}

export function WelcomeScreen({ onStart }: { onStart: () => void }) {
  return (
    <div className="welcome-screen asset-welcome" style={{ '--welcome-art': `url(${welcomeArt})` } as CSSProperties}>
      <div className="welcome-atmosphere" />
      <div className="welcome-copy">
        <div className="brand-mark"><span>ПК</span></div>
        <p className="eyebrow">ОДИНОЧНАЯ ROGUELIKE-ИГРА</p>
        <h1>Пепельный<br /><em>Круг</em></h1>
        <p className="welcome-lead">Здесь имя дают случайно. Репутацию — за кровь. А смерть не позволяет переиграть.</p>
        <button className="primary-button journey-button" onClick={onStart}>В путь <Footprints size={18} /></button>
        <div className="welcome-features">
          <span><Dices size={15} /> Каждый путь иной</span>
          <span><Skull size={15} /> Смерть окончательна</span>
          <span><Trophy size={15} /> Слава остаётся</span>
        </div>
      </div>
      <p className="build-note">Каждое значимое решение сохраняется автоматически</p>
    </div>
  )
}

export function TopBar({ hero, online, theme, onThemeToggle }: { hero: Hero; online: boolean; theme: UiTheme; onThemeToggle: () => void }) {
  return (
    <header className="top-bar">
      <div className="top-brand"><span className="mini-sigil">ПК</span><div><strong>Пепельный Круг</strong><small>Убежище обречённых</small></div></div>
      <div className="top-resources">
        <button className="theme-toggle" type="button" aria-label={theme === 'win95' ? 'Включить пепельную тему' : 'Включить тему Windows 95'} title={theme === 'win95' ? 'Пепельная тема' : 'Windows 95'} onClick={onThemeToggle}><MonitorCog size={15} /><span>{theme === 'win95' ? 'ASH' : 'WIN 95'}</span></button>
        <Tooltip text="Уровень растёт вместе с опытом. Каждые три уровня вы выбираете постоянный перк."><span tabIndex={0}><UserRound size={15} /><small>Уровень</small><b>{hero.level}</b></span></Tooltip>
        <Tooltip text="Золото тратится в таверне и лавке. Оно сохраняется между походами, пока боец жив."><span tabIndex={0}><CircleDollarSign size={15} /><small>Золото</small><b>{hero.gold}</b></span></Tooltip>
        <Tooltip text="Очки определяют место в рейтинге и остаются в записи бойца после окончательной смерти."><span tabIndex={0}><Trophy size={15} /><small>Очки</small><b>{hero.score.toLocaleString('ru-RU')}</b></span></Tooltip>
        <Tooltip text={online ? 'Обычный рейтинг синхронизируется как непроверенный. Только daily с серверным replay получает отметку подтверждения.' : 'Игра и рейтинг сохраняются только на этом устройстве.'}><span tabIndex={0} className={`sync-pill ${online ? 'online' : ''}`}>{online ? <Sparkles size={13} /> : <CloudOff size={13} />}{online ? 'Сеть · daily verified' : 'Локальный режим'}</span></Tooltip>
      </div>
    </header>
  )
}

export function MobileNav({ view, onNavigate, onHall }: { view: View; onNavigate: (view: View) => void; onHall: () => void }) {
  if (view === 'expedition') return null
  return (
    <nav className="mobile-nav" aria-label="Главное меню">
      {navItems.map((item) => (
        <button key={item.view} className={view === item.view ? 'active' : ''} onClick={() => item.view === 'hall' ? onHall() : onNavigate(item.view)}>
          <item.icon size={16} />{item.label}
        </button>
      ))}
    </nav>
  )
}
