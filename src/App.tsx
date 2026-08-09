import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  ArrowLeft, Backpack, Beer, ChevronRight, CircleDollarSign, CloudOff, Crown, Dices,
  DoorOpen, Footprints, Heart, History, Map, PackageOpen, RotateCcw, Save, Shield,
  ShieldAlert, ShoppingBag, Skull, Sparkles, Swords, TentTree, Trophy, UserRound,
} from 'lucide-react'
import { attributeName, gameReducer, getActivePerks, getHeroStats, initialState, itemIcon, statSummary } from './game/engine'
import { enemyMutations, perks, slotNames, zones } from './game/content'
import { fetchLeaderboard, loadGame, onlineLeaderboardEnabled, saveGame, submitFallenHero } from './game/storage'
import type { Attribute, EquipSlot, GameAction, GameState, Hero, Item, LeaderboardEntry, Rarity, Technique, View, Zone } from './game/types'
import { Tooltip } from './components/Tooltip'

const rarityLabels: Record<Rarity, string> = {
  common: 'Обычный', uncommon: 'Добротный', rare: 'Редкий', epic: 'Проклятый', mythic: 'Реликтовый',
}

const statHints: Record<Attribute | 'armor' | 'health' | 'xp', string> = {
  strength: 'Сила повышает урон каждого вашего попадания.',
  agility: 'Ловкость повышает точность и уклонение. В бою каждое преимущество в 1 очко даёт +5% к шансу прочитать следующую атаку врага.',
  luck: 'Удача повышает шанс критического удара, немного помогает уклонению, улучшает добычу и рискованные события.',
  armor: 'Броня уменьшает входящий урон. Каждое очко вычитает примерно 0,75 урона до учёта блока.',
  health: 'Здоровье бойца. Если оно упадёт до нуля, смерть станет окончательной.',
  xp: 'Опыт выдаётся за победы. Заполненная шкала повышает уровень; каждые три уровня открывается выбор нового перка.',
}

const rarityHints: Record<Rarity, string> = {
  common: 'Обычная вещь: базовые свойства и невысокая цена.',
  uncommon: 'Добротная вещь: характеристики обычно лучше обычных.',
  rare: 'Редкая вещь: сильные характеристики и более высокая ценность.',
  epic: 'Проклятая вещь: очень сильная добыча высоких сложностей.',
  mythic: 'Реликтовая вещь: высшая редкость и лучшие возможные свойства.',
}

const zoneHints: Record<Zone, string> = {
  head: 'Голова: +22% урона, а с перком «Палач» — повышенный шанс критического удара.',
  body: 'Корпус: стандартные урон и точность без дополнительных модификаторов.',
  legs: 'Ноги: на 10% меньше урона, но выбор зоны может помочь обойти ожидаемый блок.',
}

const techniqueHints: Record<Technique, string> = {
  quick: 'Быстрый удар: не тратит выносливость и даёт +9% к шансу попадания.',
  heavy: 'Тяжёлый удар: ×1,65 к урону, −12% к шансу попадания, расходует 2 выносливости.',
  feint: 'Финт: обходит блок. Если враг защищает выбранную зону, получает +35% к шансу попадания, но наносит только 82% обычного урона.',
}

const navItems: Array<{ view: View; label: string; icon: typeof Beer }> = [
  { view: 'hub', label: 'Убежище', icon: UserRound },
  { view: 'tavern', label: 'Таверна', icon: Beer },
  { view: 'shop', label: 'Лавка', icon: ShoppingBag },
  { view: 'hall', label: 'Рейтинг', icon: Trophy },
]

function App() {
  const [state, setState] = useState<GameState>(initialState)
  const [ready, setReady] = useState(false)
  const previousFallen = useRef(0)
  const dispatch = useCallback((action: GameAction) => setState((value) => gameReducer(value, action)), [])

  useEffect(() => {
    loadGame().then((saved) => {
      if (saved?.version === 2) {
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

  if (!ready) return <LoadingScreen />
  if (state.view === 'welcome' || !state.hero) return <WelcomeScreen onStart={() => dispatch({ type: 'NEW_HERO' })} />
  if (state.view === 'dead') return <DeathScreen state={state} dispatch={dispatch} onHall={openHall} />

  return (
    <div className="game-shell">
      <TopBar hero={state.hero} online={onlineLeaderboardEnabled()} />
      <div className="game-grid">
        <HeroSidebar hero={state.hero} dispatch={dispatch} />
        <main className="main-stage">
          {state.view !== 'expedition' && (
            <nav className="mobile-nav" aria-label="Главное меню">
              {navItems.map((item) => (
                <button key={item.view} className={state.view === item.view ? 'active' : ''} onClick={() => item.view === 'hall' ? void openHall() : dispatch({ type: 'NAVIGATE', view: item.view })}>
                  <item.icon size={16} />{item.label}
                </button>
              ))}
            </nav>
          )}
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

function LoadingScreen() {
  return <div className="loading-screen"><div className="brand-mark small"><span>ПК</span></div><p>Разжигаем угли…</p></div>
}

function WelcomeScreen({ onStart }: { onStart: () => void }) {
  return (
    <div className="welcome-screen">
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

function TopBar({ hero, online }: { hero: Hero; online: boolean }) {
  return (
    <header className="top-bar">
      <div className="top-brand"><span className="mini-sigil">ПК</span><div><strong>Пепельный Круг</strong><small>Убежище обречённых</small></div></div>
      <div className="top-resources">
        <Tooltip text="Уровень растёт вместе с опытом. Каждые три уровня вы выбираете постоянный перк."><span tabIndex={0}><UserRound size={15} /><small>Уровень</small><b>{hero.level}</b></span></Tooltip>
        <Tooltip text="Золото тратится в таверне и лавке. Оно сохраняется между походами, пока боец жив."><span tabIndex={0}><CircleDollarSign size={15} /><small>Золото</small><b>{hero.gold}</b></span></Tooltip>
        <Tooltip text="Очки определяют место в рейтинге и остаются в записи бойца после окончательной смерти."><span tabIndex={0}><Trophy size={15} /><small>Очки</small><b>{hero.score.toLocaleString('ru-RU')}</b></span></Tooltip>
        <Tooltip text={online ? 'Результаты синхронизируются с общей таблицей лидеров.' : 'Игра и рейтинг сохраняются только на этом устройстве.'}><span tabIndex={0} className={`sync-pill ${online ? 'online' : ''}`}>{online ? <Sparkles size={13} /> : <CloudOff size={13} />}{online ? 'Рейтинг в сети' : 'Локальный режим'}</span></Tooltip>
      </div>
    </header>
  )
}

function HeroSidebar({ hero, dispatch }: { hero: Hero; dispatch: (action: GameAction) => void }) {
  const stats = getHeroStats(hero)
  const hpPercent = Math.max(0, Math.min(100, hero.hp / stats.maxHp * 100))
  const xpPercent = hero.xp / hero.xpToNext * 100
  return (
    <aside className="left-sidebar">
      <section className="hero-card">
        <div className="hero-identity">
          <div className="level-medallion"><span>{hero.level}</span><small>ур.</small></div>
          <div><h2>{hero.name}</h2><p>{hero.epithet}</p></div>
        </div>
        <Meter label="Здоровье" value={`${hero.hp} / ${stats.maxHp}`} percent={hpPercent} kind="health" hint={statHints.health} />
        <Meter label="Опыт" value={`${hero.xp} / ${hero.xpToNext}`} percent={xpPercent} kind="xp" hint={statHints.xp} />
        <div className="stats-grid">
          {(['strength', 'agility', 'luck'] as Attribute[]).map((attribute) => (
            <Tooltip text={statHints[attribute]} key={attribute}>
              <div className="stat-cell" tabIndex={0}>
                <span>{attributeName(attribute)}</span>
                <b>{stats[attribute]}</b>
                {hero.unspent > 0 && <button aria-label={`Увеличить ${attributeName(attribute)}`} onClick={() => dispatch({ type: 'ADD_ATTRIBUTE', attribute })}>+</button>}
              </div>
            </Tooltip>
          ))}
          <Tooltip text={statHints.armor}><div className="stat-cell" tabIndex={0}><span>Броня</span><b>{stats.armor}</b></div></Tooltip>
        </div>
        {hero.unspent > 0 && <p className="unspent"><Sparkles size={13} /> Доступно очков: {hero.unspent}</p>}
      </section>
      <PaperDoll hero={hero} dispatch={dispatch} />
      <PerkStrip hero={hero} />
    </aside>
  )
}

function Meter({ label, value, percent, kind, hint }: { label: string; value: string; percent: number; kind: string; hint?: string }) {
  const meter = <div className="meter-wrap" tabIndex={hint ? 0 : undefined}><div className="meter-label"><span>{label}</span><b>{value}</b></div><div className={`meter ${kind}`}><i style={{ width: `${percent}%` }} /></div></div>
  return hint ? <Tooltip text={hint}>{meter}</Tooltip> : meter
}

function PaperDoll({ hero, dispatch }: { hero: Hero; dispatch: (action: GameAction) => void }) {
  const slots = Object.keys(slotNames) as EquipSlot[]
  return (
    <section className="paper-doll panel-block">
      <div className="section-cap"><span>Снаряжение</span><Shield size={15} /></div>
      <div className="doll-stage">
        <FighterSilhouette variant={hero.id.length % 6} />
        {slots.map((slot, index) => {
          const item = hero.inventory.find((candidate) => candidate.id === hero.equipment[slot])
          return (
            <Tooltip key={slot} text={item ? `${item.name}. ${statSummary(item) || item.description} Нажмите, чтобы снять.` : `${slotNames[slot]}: слот свободен.`}>
              <button className={`gear-slot slot-${index} ${item ? `filled rarity-${item.rarity}` : ''}`} onClick={() => item && dispatch({ type: 'UNEQUIP', slot })}>
                <span>{item ? itemIcon(item) : '+'}</span><small>{slotNames[slot]}</small>
              </button>
            </Tooltip>
          )
        })}
      </div>
    </section>
  )
}

function FighterSilhouette({ variant = 0, enemy = false }: { variant?: number; enemy?: boolean }) {
  return (
    <div className={`fighter-silhouette variant-${variant} ${enemy ? 'enemy' : ''}`} aria-hidden="true">
      <i className="fighter-aura" /><i className="fighter-head" /><i className="fighter-body" /><i className="fighter-arm arm-left" /><i className="fighter-arm arm-right" /><i className="fighter-leg leg-left" /><i className="fighter-leg leg-right" /><i className="fighter-weapon" />
    </div>
  )
}

function PerkStrip({ hero }: { hero: Hero }) {
  const active = getActivePerks(hero)
  const values = perks.filter((perk) => active.has(perk.id))
  return (
    <section className="panel-block perk-strip">
      <div className="section-cap"><span>Перки</span><Sparkles size={15} /></div>
      {values.length ? <div className="perk-icons">{values.map((perk) => <Tooltip text={`${perk.name}: ${perk.description}`} key={perk.id}><span tabIndex={0}>{perk.icon}</span></Tooltip>)}</div> : <p className="empty-copy">Первый выбор откроется на 3 уровне.</p>}
    </section>
  )
}

function RightSidebar({ state, dispatch }: { state: GameState; dispatch: (action: GameAction) => void }) {
  return (
    <aside className="right-sidebar">
      <InventoryPanel state={state} dispatch={dispatch} />
      <LogPanel state={state} />
    </aside>
  )
}

function InventoryPanel({ state, dispatch }: { state: GameState; dispatch: (action: GameAction) => void }) {
  const hero = state.hero!
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const selected = hero.inventory.find((item) => item.id === selectedId) ?? null
  const equipped = selected ? Object.values(hero.equipment).includes(selected.id) : false
  return (
    <section className="panel-block inventory-panel">
      <div className="section-cap"><span>Сумка <small>{hero.inventory.length}/24</small></span><Backpack size={15} /></div>
      <div className="inventory-grid">
        {hero.inventory.map((item) => (
          <Tooltip key={item.id} text={`${rarityLabels[item.rarity]}. ${item.name}. ${statSummary(item) || item.description}`}>
            <button className={`inventory-item rarity-${item.rarity} ${selectedId === item.id ? 'selected' : ''} ${Object.values(hero.equipment).includes(item.id) ? 'equipped' : ''}`} onClick={() => setSelectedId(item.id)}>
              <b>{itemIcon(item)}</b><span>{item.name}</span>
            </button>
          </Tooltip>
        ))}
        {Array.from({ length: Math.max(0, 8 - hero.inventory.length) }).map((_, index) => <i className="inventory-empty" key={index} />)}
      </div>
      {selected ? (
        <div className="item-detail">
          <Tooltip text={rarityHints[selected.rarity]}><small tabIndex={0} className={`rarity-text rarity-${selected.rarity}`}>{rarityLabels[selected.rarity]} {selected.type === 'equipment' && selected.slot ? `· ${slotNames[selected.slot]}` : '· Расходник'}</small></Tooltip>
          <h4>{selected.name}</h4>
          <b className="item-stats">{statSummary(selected) || selected.description}</b>
          {statSummary(selected) && <p>{selected.description}</p>}
          {selected.perk && (() => { const perk = perks.find((candidate) => candidate.id === selected.perk); return perk ? <Tooltip text={perk.description}><p tabIndex={0} className="embedded-perk">Дар: {perk.name}</p></Tooltip> : null })()}
          <div className="item-actions">
            {selected.type === 'equipment' ? (
              equipped ? <button onClick={() => dispatch({ type: 'UNEQUIP', slot: selected.slot! })}>Снять</button> : <button onClick={() => dispatch({ type: 'EQUIP', itemId: selected.id })}>Надеть</button>
            ) : <button onClick={() => dispatch({ type: 'USE_ITEM', itemId: selected.id })}>Использовать</button>}
            {state.view === 'shop' && !equipped && <button className="quiet" onClick={() => { dispatch({ type: 'SELL', itemId: selected.id }); setSelectedId(null) }}>Продать</button>}
          </div>
        </div>
      ) : <p className="empty-copy inventory-hint">Выбери предмет, чтобы изучить его.</p>}
    </section>
  )
}

function LogPanel({ state }: { state: GameState }) {
  return (
    <section className="panel-block log-panel">
      <div className="section-cap"><span>Летопись</span><History size={15} /></div>
      <div className="log-list">
        {state.logs.map((entry) => <p className={entry.tone} key={entry.id}>{entry.text}</p>)}
      </div>
    </section>
  )
}

function HubScreen({ state, dispatch, onHall }: { state: GameState; dispatch: (action: GameAction) => void; onHall: () => void }) {
  const [difficulty, setDifficulty] = useState(3)
  const hero = state.hero!
  const danger = difficulty <= 3 ? 'Терпимый риск' : difficulty <= 6 ? 'Верная боль' : difficulty <= 8 ? 'Почти самоубийство' : 'Приговор'
  return (
    <div className="hub-screen screen-pad">
      <div className="hub-art" />
      <section className="hub-welcome">
        <p className="eyebrow">УБЕЖИЩЕ · ДЕНЬ {Math.max(1, hero.victories + 1)}</p>
        <h1>Круг снова<br />требует <em>имя</em></h1>
        <p>Отдохни, проверь сталь и выбери, насколько сильно хочешь разозлить глубины.</p>
      </section>
      <div className="destination-grid">
        <button className="destination tavern-destination" onClick={() => dispatch({ type: 'NAVIGATE', view: 'tavern' })}><span><Beer /></span><div><small>ЗАЛАТАТЬ РАНЫ</small><b>Таверна «Сбитый зуб»</b><p>Отдых, слухи и работа</p></div><ChevronRight /></button>
        <button className="destination shop-destination" onClick={() => dispatch({ type: 'NAVIGATE', view: 'shop' })}><span><ShoppingBag /></span><div><small>ПОТРАТИТЬ ДОБЫЧУ</small><b>Лавка Мирры</b><p>Оружие, броня и смеси</p></div><ChevronRight /></button>
        <button className="destination hall-destination" onClick={onHall}><span><Trophy /></span><div><small>ПОМЕРИТЬСЯ СЛАВОЙ</small><b>Доска павших</b><p>Лучшие результаты бойцов</p></div><ChevronRight /></button>
      </div>
      <section className="expedition-launch panel-block">
        <div className="expedition-copy"><span className="route-icon"><Map /></span><div><small>СЛЕДУЮЩИЙ ПОХОД</small><h2>Выбери меру безрассудства</h2><p>Сложность усиливает врагов, опыт, золото, очки и качество добычи.</p></div></div>
        <div className="difficulty-row">
          <Tooltip text="Сложность усиливает врагов и одновременно повышает опыт, золото, очки и качество добычи."><div className="difficulty-value" tabIndex={0}><b>{difficulty}</b><span>/ 10</span><small>{danger}</small></div></Tooltip>
          <div className="slider-wrap"><input aria-label="Сложность похода" type="range" min="1" max="10" value={difficulty} onChange={(event) => setDifficulty(Number(event.target.value))} /><div className="slider-ticks">{Array.from({ length: 10 }, (_, index) => <i key={index}>{index + 1}</i>)}</div></div>
          <button className="primary-button" onClick={() => dispatch({ type: 'START_EXPEDITION', difficulty })}>Начать поход <DoorOpen size={18} /></button>
        </div>
      </section>
    </div>
  )
}

function TavernScreen({ state, dispatch }: { state: GameState; dispatch: (action: GameAction) => void }) {
  const hero = state.hero!
  const stats = getHeroStats(hero)
  const missing = stats.maxHp - hero.hp
  const restCost = Math.max(4, Math.ceil(missing / 4))
  const quest = state.quest
  const offer = state.questOffer
  return (
    <div className="location-screen screen-pad tavern-screen">
      <ScreenHeading eyebrow="ТАВЕРНА · БЕЗОПАСНАЯ ЗОНА" title="Сбитый зуб" description="Здесь не задают вопросов. Только зашивают, наливают и записывают долги." icon={<Beer />} onBack={() => dispatch({ type: 'NAVIGATE', view: 'hub' })} />
      <div className="location-grid">
        <ActionCard icon={<Heart />} title="Комната наверху" description={missing ? `Вернуть ${missing} здоровья. Постель скрипит, но нож под ребро не входит.` : 'Раны затянулись. Можно просто послушать храп.'} meta={`${restCost} золота`} button="Отдохнуть" disabled={!missing} onClick={() => dispatch({ type: 'REST' })} />
        <ActionCard icon={<Save />} title="Закрепить путь" description="Игра уже сохраняет каждое решение. Эта кнопка нужна людям, которые не доверяют магии." meta="Безопасно" button="Сохранить сейчас" onClick={() => { void saveGame(state); dispatch({ type: 'SET_DIFFICULTY_NOTICE', notice: 'Текущее состояние записано. Откат после смерти невозможен.' }) }} />
        <section className="quest-card panel-block">
          <div className="card-icon"><ShieldAlert /></div><small>{quest ? 'ТЕКУЩИЙ ЗАКАЗ' : 'ДОСКА ЗАКАЗОВ'}</small>
          {quest ? <><h3>{quest.name}</h3><p>{quest.description}</p><div className="quest-progress"><i style={{ width: `${Math.min(100, quest.progress / quest.goal * 100)}%` }} /></div><b>{quest.progress} / {quest.goal} · {quest.rewardGold} золота · {quest.rewardScore} очков</b>{quest.complete && <button className="secondary-button" onClick={() => dispatch({ type: 'CLAIM_QUEST' })}>Забрать награду</button>}</> : offer ? <><h3>{offer.name}</h3><p>{offer.description}</p><b>{offer.rewardGold} золота · {offer.rewardScore} очков</b><button className="secondary-button" onClick={() => dispatch({ type: 'ACCEPT_QUEST' })}>Взять заказ</button><button className="text-button" onClick={() => dispatch({ type: 'ROLL_QUEST' })}><RotateCcw size={14} /> Другой слух · 3 золота</button></> : <button className="secondary-button" onClick={() => dispatch({ type: 'ROLL_QUEST' })}>Расспросить за 3 золота</button>}
        </section>
      </div>
    </div>
  )
}

function ShopScreen({ state, dispatch }: { state: GameState; dispatch: (action: GameAction) => void }) {
  return (
    <div className="location-screen screen-pad shop-screen">
      <ScreenHeading eyebrow="ЛАВКА · ТОВАР ОБНОВЛЯЕТСЯ ПОСЛЕ ПОХОДА" title="Мирра знает цену" description="Не спрашивай, кому раньше принадлежала вещь. И почему на ней ещё тепло." icon={<ShoppingBag />} onBack={() => dispatch({ type: 'NAVIGATE', view: 'hub' })} />
      <div className="shop-list">
        {state.shop.map((item) => {
          const price = Math.ceil(item.value * 1.35)
          const itemPerk = item.perk ? perks.find((perk) => perk.id === item.perk) : null
          return <article className={`shop-item rarity-${item.rarity}`} key={item.id}><div className="shop-icon">{itemIcon(item)}</div><div className="shop-info"><Tooltip text={rarityHints[item.rarity]}><small tabIndex={0}>{rarityLabels[item.rarity]} {item.slot ? `· ${slotNames[item.slot]}` : '· Расходник'}</small></Tooltip><h3>{item.name}</h3><p>{statSummary(item) || item.description}</p>{itemPerk && <Tooltip text={itemPerk.description}><span tabIndex={0}>Дар: {itemPerk.name}</span></Tooltip>}</div><button disabled={state.hero!.gold < price} onClick={() => dispatch({ type: 'BUY', itemId: item.id })}><b>{price}</b><small>золота</small></button></article>
        })}
      </div>
      <p className="shop-tip">Чтобы продать трофей, выбери его в сумке справа.</p>
    </div>
  )
}

function HallScreen({ state, dispatch }: { state: GameState; dispatch: (action: GameAction) => void }) {
  const entries: LeaderboardEntry[] = state.leaderboard.length ? state.leaderboard : state.fallen.map((entry) => ({ ...entry, isLocal: true }))
  return (
    <div className="location-screen screen-pad hall-screen">
      <ScreenHeading eyebrow={onlineLeaderboardEnabled() ? 'ОБЩИЙ РЕЙТИНГ · СИНХРОНИЗИРОВАНО' : 'ЛОКАЛЬНЫЙ РЕЙТИНГ · БЕЗ СЕТИ'} title="Доска павших" description="Живые спорят. Мёртвые остаются на доске ровно там, куда сумели добраться." icon={<Trophy />} onBack={() => dispatch({ type: 'NAVIGATE', view: 'hub' })} />
      {!entries.length ? <div className="empty-hall"><Crown /><h3>Пока ни одного имени</h3><p>Это хорошая новость для бойца и плохая для летописца.</p></div> : <div className="leaderboard"><div className="leaderboard-head"><span>Место и боец</span><span>Уровень</span><span>Победы</span><span>Очки</span></div>{entries.map((entry, index) => <div className={`leader-row ${entry.id === state.hero?.id ? 'current' : ''}`} key={entry.id}><b className="rank">{entry.rank ?? index + 1}</b><div><strong>{entry.name}</strong><small>{entry.epithet}</small></div><span>{entry.level}</span><span>{entry.victories}</span><b>{entry.score.toLocaleString('ru-RU')}</b></div>)}</div>}
      {!onlineLeaderboardEnabled() && <div className="offline-explainer"><CloudOff size={17} /><p>Сейчас показаны результаты на этом устройстве. Добавь Supabase-переменные из <code>.env.example</code>, чтобы включить общую таблицу.</p></div>}
    </div>
  )
}

function ExpeditionScreen({ state, dispatch }: { state: GameState; dispatch: (action: GameAction) => void }) {
  const run = state.expedition
  if (!run) return null
  return (
    <div className="expedition-screen">
      <header className="run-header"><div><button className="icon-button" aria-label="Назад" onClick={() => dispatch({ type: 'SET_DIFFICULTY_NOTICE', notice: 'Из похода можно вернуться только после его завершения.' })}><ArrowLeft /></button><div><small>ПОХОД · СЛОЖНОСТЬ {run.difficulty}</small><h2>{run.name}</h2></div></div><Tooltip text={`Условие похода: ${run.conditionDescription}`}><span tabIndex={0}><Dices size={15} /><b>{run.condition}</b><small>{run.conditionDescription}</small></span></Tooltip><div className="run-gains"><span>Добыто <b>{run.earnedGold}</b> зол.</span><span>Заработано <b>{run.earnedScore}</b> очк.</span></div></header>
      <RunMap run={run} />
      {run.modifiers.length > 0 && <div className="run-modifiers">{run.modifiers.map((modifier, index) => <Tooltip text={`${modifier.tone === 'boon' ? 'Благословение' : 'Проклятие'}: ${modifier.description}`} key={`${modifier.id}-${index}`}><span tabIndex={0} className={modifier.tone}><i>{modifier.tone === 'boon' ? '✦' : '◆'}</i><b>{modifier.name}</b><small>{modifier.description}</small></span></Tooltip>)}</div>}
      <div className="encounter-area">
        {run.complete ? <CompleteEncounter state={state} dispatch={dispatch} /> : run.reward ? <RewardEncounter reward={run.reward} dispatch={dispatch} /> : run.combat ? <CombatEncounter state={state} dispatch={dispatch} /> : run.event ? <EventEncounter state={state} dispatch={dispatch} /> : <NodeGate state={state} dispatch={dispatch} />}
      </div>
    </div>
  )
}

function RunMap({ run }: { run: NonNullable<GameState['expedition']> }) {
  const depths = Array.from(new Set(run.nodes.map((node) => node.depth)))
  return <div className="run-map">{depths.map((depth, stageIndex) => {
    const nodes = run.nodes.filter((node) => node.depth === depth)
    return <div className={`run-stage ${depth === run.current ? 'active' : depth < run.current ? 'passed' : ''}`} key={depth}><div className="stage-nodes">{nodes.map((node) => <Tooltip text={`${node.title}: ${node.subtitle}`} key={node.id}><div tabIndex={0} className={`run-node ${node.state} type-${node.type}`}><i><NodeIcon type={node.type} /></i>{node.state === 'current' && <span><b>{depth + 1}. {node.title}</b><small>{node.subtitle}</small></span>}</div></Tooltip>)}</div>{stageIndex < depths.length - 1 && <em className="route-line" />}</div>
  })}</div>
}

function NodeGate({ state, dispatch }: { state: GameState; dispatch: (action: GameAction) => void }) {
  const run = state.expedition!
  const options = run.nodes.filter((node) => node.depth === run.current && (node.state === 'available' || node.state === 'current'))
  const selected = run.nodes.find((node) => node.id === run.selectedNodeId) ?? null
  return <div className="node-gate"><div className="gate-symbol">{selected ? <NodeIcon type={selected.type} /> : <Map />}</div><p className="eyebrow">ГЛУБИНА {run.current + 1} ИЗ 8</p><h1>{selected ? selected.title : options.length > 1 ? 'Развилка' : 'Дорога зовёт'}</h1><p>{selected ? `${selected.subtitle}. После входа другие ветви этой глубины закроются.` : 'Выбери следующую комнату. Её тип известен, но содержимое будет создано только после входа.'}</p><div className={`path-options count-${options.length}`}>{options.map((node) => <button className={selected?.id === node.id ? 'selected' : ''} onClick={() => dispatch({ type: 'SELECT_NODE', nodeId: node.id })} key={node.id}><i><NodeIcon type={node.type} /></i><span><b>{node.title}</b><small>{node.subtitle}</small></span>{selected?.id === node.id ? <Shield size={15} /> : <ChevronRight size={15} />}</button>)}</div>{selected && <button className="primary-button" onClick={() => dispatch({ type: 'ENTER_NODE' })}>Войти и закрыть развилку <ChevronRight /></button>}</div>
}

function NodeIcon({ type }: { type: NonNullable<GameState['expedition']>['nodes'][number]['type'] }) {
  if (type === 'battle') return <Swords />
  if (type === 'event') return <Dices />
  if (type === 'camp') return <TentTree />
  if (type === 'elite') return <ShieldAlert />
  if (type === 'shrine') return <Sparkles />
  if (type === 'treasure') return <PackageOpen />
  return <Skull />
}

function CombatEncounter({ state, dispatch }: { state: GameState; dispatch: (action: GameAction) => void }) {
  const combat = state.expedition!.combat!
  const hero = state.hero!
  const stats = getHeroStats(hero)
  const consumables = hero.inventory.filter((item) => item.type === 'consumable')
  return (
    <div className="combat-encounter">
      <div className="combat-scene">
        <Combatant name={hero.name} subtitle={`${stats.strength} сила · ${stats.armor} броня`} hp={hero.hp} maxHp={stats.maxHp} variant={hero.id.length % 6} />
        <div className="versus-mark"><small>ХОД</small><b>{combat.turn}</b><Swords /></div>
        <Combatant enemy name={combat.enemy.name} subtitle={combat.enemy.title} trait={combat.enemy.trait} traitDescription={combat.enemy.traitDescription} mutations={combat.enemy.mutations} hp={combat.enemy.hp} maxHp={combat.enemy.maxHp} variant={combat.enemy.portrait} />
      </div>
      <div className="combat-message"><ShieldAlert size={18} /><p>{combat.message}</p><Tooltip text="Ловкость иногда раскрывает направление следующей атаки. При равной ловкости шанс равен 25%; каждое очко преимущества меняет его на 5%."><span tabIndex={0}>{combat.enemyIntentRevealed ? <>Ловкость раскрывает: <b>удар в {zones[combat.enemyIntent].toLowerCase()}</b></> : <>Намерение врага: <b>неясно</b></>}</span></Tooltip></div>
      <div className="combat-controls">
        <ChoiceGroup mode="attack" title="Куда ударить" value={combat.attackZone} onChange={(zone) => dispatch({ type: 'SELECT_ATTACK', zone })} />
        <ChoiceGroup mode="block" title="Что защитить" value={combat.blockZone} onChange={(zone) => dispatch({ type: 'SELECT_BLOCK', zone })} />
        <TechniqueGroup value={combat.technique} stamina={combat.stamina} onChange={(technique) => dispatch({ type: 'SELECT_TECHNIQUE', technique })} />
        <button className="fight-button" disabled={!combat.attackZone || !combat.blockZone} onClick={() => dispatch({ type: 'FIGHT' })}><Swords /> Сойтись</button>
      </div>
      <div className="combat-utility"><Tooltip text="Выносливость расходуется на тяжёлые удары и финты. После каждого хода восстанавливается 1 единица."><span tabIndex={0}>Выносливость: <b>{'◆'.repeat(combat.stamina)}{'◇'.repeat(4 - combat.stamina)}</b></span></Tooltip>{consumables.map((item) => <Tooltip text={item.description} key={item.id}><button onClick={() => dispatch({ type: 'USE_ITEM', itemId: item.id })}>{itemIcon(item)} {item.name}</button></Tooltip>)}</div>
    </div>
  )
}

function Combatant({ name, subtitle, hp, maxHp, variant, mutations = [], enemy = false, trait, traitDescription }: { name: string; subtitle: string; hp: number; maxHp: number; variant: number; mutations?: string[]; enemy?: boolean; trait?: string; traitDescription?: string }) {
  return <div className={`combatant ${enemy ? 'enemy' : ''}`}><div className="combatant-visual"><FighterSilhouette variant={variant} enemy={enemy} /></div><div className="combatant-tag"><h3>{name}</h3><p>{subtitle}{trait && traitDescription && <> · <Tooltip text={traitDescription}><span className="keyword" tabIndex={0}>{trait}</span></Tooltip></>}</p>{mutations.length > 0 && <div className="mutation-row">{mutations.map((mutation) => { const details = enemyMutations.find(([name]) => name === mutation)?.[1] ?? 'Особая мутация противника.'; return <Tooltip text={details} key={mutation}><span tabIndex={0}>{mutation}</span></Tooltip> })}</div>}<Meter label="Кровь" value={`${hp} / ${maxHp}`} percent={hp / maxHp * 100} kind={enemy ? 'enemy-health' : 'health'} hint={enemy ? 'Кровь врага. Опустите её до нуля, чтобы победить.' : statHints.health} /></div></div>
}

function ChoiceGroup({ title, value, mode, onChange }: { title: string; value: Zone | null; mode: 'attack' | 'block'; onChange: (zone: Zone) => void }) {
  return <div className="choice-group"><small>{title}</small><div>{(Object.keys(zones) as Zone[]).map((zone) => <Tooltip text={mode === 'attack' ? zoneHints[zone] : `Защита зоны «${zones[zone].toLowerCase()}». Если враг ударит сюда, вы получите только 22% обычного урона.`} key={zone}><button className={value === zone ? 'selected' : ''} onClick={() => onChange(zone)}>{zones[zone]}</button></Tooltip>)}</div></div>
}

function TechniqueGroup({ value, stamina, onChange }: { value: Technique; stamina: number; onChange: (technique: Technique) => void }) {
  const values: Array<[Technique, string, string]> = [['quick', 'Быстро', '0'], ['heavy', 'Тяжело', '2'], ['feint', 'Финт', '1']]
  return <div className="choice-group technique-group"><small>Приём</small><div>{values.map(([technique, label, cost]) => <Tooltip text={techniqueHints[technique]} key={technique}><button disabled={stamina < Number(cost)} className={value === technique ? 'selected' : ''} onClick={() => onChange(technique)}>{label}<i>−{cost} вын.</i></button></Tooltip>)}</div></div>
}

function EventEncounter({ state, dispatch }: { state: GameState; dispatch: (action: GameAction) => void }) {
  const event = state.expedition!.event!
  return <div className="event-encounter"><div className="event-symbol">{event.icon}</div><p className="eyebrow">СЛУЧАЙНАЯ ВСТРЕЧА</p><h1>{event.title}</h1><p className="event-description">{event.description}</p><div className="event-choices">{event.choices.map((choice, index) => <button key={`${choice.label}-${index}`} onClick={() => dispatch({ type: 'EVENT_CHOICE', index })}><b>{choice.label}</b><span>{choice.hint}</span><ChevronRight /></button>)}</div></div>
}

function RewardEncounter({ reward, dispatch }: { reward: Item; dispatch: (action: GameAction) => void }) {
  const rewardPerk = reward.perk ? perks.find((perk) => perk.id === reward.perk) : null
  return <div className="reward-encounter"><PackageOpen size={34} /><p className="eyebrow">ДОБЫЧА</p><div className={`reward-item rarity-${reward.rarity}`}><span>{itemIcon(reward)}</span><div><Tooltip text={rarityHints[reward.rarity]}><small tabIndex={0}>{rarityLabels[reward.rarity]} {reward.slot ? `· ${slotNames[reward.slot]}` : ''}</small></Tooltip><h2>{reward.name}</h2><p>{statSummary(reward) || reward.description}</p>{rewardPerk && <Tooltip text={rewardPerk.description}><b tabIndex={0}>Дар: {rewardPerk.name}</b></Tooltip>}</div></div><div className="reward-actions"><button className="primary-button" onClick={() => dispatch({ type: 'TAKE_REWARD' })}>Забрать</button><button className="secondary-button" onClick={() => dispatch({ type: 'LEAVE_REWARD' })}>Оставить</button></div></div>
}

function CompleteEncounter({ state, dispatch }: { state: GameState; dispatch: (action: GameAction) => void }) {
  const run = state.expedition!
  return <div className="complete-encounter"><Trophy /><p className="eyebrow">ПОХОД ЗАВЕРШЁН</p><h1>Глубины отступили</h1><p>На этот раз. Ты уносишь {run.earnedGold} золота и {run.earnedScore} рейтинговых очков.</p><button className="primary-button" onClick={() => dispatch({ type: 'RETURN_HOME' })}>Вернуться в убежище <Footprints /></button></div>
}

function ScreenHeading({ eyebrow, title, description, icon, onBack }: { eyebrow: string; title: string; description: string; icon: React.ReactNode; onBack: () => void }) {
  return <header className="screen-heading"><button className="icon-button" onClick={onBack}><ArrowLeft /></button><span className="heading-icon">{icon}</span><div><small>{eyebrow}</small><h1>{title}</h1><p>{description}</p></div></header>
}

function ActionCard({ icon, title, description, meta, button, disabled, onClick }: { icon: React.ReactNode; title: string; description: string; meta: string; button: string; disabled?: boolean; onClick: () => void }) {
  return <section className="action-card panel-block"><div className="card-icon">{icon}</div><small>УСЛУГА</small><h3>{title}</h3><p>{description}</p><b>{meta}</b><button disabled={disabled} className="secondary-button" onClick={onClick}>{button}</button></section>
}

function PerkModal({ state, dispatch }: { state: GameState; dispatch: (action: GameAction) => void }) {
  const choices = state.perkChoices.map((id) => perks.find((perk) => perk.id === id)!).filter(Boolean)
  return <div className="modal-backdrop"><section className="perk-modal"><Sparkles /><p className="eyebrow">УРОВЕНЬ {state.hero!.level} · ДАР КРУГА</p><h1>Выбери, кем станешь</h1><p>Один дар останется с бойцом до самой смерти. Предметы могут временно давать другие.</p><div className="perk-choice-grid">{choices.map((perk) => <button key={perk.id} onClick={() => dispatch({ type: 'CHOOSE_PERK', perkId: perk.id })}><span>{perk.icon}</span><h3>{perk.name}</h3><p>{perk.description}</p><b>Выбрать</b></button>)}</div></section></div>
}

function DeathScreen({ state, dispatch, onHall }: { state: GameState; dispatch: (action: GameAction) => void; onHall: () => void }) {
  const hero = state.hero!
  return <div className="death-screen"><div className="death-sun" /><Skull className="death-skull" /><p className="eyebrow">ИСТОРИЯ ЗАВЕРШЕНА</p><h1>{hero.name}<br /><em>{hero.epithet}</em></h1><p>Пепел не возвращает мёртвых. Но Круг сохранил имя.</p><div className="death-stats"><span><small>Уровень</small><b>{hero.level}</b></span><span><small>Победы</small><b>{hero.victories}</b></span><span><small>Очки</small><b>{hero.score.toLocaleString('ru-RU')}</b></span></div><div className="death-actions"><button className="primary-button" onClick={() => dispatch({ type: 'NEW_HERO' })}>Новый боец <Footprints /></button><button className="secondary-button" onClick={onHall}>Доска павших <Trophy /></button></div></div>
}

function Notice({ text, onClose }: { text: string; onClose: () => void }) {
  useEffect(() => { const timer = window.setTimeout(onClose, 4200); return () => window.clearTimeout(timer) }, [onClose, text])
  return <button className="notice" onClick={onClose}><ShieldAlert size={17} />{text}</button>
}

export default App
