export type Attribute = 'strength' | 'agility' | 'luck'
export type EquipSlot = 'weapon' | 'head' | 'armor' | 'gloves' | 'boots' | 'trinket'
export type Rarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'mythic'
export type Zone = 'head' | 'body' | 'legs'
export type Technique = 'quick' | 'heavy' | 'feint'
export type View = 'welcome' | 'hub' | 'tavern' | 'shop' | 'expedition' | 'dead' | 'hall'
export type NodeType = 'battle' | 'elite' | 'event' | 'camp' | 'shrine' | 'treasure' | 'boss'

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
}

export interface PerkDefinition {
  id: string
  name: string
  description: string
  icon: string
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
  inventory: Item[]
  equipment: Partial<Record<EquipSlot, string>>
  gold: number
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
  trait: string
  traitDescription: string
  mutations: string[]
  portrait: number
  elite: boolean
  boss: boolean
}

export interface CombatState {
  enemy: Enemy
  attackZone: Zone | null
  blockZone: Zone | null
  technique: Technique
  stamina: number
  turn: number
  enemyIntent: Zone
  enemyIntentRevealed?: boolean
  message: string
}

export interface EventChoice {
  label: string
  hint: string
  kind: 'heal' | 'hurt' | 'gold' | 'item' | 'score' | 'gamble' | 'boon' | 'curse'
  value: number
}

export interface ExpeditionEvent {
  title: string
  description: string
  icon: string
  choices: EventChoice[]
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
  nodes: ExpeditionNode[]
  current: number
  selectedNodeId: string | null
  modifiers: RunModifier[]
  combat: CombatState | null
  event: ExpeditionEvent | null
  reward: Item | null
  earnedGold: number
  earnedScore: number
  complete: boolean
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
}

export interface LeaderboardEntry extends FallenHero {
  rank?: number
  isLocal?: boolean
}

export interface GameState {
  version: 2
  view: View
  seed: number
  hero: Hero | null
  expedition: Expedition | null
  quest: Quest | null
  questOffer: Quest | null
  shop: Item[]
  logs: LogEntry[]
  fallen: FallenHero[]
  leaderboard: LeaderboardEntry[]
  perkChoices: string[]
  notice: string | null
}

export type GameAction =
  | { type: 'NEW_HERO' }
  | { type: 'NAVIGATE'; view: View }
  | { type: 'SET_DIFFICULTY_NOTICE'; notice: string | null }
  | { type: 'START_EXPEDITION'; difficulty: number }
  | { type: 'SELECT_NODE'; nodeId: string }
  | { type: 'ENTER_NODE' }
  | { type: 'SELECT_ATTACK'; zone: Zone }
  | { type: 'SELECT_BLOCK'; zone: Zone }
  | { type: 'SELECT_TECHNIQUE'; technique: Technique }
  | { type: 'FIGHT' }
  | { type: 'USE_ITEM'; itemId: string }
  | { type: 'EVENT_CHOICE'; index: number }
  | { type: 'TAKE_REWARD' }
  | { type: 'LEAVE_REWARD' }
  | { type: 'RETURN_HOME' }
  | { type: 'REST' }
  | { type: 'ROLL_QUEST' }
  | { type: 'ACCEPT_QUEST' }
  | { type: 'CLAIM_QUEST' }
  | { type: 'BUY'; itemId: string }
  | { type: 'SELL'; itemId: string }
  | { type: 'EQUIP'; itemId: string }
  | { type: 'UNEQUIP'; slot: EquipSlot }
  | { type: 'ADD_ATTRIBUTE'; attribute: Attribute }
  | { type: 'CHOOSE_PERK'; perkId: string }
  | { type: 'DISMISS_NOTICE' }
  | { type: 'LOAD_LEADERBOARD'; entries: LeaderboardEntry[] }
  | { type: 'RESET_SAVE' }
