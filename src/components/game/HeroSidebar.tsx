import { Backpack, FlaskConical, Shield, Sparkles, Swords } from 'lucide-react'
import { attributeName, getActivePerks, getHeroStats, statSummary } from '../../game/engine'
import { contentRegistry } from '../../game/registry'
import type { Attribute, EquipSlot, Hero, Item } from '../../game/types'
import { statHints } from '../../ui/text'
import type { GameDispatch } from '../../ui/types'
import { Tooltip } from '../Tooltip'
import { ItemArt, itemPresentationClasses, itemPresentationLabel } from './ItemArt'
import { PerkArt } from './PerkArt'
import { bossPortraitSource, fighterArtSource } from '../../assets/registry'
import type { BossAura } from '../../game/types'

const { perks, slotNames, heroMutations } = contentRegistry

export function HeroSidebar({ hero, dispatch, inCombat, onOpenInventory, onUseConsumable }: { hero: Hero; dispatch: GameDispatch; inCombat: boolean; onOpenInventory: (slot?: EquipSlot) => void; onUseConsumable: (item: Item) => void }) {
  const stats = getHeroStats(hero)
  const hpPercent = Math.max(0, Math.min(100, hero.hp / stats.maxHp * 100))
  const xpPercent = hero.xp / hero.xpToNext * 100
  return (
    <aside className="left-sidebar">
      <section className="hero-card">
        <div className="hero-identity"><div className="level-medallion"><span>{hero.level}</span><small>ур.</small></div><div><h2><span className="hero-name-mark" aria-hidden="true"><Swords /></span>{hero.name}</h2><p>{hero.epithet}</p></div></div>
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
      <PaperDoll hero={hero} inCombat={inCombat} onOpenInventory={onOpenInventory} onUseConsumable={onUseConsumable} />
      <PerkStrip hero={hero} dispatch={dispatch} />
    </aside>
  )
}

export function Meter({ label, value, percent, trailPercent, kind, hint }: { label: string; value: string; percent: number; trailPercent?: number; kind: string; hint?: string }) {
  const meter = <div className="meter-wrap" tabIndex={hint ? 0 : undefined}><div className="meter-label"><span>{label}</span><b>{value}</b></div><div className={`meter ${kind}`} role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(percent)}>{trailPercent !== undefined && <i className="meter-trail" style={{ width: `${trailPercent}%` }} />}<i className="meter-fill" style={{ width: `${percent}%` }} /></div></div>
  return hint ? <Tooltip text={hint}>{meter}</Tooltip> : meter
}

function PaperDoll({ hero, inCombat, onOpenInventory, onUseConsumable }: { hero: Hero; inCombat: boolean; onOpenInventory: (slot?: EquipSlot) => void; onUseConsumable: (item: Item) => void }) {
  const slots = Object.keys(slotNames) as EquipSlot[]
  return (
    <section className="paper-doll panel-block">
      <div className="section-cap"><span>Снаряжение</span><Shield size={15} /></div>
      <div className="doll-stage">
        <FighterSilhouette variant={hero.id.length % 6} />
        <Tooltip text="Открыть арсенал"><button type="button" className="doll-inventory-button" aria-label={`Открыть арсенал, ${hero.inventory.length} предметов`} onClick={() => onOpenInventory()}><Backpack size={18} /><span>Арсенал</span><b>{hero.inventory.length}</b></button></Tooltip>
        {slots.map((slot, index) => {
          const item = hero.inventory.find((candidate) => candidate.id === hero.equipment[slot])
          return <Tooltip key={slot} text={item ? `${item.name}. ${itemPresentationLabel(item) ? `${itemPresentationLabel(item)}. ` : ''}${statSummary(item) || item.description} Нажмите, чтобы выбрать замену.` : `${slotNames[slot]}: выбрать предмет.`}><button className={`gear-slot slot-${index} ${item ? `filled ${itemPresentationClasses(item)}` : ''}`} onClick={() => onOpenInventory(slot)}><span>{item ? <ItemArt item={item} /> : '+'}</span><small>{slotNames[slot]}</small></button></Tooltip>
        })}
      </div>
      <ConsumableStrip hero={hero} inCombat={inCombat} onUseConsumable={onUseConsumable} />
    </section>
  )
}

function ConsumableStrip({ hero, inCombat, onUseConsumable }: { hero: Hero; inCombat: boolean; onUseConsumable: (item: Item) => void }) {
  const consumables = hero.inventory.filter((item) => item.type === 'consumable')
  return (
    <div className="consumable-strip">
      <span className="consumable-strip-label"><FlaskConical size={14} />Расходники</span>
      <div className="consumable-slots">
        {consumables.map((item) => {
          const combatOnly = item.effect === 'focus' || item.effect === 'bomb'
          const disabled = combatOnly && !inCombat
          return <Tooltip key={item.id} text={`${item.name}. ${item.description}${disabled ? ' Можно использовать только в бою.' : ''}`}><button type="button" className={itemPresentationClasses(item)} disabled={disabled} aria-label={`Использовать ${item.name}`} onClick={() => onUseConsumable(item)}><ItemArt item={item} /><small>{item.name}</small></button></Tooltip>
        })}
        {Array.from({ length: Math.max(0, 4 - consumables.length) }).map((_, index) => <i className="consumable-empty" key={index} />)}
      </div>
    </div>
  )
}

export function FighterSilhouette({ variant = 0, enemy = false, portraitAsset, aura, palette }: { variant?: number; enemy?: boolean; portraitAsset?: string; aura?: BossAura; palette?: BossAura }) {
  const resolvedPortrait = portraitAsset ? bossPortraitSource(portraitAsset) ?? portraitAsset : undefined
  const source = fighterArtSource(variant, enemy, resolvedPortrait)
  return <div className={`fighter-silhouette variant-${variant} ${enemy ? 'enemy' : ''} ${portraitAsset ? 'custom-portrait' : ''} ${aura ? `aura-${aura}` : ''} ${palette && !portraitAsset ? `palette-${palette}` : ''}`} aria-hidden="true"><i className="fighter-aura" /><img className="fighter-art" src={source} alt="" /></div>
}

function PerkStrip({ hero, dispatch }: { hero: Hero; dispatch: GameDispatch }) {
  const active = getActivePerks(hero)
  const values = perks.filter((perk) => active.has(perk.id))
  const sets = contentRegistry.itemSets.filter((set) => hero.inventory.filter((item) => Object.values(hero.equipment).includes(item.id) && item.setId === set.id).length >= set.required)
  const mutations = heroMutations.filter((mutation) => hero.mutations.includes(mutation.id))
  return <section className="panel-block perk-strip"><div className="section-cap"><span>Перки и синергии</span><Sparkles size={15} /></div>{values.length ? <div className="perk-icons">{values.map((perk) => <Tooltip text={`${perk.name}: ${perk.description}`} key={perk.id}><span tabIndex={0}><PerkArt perk={perk} /></span></Tooltip>)}</div> : <p className="empty-copy">Первый выбор откроется на 3 уровне.</p>}{sets.length > 0 && <div className="mutation-row">{sets.map((set) => <Tooltip text={set.description} key={set.id}><span tabIndex={0}>{set.name}</span></Tooltip>)}</div>}{mutations.length > 0 && <div className="mutation-row">{mutations.map((mutation) => <Tooltip text={mutation.description} key={mutation.id}><span tabIndex={0}>{mutation.name}</span></Tooltip>)}</div>}<button className="text-button" onClick={() => dispatch({ type: 'NAVIGATE', view: 'talents' })}>Открыть дерево развития</button></section>
}
