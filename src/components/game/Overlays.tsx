import { useEffect } from 'react'
import { Footprints, ShieldAlert, Skull, Sparkles, Trophy } from 'lucide-react'
import { contentRegistry } from '../../game/registry'
import type { GameState } from '../../game/types'
import type { GameDispatch } from '../../ui/types'

const { perks } = contentRegistry

export function PerkModal({ state, dispatch }: { state: GameState; dispatch: GameDispatch }) {
  const choices = state.perkChoices.map((id) => perks.find((perk) => perk.id === id)!).filter(Boolean)
  return <div className="modal-backdrop"><section className="perk-modal"><Sparkles /><p className="eyebrow">УРОВЕНЬ {state.hero!.level} · ДАР КРУГА</p><h1>Выбери, кем станешь</h1><p>Один дар останется с бойцом до самой смерти. Предметы могут временно давать другие.</p><div className="perk-choice-grid">{choices.map((perk) => <button key={perk.id} onClick={() => dispatch({ type: 'CHOOSE_PERK', perkId: perk.id })}><span>{perk.icon}</span><h3>{perk.name}</h3><p>{perk.description}</p><b>Выбрать</b></button>)}</div></section></div>
}

export function DeathScreen({ state, dispatch, onHall }: { state: GameState; dispatch: GameDispatch; onHall: () => void }) {
  const hero = state.hero!
  return <div className="death-screen"><div className="death-sun" /><Skull className="death-skull" /><p className="eyebrow">ИСТОРИЯ ЗАВЕРШЕНА</p><h1>{hero.name}<br /><em>{hero.epithet}</em></h1><p>Пепел не возвращает мёртвых. Но Круг сохранил имя.</p><div className="death-stats"><span><small>Уровень</small><b>{hero.level}</b></span><span><small>Победы</small><b>{hero.victories}</b></span><span><small>Очки</small><b>{hero.score.toLocaleString('ru-RU')}</b></span></div><div className="death-actions"><button className="primary-button" onClick={() => dispatch({ type: 'NEW_HERO' })}>Новый боец <Footprints /></button><button className="secondary-button" onClick={onHall}>Доска павших <Trophy /></button></div></div>
}

export function Notice({ text, onClose }: { text: string; onClose: () => void }) {
  useEffect(() => {
    const timer = window.setTimeout(onClose, 4200)
    return () => window.clearTimeout(timer)
  }, [onClose, text])
  return <button className="notice" onClick={onClose}><ShieldAlert size={17} />{text}</button>
}
