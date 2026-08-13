import type { AbilityId, BiomeId, EquipSlot, EventCategory, Item, PerkDefinition, WeaponStyle } from '../game/types'
import ashBridePortrait from './bosses/ash-bride.webp'
import ashKingPortrait from './bosses/ash-king.webp'
import bellFatherPortrait from './bosses/bell-father.webp'
import bellWardenPortrait from './bosses/bell-warden.webp'
import chainSisterPortrait from './bosses/chain-sister.webp'
import debtJudgePortrait from './bosses/debt-judge.webp'
import mireAbbotPortrait from './bosses/mire-abbot.webp'
import mireMouthPortrait from './bosses/mire-mouth.webp'
import ravenDukePortrait from './bosses/raven-duke.webp'
import ravenSeerPortrait from './bosses/raven-seer.webp'
import saltGiantPortrait from './bosses/salt-giant.webp'
import saltMatronPortrait from './bosses/salt-matron.webp'
import ashBellRelic from './relics/ash-bell.webp'
import barrowHeartRelic from './relics/barrow-heart.webp'
import blackThreadRelic from './relics/black-thread.webp'
import doorlessKeyRelic from './relics/doorless-key.webp'
import executionerMirrorRelic from './relics/executioner-mirror.webp'
import facelessCrownRelic from './relics/faceless-crown.webp'
import oblivionSaltRelic from './relics/oblivion-salt.webp'
import prophetBoneRelic from './relics/prophet-bone.webp'
import altarEventArt from './events/altar.webp'
import cacheEventArt from './events/cache.webp'
import creatureEventArt from './events/creature.webp'
import curseEventArt from './events/curse.webp'
import strangePlaceEventArt from './events/strange-place.webp'
import trapEventArt from './events/trap.webp'
import tradeEventArt from './events/trade.webp'
import travelerEventArt from './events/traveler.webp'
import cityMusic from './audio/city-loop.wav'
import expeditionMusic from './audio/expedition-loop.wav'
import bossMusic from './audio/boss-loop.wav'
import catacombsCombatArt from './biomes/catacombs/combat.webp'
import catacombsEventArt from './biomes/catacombs/event.webp'
import catacombsRouteArt from './biomes/catacombs/route.webp'
import citadelCombatArt from './biomes/citadel/combat.webp'
import citadelEventArt from './biomes/citadel/event.webp'
import citadelRouteArt from './biomes/citadel/route.webp'
import coastCombatArt from './biomes/coast/combat.webp'
import coastEventArt from './biomes/coast/event.webp'
import coastRouteArt from './biomes/coast/route.webp'
import gardenCombatArt from './biomes/garden/combat.webp'
import gardenEventArt from './biomes/garden/event.webp'
import gardenRouteArt from './biomes/garden/route.webp'
import marshCombatArt from './biomes/marsh/combat.webp'
import marshEventArt from './biomes/marsh/event.webp'
import marshRouteArt from './biomes/marsh/route.webp'
import minesCombatArt from './biomes/mines/combat.webp'
import minesEventArt from './biomes/mines/event.webp'
import minesRouteArt from './biomes/mines/route.webp'
import monasteryCombatArt from './biomes/monastery/combat.webp'
import monasteryEventArt from './biomes/monastery/event.webp'
import monasteryRouteArt from './biomes/monastery/route.webp'
import saltCombatArt from './biomes/salt/combat.webp'
import saltEventArt from './biomes/salt/event.webp'
import saltRouteArt from './biomes/salt/route.webp'
import combatArt from './cc0-dungeon/combat.webp'
import eventArt from './cc0-dungeon/event.webp'
import hallArt from './cc0-dungeon/hall.webp'
import routeArt from './cc0-dungeon/route.webp'
import safehouseArt from './cc0-dungeon/safehouse.webp'
import shopArt from './cc0-dungeon/shop.webp'
import talentArt from './talents/ashen-sigil-tree.webp'
import tavernArt from './cc0-dungeon/tavern.webp'
import welcomeArt from './cc0-dungeon/welcome.webp'
import armorIcon from './rpg-icons/A_Armour03.png'
import luckIcon from './rpg-icons/I_Clover.png'
import focusIcon from './rpg-icons/P_Blue05.png'
import healIcon from './rpg-icons/P_Red04.png'
import defenseIcon from './rpg-icons/S_Buff03.png'
import strengthIcon from './rpg-icons/S_Buff08.png'
import guardBreakIcon from './rpg-icons/S_Earth06.png'
import survivalIcon from './rpg-icons/S_Holy05.png'
import tradeIcon from './rpg-icons/S_Magic07.png'
import bloodletterIcon from './rpg-icons/S_Poison04.png'
import curseIcon from './rpg-icons/S_Shadow03.png'
import agilityIcon from './rpg-icons/S_Wind05.png'
import bladeIcon from './rpg-icons/W_Sword007.png'
import itemArmorV2 from './items-v2/armor.webp'
import itemBladeV2 from './items-v2/blade.webp'
import itemBombV2 from './items-v2/bomb.webp'
import itemBootsV2 from './items-v2/boots.webp'
import itemDaggerV2 from './items-v2/dagger.webp'
import itemFocusV2 from './items-v2/focus.webp'
import itemGlovesV2 from './items-v2/gloves.webp'
import itemHeadV2 from './items-v2/head.webp'
import itemHealV2 from './items-v2/heal.webp'
import itemMaceV2 from './items-v2/mace.webp'
import itemRelicV2 from './items-v2/relic.webp'
import itemSpearV2 from './items-v2/spear.webp'
import itemTrinketV2 from './items-v2/trinket.webp'
import enemy0 from './dark-fighters/enemy-0.webp'
import enemy1 from './dark-fighters/enemy-1.webp'
import enemy2 from './dark-fighters/enemy-2.webp'
import enemy3 from './dark-fighters/enemy-3.webp'
import enemy4 from './dark-fighters/enemy-4.webp'
import enemy5 from './dark-fighters/enemy-5.webp'
import hero0 from './dark-fighters/hero-0.webp'
import hero1 from './dark-fighters/hero-1.webp'
import hero2 from './dark-fighters/hero-2.webp'
import hero3 from './dark-fighters/hero-3.webp'
import hero4 from './dark-fighters/hero-4.webp'
import hero5 from './dark-fighters/hero-5.webp'

type PerkBranch = NonNullable<PerkDefinition['branch']>
type ItemSlot = Exclude<EquipSlot, 'weapon'>
type ConsumableEffect = NonNullable<Item['effect']>

interface AssetRegistry {
  scenes: {
    locations: Record<'welcome' | 'safehouse' | 'tavern' | 'shop' | 'hall' | 'talents', string>
    expedition: Record<'route' | 'combat' | 'event', string>
  }
  biomes: Record<BiomeId, { routeArt: string; combatArt: string; eventArt: string }>
  bosses: Partial<Record<string, string>>
  events: Partial<Record<EventCategory, string>>
  fighters: {
    heroes: readonly string[]
    enemies: readonly string[]
  }
  items: {
    slots: Record<ItemSlot, string>
    weapons: Record<WeaponStyle, string>
    consumables: Record<ConsumableEffect, string>
    uniqueRelics: readonly string[]
  }
  perks: Record<PerkBranch, string>
  perkIndividuals: Partial<Record<string, string>>
  abilities: Record<AbilityId, string>
  audio: {
    music: Partial<Record<'city' | 'expedition' | 'boss', string>>
  }
  fallbacks: {
    image: string
    scene: string
    fighter: string
    icon: string
  }
}

export const assetRegistry = {
  scenes: {
    locations: {
      welcome: welcomeArt,
      safehouse: safehouseArt,
      tavern: tavernArt,
      shop: shopArt,
      hall: hallArt,
      talents: talentArt,
    },
    expedition: {
      route: routeArt,
      combat: combatArt,
      event: eventArt,
    },
  },
  biomes: {
    catacombs: { routeArt: catacombsRouteArt, combatArt: catacombsCombatArt, eventArt: catacombsEventArt },
    salt: { routeArt: saltRouteArt, combatArt: saltCombatArt, eventArt: saltEventArt },
    citadel: { routeArt: citadelRouteArt, combatArt: citadelCombatArt, eventArt: citadelEventArt },
    marsh: { routeArt: marshRouteArt, combatArt: marshCombatArt, eventArt: marshEventArt },
    monastery: { routeArt: monasteryRouteArt, combatArt: monasteryCombatArt, eventArt: monasteryEventArt },
    mines: { routeArt: minesRouteArt, combatArt: minesCombatArt, eventArt: minesEventArt },
    coast: { routeArt: coastRouteArt, combatArt: coastCombatArt, eventArt: coastEventArt },
    garden: { routeArt: gardenRouteArt, combatArt: gardenCombatArt, eventArt: gardenEventArt },
  },
  bosses: {
    'debt-judge': debtJudgePortrait,
    'salt-matron': saltMatronPortrait,
    'ash-king': ashKingPortrait,
    'mire-mouth': mireMouthPortrait,
    'bell-father': bellFatherPortrait,
    'raven-duke': ravenDukePortrait,
    'chain-sister': chainSisterPortrait,
    'salt-giant': saltGiantPortrait,
    'ash-bride': ashBridePortrait,
    'mire-abbot': mireAbbotPortrait,
    'bell-warden': bellWardenPortrait,
    'raven-seer': ravenSeerPortrait,
  },
  events: {
    altar: altarEventArt,
    traveler: travelerEventArt,
    trap: trapEventArt,
    cache: cacheEventArt,
    curse: curseEventArt,
    trade: tradeEventArt,
    'strange-place': strangePlaceEventArt,
    creature: creatureEventArt,
  },
  fighters: {
    heroes: [hero0, hero1, hero2, hero3, hero4, hero5],
    enemies: [enemy0, enemy1, enemy2, enemy3, enemy4, enemy5],
  },
  items: {
    slots: {
      armor: itemArmorV2,
      boots: itemBootsV2,
      gloves: itemGlovesV2,
      head: itemHeadV2,
      trinket: itemTrinketV2,
    },
    weapons: {
      blade: itemBladeV2,
      dagger: itemDaggerV2,
      mace: itemMaceV2,
      relic: itemRelicV2,
      spear: itemSpearV2,
    },
    consumables: {
      bomb: itemBombV2,
      focus: itemFocusV2,
      heal: itemHealV2,
    },
    uniqueRelics: [facelessCrownRelic, executionerMirrorRelic, ashBellRelic, prophetBoneRelic, barrowHeartRelic, blackThreadRelic, doorlessKeyRelic, oblivionSaltRelic],
  },
  perks: {
    strength: strengthIcon,
    agility: agilityIcon,
    luck: luckIcon,
    defense: defenseIcon,
    survival: survivalIcon,
    trade: tradeIcon,
    curse: curseIcon,
  },
  perkIndividuals: {
    'iron-hide': armorIcon,
    'grave-luck': luckIcon,
    'wolf-sinew': strengthIcon,
    'rat-step': agilityIcon,
    'blood-price': bloodletterIcon,
    'second-breath': survivalIcon,
    scavenger: tradeIcon,
    'thick-blood': healIcon,
    executioner: bladeIcon,
    'loaded-dice': focusIcon,
    'hard-lesson': defenseIcon,
    'last-word': curseIcon,
  },
  abilities: {
    bloodletter: bloodletterIcon,
    guardBreak: guardBreakIcon,
    secondWind: survivalIcon,
  },
  audio: {
    music: { city: cityMusic, expedition: expeditionMusic, boss: bossMusic },
  },
  fallbacks: {
    image: '/icon.svg',
    scene: welcomeArt,
    fighter: hero0,
    icon: focusIcon,
  },
} as const satisfies AssetRegistry

export function assetOrFallback(asset: string | null | undefined, fallback: string = assetRegistry.fallbacks.image): string {
  return asset?.trim() ? asset : fallback
}

export function fighterArtSource(variant: number, enemy = false, portraitAsset?: string): string {
  const fighters = enemy ? assetRegistry.fighters.enemies : assetRegistry.fighters.heroes
  const source = fighters[Math.abs(Math.trunc(variant)) % fighters.length]
  return assetOrFallback(portraitAsset, assetOrFallback(source, assetRegistry.fallbacks.fighter))
}

export function bossPortraitSource(bossId: string): string | undefined {
  return (assetRegistry.bosses as Partial<Record<string, string>>)[bossId]
}

export function itemArtSource(item: Item): string {
  const relicIndex = item.uniqueId?.match(/^relic-(\d+)-/)?.[1]
  if (relicIndex !== undefined) {
    return assetOrFallback(assetRegistry.items.uniqueRelics[Number(relicIndex)], assetRegistry.fallbacks.icon)
  }
  if (item.type === 'consumable') {
    return assetOrFallback(assetRegistry.items.consumables[item.effect ?? 'focus'], assetRegistry.fallbacks.icon)
  }
  if (item.slot === 'weapon') {
    return assetOrFallback(assetRegistry.items.weapons[item.weaponStyle ?? 'blade'], assetRegistry.fallbacks.icon)
  }
  return assetOrFallback(assetRegistry.items.slots[item.slot ?? 'trinket'], assetRegistry.fallbacks.icon)
}

export function perkArtSource(perk: Pick<PerkDefinition, 'id' | 'branch'>): string {
  const individual = (assetRegistry.perkIndividuals as Partial<Record<string, string>>)[perk.id]
  return assetOrFallback(individual ?? (perk.branch ? assetRegistry.perks[perk.branch] : undefined), assetRegistry.fallbacks.icon)
}

export function abilityArtSource(ability: AbilityId): string {
  return assetOrFallback(assetRegistry.abilities[ability], assetRegistry.fallbacks.icon)
}

export function biomeArtSource(biomeId: string, scene: 'routeArt' | 'combatArt' | 'eventArt'): string {
  const biome = assetRegistry.biomes[biomeId as BiomeId]
  return assetOrFallback(biome?.[scene], assetRegistry.fallbacks.scene)
}

export function eventArtSource(category: EventCategory | undefined, fallback: string): string {
  return assetOrFallback(category ? (assetRegistry.events as Partial<Record<EventCategory, string>>)[category] : undefined, fallback)
}
