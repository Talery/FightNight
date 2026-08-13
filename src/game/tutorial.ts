import { contentRegistry } from './registry'
import type { CombatState, Expedition, Item } from './types'

export const TUTORIAL_SEED = 0x5455544f

export function createTutorialExpedition(): Expedition {
  const enemy = {
    id: 'tutorial-keeper', name: 'Учебный хранитель', title: 'страж пустого круга',
    hp: 50, maxHp: 50, power: 4, armor: 0, agility: -20, damageType: 'pierce' as const,
    trait: 'Тупое лезвие', traitDescription: 'Учебное оружие не может убить бойца.', mutations: [],
    portrait: 0, elite: false, boss: false, phase: 1, faction: 'Хранители', archetype: 'duelist',
  }
  const combat: CombatState = {
    enemy, attackZone: null, blockZone: 'body', technique: 'quick', selectedAbility: null,
    abilityCooldowns: { bloodletter: 0, guardBreak: 0, secondWind: 0 }, stamina: 4, turn: 1,
    enemyIntent: 'body', enemyIntentKind: 'strike', enemyIntentRevealed: true, scouting: false,
    enemyBehavior: { patternId: 'tutorial', patternStep: 0, lastEnemyMissed: false, lastAttackGuarded: false, playerAttackZones: [], phase: 1 },
    enemyIntentHistory: [], heroStatuses: [], enemyStatuses: [],
    message: 'Учебный бой не может погубить героя. Сначала выбери зону удара.',
  }
  const node = { id: 'tutorial-ring', type: 'battle' as const, title: 'Пустой круг', subtitle: 'безопасная тренировка', depth: 0, lane: 0, state: 'current' as const }
  return {
    id: `tutorial-${TUTORIAL_SEED}`, difficulty: 1, name: 'Школа Пепельного Круга',
    condition: 'Учебный бой', conditionDescription: 'Без смерти, золота и рейтинговых очков.',
    biome: contentRegistry.biomes[0], seedCode: 'TUTORIAL', daily: false, victoryCondition: 'boss',
    sigils: 0, sigilsRequired: 0, nodes: [node], current: 0, selectedNodeId: node.id, modifiers: [],
    combat, event: null, reward: null, rewardChoices: [], irrelevantRewardStreak: 0, rewardSalvageAvailable: false, tutorial: true, tutorialRewards: [], earnedGold: 0, earnedScore: 0, complete: false,
  }
}

export function tutorialRewards(): Item[] {
  return [
    { id: 'tutorial-bandage', name: 'Чистая перевязь', type: 'consumable', rarity: 'common', stats: {}, value: 4, description: 'Восстанавливает 12 здоровья.', effect: 'heal', amount: 12 },
    { id: 'tutorial-tonic', name: 'Горький тоник', type: 'consumable', rarity: 'common', stats: {}, value: 4, description: 'Восстанавливает 2 выносливости в бою.', effect: 'focus', amount: 2 },
  ]
}

export function prepareTutorialTurn(combat: CombatState): void {
  const intents = [
    { zone: 'body', kind: 'strike' },
    { zone: 'head', kind: 'strike' },
    { zone: 'legs', kind: 'venomousCut' },
  ] as const
  const intent = intents[Math.min(combat.turn - 1, intents.length - 1)]
  combat.enemyIntent = intent.zone
  combat.enemyIntentKind = intent.kind
  combat.enemyIntentRevealed = true
  combat.scouting = false
  if (combat.turn === 2) { combat.attackZone = 'body'; combat.blockZone = null; combat.technique = 'quick' }
  if (combat.turn === 3) { combat.attackZone = 'body'; combat.blockZone = 'legs'; combat.technique = 'quick' }
}
