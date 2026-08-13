import { describe, expect, it } from 'vitest'
import { createInitialState, enemyIntentReadChance, gameReducer, getHeroStats, initialState } from './engine'
import { contentRegistry } from './registry'
import type { GameState } from './types'
import { killHero } from './progression'
import { generateEnemy } from './generation'
import { SeededRng } from './random'

function freshState(): GameState {
  return gameReducer({ ...initialState, seed: 123456789, fallen: [], logs: [] }, { type: 'NEW_HERO' })
}

function selectFirstNode(state: GameState): GameState {
  const node = state.expedition!.nodes.find((candidate) => candidate.depth === state.expedition!.current)!
  return gameReducer(state, { type: 'SELECT_NODE', nodeId: node.id })
}

describe('game engine', () => {
  it('replays the same actions identically for the same seed', () => {
    let first = gameReducer(createInitialState(424242), { type: 'NEW_HERO' })
    let second = gameReducer(createInitialState(424242), { type: 'NEW_HERO' })
    first = gameReducer(first, { type: 'START_EXPEDITION', difficulty: 6 })
    second = gameReducer(second, { type: 'START_EXPEDITION', difficulty: 6 })
    const nodeId = first.expedition!.nodes.find((node) => node.depth === 0)!.id
    const actions = [
      { type: 'SELECT_NODE', nodeId },
      { type: 'ENTER_NODE' },
      { type: 'SELECT_ATTACK', zone: 'head' },
      { type: 'SELECT_BLOCK', zone: 'body' },
      { type: 'SELECT_TECHNIQUE', technique: 'heavy' },
      { type: 'FIGHT' },
    ] as const
    actions.forEach((action) => {
      first = gameReducer(first, action)
      second = gameReducer(second, action)
    })
    expect(second).toEqual(first)
    expect(first.seed).toBe(424242)
    expect(first.actionSequence).toBe(actions.length + 2)
  })

  it('does not let an imported save resurrect a locally fallen hero', () => {
    const living = gameReducer(createInitialState(10101), { type: 'NEW_HERO' })
    const afterDeath = structuredClone(living)
    afterDeath.view = 'dead'
    afterDeath.fallen = [{
      id: living.hero!.id,
      name: living.hero!.name,
      epithet: living.hero!.epithet,
      level: living.hero!.level,
      score: living.hero!.score,
      victories: living.hero!.victories,
      diedAt: living.actionSequence + 1,
      cause: 'test', perks: [], mutations: [], epitaph: 'test',
    }]
    const result = gameReducer(afterDeath, { type: 'IMPORT_SAVE', state: living })
    expect(result.view).toBe('dead')
    expect(result.notice).toMatch(/откат смерти запрещён/i)
  })

  it('does not let a fallen hero leave the memorial and start another fight', () => {
    let state = freshState()
    const fallenHeroId = state.hero!.id
    expect(killHero(state, 'test defeat')).toBe(true)

    state = gameReducer(state, { type: 'NAVIGATE', view: 'hall' })
    expect(state.view).toBe('hall')

    state = gameReducer(state, { type: 'NAVIGATE', view: 'hub' })
    expect(state.view).toBe('dead')
    state = gameReducer(state, { type: 'START_EXPEDITION', difficulty: 1 })

    expect(state.view).toBe('dead')
    expect(state.expedition).toBeNull()
    expect(state.hero?.id).toBe(fallenHeroId)
  })

  it('uses relative agility to reveal enemy intent sometimes', () => {
    expect(enemyIntentReadChance(5, 5)).toBeCloseTo(0.25)
    expect(enemyIntentReadChance(10, 5)).toBeCloseTo(0.5)
    expect(enemyIntentReadChance(-100, 100)).toBeCloseTo(0.08)
    expect(enemyIntentReadChance(100, -100)).toBeCloseTo(0.75)
  })

  it('creates a playable hero with equipment, a shop and a quest offer', () => {
    const state = freshState()
    expect(state.hero).not.toBeNull()
    expect(state.hero!.name.length).toBeGreaterThan(2)
    expect(state.hero!.inventory.length).toBeGreaterThanOrEqual(2)
    expect(state.hero!.equipment.weapon).toBeTruthy()
    expect(state.shop).toHaveLength(7)
    expect(state.questOffer?.goal).toBeGreaterThanOrEqual(3)
    expect(getHeroStats(state.hero!).strength).toBeGreaterThan(state.hero!.base.strength)
  })

  it('generates a branching expedition with a variable length and a final boss', () => {
    const state = gameReducer(freshState(), { type: 'START_EXPEDITION', difficulty: 7 })
    expect(state.view).toBe('expedition')
    expect(state.expedition?.difficulty).toBe(7)
    const maxDepth = Math.max(...state.expedition!.nodes.map((node) => node.depth))
    expect(maxDepth + 1).toBeGreaterThanOrEqual(6)
    expect(maxDepth + 1).toBeLessThanOrEqual(10)
    expect(state.expedition!.nodes.length).toBeGreaterThan(8)
    expect(state.expedition?.nodes[0].state).toBe('available')
    expect(state.expedition?.nodes.find((node) => node.depth === maxDepth)?.type).toBe('boss')
    expect(state.expedition?.nodes.some((node) => node.depth > 0 && ['trap', 'secret', 'merchant', 'forge', 'ally'].includes(node.type))).toBe(true)
    expect(state.expedition?.condition.length).toBeGreaterThan(3)
  })

  it('resolves tactical combat and produces loot after victory', () => {
    let state = gameReducer(freshState(), { type: 'START_EXPEDITION', difficulty: 2 })
    state = selectFirstNode(state)
    state = gameReducer(state, { type: 'ENTER_NODE' })
    expect(state.expedition?.combat).not.toBeNull()
    state.hero!.base.strength = 100
    state.expedition!.combat!.enemy.hp = 1
    state.expedition!.combat!.enemy.agility = -100
    state = gameReducer(state, { type: 'SELECT_ATTACK', zone: 'head' })
    state = gameReducer(state, { type: 'SELECT_BLOCK', zone: state.expedition!.combat!.enemyIntent })
    state = gameReducer(state, { type: 'SELECT_TECHNIQUE', technique: 'heavy' })
    state = gameReducer(state, { type: 'FIGHT' })
    expect(state.expedition?.reward).not.toBeNull()
    expect(state.hero!.victories).toBe(1)
    expect(state.hero!.score).toBeGreaterThan(0)
  })

  it('applies damage-over-time statuses at the beginning of a combat turn', () => {
    let state = gameReducer(freshState(), { type: 'START_EXPEDITION', difficulty: 2 })
    state = selectFirstNode(state)
    state = gameReducer(state, { type: 'ENTER_NODE' })
    state.hero!.hp = 10
    state.hero!.base.strength = 100
    state.expedition!.combat!.enemy.hp = 1
    state.expedition!.combat!.enemy.agility = -100
    state.expedition!.combat!.heroStatuses = [{ kind: 'bleed', turns: 1, potency: 1 }]
    state = gameReducer(state, { type: 'SELECT_ATTACK', zone: 'head' })
    state = gameReducer(state, { type: 'SELECT_BLOCK', zone: state.expedition!.combat!.enemyIntent })
    state = gameReducer(state, { type: 'FIGHT' })
    expect(state.hero!.hp).toBe(7)
    expect(state.expedition?.reward).not.toBeNull()
  })

  it('uses active abilities with cooldowns and publishes enemy attack patterns', () => {
    let state = gameReducer(freshState(), { type: 'START_EXPEDITION', difficulty: 2 })
    state = selectFirstNode(state)
    state = gameReducer(state, { type: 'ENTER_NODE' })
    const combat = state.expedition!.combat!
    expect(combat.enemyIntentKind).toBeTruthy()
    combat.enemy.hp = 999
    combat.enemy.agility = -100
    state = gameReducer(state, { type: 'SELECT_ABILITY', abilityId: 'guardBreak' })
    expect(state.expedition!.combat!.selectedAbility).toBeNull()
    state.hero!.perks.push('tree-strength-2')
    state = gameReducer(state, { type: 'SELECT_ATTACK', zone: 'body' })
    state = gameReducer(state, { type: 'SELECT_BLOCK', zone: combat.enemyIntent })
    state = gameReducer(state, { type: 'SELECT_ABILITY', abilityId: 'guardBreak' })
    state = gameReducer(state, { type: 'FIGHT' })
    expect(state.expedition!.combat!.enemyStatuses.some((status) => status.kind === 'brokenArmor')).toBe(true)
    expect(state.expedition!.combat!.abilityCooldowns.guardBreak).toBeGreaterThan(0)
    expect(state.expedition!.combat!.enemyIntentHistory).toHaveLength(1)
    expect(state.expedition!.combat!.enemyIntentHistory[0]).toMatchObject({ zone: combat.enemyIntent, kind: combat.enemyIntentKind })
    expect(state.expedition!.combat!.enemyBehavior.patternId).toBeTruthy()
  })

  it('trades stamina and attack damage for exact enemy scouting', () => {
    let state = gameReducer(freshState(), { type: 'START_EXPEDITION', difficulty: 2 })
    state = selectFirstNode(state)
    state = gameReducer(state, { type: 'ENTER_NODE' })
    state.expedition!.combat!.enemyIntentRevealed = false
    state.expedition!.combat!.enemy.hp = 999
    state.expedition!.combat!.enemy.maxHp = 999
    const stamina = state.expedition!.combat!.stamina
    state = gameReducer(state, { type: 'SCOUT_INTENT' })
    expect(state.expedition!.combat!.enemyIntentRevealed).toBe(true)
    expect(state.expedition!.combat!.scouting).toBe(true)
    expect(state.expedition!.combat!.stamina).toBe(stamina - 1)
    state = gameReducer(state, { type: 'SELECT_ATTACK', zone: 'body' })
    state = gameReducer(state, { type: 'SELECT_BLOCK', zone: state.expedition!.combat!.enemyIntent })
    state = gameReducer(state, { type: 'FIGHT' })
    expect(state.expedition!.combat!.scouting).toBe(false)
    expect(state.expedition!.combat!.attackZone).toBeNull()
    state = gameReducer(state, { type: 'REPEAT_COMBAT_SELECTION' })
    expect(state.expedition!.combat!.attackZone).toBe('body')
    expect(state.expedition!.combat!.blockZone).not.toBeNull()
  })

  it('changes a boss into later combat phases as its health drops', () => {
    let state = gameReducer(freshState(), { type: 'START_EXPEDITION', difficulty: 1 })
    const bossDepth = Math.max(...state.expedition!.nodes.map((node) => node.depth))
    state.expedition!.current = bossDepth
    state.expedition!.nodes.forEach((node) => { node.state = node.depth === bossDepth ? 'available' : 'locked' })
    const boss = state.expedition!.nodes.find((node) => node.depth === bossDepth)!
    state = gameReducer(state, { type: 'SELECT_NODE', nodeId: boss.id })
    state = gameReducer(state, { type: 'ENTER_NODE' })
    const combat = state.expedition!.combat!
    combat.enemy.hp = Math.ceil(combat.enemy.maxHp * 0.68)
    combat.enemy.agility = -100
    state.hero!.base.strength = 20
    state = gameReducer(state, { type: 'SELECT_ATTACK', zone: 'head' })
    state = gameReducer(state, { type: 'SELECT_BLOCK', zone: combat.enemyIntent })
    state = gameReducer(state, { type: 'FIGHT' })
    expect(state.expedition!.combat!.enemy.phase).toBeGreaterThanOrEqual(2)
  })

  it('upgrades, reforges and dismantles equipment through the forge', () => {
    let state = freshState()
    const weapon = state.hero!.inventory.find((item) => item.id === state.hero!.equipment.weapon)!
    state.hero!.materials = { scrap: 30, ember: 3, essence: 0 }
    state = gameReducer(state, { type: 'UPGRADE_ITEM', itemId: weapon.id })
    expect(state.hero!.inventory.find((item) => item.id === weapon.id)?.upgradeLevel).toBe(1)
    state = gameReducer(state, { type: 'REFORGE_ITEM', itemId: weapon.id })
    expect(Object.keys(state.hero!.inventory.find((item) => item.id === weapon.id)!.stats)).toHaveLength(1)
    state = gameReducer(state, { type: 'UNEQUIP', slot: 'weapon' })
    state = gameReducer(state, { type: 'DISMANTLE_ITEM', itemId: weapon.id })
    expect(state.hero!.inventory.some((item) => item.id === weapon.id)).toBe(false)
  })

  it('generates a content-scale affix pool and applies completed equipment sets', () => {
    expect(contentRegistry.itemAffixes.length).toBeGreaterThanOrEqual(120)
    expect(contentRegistry.uniqueRelics.length).toBeGreaterThanOrEqual(40)
    const state = freshState()
    const first = state.hero!.inventory[0]
    const second = { ...first, id: 'set-test', slot: 'head' as const, setId: 'raven', stats: {} }
    first.setId = 'raven'
    state.hero!.inventory.push(second)
    state.hero!.equipment.head = second.id
    expect(getHeroStats(state.hero!).luck).toBeGreaterThanOrEqual(state.hero!.base.luck + 3)
  })

  it('offers only reachable talents from the modifier-based development tree', () => {
    let state = freshState()
    expect(contentRegistry.perks).toHaveLength(30)
    const tree = contentRegistry.perks.filter((perk) => perk.id.startsWith('tree-'))
    expect(tree).toHaveLength(18)
    expect(tree.every((perk) => perk.statBonus === undefined)).toBe(true)
    expect(new Set(tree.map((perk) => perk.description)).size).toBe(tree.length)
    const strengthBefore = getHeroStats(state.hero!).strength
    state.hero!.pendingPerks = 1
    state = gameReducer(state, { type: 'CHOOSE_PERK', perkId: 'tree-strength-2' })
    expect(state.hero!.perks).not.toContain('tree-strength-2')
    state.perkChoices = ['tree-strength-1']
    state = gameReducer(state, { type: 'CHOOSE_PERK', perkId: 'tree-strength-1' })
    expect(state.hero!.perks).toContain('tree-strength-1')
    expect(getHeroStats(state.hero!).strength).toBe(strengthBefore)
  })

  it('applies permanent bonuses from hero mutations', () => {
    const state = freshState()
    state.hero!.mutations.push('iron-bone')
    expect(getHeroStats(state.hero!).armor).toBe(state.hero!.base.armor + 2)
  })

  it('generates one hundred valid, non-identical biome routes without softlock shapes', () => {
    const routes = new Set<string>()
    for (let seed = 1; seed <= 100; seed += 1) {
      const state = gameReducer(gameReducer(createInitialState(seed), { type: 'NEW_HERO' }), { type: 'START_EXPEDITION', difficulty: 3 })
      const run = state.expedition!
      const lastDepth = Math.max(...run.nodes.map((node) => node.depth))
      expect(run.nodes.some((node) => node.depth === 0 && node.state === 'available')).toBe(true)
      expect(run.nodes.filter((node) => node.depth === lastDepth)).toHaveLength(1)
      expect(run.nodes.find((node) => node.depth === lastDepth)?.type).toBe('boss')
      routes.add(run.nodes.map((node) => `${node.depth}:${node.type}`).join('|'))
    }
    expect(routes.size).toBeGreaterThan(90)
  })

  it('creates identical fixed daily expeditions from the same public seed', () => {
    const first = gameReducer(freshState(), { type: 'START_DAILY_EXPEDITION', seed: 20260810 })
    const second = gameReducer(freshState(), { type: 'START_DAILY_EXPEDITION', seed: 20260810 })
    expect(first.expedition?.daily).toBe(true)
    expect(second.expedition?.nodes).toEqual(first.expedition?.nodes)
    expect(second.expedition?.biome).toEqual(first.expedition?.biome)
  })

  it('uses a fixed isolated hero for a daily run and restores the campaign hero afterwards', () => {
    let state = freshState()
    const campaignHero = structuredClone(state.hero!)
    state.hero!.base.strength = 99
    state.hero!.gold = 777
    state = gameReducer(state, { type: 'START_DAILY_EXPEDITION', seed: 20260810 })
    expect(state.dailyReturnHero?.base.strength).toBe(99)
    expect(state.hero?.base.strength).toBe(campaignHero.base.strength)
    expect(state.expedition?.daily).toBe(true)
    state.expedition!.complete = true
    state.hero!.score = 321
    state = gameReducer(state, { type: 'RETURN_HOME' })
    expect(state.hero?.base.strength).toBe(99)
    expect(state.hero?.gold).toBe(777)
    expect(state.dailyReturnHero).toBeNull()
    expect(state.logs[0]?.text).toMatch(/321/)
  })

  it('keeps an active expedition when switching to and back from the talent tree', () => {
    let state = gameReducer(freshState(), { type: 'START_EXPEDITION', difficulty: 3 })
    const runId = state.expedition!.id
    state = gameReducer(state, { type: 'NAVIGATE', view: 'talents' })
    expect(state.expedition?.id).toBe(runId)
    state = gameReducer(state, { type: 'NAVIGATE', view: 'expedition' })
    expect(state.view).toBe('expedition')
    expect(state.expedition?.id).toBe(runId)
  })

  it('does not archive the campaign hero when a daily challenger dies', () => {
    let state = freshState()
    state.hero!.base.armor = 7
    state = gameReducer(state, { type: 'START_DAILY_EXPEDITION', seed: 20260810 })
    expect(killHero(state, 'проверка ежедневного поражения')).toBe(true)
    expect(state.view).toBe('hub')
    expect(state.hero?.base.armor).toBe(7)
    expect(state.fallen).toHaveLength(0)
    expect(state.notice).toMatch(/Кампания/)
  })

  it('can end a sigil expedition before the boss through an alternative victory', () => {
    let state = gameReducer(freshState(), { type: 'START_EXPEDITION', difficulty: 3 })
    const run = state.expedition!
    run.victoryCondition = 'sigils'
    run.sigils = 1
    run.sigilsRequired = 2
    const node = run.nodes.find((candidate) => candidate.depth === 0)!
    node.state = 'current'
    run.selectedNodeId = node.id
    run.event = { title: 'Печать', description: 'Путь открыт.', icon: '◈', category: 'cache', choices: [{ label: 'Взять', hint: 'Победа', kind: 'sigil', value: 1 }] }
    state = gameReducer(state, { type: 'EVENT_CHOICE', index: 0 })
    expect(state.expedition?.event?.outcome?.result).toMatch(/2\/2/)
    state = gameReducer(state, { type: 'CONTINUE_EVENT' })
    expect(state.expedition?.complete).toBe(true)
    expect(state.expedition?.sigils).toBe(2)
  })

  it('builds faction enemies from all six archetypes and twelve boss templates', () => {
    expect(contentRegistry.expandedEnemyTraits).toHaveLength(60)
    expect(contentRegistry.expandedEnemyMutations).toHaveLength(80)
    expect(contentRegistry.bosses).toHaveLength(12)
    const seenBosses = new Set<string>()
    for (let seed = 1; seed <= 60; seed += 1) {
      let state = gameReducer(gameReducer(createInitialState(seed), { type: 'NEW_HERO' }), { type: 'START_EXPEDITION', difficulty: 5 })
      const run = state.expedition!
      const depth = Math.max(...run.nodes.map((node) => node.depth))
      const boss = run.nodes.find((node) => node.depth === depth)!
      run.current = depth
      run.nodes.forEach((node) => { node.state = node.id === boss.id ? 'available' : 'locked' })
      state = gameReducer(state, { type: 'SELECT_NODE', nodeId: boss.id })
      state = gameReducer(state, { type: 'ENTER_NODE' })
      seenBosses.add(state.expedition!.combat!.enemy.bossId!)
      expect(state.expedition!.combat!.enemy.faction).toBeTruthy()
      expect(state.expedition!.combat!.enemy.archetype).toBeTruthy()
    }
    expect(seenBosses.size).toBeGreaterThanOrEqual(10)
  })

  it('keeps regular enemy silhouettes tied to archetypes and palettes tied to factions', () => {
    const portraitsByArchetype = new Map<string, Set<number>>()
    const palettesByFaction = new Map<string, Set<string | undefined>>()
    for (let seed = 1; seed <= 240; seed += 1) {
      const enemy = generateEnemy(new SeededRng(seed), 5, 2, false, false)
      const portraits = portraitsByArchetype.get(enemy.archetype) ?? new Set<number>()
      portraits.add(enemy.portrait)
      portraitsByArchetype.set(enemy.archetype, portraits)
      const palettes = palettesByFaction.get(enemy.faction) ?? new Set<string | undefined>()
      palettes.add(enemy.visualPalette)
      palettesByFaction.set(enemy.faction, palettes)
    }
    expect(portraitsByArchetype.size).toBe(6)
    expect(palettesByFaction.size).toBe(6)
    expect([...portraitsByArchetype.values()].every((variants) => variants.size === 1)).toBe(true)
    expect([...palettesByFaction.values()].every((palettes) => palettes.size === 1 && !palettes.has(undefined))).toBe(true)
  })

  it('turns a spared wounded enemy into a persistent nemesis', () => {
    let state = gameReducer(freshState(), { type: 'START_EXPEDITION', difficulty: 2 })
    state = selectFirstNode(state)
    state = gameReducer(state, { type: 'ENTER_NODE' })
    const combat = state.expedition!.combat!
    combat.enemy.hp = Math.floor(combat.enemy.maxHp * 0.25)
    const name = combat.enemy.name
    state = gameReducer(state, { type: 'SPARE_ENEMY' })
    expect(state.hero!.nemeses[0].name).toBe(name)
    expect(state.hero!.nemeses[0].origin).toBe('mercy')
    expect(state.hero!.nemeses[0].favoriteIntent).toBeTruthy()
    expect(state.hero!.nemeses[0].scar).toBeTruthy()
    expect(state.hero!.nemeses[0].epithet).toBeTruthy()
    expect(state.hero!.nemeses[0].counterMutation).toBeTruthy()
    expect(state.expedition!.combat).toBeNull()
  })

  it('supports faction contracts, reputation and a refreshable city economy', () => {
    let state = freshState()
    expect(contentRegistry.questTemplates.length).toBeGreaterThanOrEqual(100)
    expect(contentRegistry.eventTemplates.length).toBeGreaterThanOrEqual(150)
    expect(new Set(contentRegistry.eventTemplates.map((event) => event.category))).toEqual(new Set(contentRegistry.eventCategories))
    const oldShop = state.shop.map((item) => item.id)
    state.hero!.gold = 100
    state = gameReducer(state, { type: 'REFRESH_SHOP' })
    expect(state.shop.map((item) => item.id)).not.toEqual(oldShop)
    state.quest = { ...state.questOffer!, complete: true, faction: 'Орден Цепей' }
    state = gameReducer(state, { type: 'CLAIM_QUEST' })
    expect(state.hero!.reputation['Орден Цепей']).toBe(2)
  })

  it('completes all eight depths and returns the hero home', () => {
    let state = gameReducer(freshState(), { type: 'START_EXPEDITION', difficulty: 1 })
    for (let guard = 0; guard < 80 && !state.expedition?.complete; guard += 1) {
      const run = state.expedition!
      if (run.reward) {
        state = gameReducer(state, { type: 'TAKE_REWARD' })
      } else if (run.event) {
        state = gameReducer(state, run.event.outcome ? { type: 'CONTINUE_EVENT' } : { type: 'EVENT_CHOICE', index: 0 })
      } else if (run.combat) {
        state.hero!.base.strength = 100
        run.combat.enemy.hp = 1
        run.combat.enemy.agility = -100
        state = gameReducer(state, { type: 'SELECT_ATTACK', zone: 'head' })
        state = gameReducer(state, { type: 'SELECT_BLOCK', zone: state.expedition!.combat!.enemyIntent })
        state = gameReducer(state, { type: 'FIGHT' })
      } else if (run.selectedNodeId) {
        state = gameReducer(state, { type: 'ENTER_NODE' })
      } else {
        state = selectFirstNode(state)
      }
    }
    expect(state.expedition?.complete).toBe(true)
    expect(state.expedition?.current).toBe(Math.max(...state.expedition!.nodes.map((node) => node.depth)))
    state = gameReducer(state, { type: 'RETURN_HOME' })
    expect(state.view).toBe('hub')
    expect(state.expedition).toBeNull()
    expect(state.hero!.victories).toBeGreaterThanOrEqual(1)
  })

  it('finishes 1,000 automated expeditions without a softlock', () => {
    for (let seed = 1; seed <= 1000; seed += 1) {
      let state = gameReducer(gameReducer(createInitialState(seed), { type: 'NEW_HERO' }), { type: 'START_EXPEDITION', difficulty: 1 })
      for (let guard = 0; guard < 100 && !state.expedition?.complete; guard += 1) {
        const run = state.expedition!
        state.hero!.hp = getHeroStats(state.hero!).maxHp
        if (run.reward) state = gameReducer(state, { type: 'TAKE_REWARD' })
        else if (run.event) state = gameReducer(state, run.event.outcome ? { type: 'CONTINUE_EVENT' } : { type: 'EVENT_CHOICE', index: 0 })
        else if (run.combat) {
          state.hero!.base.strength = 100
          run.combat.enemy.hp = 1
          run.combat.enemy.agility = -100
          state = gameReducer(state, { type: 'SELECT_ATTACK', zone: 'head' })
          state = gameReducer(state, { type: 'SELECT_BLOCK', zone: run.combat.enemyIntent })
          state = gameReducer(state, { type: 'FIGHT' })
        } else if (run.selectedNodeId) state = gameReducer(state, { type: 'ENTER_NODE' })
        else state = selectFirstNode(state)
      }
      expect(state.expedition?.complete, `seed ${seed}`).toBe(true)
    }
  }, 15_000)

  it('archives a dead hero and does not offer a rollback', () => {
    let state = freshState()
    state.hero!.score = 404
    state.hero!.victories = 9
    state.hero!.hp = 0
    state = gameReducer(state, { type: 'START_EXPEDITION', difficulty: 10 })
    state = selectFirstNode(state)
    state = gameReducer(state, { type: 'ENTER_NODE' })
    state.expedition!.combat!.enemy.power = 1000
    state.expedition!.combat!.enemy.agility = 1000
    state = gameReducer(state, { type: 'SELECT_ATTACK', zone: 'body' })
    state = gameReducer(state, { type: 'SELECT_BLOCK', zone: state.expedition!.combat!.enemyIntent === 'head' ? 'legs' : 'head' })
    state = gameReducer(state, { type: 'FIGHT' })
    expect(state.view).toBe('dead')
    expect(state.fallen[0].score).toBe(404)
    expect(state.fallen[0].cause).toBeTruthy()
    expect(state.fallen[0].epitaph).toBeTruthy()
    expect(state.expedition).toBeNull()
  })

  it('adds enemy mutations at high difficulty', () => {
    let state = gameReducer(freshState(), { type: 'START_EXPEDITION', difficulty: 8 })
    state = selectFirstNode(state)
    state = gameReducer(state, { type: 'ENTER_NODE' })
    expect(state.expedition?.combat?.enemy.mutations.length).toBeGreaterThanOrEqual(1)
  })

  it('grants a run modifier at a shrine and closes the unchosen route', () => {
    let state = gameReducer(freshState(), { type: 'START_EXPEDITION', difficulty: 4 })
    const shrine = state.expedition!.nodes.find((node) => node.type === 'shrine') ?? state.expedition!.nodes.find((node) => node.depth === 2)!
    shrine.type = 'shrine'
    state.expedition!.current = shrine.depth
    state.expedition!.nodes.forEach((node) => { node.state = node.depth === shrine.depth ? 'available' : 'locked' })
    state = gameReducer(state, { type: 'SELECT_NODE', nodeId: shrine.id })
    state = gameReducer(state, { type: 'ENTER_NODE' })
    expect(state.expedition?.event?.title).toBe('Алтарь двух голосов')
    state = gameReducer(state, { type: 'EVENT_CHOICE', index: 0 })
    expect(state.expedition?.modifiers).toHaveLength(3)
    expect(state.expedition?.modifiers.filter((modifier) => !modifier.id.startsWith('oath-'))).toHaveLength(1)
    expect(state.expedition?.modifiers.find((modifier) => !modifier.id.startsWith('oath-'))?.tone).toBe('boon')
    expect(state.expedition?.event?.outcome).toBeTruthy()
    state = gameReducer(state, { type: 'CONTINUE_EVENT' })
    expect(state.expedition?.current).toBe(shrine.depth + 1)
    expect(state.expedition?.nodes.filter((node) => node.depth === shrine.depth && node.state === 'locked').length).toBeGreaterThanOrEqual(1)
  })
})
