import type { Rarity, Technique } from './types'

export const balance = Object.freeze({
  inventoryCapacity: 24,
  maxLogs: 80,
  maxFallenHeroes: 50,
  maxStamina: 4,
  startingHp: 82,
  startingGold: 28,
  startingXpTarget: 70,
  attributesPerLevel: 3,
  perkLevelInterval: 3,
  levelHpGain: 5,
  levelHeal: 18,
  sellMultiplier: 0.6,
  scavengerSellMultiplier: 0.8,
  buyMultiplier: 1.35,
  restHealthPerGold: 4,
  minimumRestPrice: 4,
  techniqueStamina: { quick: 0, heavy: 2, feint: 1 } satisfies Record<Technique, number>,
  rarityRank: { common: 1, uncommon: 2, rare: 3, epic: 4, mythic: 5 } satisfies Record<Rarity, number>,
  rarityThresholds: { mythic: 1.2, epic: 1.02, rare: 0.78, uncommon: 0.42 },
})

export function xpTargetForLevel(level: number): number {
  return Math.round(balance.startingXpTarget * Math.pow(level, 1.22))
}

export function restPrice(missingHealth: number): number {
  return Math.max(balance.minimumRestPrice, Math.ceil(missingHealth / balance.restHealthPerGold))
}

export function buyPrice(value: number): number {
  return Math.ceil(value * balance.buyMultiplier)
}

export function sellPrice(value: number, scavenger: boolean): number {
  return Math.ceil(value * (scavenger ? balance.scavengerSellMultiplier : balance.sellMultiplier))
}
