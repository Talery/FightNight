import {
  ArrowLeft, ChevronRight, Dices, Footprints, Map, PackageOpen, Shield, ShieldAlert,
  Sparkles, Swords, TentTree, Trophy, Skull,
} from 'lucide-react'
import { getHeroStats, itemIcon, statSummary } from '../game/engine'
import { contentRegistry } from '../game/registry'
import type { GameState, Item, Technique, Zone } from '../game/types'
import { rarityHints, rarityLabels, statHints, techniqueHints, zoneHints } from '../ui/text'
import type { GameDispatch } from '../ui/types'
import { FighterSilhouette, Meter } from '../components/game/HeroSidebar'
import { Tooltip } from '../components/Tooltip'

const { enemyMutations, perks, slotNames, zones } = contentRegistry

export function ExpeditionScreen({ state, dispatch }: { state: GameState; dispatch: GameDispatch }) {
  const run = state.expedition
  if (!run) return null
  return (
    <div className="expedition-screen">
      <header className="run-header"><div><button className="icon-button" aria-label="Назад" onClick={() => dispatch({ type: 'SET_DIFFICULTY_NOTICE', notice: 'Из похода можно вернуться только после его завершения.' })}><ArrowLeft /></button><div><small>ПОХОД · СЛОЖНОСТЬ {run.difficulty}</small><h2>{run.name}</h2></div></div><Tooltip text={`Условие похода: ${run.conditionDescription}`}><span tabIndex={0}><Dices size={15} /><b>{run.condition}</b><small>{run.conditionDescription}</small></span></Tooltip><div className="run-gains"><span>Добыто <b>{run.earnedGold}</b> зол.</span><span>Заработано <b>{run.earnedScore}</b> очк.</span></div></header>
      <RunMap run={run} />
      {run.modifiers.length > 0 && <div className="run-modifiers">{run.modifiers.map((modifier, index) => <Tooltip text={`${modifier.tone === 'boon' ? 'Благословение' : 'Проклятие'}: ${modifier.description}`} key={`${modifier.id}-${index}`}><span tabIndex={0} className={modifier.tone}><i>{modifier.tone === 'boon' ? '✦' : '◆'}</i><b>{modifier.name}</b><small>{modifier.description}</small></span></Tooltip>)}</div>}
      <div className="encounter-area">{run.complete ? <CompleteEncounter state={state} dispatch={dispatch} /> : run.reward ? <RewardEncounter reward={run.reward} dispatch={dispatch} /> : run.combat ? <CombatEncounter state={state} dispatch={dispatch} /> : run.event ? <EventEncounter state={state} dispatch={dispatch} /> : <NodeGate state={state} dispatch={dispatch} />}</div>
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

function CombatEncounter({ state, dispatch }: { state: GameState; dispatch: GameDispatch }) {
  const combat = state.expedition!.combat!
  const hero = state.hero!
  const stats = getHeroStats(hero)
  const consumables = hero.inventory.filter((item) => item.type === 'consumable')
  return (
    <div className="combat-encounter">
      <div className="combat-scene"><Combatant name={hero.name} subtitle={`${stats.strength} сила · ${stats.armor} броня`} hp={hero.hp} maxHp={stats.maxHp} variant={hero.id.length % 6} /><div className="versus-mark"><small>ХОД</small><b>{combat.turn}</b><Swords /></div><Combatant enemy name={combat.enemy.name} subtitle={combat.enemy.title} trait={combat.enemy.trait} traitDescription={combat.enemy.traitDescription} mutations={combat.enemy.mutations} hp={combat.enemy.hp} maxHp={combat.enemy.maxHp} variant={combat.enemy.portrait} /></div>
      <div className="combat-message"><ShieldAlert size={18} /><p>{combat.message}</p><Tooltip text="Ловкость иногда раскрывает направление следующей атаки. При равной ловкости шанс равен 25%; каждое очко преимущества меняет его на 5%."><span tabIndex={0}>{combat.enemyIntentRevealed ? <>Ловкость раскрывает: <b>удар в {zones[combat.enemyIntent].toLowerCase()}</b></> : <>Намерение врага: <b>неясно</b></>}</span></Tooltip></div>
      <div className="combat-controls"><ChoiceGroup mode="attack" title="Куда ударить" value={combat.attackZone} onChange={(zone) => dispatch({ type: 'SELECT_ATTACK', zone })} /><ChoiceGroup mode="block" title="Что защитить" value={combat.blockZone} onChange={(zone) => dispatch({ type: 'SELECT_BLOCK', zone })} /><TechniqueGroup value={combat.technique} stamina={combat.stamina} onChange={(technique) => dispatch({ type: 'SELECT_TECHNIQUE', technique })} /><button className="fight-button" disabled={!combat.attackZone || !combat.blockZone} onClick={() => dispatch({ type: 'FIGHT' })}><Swords /> Сойтись</button></div>
      <div className="combat-utility"><Tooltip text="Выносливость расходуется на тяжёлые удары и финты. После каждого хода восстанавливается 1 единица."><span tabIndex={0}>Выносливость: <b>{'◆'.repeat(combat.stamina)}{'◇'.repeat(4 - combat.stamina)}</b></span></Tooltip>{consumables.map((item) => <Tooltip text={item.description} key={item.id}><button onClick={() => dispatch({ type: 'USE_ITEM', itemId: item.id })}>{itemIcon(item)} {item.name}</button></Tooltip>)}</div>
    </div>
  )
}

function Combatant({ name, subtitle, hp, maxHp, variant, mutations = [], enemy = false, trait, traitDescription }: { name: string; subtitle: string; hp: number; maxHp: number; variant: number; mutations?: string[]; enemy?: boolean; trait?: string; traitDescription?: string }) {
  return <div className={`combatant ${enemy ? 'enemy' : ''}`}><div className="combatant-visual"><FighterSilhouette variant={variant} enemy={enemy} /></div><div className="combatant-tag"><h3>{name}</h3><p>{subtitle}{trait && traitDescription && <> · <Tooltip text={traitDescription}><span className="keyword" tabIndex={0}>{trait}</span></Tooltip></>}</p>{mutations.length > 0 && <div className="mutation-row">{mutations.map((mutation) => { const details = enemyMutations.find(([mutationName]) => mutationName === mutation)?.[1] ?? 'Особая мутация противника.'; return <Tooltip text={details} key={mutation}><span tabIndex={0}>{mutation}</span></Tooltip> })}</div>}<Meter label="Кровь" value={`${hp} / ${maxHp}`} percent={hp / maxHp * 100} kind={enemy ? 'enemy-health' : 'health'} hint={enemy ? 'Кровь врага. Опустите её до нуля, чтобы победить.' : statHints.health} /></div></div>
}

function ChoiceGroup({ title, value, mode, onChange }: { title: string; value: Zone | null; mode: 'attack' | 'block'; onChange: (zone: Zone) => void }) {
  return <div className="choice-group"><small>{title}</small><div>{(Object.keys(zones) as Zone[]).map((zone) => <Tooltip text={mode === 'attack' ? zoneHints[zone] : `Защита зоны «${zones[zone].toLowerCase()}». Если враг ударит сюда, вы получите только 22% обычного урона.`} key={zone}><button className={value === zone ? 'selected' : ''} onClick={() => onChange(zone)}>{zones[zone]}</button></Tooltip>)}</div></div>
}

function TechniqueGroup({ value, stamina, onChange }: { value: Technique; stamina: number; onChange: (technique: Technique) => void }) {
  const values: Array<[Technique, string, string]> = [['quick', 'Быстро', '0'], ['heavy', 'Тяжело', '2'], ['feint', 'Финт', '1']]
  return <div className="choice-group technique-group"><small>Приём</small><div>{values.map(([technique, label, cost]) => <Tooltip text={techniqueHints[technique]} key={technique}><button disabled={stamina < Number(cost)} className={value === technique ? 'selected' : ''} onClick={() => onChange(technique)}>{label}<i>−{cost} вын.</i></button></Tooltip>)}</div></div>
}

function EventEncounter({ state, dispatch }: { state: GameState; dispatch: GameDispatch }) {
  const event = state.expedition!.event!
  return <div className="event-encounter"><div className="event-symbol">{event.icon}</div><p className="eyebrow">СЛУЧАЙНАЯ ВСТРЕЧА</p><h1>{event.title}</h1><p className="event-description">{event.description}</p><div className="event-choices">{event.choices.map((choice, index) => <button key={`${choice.label}-${index}`} onClick={() => dispatch({ type: 'EVENT_CHOICE', index })}><b>{choice.label}</b><span>{choice.hint}</span><ChevronRight /></button>)}</div></div>
}

function RewardEncounter({ reward, dispatch }: { reward: Item; dispatch: GameDispatch }) {
  const rewardPerk = reward.perk ? perks.find((perk) => perk.id === reward.perk) : null
  return <div className="reward-encounter"><PackageOpen size={34} /><p className="eyebrow">ДОБЫЧА</p><div className={`reward-item rarity-${reward.rarity}`}><span>{itemIcon(reward)}</span><div><Tooltip text={rarityHints[reward.rarity]}><small tabIndex={0}>{rarityLabels[reward.rarity]} {reward.slot ? `· ${slotNames[reward.slot]}` : ''}</small></Tooltip><h2>{reward.name}</h2><p>{statSummary(reward) || reward.description}</p>{rewardPerk && <Tooltip text={rewardPerk.description}><b tabIndex={0}>Дар: {rewardPerk.name}</b></Tooltip>}</div></div><div className="reward-actions"><button className="primary-button" onClick={() => dispatch({ type: 'TAKE_REWARD' })}>Забрать</button><button className="secondary-button" onClick={() => dispatch({ type: 'LEAVE_REWARD' })}>Оставить</button></div></div>
}

function CompleteEncounter({ state, dispatch }: { state: GameState; dispatch: GameDispatch }) {
  const run = state.expedition!
  return <div className="complete-encounter"><Trophy /><p className="eyebrow">ПОХОД ЗАВЕРШЁН</p><h1>Глубины отступили</h1><p>На этот раз. Ты уносишь {run.earnedGold} золота и {run.earnedScore} рейтинговых очков.</p><button className="primary-button" onClick={() => dispatch({ type: 'RETURN_HOME' })}>Вернуться в убежище <Footprints /></button></div>
}
