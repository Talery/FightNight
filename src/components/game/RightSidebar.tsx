import { useEffect, useState } from 'react'
import { Backpack, CircleHelp, History, X } from 'lucide-react'
import { statSummary } from '../../game/engine'
import { contentRegistry } from '../../game/registry'
import type { EquipSlot, GameState, Item } from '../../game/types'
import { rarityHints, rarityLabels } from '../../ui/text'
import type { GameDispatch } from '../../ui/types'
import { Tooltip } from '../Tooltip'
import { ItemArt, itemPresentationClasses, itemPresentationLabel } from './ItemArt'
import { buildSynergies, itemRuleDescriptions, synergyDescriptions } from '../../game/build-identity'
import { recurringNpcs, worldMemoryJournal } from '../../game/world-memory'

const { perks, slotNames } = contentRegistry
const rarityRank = { common: 1, uncommon: 2, rare: 3, epic: 4, mythic: 5 }

export function RightSidebar({ state }: { state: GameState }) {
  return <aside className="right-sidebar"><SynergyPanel state={state} /><MemoryPanel state={state} /><LogPanel state={state} /></aside>
}

function MemoryPanel({ state }: { state: GameState }) {
  if (!state.hero) return null
  const journal = worldMemoryJournal(state.hero)
  const relations = Object.entries(state.hero.npcRelations)
  if (!journal.length && !relations.length) return null
  return <section className="panel-block memory-panel" aria-label="Память мира"><div className="section-cap"><span>Память мира</span><History size={14} /></div><div className="memory-list">{journal.map((entry) => <span className={entry.state} key={entry.id}><b>{entry.id}</b><small>{entry.state === 'open' ? 'История продолжится' : 'Цепочка завершена'}</small></span>)}{relations.map(([npc, value]) => <span key={npc}><b>{recurringNpcs[npc as keyof typeof recurringNpcs] ?? npc}</b><small>Отношение: {value > 0 ? `+${value}` : value}</small></span>)}</div></section>
}

function SynergyPanel({ state }: { state: GameState }) {
  if (!state.hero) return null
  const synergies = buildSynergies(state.hero, state.expedition)
  const statusHint = (state: 'active' | 'near' | 'seed') => state === 'active'
    ? 'Стиль сформирован: собрано не менее трёх источников.'
    : state === 'near'
      ? 'Почти сформирован: нужен ещё один источник.'
      : 'Найден первый источник этого стиля.'
  return <section className="panel-block synergy-panel" aria-label="Боевой стиль"><div className="section-cap"><span>Боевой стиль</span><Tooltip text="Стиль складывается из экипировки, перков и клятвы. При двух источниках подходящая добыча начинает встречаться чаще."><CircleHelp className="section-help" size={15} tabIndex={0} /></Tooltip><b>{synergies.filter((entry) => entry.state === 'active').length} акт.</b></div>{synergies.length ? <div className="synergy-list">{synergies.map((entry) => <Tooltip key={entry.tag} text={`${synergyDescriptions[entry.tag]} ${statusHint(entry.state)} Собрано: ${entry.count} из 3.`}><span tabIndex={0} className={entry.state}><b>{entry.name}</b><i>{entry.count}/3</i><small>{entry.state === 'active' ? 'АКТИВЕН' : entry.state === 'near' ? 'ЕЩЁ ОДИН' : 'НАЧАЛО'}</small></span></Tooltip>)}</div> : <p className="empty-copy">Надень предмет или выбери клятву, чтобы наметить стиль.</p>}</section>
}

export function InventoryModal({ state, dispatch, slot, onClose, onUseConsumable }: { state: GameState; dispatch: GameDispatch; slot: EquipSlot | null; onClose: () => void; onUseConsumable: (item: Item) => void }) {
  const hero = state.hero!
  const [selectedId, setSelectedId] = useState<string | null>(() => slot ? hero.equipment[slot] ?? null : null)
  const [filter, setFilter] = useState<'all' | 'equipment' | 'consumable'>(slot ? 'equipment' : 'all')
  const [sort, setSort] = useState<'rarity' | 'value' | 'name'>('rarity')
  const selected = hero.inventory.find((item) => item.id === selectedId) ?? null
  const visibleItems = [...hero.inventory]
    .filter((item) => slot ? item.type === 'equipment' && item.slot === slot : filter === 'all' || item.type === filter)
    .sort((left, right) => sort === 'name' ? left.name.localeCompare(right.name, 'ru') : sort === 'value' ? right.value - left.value : rarityRank[right.rarity] - rarityRank[left.rarity] || right.value - left.value)

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
    <div className="modal-backdrop inventory-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}>
      <section className="panel-block inventory-modal" role="dialog" aria-modal="true" aria-labelledby="inventory-title">
        <div className="section-cap">
          <span id="inventory-title">{slot ? `Арсенал: ${slotNames[slot]}` : 'Арсенал бойца'} <small>{visibleItems.length}/{hero.inventory.length}</small></span>
          <div><Backpack size={17} /><button type="button" className="modal-close" aria-label="Закрыть сумку" onClick={onClose}><X size={18} /></button></div>
        </div>
        <div className="inventory-tools">
          {slot ? <p className="slot-filter-label">Только предметы для слота «{slotNames[slot].toLowerCase()}»</p> : <select aria-label="Фильтр сумки" value={filter} onChange={(event) => { setFilter(event.target.value as typeof filter); setSelectedId(null) }}><option value="all">Всё</option><option value="equipment">Экипировка</option><option value="consumable">Расходники</option></select>}
          <select aria-label="Сортировка сумки" value={sort} onChange={(event) => setSort(event.target.value as typeof sort)}><option value="rarity">По редкости</option><option value="value">По цене</option><option value="name">По названию</option></select>
        </div>
        <div className="inventory-modal-content">
          <div className="inventory-grid">
            {visibleItems.map((item) => <Tooltip key={item.id} text={`${rarityLabels[item.rarity]}. ${itemPresentationLabel(item) ? `${itemPresentationLabel(item)}. ` : ''}${item.name}. ${statSummary(item) || item.description}`}><button className={`inventory-item ${itemPresentationClasses(item)} ${selectedId === item.id ? 'selected' : ''} ${Object.values(hero.equipment).includes(item.id) ? 'equipped' : ''}`} onClick={() => setSelectedId(item.id)}><b><ItemArt item={item} /></b><span><strong>{item.name}</strong><small>{rarityLabels[item.rarity]}{item.upgradeLevel ? ` · +${item.upgradeLevel}` : ''}</small></span></button></Tooltip>)}
            {Array.from({ length: Math.max(0, 12 - visibleItems.length) }).map((_, index) => <i className="inventory-empty" key={index} />)}
          </div>
          {selected ? <ItemDetails item={selected} state={state} dispatch={dispatch} onRemoved={() => setSelectedId(null)} onUseConsumable={onUseConsumable} /> : <p className="empty-copy inventory-hint">{visibleItems.length ? 'Выбери предмет, чтобы изучить его.' : slot ? `В сумке пока нет предметов для слота «${slotNames[slot].toLowerCase()}».` : 'Сумка пуста.'}</p>}
        </div>
      </section>
    </div>
  )
}

function ItemDetails({ item, state, dispatch, onRemoved, onUseConsumable }: { item: Item; state: GameState; dispatch: GameDispatch; onRemoved: () => void; onUseConsumable: (item: Item) => void }) {
  const hero = state.hero!
  const equipped = Object.values(hero.equipment).includes(item.id)
  const equippedSameSlot = item.slot ? hero.inventory.find((candidate) => candidate.id === hero.equipment[item.slot!]) : null
  const perk = item.perk ? perks.find((candidate) => candidate.id === item.perk) : null
  return (
    <div className={`item-detail ${itemPresentationClasses(item)}`}>
      <div className="item-detail-hero"><span className="item-detail-art"><ItemArt item={item} /></span><div><Tooltip text={rarityHints[item.rarity]}><small tabIndex={0} className={`rarity-text rarity-${item.rarity}`}>{rarityLabels[item.rarity]} {item.type === 'equipment' && item.slot ? `· ${slotNames[item.slot]}` : '· Расходник'}</small></Tooltip><h4>{item.name}{item.upgradeLevel ? ` +${item.upgradeLevel}` : ''}</h4></div></div>
      {itemPresentationLabel(item) && <p className="item-special-mark">{itemPresentationLabel(item)}</p>}
      {item.ruleModifier && <p className="embedded-perk">Правило: {itemRuleDescriptions[item.ruleModifier]}</p>}
      <b className="item-stats">{statSummary(item) || item.description}</b>
      {item.faction && <p className="embedded-perk">Трофей фракции: {item.faction}</p>}
      {statSummary(item) && <p>{item.description}</p>}
      {equippedSameSlot && equippedSameSlot.id !== item.id && <p className="item-compare">Сейчас надето: <b>{equippedSameSlot.name}</b><br />{statSummary(equippedSameSlot) || equippedSameSlot.description}</p>}
      {perk && <Tooltip text={perk.description}><p tabIndex={0} className="embedded-perk">Дар: {perk.name}</p></Tooltip>}
      <div className="item-actions">
        {item.type === 'equipment' ? equipped ? <button onClick={() => dispatch({ type: 'UNEQUIP', slot: item.slot! })}>Снять</button> : <button onClick={() => dispatch({ type: 'EQUIP', itemId: item.id })}>Надеть</button> : <button onClick={() => onUseConsumable(item)}>Использовать</button>}
        {state.view === 'shop' && item.type === 'equipment' && <><button onClick={() => dispatch({ type: 'UPGRADE_ITEM', itemId: item.id })}>Улучшить</button><button onClick={() => dispatch({ type: 'REFORGE_ITEM', itemId: item.id })}>Перековать</button></>}
        {state.view === 'shop' && !equipped && <><button className="quiet" onClick={() => { dispatch({ type: 'SELL', itemId: item.id }); onRemoved() }}>Продать</button>{item.type === 'equipment' && <button className="quiet" onClick={() => { if (window.confirm(`Разобрать «${item.name}»? Вещь исчезнет, останутся только материалы.`)) { dispatch({ type: 'DISMANTLE_ITEM', itemId: item.id }); onRemoved() } }}>Разобрать</button>}</>}
      </div>
    </div>
  )
}

function LogPanel({ state }: { state: GameState }) {
  return <section className="panel-block log-panel"><div className="section-cap"><span>Летопись</span><History size={15} /></div><div className="log-list">{state.logs.map((entry) => { const actions = entry.text.includes(' • ') ? entry.text.split(' • ') : null; return actions ? <div className={`log-exchange ${entry.tone}`} key={entry.id}>{actions.map((action, index) => { const separator = action.indexOf(' · '); const actor = separator >= 0 ? action.slice(0, separator) : action; const detail = separator >= 0 ? action.slice(separator + 3) : action; return <p className={index === 0 ? 'hero-action' : 'enemy-action'} key={`${entry.id}-${index}`}><b>{actor}</b><span>{detail}</span></p> })}</div> : <p className={entry.tone} key={entry.id}>{entry.text}</p> })}</div></section>
}
