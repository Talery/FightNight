import { useState } from 'react'
import { Backpack, History } from 'lucide-react'
import { itemIcon, statSummary } from '../../game/engine'
import { contentRegistry } from '../../game/registry'
import type { GameState } from '../../game/types'
import { rarityHints, rarityLabels } from '../../ui/text'
import type { GameDispatch } from '../../ui/types'
import { Tooltip } from '../Tooltip'

const { perks, slotNames } = contentRegistry

export function RightSidebar({ state, dispatch }: { state: GameState; dispatch: GameDispatch }) {
  return <aside className="right-sidebar"><InventoryPanel state={state} dispatch={dispatch} /><LogPanel state={state} /></aside>
}

function InventoryPanel({ state, dispatch }: { state: GameState; dispatch: GameDispatch }) {
  const hero = state.hero!
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const selected = hero.inventory.find((item) => item.id === selectedId) ?? null
  const equipped = selected ? Object.values(hero.equipment).includes(selected.id) : false
  return (
    <section className="panel-block inventory-panel">
      <div className="section-cap"><span>Сумка <small>{hero.inventory.length}/24</small></span><Backpack size={15} /></div>
      <div className="inventory-grid">
        {hero.inventory.map((item) => <Tooltip key={item.id} text={`${rarityLabels[item.rarity]}. ${item.name}. ${statSummary(item) || item.description}`}><button className={`inventory-item rarity-${item.rarity} ${selectedId === item.id ? 'selected' : ''} ${Object.values(hero.equipment).includes(item.id) ? 'equipped' : ''}`} onClick={() => setSelectedId(item.id)}><b>{itemIcon(item)}</b><span>{item.name}</span></button></Tooltip>)}
        {Array.from({ length: Math.max(0, 8 - hero.inventory.length) }).map((_, index) => <i className="inventory-empty" key={index} />)}
      </div>
      {selected ? <div className="item-detail"><Tooltip text={rarityHints[selected.rarity]}><small tabIndex={0} className={`rarity-text rarity-${selected.rarity}`}>{rarityLabels[selected.rarity]} {selected.type === 'equipment' && selected.slot ? `· ${slotNames[selected.slot]}` : '· Расходник'}</small></Tooltip><h4>{selected.name}</h4><b className="item-stats">{statSummary(selected) || selected.description}</b>{statSummary(selected) && <p>{selected.description}</p>}{selected.perk && (() => { const perk = perks.find((candidate) => candidate.id === selected.perk); return perk ? <Tooltip text={perk.description}><p tabIndex={0} className="embedded-perk">Дар: {perk.name}</p></Tooltip> : null })()}<div className="item-actions">{selected.type === 'equipment' ? equipped ? <button onClick={() => dispatch({ type: 'UNEQUIP', slot: selected.slot! })}>Снять</button> : <button onClick={() => dispatch({ type: 'EQUIP', itemId: selected.id })}>Надеть</button> : <button onClick={() => dispatch({ type: 'USE_ITEM', itemId: selected.id })}>Использовать</button>}{state.view === 'shop' && !equipped && <button className="quiet" onClick={() => { dispatch({ type: 'SELL', itemId: selected.id }); setSelectedId(null) }}>Продать</button>}</div></div> : <p className="empty-copy inventory-hint">Выбери предмет, чтобы изучить его.</p>}
    </section>
  )
}

function LogPanel({ state }: { state: GameState }) {
  return <section className="panel-block log-panel"><div className="section-cap"><span>Летопись</span><History size={15} /></div><div className="log-list">{state.logs.map((entry) => <p className={entry.tone} key={entry.id}>{entry.text}</p>)}</div></section>
}
