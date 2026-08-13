import { useEffect, useRef, useState, type ChangeEvent, type CSSProperties, type ReactNode } from 'react'
import {
  ArrowLeft, Beer, ChevronRight, CloudOff, Crown, DoorOpen, Download, Hammer, Heart, Map,
  RotateCcw, Save, ShieldAlert, ShoppingBag, Trophy, Upload,
} from 'lucide-react'
import { buyPrice, restPrice } from '../game/balance'
import { getHeroStats, statSummary } from '../game/engine'
import { contentRegistry } from '../game/registry'
import { exportGame, exportRunSummaries, importGame, loadRunSummaries, onlineLeaderboardEnabled, saveGame } from '../game/storage'
import type { GameState, LeaderboardEntry, OathId } from '../game/types'
import { oathDefinitions } from '../game/build-identity'
import { rarityHints, rarityLabels } from '../ui/text'
import type { GameDispatch } from '../ui/types'
import { Tooltip } from '../components/Tooltip'
import { ItemArt, itemPresentationClasses, itemPresentationLabel } from '../components/game/ItemArt'
import type { AccessibilitySettings } from '../game/settings'
import { assetRegistry } from '../assets/registry'
import { DAILY_RULESET_VERSION } from '../game/daily-protocol'
import { fetchDailyConfig, fetchVerifiedDailyRanks, loadDailyReceipts, localDailyConfig, pendingDailySubmissionCount, type VerifiedDailyRank } from '../game/daily-sync'

const { hall: hallArt, safehouse: safehouseArt, shop: shopArt, tavern: tavernArt } = assetRegistry.scenes.locations

const { perks, slotNames } = contentRegistry

function sceneStyle(art: string): CSSProperties {
  return { '--location-art': `url(${art})` } as CSSProperties
}

function exportHeroCard(entry: LeaderboardEntry): void {
  const payload = { name: entry.name, epithet: entry.epithet, level: entry.level, score: entry.score, victories: entry.victories, cause: entry.cause, epitaph: entry.epitaph, bestItem: entry.bestItem, perks: entry.perks, mutations: entry.mutations }
  const url = URL.createObjectURL(new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' }))
  const link = document.createElement('a')
  link.href = url
  link.download = `ashen-ring-hero-${entry.name}.json`
  link.click()
  URL.revokeObjectURL(url)
}

function downloadJson(contents: string, filename: string): void {
  const url = URL.createObjectURL(new Blob([contents], { type: 'application/json' }))
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}

export function HubScreen({ state, dispatch, onHall, accessibility, onAccessibilityChange }: { state: GameState; dispatch: GameDispatch; onHall: () => void; accessibility: AccessibilitySettings; onAccessibilityChange: (settings: AccessibilitySettings) => void }) {
  const [difficulty, setDifficulty] = useState(3)
  const [oathId, setOathId] = useState<OathId | null>(null)
  const hero = state.hero!
  const danger = difficulty <= 3 ? 'Терпимый риск' : difficulty <= 6 ? 'Верная боль' : difficulty <= 8 ? 'Почти самоубийство' : 'Приговор'
  const [dailyConfig, setDailyConfig] = useState(localDailyConfig)
  useEffect(() => { void fetchDailyConfig().then(setDailyConfig) }, [])
  return (
    <div className="hub-screen screen-pad">
      <div className="hub-art" style={{ backgroundImage: `url(${safehouseArt})` }} />
      <section className="hub-welcome"><p className="eyebrow">УБЕЖИЩЕ · ДЕНЬ {Math.max(1, hero.victories + 1)}</p><h1>Круг снова<br />требует <em>имя</em></h1><p>Отдохни, проверь сталь и выбери, насколько сильно хочешь разозлить глубины.</p></section>
      <div className="destination-grid">
        <button className="destination tavern-destination" onClick={() => dispatch({ type: 'NAVIGATE', view: 'tavern' })}><span><Beer /></span><div><small>ЗАЛАТАТЬ РАНЫ</small><b>Таверна «Сбитый зуб»</b><p>Отдых, слухи и работа</p></div><ChevronRight /></button>
        <button className="destination shop-destination" onClick={() => dispatch({ type: 'NAVIGATE', view: 'shop' })}><span><ShoppingBag /></span><div><small>ПОТРАТИТЬ ДОБЫЧУ</small><b>Лавка Мирры</b><p>Оружие, броня и смеси</p></div><ChevronRight /></button>
        <button className="destination hall-destination" onClick={onHall}><span><Trophy /></span><div><small>ПОМЕРИТЬСЯ СЛАВОЙ</small><b>Доска павших</b><p>Лучшие результаты бойцов</p></div><ChevronRight /></button>
      </div>
      <section className="expedition-launch panel-block">
        <div className="expedition-copy"><span className="route-icon"><Map /></span><div><small>СЛЕДУЮЩИЙ ПОХОД</small><h2>Выбери меру безрассудства</h2><p>Сложность усиливает врагов, опыт, золото, очки и качество добычи.</p></div></div>
        <fieldset className="oath-picker"><legend>Выбери клятву: выгода всегда имеет цену</legend>{oathDefinitions.map((oath) => <button type="button" aria-pressed={oathId === oath.id} className={oathId === oath.id ? 'selected' : ''} onClick={() => setOathId(oath.id)} key={oath.id}><b>{oath.name}</b><span>{oath.promise}</span><small>{oath.price}</small></button>)}</fieldset>
        <div className="difficulty-row"><Tooltip text="Сложность усиливает врагов и одновременно повышает опыт, золото, очки и качество добычи."><div className="difficulty-value" tabIndex={0}><b>{difficulty}</b><span>/ 10</span><small>{danger}</small></div></Tooltip><div className="slider-wrap"><input aria-label="Сложность похода" type="range" min="1" max="10" value={difficulty} onChange={(event) => setDifficulty(Number(event.target.value))} /><div className="slider-ticks">{Array.from({ length: 10 }, (_, index) => <i key={index}>{index + 1}</i>)}</div></div><button disabled={!oathId} className="primary-button" onClick={() => oathId && dispatch({ type: 'START_EXPEDITION', difficulty, oathId })}>Начать поход <DoorOpen size={18} /></button><button className="secondary-button" onClick={() => dispatch({ type: 'START_DAILY_EXPEDITION', seed: dailyConfig.seed, day: dailyConfig.day, rulesetVersion: dailyConfig.rulesetVersion })}>Daily {dailyConfig.day} · {DAILY_RULESET_VERSION} · {dailyConfig.source === 'server' ? 'серверный' : 'локальный'} seed</button></div>
      </section>
      <details className="onboarding-card panel-block">
        <summary>Боевая шпаргалка</summary>
        <ol>
          <li><b>Ход:</b> зона удара → зона защиты → приём → «В бой» или Enter.</li>
          <li><b>Блок:</b> совпавшая с намерением зона резко снижает урон. Разведка раскрывает точную зону за 1 выносливость.</li>
          <li><b>Выносливость:</b> быстрый удар 0, тяжёлый 2, финт 1; после хода возвращается 1.</li>
          <li><b>Статусы:</b> наведи или сфокусируй значок под именем бойца, чтобы увидеть эффект и срок.</li>
        </ol>
      </details>
      <section className="accessibility-panel panel-block" aria-label="Настройки читаемости">
        <div><small>КОМФОРТ И ДОСТУПНОСТЬ</small><h2>Настроить под себя</h2><p>Изменения сохраняются на этом устройстве.</p></div>
        <label>Тема <select aria-label="Тема интерфейса" value={accessibility.theme} onChange={(event) => onAccessibilityChange({ ...accessibility, theme: event.target.value as AccessibilitySettings['theme'] })}><option value="ashen">Пепельная</option><option value="win95">Windows 95</option></select></label>
        <label>Размер текста <select aria-label="Размер текста" value={accessibility.textScale} onChange={(event) => onAccessibilityChange({ ...accessibility, textScale: event.target.value as AccessibilitySettings['textScale'] })}><option value="normal">Обычный</option><option value="large">Крупный</option><option value="xlarge">Очень крупный</option></select></label>
        <button className={accessibility.contrast === 'high' ? 'selected' : ''} aria-pressed={accessibility.contrast === 'high'} onClick={() => onAccessibilityChange({ ...accessibility, contrast: accessibility.contrast === 'high' ? 'default' : 'high' })}>Высокий контраст</button>
        <button className={accessibility.reducedMotion ? 'selected' : ''} aria-pressed={accessibility.reducedMotion} onClick={() => onAccessibilityChange({ ...accessibility, reducedMotion: !accessibility.reducedMotion })}>Меньше анимации</button>
        <label>Эффекты <input aria-label="Громкость эффектов" type="range" min="0" max="1" step="0.05" value={accessibility.effectsVolume} onChange={(event) => onAccessibilityChange({ ...accessibility, effectsVolume: Number(event.target.value) })} /></label>
        <label>Музыка <input aria-label="Громкость музыки" type="range" min="0" max="1" step="0.05" value={accessibility.musicVolume} onChange={(event) => onAccessibilityChange({ ...accessibility, musicVolume: Number(event.target.value) })} /></label>
        <button className={accessibility.muted ? 'selected' : ''} aria-pressed={accessibility.muted} onClick={() => onAccessibilityChange({ ...accessibility, muted: !accessibility.muted })}>{accessibility.muted ? 'Звук выключен' : 'Выключить звук'}</button>
        <button onClick={() => dispatch({ type: 'START_TUTORIAL' })}>{state.tutorial.completed ? 'Повторить обучение' : state.tutorial.skipped ? 'Пройти обучение' : 'Начать обучение'}</button>
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
    <div className="location-screen screen-pad tavern-screen" style={sceneStyle(tavernArt)}>
      <ScreenHeading eyebrow="ТАВЕРНА · БЕЗОПАСНАЯ ЗОНА" title="Сбитый зуб" description="Здесь не задают вопросов. Только зашивают, наливают и записывают долги." icon={<Beer />} onBack={() => dispatch({ type: 'NAVIGATE', view: 'hub' })} />
      <div className="location-grid">
        <ActionCard icon={<Heart />} title="Комната наверху" description={missing ? `Вернуть ${missing} здоровья. Постель скрипит, но нож под ребро не входит.` : 'Раны затянулись. Можно просто послушать храп.'} meta={`${cost} золота`} button="Отдохнуть" disabled={!missing} onClick={() => dispatch({ type: 'REST' })} />
        <ActionCard icon={<Heart />} title="Подпольный лекарь" description="Вдвое дешевле, но иногда лечит так, что хочется пожалеть о выборе." meta={`${Math.max(1, Math.ceil(cost / 2))} золота · риск`} button="Рискнуть" disabled={!missing} onClick={() => { if (window.confirm('Подпольный лекарь может усугубить раны. Продолжить?')) dispatch({ type: 'RISKY_REST' }) }} />
        <SaveTransferCard state={state} dispatch={dispatch} />
        <section className="quest-card panel-block"><div className="card-icon"><ShieldAlert /></div><small>{quest ? 'ТЕКУЩИЙ ЗАКАЗ' : 'ДОСКА ЗАКАЗОВ'}</small>{quest ? <><h3>{quest.name}</h3><p>{quest.description}</p><div className="quest-progress"><i style={{ width: `${Math.min(100, quest.progress / quest.goal * 100)}%` }} /></div><b>{quest.progress} / {quest.goal} · {quest.rewardGold} золота · {quest.rewardScore} очков</b>{quest.complete && <button className="secondary-button" onClick={() => dispatch({ type: 'CLAIM_QUEST' })}>Забрать награду</button>}</> : offer ? <><h3>{offer.name}</h3><p>{offer.description}</p><b>{offer.rewardGold} золота · {offer.rewardScore} очков</b><button className="secondary-button" onClick={() => dispatch({ type: 'ACCEPT_QUEST' })}>Взять заказ</button><button className="text-button" onClick={() => dispatch({ type: 'ROLL_QUEST' })}><RotateCcw size={14} /> Другой слух · 3 золота</button></> : <button className="secondary-button" onClick={() => dispatch({ type: 'ROLL_QUEST' })}>Расспросить за 3 золота</button>}<p className="embedded-perk">Репутация: {Object.entries(hero.reputation).length ? Object.entries(hero.reputation).map(([faction, value]) => `${faction} ${value}`).join(' · ') : 'пока без имени'}</p></section>
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
    <div className="location-screen screen-pad shop-screen" style={sceneStyle(shopArt)}>
      <ScreenHeading eyebrow="ЛАВКА · ТОВАР ОБНОВЛЯЕТСЯ ПОСЛЕ ПОХОДА" title="Мирра знает цену" description="Не спрашивай, кому раньше принадлежала вещь. И почему на ней ещё тепло." icon={<ShoppingBag />} onBack={() => dispatch({ type: 'NAVIGATE', view: 'hub' })} />
      <section className="forge-materials" aria-label="Материалы кузницы"><div><Hammer size={18} /><span><small>КУЗНИЦА МИРРЫ</small><b>Выбери снаряжение в сумке справа, чтобы улучшить, перековать или разобрать его.</b></span></div><dl><div><dt>Обломки</dt><dd>{state.hero!.materials.scrap}</dd></div><div><dt>Угольки</dt><dd>{state.hero!.materials.ember}</dd></div><div><dt>Эссенции</dt><dd>{state.hero!.materials.essence}</dd></div></dl></section>
      <div className="shop-list">{state.shop.map((item) => { const price = buyPrice(item.value); const itemPerk = item.perk ? perks.find((perk) => perk.id === item.perk) : null; return <article className={`shop-item ${itemPresentationClasses(item)}`} key={item.id}><div className="shop-icon"><ItemArt item={item} /></div><div className="shop-info"><Tooltip text={rarityHints[item.rarity]}><small tabIndex={0}>{rarityLabels[item.rarity]} {item.slot ? `· ${slotNames[item.slot]}` : '· Расходник'}{itemPresentationLabel(item) ? ` · ${itemPresentationLabel(item)}` : ''}</small></Tooltip><h3>{item.name}</h3><p>{statSummary(item) || item.description}</p>{itemPerk && <Tooltip text={itemPerk.description}><span tabIndex={0}>Дар: {itemPerk.name}</span></Tooltip>}</div><button disabled={state.hero!.gold < price} onClick={() => dispatch({ type: 'BUY', itemId: item.id })}><b>{price}</b><small>золота</small></button><button onClick={() => dispatch({ type: 'HAGGLE_BUY', itemId: item.id })}>Торг</button></article> })}</div>
      <p className="shop-tip">Чтобы продать трофей, выбери его в сумке справа. <button className="text-button" onClick={() => dispatch({ type: 'REFRESH_SHOP' })}>Новый товар · 4 золота</button></p>
    </div>
  )
}

export function HallScreen({ state, dispatch }: { state: GameState; dispatch: GameDispatch }) {
  const entries: LeaderboardEntry[] = state.leaderboard.length ? state.leaderboard : state.fallen.map((entry) => ({ ...entry, isLocal: true }))
  const runSummaries = loadRunSummaries()
  const dailyReceipts = loadDailyReceipts()
  const pendingDaily = pendingDailySubmissionCount()
  const [verifiedDaily, setVerifiedDaily] = useState<VerifiedDailyRank[]>([])
  const [verifiedSeason, setVerifiedSeason] = useState<VerifiedDailyRank[]>([])
  useEffect(() => { void Promise.all([fetchVerifiedDailyRanks('daily'), fetchVerifiedDailyRanks('season')]).then(([daily, season]) => { setVerifiedDaily(daily); setVerifiedSeason(season) }) }, [])
  return (
    <div className="location-screen screen-pad hall-screen" style={sceneStyle(hallArt)}>
      <ScreenHeading eyebrow={onlineLeaderboardEnabled() ? 'ОБЩИЙ РЕЙТИНГ · НЕПРОВЕРЕННЫЕ ОБЫЧНЫЕ ЗАБЕГИ' : 'ЛОКАЛЬНЫЙ РЕЙТИНГ · БЕЗ СЕТИ'} title="Доска павших" description="Живые спорят. Обычная доска не подтверждает честность счёта; проверенные daily и сезон показаны отдельно." icon={<Trophy />} onBack={() => dispatch({ type: 'NAVIGATE', view: 'hub' })} />
      {!entries.length ? <div className="empty-hall"><Crown /><h3>Пока ни одного имени</h3><p>Это хорошая новость для бойца и плохая для летописца.</p></div> : <div className="leaderboard"><div className="leaderboard-head"><span>Место и боец</span><span>Уровень</span><span>Победы</span><span>Очки</span></div>{entries.map((entry, index) => <div className={`leader-row ${entry.id === state.hero?.id ? 'current' : ''}`} key={entry.id}><b className="rank">{entry.rank ?? index + 1}</b><div><strong>{entry.name}</strong><small>{entry.epithet} · {entry.cause}</small></div><span>{entry.level}</span><span>{entry.victories}</span><b>{entry.score.toLocaleString('ru-RU')}</b><button className="text-button" onClick={() => exportHeroCard(entry)}>Карточка</button></div>)}</div>}
      <section className="run-report-tools" aria-label="Отчёты забегов"><div><Download size={18} /><span><small>ЛОКАЛЬНЫЕ ОТЧЁТЫ ЗАБЕГОВ</small><b>{runSummaries.length ? `Сохранено ${runSummaries.length} из 20` : 'Завершённых отчётов пока нет'}</b><p>Только агрегированные игровые метрики без имени бойца, данных устройства и автоматической отправки.</p></span></div><div><button className="secondary-button" disabled={!runSummaries.length} onClick={() => downloadJson(exportRunSummaries(runSummaries.slice(0, 1)), 'ashen-ring-run-latest.json')}><Download size={14} /> Последний</button><button className="text-button" disabled={!runSummaries.length} onClick={() => downloadJson(exportRunSummaries(runSummaries), 'ashen-ring-runs.json')}><Download size={14} /> Все отчёты</button></div></section>
      {!onlineLeaderboardEnabled() && <div className="offline-explainer"><CloudOff size={17} /><p>Сейчас показаны результаты на этом устройстве. Добавь Supabase-переменные из <code>.env.example</code>, чтобы включить общую таблицу.</p></div>}
      <section className="run-report-tools daily-verification" aria-label="Проверка daily"><div><ShieldAlert size={18} /><span><small>ПРОВЕРЯЕМЫЙ DAILY · {DAILY_RULESET_VERSION}</small><b>{pendingDaily ? `Ожидают сети: ${pendingDaily}` : dailyReceipts[0]?.state === 'verified' ? `Подтверждено: ${dailyReceipts[0].score} очков` : dailyReceipts[0]?.state === 'rejected' ? 'Последний результат отклонён' : 'Подтверждённых результатов пока нет'}</b><p>Обычная кампания остаётся локальной. Daily отправляет только анонимный ID, день, версию правил и журнал игровых действий; сервер пересчитывает счёт сам.</p></span></div>{dailyReceipts[0] && <b className={`verification-state ${dailyReceipts[0].state}`}>{dailyReceipts[0].state === 'verified' ? 'ПОДТВЕРЖДЁН' : dailyReceipts[0].state === 'pending' ? 'ОЖИДАЕТ' : 'ОТКЛОНЁН'}</b>}</section>
      {(verifiedDaily.length > 0 || verifiedSeason.length > 0) && <div className="verified-rankings"><VerifiedRanking title="Daily · подтверждено" rows={verifiedDaily} /><VerifiedRanking title="Сезон · подтверждено" rows={verifiedSeason} /></div>}
    </div>
  )
}

function VerifiedRanking({ title, rows }: { title: string; rows: VerifiedDailyRank[] }) {
  return <section className="panel-block"><div className="section-cap"><span>{title}</span><ShieldAlert size={14} /></div><div className="verified-rank-list">{rows.length ? rows.map((row) => <span key={`${title}-${row.playerId}`}><b>#{row.rank}</b><code>{row.playerId.slice(0, 8)}…</code><strong>{row.score.toLocaleString('ru-RU')}</strong><small>{row.verifiedRuns ? `${row.verifiedRuns} зачтено` : row.outcome === 'victory' ? 'победа' : 'смерть'}</small></span>) : <p>Проверенных результатов пока нет.</p>}</div></section>
}

function ScreenHeading({ eyebrow, title, description, icon, onBack }: { eyebrow: string; title: string; description: string; icon: ReactNode; onBack: () => void }) {
  return <header className="screen-heading"><button className="icon-button" onClick={onBack}><ArrowLeft /></button><span className="heading-icon">{icon}</span><div><small>{eyebrow}</small><h1>{title}</h1><p>{description}</p></div></header>
}

function ActionCard({ icon, title, description, meta, button, disabled, onClick }: { icon: ReactNode; title: string; description: string; meta: string; button: string; disabled?: boolean; onClick: () => void }) {
  return <section className="action-card panel-block"><div className="card-icon">{icon}</div><small>УСЛУГА</small><h3>{title}</h3><p>{description}</p><b>{meta}</b><button disabled={disabled} className="secondary-button" onClick={onClick}>{button}</button></section>
}
