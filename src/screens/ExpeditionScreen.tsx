import {
  ArrowLeft, Backpack, ChevronRight, Dices, Eye, Footprints, Map, PackageOpen, Shield, ShieldAlert,
  Sparkles, Swords, TentTree, Trophy, Skull, Hammer, Handshake, ShoppingBag, TriangleAlert,
} from 'lucide-react'
import { useEffect, type CSSProperties } from 'react'
import { getHeroStats, getUnlockedAbilities, statSummary } from '../game/engine'
import { contentRegistry } from '../game/registry'
import type { AbilityId, EventCategory, GameState, Item, StatusEffect, Technique, Zone } from '../game/types'
import { rarityHints, rarityLabels, statHints, techniqueHints, zoneHints } from '../ui/text'
import type { GameDispatch } from '../ui/types'
import { FighterSilhouette, Meter } from '../components/game/HeroSidebar'
import { ItemArt, itemPresentationClasses, itemPresentationLabel } from '../components/game/ItemArt'
import { AbilityArt } from '../components/game/PerkArt'
import { StatusArt, statusHint } from '../components/game/StatusArt'
import { Tooltip } from '../components/Tooltip'
import { biomeArtSource, eventArtSource } from '../assets/registry'
import { inferItemTags, synergyNames } from '../game/build-identity'
import { loadRunSummaries } from '../game/storage'
import { RunDebrief } from '../components/game/RunDebrief'

const { enemyMutations, perks, slotNames, zones } = contentRegistry
const eventCategoryLabels: Record<EventCategory, string> = { altar: 'АЛТАРЬ', traveler: 'ПУТНИК', trap: 'ЛОВУШКА', cache: 'ТАЙНИК', curse: 'ПРОКЛЯТИЕ', trade: 'ТОРГОВЛЯ', 'strange-place': 'СТРАННОЕ МЕСТО', creature: 'СУЩЕСТВО', unknown: 'НЕИЗВЕСТНОЕ' }

export function ExpeditionScreen({ state, dispatch, onOpenInventory }: { state: GameState; dispatch: GameDispatch; onOpenInventory: () => void }) {
  const run = state.expedition
  if (!run) return null
  return (
    <div className={`expedition-screen ${run.combat ? 'in-combat' : ''}`} style={{ '--expedition-art': `url(${biomeArtSource(run.biome.id, 'routeArt')})` } as CSSProperties}>
      <header className="run-header"><div><button className="icon-button" aria-label="Назад" onClick={() => run.tutorial ? dispatch({ type: 'SKIP_TUTORIAL' }) : dispatch({ type: 'SET_DIFFICULTY_NOTICE', notice: 'Из похода можно вернуться только после его завершения.' })}><ArrowLeft /></button><div><small>{run.tutorial ? 'ОБУЧЕНИЕ · БЕЗОПАСНЫЙ БОЙ' : `ПОХОД · СЛОЖНОСТЬ ${run.difficulty}`}</small><h2>{run.name}</h2></div></div><Tooltip text={`${run.biome.description} · Seed ${run.seedCode}`}><span tabIndex={0}><Dices size={15} /><b>{run.biome.name}</b><small>{run.victoryCondition === 'sigils' ? `Печати ${run.sigils}/${run.sigilsRequired}` : run.condition} · {run.seedCode}</small></span></Tooltip><div className="run-gains">{run.tutorial ? <button className="text-button" onClick={() => dispatch({ type: 'SKIP_TUTORIAL' })}>Пропустить обучение</button> : <><span>Добыто <b>{run.earnedGold}</b> зол.</span><span>Заработано <b>{run.earnedScore}</b> очк.</span></>}</div></header>
      <RunMap run={run} />
      {run.modifiers.length > 0 && <div className="run-modifiers">{run.modifiers.map((modifier, index) => <Tooltip text={`${modifier.tone === 'boon' ? 'Благословение' : 'Проклятие'}: ${modifier.description}`} key={`${modifier.id}-${index}`}><span tabIndex={0} className={modifier.tone}><i>{modifier.tone === 'boon' ? '✦' : '◆'}</i><b>{modifier.name}</b><small>{modifier.description}</small></span></Tooltip>)}</div>}
      <div className="encounter-area">{run.tutorialRewards?.length ? <TutorialRewardEncounter rewards={run.tutorialRewards} dispatch={dispatch} /> : run.complete ? <CompleteEncounter state={state} dispatch={dispatch} /> : run.reward ? <RewardEncounter reward={run.reward} choices={run.rewardChoices ?? [run.reward]} salvageAvailable={Boolean(run.rewardSalvageAvailable)} dispatch={dispatch} defeatedVariant={run.combat?.enemy.portrait} defeatedPalette={run.combat?.enemy.visualPalette} /> : run.combat ? <CombatEncounter state={state} dispatch={dispatch} onOpenInventory={onOpenInventory} /> : run.event ? <EventEncounter state={state} dispatch={dispatch} /> : <NodeGate state={state} dispatch={dispatch} />}</div>
    </div>
  )
}

function RunMap({ run }: { run: NonNullable<GameState['expedition']> }) {
  const depths = Array.from(new Set(run.nodes.map((node) => node.depth)))
  return <div className="run-map">{depths.map((depth, stageIndex) => { const nodes = run.nodes.filter((node) => node.depth === depth); return <div className={`run-stage ${depth === run.current ? 'active' : depth < run.current ? 'passed' : ''}`} key={depth}><div className="stage-nodes">{nodes.map((node) => <Tooltip text={`${node.title}: ${node.subtitle}`} key={node.id}><div tabIndex={0} className={`run-node ${node.state} type-${node.type}`}><i><NodeIcon type={node.type} /></i>{node.state === 'current' && <span><b>{depth + 1}. {node.title}</b><small>{node.subtitle}</small></span>}</div></Tooltip>)}</div>{stageIndex < depths.length - 1 && <em className="route-line" />}</div> })}</div>
}

function NodeGate({ state, dispatch }: { state: GameState; dispatch: GameDispatch }) {
  const run = state.expedition!
  const options = run.nodes.filter((node) => node.depth === run.current && (node.state === 'available' || node.state === 'current'))
  const selected = run.nodes.find((node) => node.id === run.selectedNodeId) ?? null
  return <div className="node-gate"><div className="gate-symbol">{selected ? <NodeIcon type={selected.type} /> : <Map />}</div><p className="eyebrow">ГЛУБИНА {run.current + 1} ИЗ {Math.max(...run.nodes.map((node) => node.depth)) + 1}</p><h1>{selected ? selected.title : options.length > 1 ? 'Развилка' : 'Дорога зовёт'}</h1><p>{selected ? `${selected.subtitle}. После входа другие ветви этой глубины закроются.` : 'Выбери следующую комнату. Её тип известен, но содержимое будет создано только после входа.'}</p><div className={`path-options count-${options.length}`}>{options.map((node) => <button className={selected?.id === node.id ? 'selected' : ''} onClick={() => dispatch({ type: 'SELECT_NODE', nodeId: node.id })} key={node.id}><i><NodeIcon type={node.type} /></i><span><b>{node.title}</b><small>{node.subtitle}</small></span>{selected?.id === node.id ? <Shield size={15} /> : <ChevronRight size={15} />}</button>)}</div>{selected && <button className="primary-button" onClick={() => dispatch({ type: 'ENTER_NODE' })}>Войти и закрыть развилку <ChevronRight /></button>}</div>
}

function NodeIcon({ type }: { type: NonNullable<GameState['expedition']>['nodes'][number]['type'] }) {
  if (type === 'battle') return <Swords />
  if (type === 'event') return <Dices />
  if (type === 'camp') return <TentTree />
  if (type === 'elite') return <ShieldAlert />
  if (type === 'shrine') return <Sparkles />
  if (type === 'treasure' || type === 'secret') return <PackageOpen />
  if (type === 'trap') return <TriangleAlert />
  if (type === 'merchant') return <ShoppingBag />
  if (type === 'forge') return <Hammer />
  if (type === 'ally') return <Handshake />
  return <Skull />
}

function CombatEncounter({ state, dispatch, onOpenInventory }: { state: GameState; dispatch: GameDispatch; onOpenInventory: () => void }) {
  const combat = state.expedition!.combat!
  const combatArt = biomeArtSource(state.expedition!.biome.id, 'combatArt')
  const hero = state.hero!
  const stats = getHeroStats(hero)
  const heroExchange = combat.lastExchange?.hero ?? ''
  const enemyExchange = combat.lastExchange?.enemy ?? ''
  const enemyEffect = combat.lastExchange?.heroResult ?? (heroExchange.includes('КРИТ') ? 'critical' : heroExchange.includes('враг заблокировал') ? 'block' : heroExchange.includes('−') ? 'hit' : undefined)
  const heroEffect = combat.lastExchange?.enemyResult ?? (enemyExchange.includes('вы заблокировали') ? 'block' : enemyExchange.includes('−') ? 'hit' : undefined)
  const tutorial = Boolean(state.expedition?.tutorial)
  const tutorialText = combat.turn === 1
    ? 'Шаг 1/3. Выбери зону удара. Голова рискованнее, корпус надёжнее, ноги помогают контролировать бой.'
    : combat.turn === 2
      ? `Шаг 2/3. Намерение раскрыто: враг бьёт в ${zones[combat.enemyIntent].toLowerCase()}. Выбери эту же зону защиты — блок сильно снизит урон.`
      : combat.turn === 3
        ? 'Шаг 3/3. Выбери приём: быстрый не тратит выносливость, тяжёлый тратит 2, финт — 1. Выносливость восстанавливается по 1 за ход.'
        : combat.heroStatuses.length ? 'Статус появился под именем бойца. Наведи или сфокусируй его значок: подсказка покажет эффект, силу и оставшиеся ходы.' : 'Основы пройдены. Теперь закончи безопасный бой любыми зонами и приёмами.'
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.repeat || event.ctrlKey || event.metaKey || event.altKey) return
      const target = event.target as HTMLElement | null
      if (target?.matches('input, textarea, select')) return
      if (event.key === 'r' || event.key === 'R' || event.key === 'к' || event.key === 'К') dispatch({ type: 'REPEAT_COMBAT_SELECTION' })
      if (event.key === 'Enter' && combat.attackZone && combat.blockZone) dispatch({ type: 'FIGHT' })
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [combat.attackZone, combat.blockZone, dispatch])
  return (
    <div className="combat-encounter">
      <div className={`combat-scene ${combat.lastExchange && (combat.technique === 'heavy' || enemyEffect === 'critical') ? 'impact-heavy' : ''}`} key={combat.turn} style={{ backgroundImage: `linear-gradient(rgba(6,6,5,.2), rgba(6,6,5,.72)), url(${combatArt})` }}><Combatant name={hero.name} subtitle={`${stats.strength} сила · ${stats.armor} броня`} statuses={combat.heroStatuses} hp={hero.hp} maxHp={stats.maxHp} variant={hero.id.length % 6} effect={heroEffect} damage={combat.lastExchange?.enemyDamage} /><div className="versus-mark"><small>ХОД</small><b>{combat.turn}</b><Swords /></div><Combatant enemy boss={combat.enemy.boss} phase={combat.enemy.phase} portraitAsset={combat.enemy.portraitAsset} aura={combat.enemy.bossAura} palette={combat.enemy.visualPalette} name={combat.enemy.name} subtitle={`${combat.enemy.archetype}${combat.enemy.boss ? ` · фаза ${combat.enemy.phase}` : ''}`} statuses={combat.enemyStatuses} trait={combat.enemy.trait} traitDescription={combat.enemy.traitDescription} mutations={combat.enemy.mutations} hp={combat.enemy.hp} maxHp={combat.enemy.maxHp} variant={combat.enemy.portrait} effect={enemyEffect} damage={combat.lastExchange?.heroDamage} /></div>
      {tutorial && <aside className="tutorial-coach" role="status" aria-live="polite"><b>{tutorialText}</b><button onClick={() => dispatch({ type: 'SKIP_TUTORIAL' })}>Пропустить</button></aside>}
      <div className={`combat-message ${combat.lastExchange ? 'has-exchange' : ''}`}>{combat.lastExchange ? <div className="combat-exchange" role="status" aria-live="polite"><p className="hero-action"><b>ВЫ → {combat.enemy.name}</b><span>{combat.lastExchange.hero}</span></p><p className="enemy-action"><b>{combat.enemy.name} → ВЫ</b><span>{combat.lastExchange.enemy}</span></p></div> : <p role="status" aria-live="polite">{combat.message}</p>}<div className="intent-panel"><Tooltip text="Класс угрозы известен всегда. Ловкость или разведка уточняет точную зону."><span className={`enemy-intent threat-${threatClass(combat.enemyIntentKind)}`} tabIndex={0}>Угроза: <b>{threatLabel(combat.enemyIntentKind)}</b>{combat.enemyIntentRevealed ? <> · {zones[combat.enemyIntent].toLowerCase()}</> : <> · зона скрыта</>}</span></Tooltip>{combat.enemyIntentHistory.length > 0 && <div className="intent-history" aria-label="Последние действия врага"><small>ИСТОРИЯ</small>{combat.enemyIntentHistory.map((intent, index) => <Tooltip text={`${intentLabel(intent.kind)} в ${zones[intent.zone].toLowerCase()}`} key={`${combat.turn}-${index}`}><span tabIndex={0} className={`threat-${threatClass(intent.kind)}`}>{threatGlyph(intent.kind)}</span></Tooltip>)}</div>}</div></div>
      <div className="combat-controls"><ChoiceGroup disabled={tutorial && combat.turn !== 1 && combat.turn <= 3} mode="attack" title="1 · Удар" value={combat.attackZone} onChange={(zone) => dispatch({ type: 'SELECT_ATTACK', zone })} /><ChoiceGroup disabled={tutorial && combat.turn !== 2 && combat.turn <= 3} mode="block" title="2 · Защита" value={combat.blockZone} onChange={(zone) => dispatch({ type: 'SELECT_BLOCK', zone })} /><TechniqueGroup disabled={tutorial && combat.turn < 3} value={combat.technique} stamina={combat.stamina} onChange={(technique) => dispatch({ type: 'SELECT_TECHNIQUE', technique })} /><button className="fight-button" disabled={!combat.attackZone || !combat.blockZone || (tutorial && combat.turn === 3 && !state.tutorial.interactionMade)} onClick={() => dispatch({ type: 'FIGHT' })}><Swords /> В бой <small>ENTER</small></button></div>
      <div className="combat-utility"><Tooltip text="Выносливость расходуется на тяжёлые удары, финты и разведку. После каждого хода восстанавливается 1 единица."><span tabIndex={0}>Выносливость: <b>{'◆'.repeat(combat.stamina)}{'◇'.repeat(4 - combat.stamina)}</b></span></Tooltip><button className="combat-bag-button" onClick={onOpenInventory}><Backpack size={14} /> Сумка</button>{combat.lastSelection && <Tooltip text="Вернуть зоны и приём прошлого хода. Горячая клавиша: R."><button onClick={() => dispatch({ type: 'REPEAT_COMBAT_SELECTION' })}>↻ Повторить <small>R</small></button></Tooltip>}<Tooltip text="Потратить 1 выносливость, раскрыть точную зону врага и нанести 45% обычного урона в этом ходу."><button disabled={combat.scouting || combat.stamina < 1} aria-pressed={combat.scouting} className={combat.scouting ? 'scout-active' : ''} onClick={() => dispatch({ type: 'SCOUT_INTENT' })}><Eye size={14} />{combat.scouting ? 'Зона разведана' : 'Разведать'}</button></Tooltip><AbilityGroup abilities={getUnlockedAbilities(hero)} selected={combat.selectedAbility} cooldowns={combat.abilityCooldowns} onChange={(abilityId) => dispatch({ type: 'SELECT_ABILITY', abilityId })} />{combat.enemy.hp <= combat.enemy.maxHp * 0.25 && !combat.enemy.boss && <button onClick={() => dispatch({ type: 'SPARE_ENEMY' })}>Пощадить · Немезида</button>}</div>
    </div>
  )
}

function Combatant({ name, subtitle, hp, maxHp, variant, mutations = [], statuses = [], enemy = false, boss = false, phase = 1, portraitAsset, aura, palette, trait, traitDescription, effect, damage = 0 }: { name: string; subtitle: string; hp: number; maxHp: number; variant: number; mutations?: string[]; statuses?: StatusEffect[]; enemy?: boolean; boss?: boolean; phase?: number; portraitAsset?: string; aura?: import('../game/types').BossAura; palette?: import('../game/types').BossAura; trait?: string; traitDescription?: string; effect?: 'hit' | 'critical' | 'block' | 'miss' | 'status'; damage?: number }) {
  const percent = hp / maxHp * 100
  const trailPercent = Math.min(100, (hp + Math.max(0, damage)) / maxHp * 100)
  return <div className={`combatant ${enemy ? 'enemy' : ''} ${boss ? `boss boss-phase-${phase}` : ''} ${effect ? `effect-${effect}` : ''}`}><div className="combatant-visual"><FighterSilhouette variant={variant} enemy={enemy} portraitAsset={portraitAsset} aura={aura} palette={palette} />{effect && <i className="combat-impact" aria-hidden="true" />}{damage > 0 && <strong className={`floating-number ${effect === 'critical' ? 'critical' : ''}`} aria-label={`Получено ${damage} урона`}>−{damage}</strong>}{effect === 'miss' && <strong className="floating-number miss">МИМО</strong>}</div><div className="combatant-tag"><h3>{name}</h3><p>{subtitle}{trait && traitDescription && <> · <span className="trait-label">черта:</span> <Tooltip text={traitDescription}><span className="keyword" tabIndex={0}>{trait}</span></Tooltip></>}</p>{mutations.length > 0 && <div className="mutation-row">{mutations.map((mutation) => { const details = enemyMutations.find(([mutationName]) => mutationName === mutation)?.[1] ?? 'Особая мутация противника.'; return <Tooltip text={details} key={mutation}><span tabIndex={0}>{mutation}</span></Tooltip> })}</div>}{statuses.length > 0 && <div className="status-row">{statuses.map((status) => <Tooltip text={statusHint(status)} key={status.kind}><StatusArt status={status} /></Tooltip>)}</div>}<Meter label="Кровь" value={`${hp} / ${maxHp}`} percent={percent} trailPercent={trailPercent} kind={enemy ? 'enemy-health' : 'health'} hint={enemy ? 'Кровь врага. Опустите её до нуля, чтобы победить.' : statHints.health} /></div></div>
}

function ChoiceGroup({ title, value, mode, onChange, disabled = false }: { title: string; value: Zone | null; mode: 'attack' | 'block'; onChange: (zone: Zone) => void; disabled?: boolean }) {
  return <div className={`choice-group ${disabled ? 'tutorial-locked' : ''}`}><small>{title}</small><div>{(Object.keys(zones) as Zone[]).map((zone) => <Tooltip text={mode === 'attack' ? zoneHints[zone] : `Защита зоны «${zones[zone].toLowerCase()}». Если враг ударит сюда, вы получите только 22% обычного урона.`} key={zone}><button disabled={disabled} className={value === zone ? 'selected' : ''} onClick={() => onChange(zone)}>{zones[zone]}</button></Tooltip>)}</div></div>
}

function TechniqueGroup({ value, stamina, onChange, disabled = false }: { value: Technique; stamina: number; onChange: (technique: Technique) => void; disabled?: boolean }) {
  const values: Array<[Technique, string, string]> = [['quick', 'Быстро', '0'], ['heavy', 'Тяжело', '2'], ['feint', 'Финт', '1']]
  return <div className={`choice-group technique-group ${disabled ? 'tutorial-locked' : ''}`}><small>3 · Приём</small><div>{values.map(([technique, label, cost]) => <Tooltip text={techniqueHints[technique]} key={technique}><button disabled={disabled || stamina < Number(cost)} className={value === technique ? 'selected' : ''} onClick={() => onChange(technique)}>{label}<i>−{cost} вын.</i></button></Tooltip>)}</div></div>
}

function TutorialRewardEncounter({ rewards, dispatch }: { rewards: Item[]; dispatch: GameDispatch }) {
  return <div className="reward-encounter tutorial-rewards" aria-live="polite"><PackageOpen size={34} /><p className="eyebrow">ОБУЧЕНИЕ ЗАВЕРШЕНО</p><h1>Выбери одну настоящую награду</h1><p>Она останется у героя. Пропуск обучения наград не выдаёт.</p><div className="tutorial-reward-grid">{rewards.map((reward) => <button className={`reward-item ${itemPresentationClasses(reward)}`} key={reward.id} onClick={() => dispatch({ type: 'CHOOSE_TUTORIAL_REWARD', itemId: reward.id })}><ItemArt item={reward} /><span><b>{reward.name}</b><small>{reward.description}</small></span></button>)}</div></div>
}

function AbilityGroup({ abilities, selected, cooldowns, onChange }: { abilities: AbilityId[]; selected: AbilityId | null; cooldowns: Record<AbilityId, number>; onChange: (ability: AbilityId | null) => void }) {
  const definitions: Record<AbilityId, [string, string]> = { bloodletter: ['Кровопускание', 'Урон +35%, кровотечение 3 хода'], guardBreak: ['Ломатель брони', 'Снижает броню цели на 3 хода'], secondWind: ['Второе дыхание', '+2 выносливости сразу'] }
  if (!abilities.length) return null
  return <div className="ability-group">{abilities.map((id) => { const [label, hint] = definitions[id]; const cooldown = cooldowns[id]; const state = cooldown > 0 ? 'cooldown' : selected === id ? 'selected' : 'available'; return <Tooltip key={id} text={hint}><button disabled={cooldown > 0} aria-pressed={selected === id} className={`ability-${state}`} onClick={() => onChange(selected === id ? null : id)}><AbilityArt ability={id} /><span>{label}<small>{state === 'cooldown' ? 'ПЕРЕЗАРЯДКА' : state === 'selected' ? 'ВЫБРАНО' : 'ДОСТУПНО'}</small></span>{cooldown > 0 && <i>{cooldown}</i>}</button></Tooltip> })}</div>
}

function intentLabel(kind: 'strike' | 'crushingBlow' | 'venomousCut' | 'arcaneBurst'): string { return ({ strike: 'удар', crushingBlow: 'сокрушающий удар', venomousCut: 'ядовитый выпад', arcaneBurst: 'мистический всплеск' })[kind] }
function threatClass(kind: 'strike' | 'crushingBlow' | 'venomousCut' | 'arcaneBurst'): 'fast' | 'heavy' | 'special' { return kind === 'strike' ? 'fast' : kind === 'crushingBlow' ? 'heavy' : 'special' }
function threatLabel(kind: 'strike' | 'crushingBlow' | 'venomousCut' | 'arcaneBurst'): string { return ({ strike: 'быстрый удар', crushingBlow: 'тяжёлый удар', venomousCut: 'особый приём', arcaneBurst: 'особый приём' })[kind] }
function threatGlyph(kind: 'strike' | 'crushingBlow' | 'venomousCut' | 'arcaneBurst'): string { return ({ strike: '↗', crushingBlow: '◆', venomousCut: '☠', arcaneBurst: '✦' })[kind] }

function EventEncounter({ state, dispatch }: { state: GameState; dispatch: GameDispatch }) {
  const event = state.expedition!.event!
  const biomeEventArt = biomeArtSource(state.expedition!.biome.id, 'eventArt')
  const eventArt = eventArtSource(event.category, biomeEventArt)
  const category = event.category ?? 'unknown'
  return <div className={`event-encounter event-category-${category}`} aria-live="polite" style={{ backgroundImage: `linear-gradient(rgba(8,8,6,.18), rgba(8,8,6,.82)), url(${eventArt})` }}><div className="event-symbol" aria-hidden="true">{event.icon}</div><p className="eyebrow">{event.outcome ? 'ПОСЛЕДСТВИЕ РЕШЕНИЯ' : `СЛУЧАЙНАЯ ВСТРЕЧА · ${eventCategoryLabels[category]}`}</p><h1>{event.title}</h1><p className="event-description">{event.description}</p>{event.outcome ? <div className={`event-outcome ${event.outcome.tone}`}><small>ВЫ ВЫБРАЛИ</small><h2>{event.outcome.choiceLabel}</h2><p>{event.outcome.result}</p><span>Теперь последствие этого решения известно.</span><button className="primary-button" onClick={() => dispatch({ type: 'CONTINUE_EVENT' })}>Продолжить путь <ChevronRight /></button></div> : <><p className="event-unknown">Последствия неизвестны до выбора</p><div className="event-choices">{event.choices.map((choice, index) => <button aria-label={`Выбрать: ${choice.label}. Последствия неизвестны.`} key={`${choice.label}-${index}`} onClick={() => dispatch({ type: 'EVENT_CHOICE', index })}><b>{choice.label}</b><span>???</span><ChevronRight /></button>)}</div></>}</div>
}

function RewardEncounter({ reward, choices, salvageAvailable, dispatch, defeatedVariant, defeatedPalette }: { reward: Item; choices: Item[]; salvageAvailable: boolean; dispatch: GameDispatch; defeatedVariant?: number; defeatedPalette?: import('../game/types').BossAura }) {
  const rewardPerk = reward.perk ? perks.find((perk) => perk.id === reward.perk) : null
  return <div className="reward-encounter" aria-live="polite">{defeatedVariant !== undefined && <div className="defeated-foe" aria-hidden="true"><FighterSilhouette variant={defeatedVariant} enemy palette={defeatedPalette} /></div>}<PackageOpen size={34} aria-hidden="true" /><p className="eyebrow">ДОБЫЧА · ВЫБЕРИ ОДНУ</p><div className="reward-choice-grid">{choices.map((item) => <button aria-pressed={item.id === reward.id} className={`reward-choice ${item.id === reward.id ? 'selected' : ''} ${itemPresentationClasses(item)}`} key={item.id} onClick={() => dispatch({ type: 'SELECT_REWARD', itemId: item.id })}><ItemArt item={item} /><span><b>{item.name}</b><small>{inferItemTags(item).map((tag) => synergyNames[tag]).join(' · ')}</small></span></button>)}</div><div className={`reward-item ${itemPresentationClasses(reward)}`}><span aria-hidden="true"><ItemArt item={reward} /></span><div><Tooltip text={rarityHints[reward.rarity]}><small tabIndex={0}>{rarityLabels[reward.rarity]} {reward.slot ? `· ${slotNames[reward.slot]}` : ''}{itemPresentationLabel(reward) ? ` · ${itemPresentationLabel(reward)}` : ''}</small></Tooltip><h2>{reward.name}</h2><p>{statSummary(reward) || reward.description}</p>{rewardPerk && <Tooltip text={rewardPerk.description}><b tabIndex={0}>Дар: {rewardPerk.name}</b></Tooltip>}</div></div><div className="reward-actions"><button className="primary-button" onClick={() => dispatch({ type: 'TAKE_REWARD' })}>Забрать выбранное</button>{salvageAvailable && <button className="secondary-button" onClick={() => dispatch({ type: 'SALVAGE_REWARD' })}>Разобрать в обломки · 1 раз</button>}<button className="secondary-button" onClick={() => dispatch({ type: 'LEAVE_REWARD' })}>Оставить</button></div></div>
}

function CompleteEncounter({ state, dispatch }: { state: GameState; dispatch: GameDispatch }) {
  const run = state.expedition!
  const summary = loadRunSummaries().find((candidate) => candidate.runId === run.id)
  return <div className="complete-encounter"><Trophy /><p className="eyebrow">ПОХОД ЗАВЕРШЁН</p><h1>Глубины отступили</h1><p>На этот раз. Ты уносишь {run.earnedGold} золота и {run.earnedScore} рейтинговых очков.</p>{summary && <RunDebrief summary={summary} state={state} />}<button className="primary-button" onClick={() => dispatch({ type: 'RETURN_HOME' })}>Вернуться в убежище <Footprints /></button></div>
}
