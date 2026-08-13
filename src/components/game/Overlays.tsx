import { useEffect } from 'react'
import { Footprints, ShieldAlert, Skull, Sparkles, Trophy } from 'lucide-react'
import { contentRegistry } from '../../game/registry'
import type { GameState, Item } from '../../game/types'
import type { GameDispatch } from '../../ui/types'
import { PerkArt } from './PerkArt'
import { ItemArt } from './ItemArt'
import { loadRunSummaries } from '../../game/storage'
import { RunDebrief } from './RunDebrief'

const { perks } = contentRegistry

export function ConsumableConfirmModal({ item, onConfirm, onClose }: { item: Item; onConfirm: () => void; onClose: () => void }) {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose() }
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', onKeyDown)
    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [onClose])
  return (
    <div className="modal-backdrop consumable-confirm-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}>
      <section className="consumable-confirm" role="alertdialog" aria-modal="true" aria-labelledby="consumable-confirm-title" aria-describedby="consumable-confirm-description">
        <span className="consumable-confirm-art"><ItemArt item={item} /></span>
        <p className="eyebrow">ПОДТВЕРЖДЕНИЕ</p>
        <h2 id="consumable-confirm-title">Использовать «{item.name}»?</h2>
        <p id="consumable-confirm-description">{item.description}<br />После применения предмет может исчезнуть из сумки.</p>
        <div className="consumable-confirm-actions"><button className="secondary-button" type="button" onClick={onClose}>Отмена</button><button className="primary-button" type="button" onClick={onConfirm}>Использовать</button></div>
      </section>
    </div>
  )
}

export function PerkModal({ state, dispatch }: { state: GameState; dispatch: GameDispatch }) {
  const choices = state.perkChoices.map((id) => perks.find((perk) => perk.id === id)!).filter(Boolean)
  return <div className="modal-backdrop"><section className="perk-modal"><Sparkles /><p className="eyebrow">УРОВЕНЬ {state.hero!.level} · ДАР КРУГА</p><h1>Выбери, кем станешь</h1><p>Один дар останется с бойцом до самой смерти. Предметы могут временно давать другие.</p><div className="perk-choice-grid">{choices.map((perk) => <button key={perk.id} onClick={() => dispatch({ type: 'CHOOSE_PERK', perkId: perk.id })}><span><PerkArt perk={perk} /></span><h3>{perk.name}</h3><p>{perk.description}</p><b>Выбрать</b></button>)}</div></section></div>
}

export function DeathScreen({ state, dispatch, onHall }: { state: GameState; dispatch: GameDispatch; onHall: () => void }) {
  const hero = state.hero!
  const chronicle = state.fallen.find((fallen) => fallen.id === hero.id)
  const summary = loadRunSummaries().find((candidate) => candidate.outcome === 'death')
  return <div className="death-screen"><div className="death-sun" /><Skull className="death-skull" /><p className="eyebrow">ИСТОРИЯ ЗАВЕРШЕНА</p><h1>{hero.name}<br /><em>{hero.epithet}</em></h1><p>Пепел не возвращает мёртвых. Но Круг сохранил имя.</p>{chronicle && <p className="embedded-perk">Погиб: {chronicle.cause}. {chronicle.epitaph}{chronicle.bestItem ? ` Последний великий трофей: ${chronicle.bestItem}.` : ''}</p>}{summary && <RunDebrief summary={summary} state={state} />}<div className="death-stats"><span><small>Уровень</small><b>{hero.level}</b></span><span><small>Победы</small><b>{hero.victories}</b></span><span><small>Очки</small><b>{hero.score.toLocaleString('ru-RU')}</b></span></div><div className="death-actions"><button className="primary-button" onClick={() => dispatch({ type: 'NEW_HERO' })}>Новый боец <Footprints /></button><button className="secondary-button" onClick={onHall}>Доска павших <Trophy /></button></div></div>
}

export function Notice({ text, onClose }: { text: string; onClose: () => void }) {
  useEffect(() => {
    const timer = window.setTimeout(onClose, 4200)
    return () => window.clearTimeout(timer)
  }, [onClose, text])
  return <button className="notice" role="status" aria-live="polite" onClick={onClose}><ShieldAlert size={17} aria-hidden="true" />{text}</button>
}
