export type Attribute = 'strength' | 'agility' | 'luck'
export type EquipSlot = 'weapon' | 'head' | 'armor' | 'gloves' | 'boots' | 'trinket'
export type Rarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'mythic'
export type Zone = 'head' | 'body' | 'legs'
export type Technique = 'quick' | 'heavy' | 'feint'
export type DamageType = 'slash' | 'crush' | 'pierce' | 'mystic'
export type WeaponStyle = 'blade' | 'mace' | 'spear' | 'dagger' | 'relic'
export type StatusKind = 'bleed' | 'poison' | 'burn' | 'stun' | 'fear' | 'weaken' | 'brokenArmor'
export type AbilityId = 'bloodletter' | 'guardBreak' | 'secondWind'
export type EnemyIntentKind = 'strike' | 'crushingBlow' | 'venomousCut' | 'arcaneBurst'
export type EnemyArchetypeId = 'tank' | 'assassin' | 'berserker' | 'duelist' | 'ranger' | 'mystic'
export type EnemyBehaviorTrigger = 'default' | 'opening' | 'low-health' | 'after-miss' | 'after-guarded' | 'player-repeat' | 'phase-shift'
export type View = 'welcome' | 'hub' | 'tavern' | 'shop' | 'talents' | 'expedition' | 'dead' | 'hall'
export type NodeType = 'battle' | 'elite' | 'event' | 'camp' | 'shrine' | 'treasure' | 'boss' | 'trap' | 'secret' | 'merchant' | 'forge' | 'ally'
export type BiomeId = 'catacombs' | 'salt' | 'citadel' | 'marsh' | 'monastery' | 'mines' | 'coast' | 'garden'
export type BossAura = 'chain' | 'salt' | 'ash' | 'mire' | 'bell' | 'raven'
export type EventCategory = 'altar' | 'traveler' | 'trap' | 'cache' | 'curse' | 'trade' | 'strange-place' | 'creature' | 'unknown'
export type SynergyTag = 'blood' | 'poison' | 'heavy' | 'counter' | 'evasion' | 'relics' | 'survival' | 'trade'
export type OathId = 'scarlet' | 'iron' | 'wanderer'
export type ItemRuleModifier = 'bloodMomentum' | 'perfectGuard' | 'freeHeavyOpener'

export interface StatBlock {
  strength: number
  agility: number
  luck: number
  armor: number
  maxHp: number
}

export interface Item {
  id: string
  name: string
  type: 'equipment' | 'consumable'
  slot?: EquipSlot
  rarity: Rarity
  stats: Partial<StatBlock>
  value: number
  description: string
  perk?: string
  effect?: 'heal' | 'focus' | 'bomb'
  amount?: number
  weaponStyle?: WeaponStyle
  upgradeLevel?: number
  affixes?: ItemAffix[]
  setId?: string
  uniqueId?: string
  faction?: string
  tags?: SynergyTag[]
  ruleModifier?: ItemRuleModifier
}

export interface ItemAffix {
  id: string
  name: string
  description: string
  stat: keyof StatBlock
  value: number
  cursed?: boolean
}

export interface ItemSetDefinition {
  id: string
  name: string
  required: number
  bonus: Partial<StatBlock>
  description: string
}

export interface HeroMutationDefinition {
  id: string
  name: string
  description: string
  statBonus: Partial<StatBlock>
}

export interface BiomeDefinition {
  id: BiomeId
  name: string
  description: string
  routeArt: string
  combatArt: string
  eventArt: string
  enemyHpMultiplier: number
  enemyPowerMultiplier: number
  healingMultiplier: number
}

export interface EnemyFactionDefinition { id: string; name: string; description: string }
export interface EnemyArchetypeDefinition { id: EnemyArchetypeId; name: string; description: string; hpMultiplier: number; powerMultiplier: number; armorBonus: number; agilityBonus: number }
export interface EnemyBehaviorPattern { id: string; trigger: EnemyBehaviorTrigger; weight: number; sequence: EnemyIntentKind[]; zones: Zone[] }
export interface EnemyBehaviorProfile { archetypeId: EnemyArchetypeId; description: string; patterns: EnemyBehaviorPattern[] }
export interface BossDefinition { id: string; name: string; title: string; faction: string; description: string; portraitAsset?: string; aura: BossAura }
export interface NemesisRecord {
  id: string
  name: string
  faction: string
  archetype: string
  power: number
  armor: number
  encounters: number
  origin?: 'mercy' | 'defeat'
  originText?: string
  favoriteIntent?: EnemyIntentKind
  scar?: string
  epithet?: string
  counterMutation?: 'guarded' | 'relentless' | 'watchful'
  biomeId?: BiomeId
}

export interface PerkDefinition {
  id: string
  name: string
  description: string
  icon: string
  branch?: 'strength' | 'agility' | 'luck' | 'defense' | 'survival' | 'trade' | 'curse'
  tier?: number
  requires?: string[]
  statBonus?: Partial<StatBlock>
}

export interface Hero {
  id: string
  name: string
  epithet: string
  level: number
  xp: number
  xpToNext: number
  hp: number
  base: StatBlock
  unspent: number
  pendingPerks: number
  perks: string[]
  mutations: string[]
  nemeses: NemesisRecord[]
  reputation: Record<string, number>
  decisionFlags: Record<string, string | number | boolean>
  npcRelations: Record<string, number>
  inventory: Item[]
  equipment: Partial<Record<EquipSlot, string>>
  gold: number
  materials: { scrap: number; ember: number; essence: number }
  score: number
  victories: number
  deepest: number
  createdAt: number
  lastWordUsed: boolean
}

export interface Enemy {
  id: string
  name: string
  title: string
  hp: number
  maxHp: number
  power: number
  armor: number
  agility: number
  damageType: DamageType
  trait: string
  traitDescription: string
  mutations: string[]
  portrait: number
  elite: boolean
  boss: boolean
  phase: number
  faction: string
  archetype: string
  bossId?: string
  portraitAsset?: string
  bossAura?: BossAura
  visualPalette?: BossAura
}

export interface StatusEffect {
  kind: StatusKind
  turns: number
  potency: number
}

export interface EnemyIntentRecord { zone: Zone; kind: EnemyIntentKind }
export interface EnemyBehaviorState {
  patternId: string
  patternStep: number
  lastEnemyMissed: boolean
  lastAttackGuarded: boolean
  playerAttackZones: Zone[]
  phase: number
}

export interface CombatState {
  enemy: Enemy
  attackZone: Zone | null
  blockZone: Zone | null
  technique: Technique
  selectedAbility: AbilityId | null
  abilityCooldowns: Record<AbilityId, number>
  stamina: number
  turn: number
  enemyIntent: Zone
  enemyIntentKind: EnemyIntentKind
  enemyIntentRevealed?: boolean
  scouting: boolean
  lastSelection?: { attackZone: Zone; blockZone: Zone; technique: Technique }
  enemyBehavior: EnemyBehaviorState
  enemyIntentHistory: EnemyIntentRecord[]
  heroStatuses: StatusEffect[]
  enemyStatuses: StatusEffect[]
  message: string
  lastExchange?: {
    hero: string
    enemy: string
    heroDamage?: number
    enemyDamage?: number
    heroResult?: 'hit' | 'block' | 'miss' | 'critical' | 'status'
    enemyResult?: 'hit' | 'block' | 'miss' | 'critical' | 'status'
  }
}

export interface EventChoice {
  label: string
  hint: string
  kind: 'heal' | 'hurt' | 'gold' | 'item' | 'score' | 'gamble' | 'boon' | 'curse' | 'material' | 'sigil'
  value: number
}

export interface ExpeditionEvent {
  title: string
  description: string
  icon: string
  category: EventCategory
  choices: EventChoice[]
  outcome?: {
    choiceLabel: string
    result: string
    tone: 'plain' | 'good' | 'bad' | 'gold'
  }
}

export interface ExpeditionNode {
  id: string
  type: NodeType
  title: string
  subtitle: string
  depth: number
  lane: number
  state: 'locked' | 'available' | 'current' | 'cleared'
}

export interface RunModifier {
  id: string
  name: string
  description: string
  tone: 'boon' | 'curse'
  stat: 'heroPower' | 'heroArmor' | 'healing' | 'luck' | 'enemyPower' | 'enemyHp' | 'score'
  value: number
}

export interface Expedition {
  id: string
  difficulty: number
  name: string
  condition: string
  conditionDescription: string
  biome: BiomeDefinition
  seedCode: string
  daily: boolean
  oathId?: OathId
  victoryCondition: 'boss' | 'sigils'
  sigils: number
  sigilsRequired: number
  nodes: ExpeditionNode[]
  current: number
  selectedNodeId: string | null
  modifiers: RunModifier[]
  combat: CombatState | null
  event: ExpeditionEvent | null
  reward: Item | null
  rewardChoices?: Item[]
  irrelevantRewardStreak?: number
  rewardSalvageAvailable?: boolean
  tutorial?: boolean
  tutorialRewards?: Item[]
  earnedGold: number
  earnedScore: number
  complete: boolean
}

/**
 * Local, deterministic playtest data for one expedition.
 *
 * Privacy boundary: this shape must not contain hero/player identity, device data,
 * save contents, timestamps or free-form logs. Keep new fields aggregate-only and
 * add them to the strict runtime validator in run-summary.ts.
 */
export interface RunSummary {
  schemaVersion: 2
  runId: string
  seed: number
  seedCode: string
  difficulty: number
  daily: boolean
  biome: BiomeId
  outcome: 'victory' | 'death' | 'abandoned'
  /** Deterministic duration proxy; wall-clock time is deliberately excluded. */
  actionCount: number
  roomsEntered: number
  roomsCleared: number
  combatTurns: number
  attackZones: Record<Zone, number>
  blockZones: Record<Zone, number>
  techniques: Record<Technique, number>
  damageTaken: number
  damageBySource: Record<string, number>
  unblockedDamageByZone: Record<Zone, number>
  statusDamage: number
  healingReceived: number
  selectedRewardIds: string[]
  deathCause: string | null
}

export interface Quest {
  id: string
  name: string
  description: string
  goal: number
  progress: number
  rewardGold: number
  rewardScore: number
  minDifficulty: number
  faction?: string
  complete: boolean
}

export interface LogEntry {
  id: string
  time: number
  tone: 'plain' | 'good' | 'bad' | 'gold'
  text: string
}

export interface FallenHero {
  id: string
  name: string
  epithet: string
  level: number
  score: number
  victories: number
  diedAt: number
  cause: string
  perks: string[]
  mutations: string[]
  bestItem?: string
  epitaph: string
}

export interface LeaderboardEntry extends FallenHero {
  rank?: number
  isLocal?: boolean
}

export interface GameState {
  version: 18
  view: View
  seed: number
  actionSequence: number
  hero: Hero | null
  /** Original campaign hero while an isolated fixed-build daily challenge is active. */
  dailyReturnHero: Hero | null
  expedition: Expedition | null
  quest: Quest | null
  questOffer: Quest | null
  shop: Item[]
  logs: LogEntry[]
  fallen: FallenHero[]
  leaderboard: LeaderboardEntry[]
  perkChoices: string[]
  notice: string | null
  tutorial: { completed: boolean; skipped: boolean; interactionMade: boolean }
}

export type GameAction =
  | { type: 'NEW_HERO' }
  | { type: 'NAVIGATE'; view: View }
  | { type: 'SET_DIFFICULTY_NOTICE'; notice: string | null }
  | { type: 'START_EXPEDITION'; difficulty: number; oathId?: OathId }
  | { type: 'START_TUTORIAL' }
  | { type: 'SKIP_TUTORIAL' }
  | { type: 'CHOOSE_TUTORIAL_REWARD'; itemId: string }
  | { type: 'START_DAILY_EXPEDITION'; seed: number; day?: string; rulesetVersion?: string }
  | { type: 'SELECT_NODE'; nodeId: string }
  | { type: 'ENTER_NODE' }
  | { type: 'SELECT_ATTACK'; zone: Zone }
  | { type: 'SELECT_BLOCK'; zone: Zone }
  | { type: 'SELECT_TECHNIQUE'; technique: Technique }
  | { type: 'SELECT_ABILITY'; abilityId: AbilityId | null }
  | { type: 'SCOUT_INTENT' }
  | { type: 'REPEAT_COMBAT_SELECTION' }
  | { type: 'FIGHT' }
  | { type: 'SPARE_ENEMY' }
  | { type: 'USE_ITEM'; itemId: string }
  | { type: 'EVENT_CHOICE'; index: number }
  | { type: 'CONTINUE_EVENT' }
  | { type: 'TAKE_REWARD' }
  | { type: 'SELECT_REWARD'; itemId: string }
  | { type: 'SALVAGE_REWARD' }
  | { type: 'LEAVE_REWARD' }
  | { type: 'RETURN_HOME' }
  | { type: 'REST' }
  | { type: 'RISKY_REST' }
  | { type: 'HAGGLE_BUY'; itemId: string }
  | { type: 'REFRESH_SHOP' }
  | { type: 'ROLL_QUEST' }
  | { type: 'ACCEPT_QUEST' }
  | { type: 'CLAIM_QUEST' }
  | { type: 'BUY'; itemId: string }
  | { type: 'SELL'; itemId: string }
  | { type: 'UPGRADE_ITEM'; itemId: string }
  | { type: 'DISMANTLE_ITEM'; itemId: string }
  | { type: 'REFORGE_ITEM'; itemId: string }
  | { type: 'EQUIP'; itemId: string }
  | { type: 'UNEQUIP'; slot: EquipSlot }
  | { type: 'ADD_ATTRIBUTE'; attribute: Attribute }
  | { type: 'CHOOSE_PERK'; perkId: string }
  | { type: 'DISMISS_NOTICE' }
  | { type: 'LOAD_LEADERBOARD'; entries: LeaderboardEntry[] }
  | { type: 'IMPORT_SAVE'; state: GameState }
  | { type: 'RESET_SAVE'; seed?: number }
