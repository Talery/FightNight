import { Shield, Sparkles } from 'lucide-react'
import { attributeName, getActivePerks, getHeroStats, itemIcon, statSummary } from '../../game/engine'
import { contentRegistry } from '../../game/registry'
import type { Attribute, EquipSlot, Hero } from '../../game/types'
import { statHints } from '../../ui/text'
import type { GameDispatch } from '../../ui/types'
import { Tooltip } from '../Tooltip'

const { perks, slotNames } = contentRegistry

export function HeroSidebar({ hero, dispatch }: { hero: Hero; dispatch: GameDispatch }) {
  const stats = getHeroStats(hero)
  const hpPercent = Math.max(0, Math.min(100, hero.hp / stats.maxHp * 100))
  const xpPercent = hero.xp / hero.xpToNext * 100
  return (
    <aside className="left-sidebar">
      <section className="hero-card">
        <div className="hero-identity"><div className="level-medallion"><span>{hero.level}</span><small>ур.</small></div><div><h2>{hero.name}</h2><p>{hero.epithet}</p></div></div>
        <Meter label="Здоровье" value={`${hero.hp} / ${stats.maxHp}`} percent={hpPercent} kind="health" hint={statHints.health} />
        <Meter label="Опыт" value={`${hero.xp} / ${hero.xpToNext}`} percent={xpPercent} kind="xp" hint={statHints.xp} />
        <div className="stats-grid">
          {(['strength', 'agility', 'luck'] as Attribute[]).map((attribute) => (
            <Tooltip text={statHints[attribute]} key={attribute}><div className="stat-cell" tabIndex={0}><span>{attributeName(attribute)}</span><b>{stats[attribute]}</b>{hero.unspent > 0 && <button aria-label={`Увеличить ${attributeName(attribute)}`} onClick={() => dispatch({ type: 'ADD_ATTRIBUTE', attribute })}>+</button>}</div></Tooltip>
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

export function Meter({ label, value, percent, kind, hint }: { label: string; value: string; percent: number; kind: string; hint?: string }) {
  const meter = <div className="meter-wrap" tabIndex={hint ? 0 : undefined}><div className="meter-label"><span>{label}</span><b>{value}</b></div><div className={`meter ${kind}`}><i style={{ width: `${percent}%` }} /></div></div>
  return hint ? <Tooltip text={hint}>{meter}</Tooltip> : meter
}

function PaperDoll({ hero, dispatch }: { hero: Hero; dispatch: GameDispatch }) {
  const slots = Object.keys(slotNames) as EquipSlot[]
  return (
    <section className="paper-doll panel-block">
      <div className="section-cap"><span>Снаряжение</span><Shield size={15} /></div>
      <div className="doll-stage">
        <FighterSilhouette variant={hero.id.length % 6} />
        {slots.map((slot, index) => {
          const item = hero.inventory.find((candidate) => candidate.id === hero.equipment[slot])
          return <Tooltip key={slot} text={item ? `${item.name}. ${statSummary(item) || item.description} Нажмите, чтобы снять.` : `${slotNames[slot]}: слот свободен.`}><button className={`gear-slot slot-${index} ${item ? `filled rarity-${item.rarity}` : ''}`} onClick={() => item && dispatch({ type: 'UNEQUIP', slot })}><span>{item ? itemIcon(item) : '+'}</span><small>{slotNames[slot]}</small></button></Tooltip>
        })}
      </div>
    </section>
  )
}

export function FighterSilhouette({ variant = 0, enemy = false }: { variant?: number; enemy?: boolean }) {
  return <div className={`fighter-silhouette variant-${variant} ${enemy ? 'enemy' : ''}`} aria-hidden="true"><i className="fighter-aura" /><i className="fighter-head" /><i className="fighter-body" /><i className="fighter-arm arm-left" /><i className="fighter-arm arm-right" /><i className="fighter-leg leg-left" /><i className="fighter-leg leg-right" /><i className="fighter-weapon" /></div>
}

function PerkStrip({ hero }: { hero: Hero }) {
  const active = getActivePerks(hero)
  const values = perks.filter((perk) => active.has(perk.id))
  return <section className="panel-block perk-strip"><div className="section-cap"><span>Перки</span><Sparkles size={15} /></div>{values.length ? <div className="perk-icons">{values.map((perk) => <Tooltip text={`${perk.name}: ${perk.description}`} key={perk.id}><span tabIndex={0}>{perk.icon}</span></Tooltip>)}</div> : <p className="empty-copy">Первый выбор откроется на 3 уровне.</p>}</section>
}
