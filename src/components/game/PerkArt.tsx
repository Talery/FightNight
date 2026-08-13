import type { AbilityId, PerkDefinition } from '../../game/types'
import { abilityArtSource, perkArtSource } from '../../assets/registry'
import {
  Activity, Axe, BookOpen, Clover, Coins, Crown, Dice5, Dices, Droplets,
  Dumbbell, Eye, Feather, FlaskConical, Footprints, Gauge, Gem, Hammer,
  Heart, HeartPulse, Shield, ShieldCheck, ShieldOff, Skull, Sparkles,
  Swords, Trophy, Wind,
  type LucideIcon,
} from 'lucide-react'

const perkIcons: Record<string, LucideIcon> = {
  'iron-hide': Shield,
  'grave-luck': Clover,
  'wolf-sinew': Dumbbell,
  'rat-step': Footprints,
  'blood-price': Droplets,
  'second-breath': Wind,
  scavenger: Coins,
  'thick-blood': HeartPulse,
  executioner: Axe,
  'loaded-dice': Dice5,
  'hard-lesson': BookOpen,
  'last-word': Skull,
  'tree-strength-1': Hammer,
  'tree-strength-2': ShieldOff,
  'tree-strength-3': Eye,
  'tree-agility-1': Gauge,
  'tree-agility-2': Feather,
  'tree-agility-3': Activity,
  'tree-luck-1': Sparkles,
  'tree-luck-2': Dices,
  'tree-luck-3': Gem,
  'tree-defense-1': ShieldCheck,
  'tree-defense-2': Swords,
  'tree-defense-3': Shield,
  'tree-survival-1': FlaskConical,
  'tree-survival-2': Heart,
  'tree-survival-3': HeartPulse,
  'tree-trade-1': Trophy,
  'tree-trade-2': FlaskConical,
  'tree-trade-3': Crown,
}

export function PerkArt({ perk, className = '' }: { perk: PerkDefinition; className?: string }) {
  const Icon = perkIcons[perk.id]
  if (Icon) return <Icon className={`perk-art perk-symbol ${className}`.trim()} aria-hidden="true" />
  return <img className={`perk-art ${className}`.trim()} src={perkArtSource(perk)} alt="" aria-hidden="true" />
}

export function AbilityArt({ ability, className = '' }: { ability: AbilityId; className?: string }) {
  return <img className={`ability-art ${className}`.trim()} src={abilityArtSource(ability)} alt="" aria-hidden="true" />
}
