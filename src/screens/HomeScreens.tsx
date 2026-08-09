import { useRef, useState, type ChangeEvent, type ReactNode } from 'react'
import {
  ArrowLeft, Beer, ChevronRight, CloudOff, Crown, DoorOpen, Download, Heart, Map,
  RotateCcw, Save, ShieldAlert, ShoppingBag, Trophy, Upload,
} from 'lucide-react'
import { buyPrice, restPrice } from '../game/balance'
import { getHeroStats, itemIcon, statSummary } from '../game/engine'
import { contentRegistry } from '../game/registry'
import { exportGame, importGame, onlineLeaderboardEnabled, saveGame } from '../game/storage'
import type { GameState, LeaderboardEntry } from '../game/types'
import { rarityHints, rarityLabels } from '../ui/text'
import type { GameDispatch } from '../ui/types'
import { Tooltip } from '../components/Tooltip'

const { perks, slotNames } = contentRegistry

export function HubScreen({ state, dispatch, onHall }: { state: GameState; dispatch: GameDispatch; onHall: () => void }) {
  const [difficulty, setDifficulty] = useState(3)
  const hero = state.hero!
  const danger = difficulty <= 3 ? 'Терпимый риск' : difficulty <= 6 ? 'Верная боль' : difficulty <= 8 ? 'Почти самоубийство' : 'Приговор'
  return (
    <div className="hub-screen screen-pad">
      <div className="hub-art" />
      <section className="hub-welcome"><p className="eyebrow">УБЕЖИЩЕ · ДЕНЬ {Math.max(1, hero.victories + 1)}</p><h1>Круг снова<br />требует <em>имя</em></h1><p>Отдохни, проверь сталь и выбери, насколько сильно хочешь разозлить глубины.</p></section>
      <div className="destination-grid">
        <button className="destination tavern-destination" onClick={() => dispatch({ type: 'NAVIGATE', view: 'tavern' })}><span><Beer /></span><div><small>ЗАЛАТАТЬ РАНЫ</small><b>Таверна «Сбитый зуб»</b><p>Отдых, слухи и работа</p></div><ChevronRight /></button>
        <button className="destination shop-destination" onClick={() => dispatch({ type: 'NAVIGATE', view: 'shop' })}><span><ShoppingBag /></span><div><small>ПОТРАТИТЬ ДОБЫЧУ</small><b>Лавка Мирры</b><p>Оружие, броня и смеси</p></div><ChevronRight /></button>
        <button className="destination hall-destination" onClick={onHall}><span><Trophy /></span><div><small>ПОМЕРИТЬСЯ СЛАВОЙ</small><b>Доска павших</b><p>Лучшие результаты бойцов</p></div><ChevronRight /></button>
      </div>
      <section className="expedition-launch panel-block">
        <div className="expedition-copy"><span className="route-icon"><Map /></span><div><small>СЛЕДУЮЩИЙ ПОХОД</small><h2>Выбери меру безрассудства</h2><p>Сложность усиливает врагов, опыт, золото, очки и качество добычи.</p></div></div>
        <div className="difficulty-row"><Tooltip text="Сложность усиливает врагов и одновременно повышает опыт, золото, очки и качество добычи."><div className="difficulty-value" tabIndex={0}><b>{difficulty}</b><span>/ 10</span><small>{danger}</small></div></Tooltip><div className="slider-wrap"><input aria-label="Сложность похода" type="range" min="1" max="10" value={difficulty} onChange={(event) => setDifficulty(Number(event.target.value))} /><div className="slider-ticks">{Array.from({ length: 10 }, (_, index) => <i key={index}>{index + 1}</i>)}</div></div><button className="primary-button" onClick={() => dispatch({ type: 'START_EXPEDITION', difficulty })}>Начать поход <DoorOpen size={18} /></button></div>
      </section>
    </div>
  )
}

export function TavernScreen({ state, dispatch }: { state: GameState; dispatch: GameDispatch }) {
  const hero = state.hero!
  const missing = getHeroStats(hero).maxHp - hero.hp
  const cost = restPrice(missing)
  const quest = state.quest
  const offer = state.questOffer
  return (
    <div className="location-screen screen-pad tavern-screen">
      <ScreenHeading eyebrow="ТАВЕРНА · БЕЗОПАСНАЯ ЗОНА" title="Сбитый зуб" description="Здесь не задают вопросов. Только зашивают, наливают и записывают долги." icon={<Beer />} onBack={() => dispatch({ type: 'NAVIGATE', view: 'hub' })} />
      <div className="location-grid">
        <ActionCard icon={<Heart />} title="Комната наверху" description={missing ? `Вернуть ${missing} здоровья. Постель скрипит, но нож под ребро не входит.` : 'Раны затянулись. Можно просто послушать храп.'} meta={`${cost} золота`} button="Отдохнуть" disabled={!missing} onClick={() => dispatch({ type: 'REST' })} />
        <SaveTransferCard state={state} dispatch={dispatch} />
        <section className="quest-card panel-block"><div className="card-icon"><ShieldAlert /></div><small>{quest ? 'ТЕКУЩИЙ ЗАКАЗ' : 'ДОСКА ЗАКАЗОВ'}</small>{quest ? <><h3>{quest.name}</h3><p>{quest.description}</p><div className="quest-progress"><i style={{ width: `${Math.min(100, quest.progress / quest.goal * 100)}%` }} /></div><b>{quest.progress} / {quest.goal} · {quest.rewardGold} золота · {quest.rewardScore} очков</b>{quest.complete && <button className="secondary-button" onClick={() => dispatch({ type: 'CLAIM_QUEST' })}>Забрать награду</button>}</> : offer ? <><h3>{offer.name}</h3><p>{offer.description}</p><b>{offer.rewardGold} золота · {offer.rewardScore} очков</b><button className="secondary-button" onClick={() => dispatch({ type: 'ACCEPT_QUEST' })}>Взять заказ</button><button className="text-button" onClick={() => dispatch({ type: 'ROLL_QUEST' })}><RotateCcw size={14} /> Другой слух · 3 золота</button></> : <button className="secondary-button" onClick={() => dispatch({ type: 'ROLL_QUEST' })}>Расспросить за 3 золота</button>}</section>
      </div>
    </div>
  )
}

function SaveTransferCard({ state, dispatch }: { state: GameState; dispatch: GameDispatch }) {
  const inputRef = useRef<HTMLInputElement>(null)

  const download = () => {
    const url = URL.createObjectURL(new Blob([exportGame(state)], { type: 'application/json' }))
    const link = document.createElement('a')
    link.href = url
    link.download = `ashen-ring-${state.hero?.name ?? 'save'}.json`
    link.click()
    URL.revokeObjectURL(url)
  }

  const upload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    try {
      dispatch({ type: 'IMPORT_SAVE', state: importGame(await file.text()) })
    } catch (error) {
      dispatch({ type: 'SET_DIFFICULTY_NOTICE', notice: error instanceof Error ? error.message : 'Не удалось импортировать сохранение.' })
    }
  }

  return (
    <section className="action-card panel-block save-transfer-card">
      <div className="card-icon"><Save /></div><small>ЛОКАЛЬНОЕ СОХРАНЕНИЕ</small><h3>Закрепить путь</h3><p>Автосохранение работает постоянно. Экспорт пригодится для переноса на другое устройство.</p><b>Версия {state.version} · действие {state.actionSequence}</b>
      <div className="save-transfer-actions"><button className="secondary-button" onClick={() => { void saveGame(state); dispatch({ type: 'SET_DIFFICULTY_NOTICE', notice: 'Текущее состояние записано. Откат после смерти невозможен.' }) }}><Save size={14} /> Сохранить</button><button className="text-button" onClick={download}><Download size={14} /> Экспорт</button><button className="text-button" onClick={() => inputRef.current?.click()}><Upload size={14} /> Импорт</button></div>
      <input ref={inputRef} className="save-file-input" type="file" accept="application/json,.json" onChange={(event) => void upload(event)} />
    </section>
  )
}

export function ShopScreen({ state, dispatch }: { state: GameState; dispatch: GameDispatch }) {
  return (
    <div className="location-screen screen-pad shop-screen">
      <ScreenHeading eyebrow="ЛАВКА · ТОВАР ОБНОВЛЯЕТСЯ ПОСЛЕ ПОХОДА" title="Мирра знает цену" description="Не спрашивай, кому раньше принадлежала вещь. И почему на ней ещё тепло." icon={<ShoppingBag />} onBack={() => dispatch({ type: 'NAVIGATE', view: 'hub' })} />
      <div className="shop-list">{state.shop.map((item) => { const price = buyPrice(item.value); const itemPerk = item.perk ? perks.find((perk) => perk.id === item.perk) : null; return <article className={`shop-item rarity-${item.rarity}`} key={item.id}><div className="shop-icon">{itemIcon(item)}</div><div className="shop-info"><Tooltip text={rarityHints[item.rarity]}><small tabIndex={0}>{rarityLabels[item.rarity]} {item.slot ? `· ${slotNames[item.slot]}` : '· Расходник'}</small></Tooltip><h3>{item.name}</h3><p>{statSummary(item) || item.description}</p>{itemPerk && <Tooltip text={itemPerk.description}><span tabIndex={0}>Дар: {itemPerk.name}</span></Tooltip>}</div><button disabled={state.hero!.gold < price} onClick={() => dispatch({ type: 'BUY', itemId: item.id })}><b>{price}</b><small>золота</small></button></article> })}</div>
      <p className="shop-tip">Чтобы продать трофей, выбери его в сумке справа.</p>
    </div>
  )
}

export function HallScreen({ state, dispatch }: { state: GameState; dispatch: GameDispatch }) {
  const entries: LeaderboardEntry[] = state.leaderboard.length ? state.leaderboard : state.fallen.map((entry) => ({ ...entry, isLocal: true }))
  return (
    <div className="location-screen screen-pad hall-screen">
      <ScreenHeading eyebrow={onlineLeaderboardEnabled() ? 'ОБЩИЙ РЕЙТИНГ · СИНХРОНИЗИРОВАНО' : 'ЛОКАЛЬНЫЙ РЕЙТИНГ · БЕЗ СЕТИ'} title="Доска павших" description="Живые спорят. Мёртвые остаются на доске ровно там, куда сумели добраться." icon={<Trophy />} onBack={() => dispatch({ type: 'NAVIGATE', view: 'hub' })} />
      {!entries.length ? <div className="empty-hall"><Crown /><h3>Пока ни одного имени</h3><p>Это хорошая новость для бойца и плохая для летописца.</p></div> : <div className="leaderboard"><div className="leaderboard-head"><span>Место и боец</span><span>Уровень</span><span>Победы</span><span>Очки</span></div>{entries.map((entry, index) => <div className={`leader-row ${entry.id === state.hero?.id ? 'current' : ''}`} key={entry.id}><b className="rank">{entry.rank ?? index + 1}</b><div><strong>{entry.name}</strong><small>{entry.epithet}</small></div><span>{entry.level}</span><span>{entry.victories}</span><b>{entry.score.toLocaleString('ru-RU')}</b></div>)}</div>}
      {!onlineLeaderboardEnabled() && <div className="offline-explainer"><CloudOff size={17} /><p>Сейчас показаны результаты на этом устройстве. Добавь Supabase-переменные из <code>.env.example</code>, чтобы включить общую таблицу.</p></div>}
    </div>
  )
}

function ScreenHeading({ eyebrow, title, description, icon, onBack }: { eyebrow: string; title: string; description: string; icon: ReactNode; onBack: () => void }) {
  return <header className="screen-heading"><button className="icon-button" onClick={onBack}><ArrowLeft /></button><span className="heading-icon">{icon}</span><div><small>{eyebrow}</small><h1>{title}</h1><p>{description}</p></div></header>
}

function ActionCard({ icon, title, description, meta, button, disabled, onClick }: { icon: ReactNode; title: string; description: string; meta: string; button: string; disabled?: boolean; onClick: () => void }) {
  return <section className="action-card panel-block"><div className="card-icon">{icon}</div><small>УСЛУГА</small><h3>{title}</h3><p>{description}</p><b>{meta}</b><button disabled={disabled} className="secondary-button" onClick={onClick}>{button}</button></section>
}
