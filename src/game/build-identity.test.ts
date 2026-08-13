import { describe, expect, it } from 'vitest'
import { buildSynergies, inferItemTags, oathById } from './build-identity'
import { createInitialState, gameReducer } from './engine'
import type { Item } from './types'

describe('build identity', () => {
  it('maps equipment into stable synergy tags', () => {
    const dagger: Item = { id: 'dagger', name: 'Ядовитый стилет', type: 'equipment', slot: 'weapon', rarity: 'rare', stats: { agility: 2 }, value: 20, description: '', weaponStyle: 'dagger' }
    expect(inferItemTags(dagger)).toEqual(expect.arrayContaining(['poison', 'evasion']))
    expect(inferItemTags(dagger)).toEqual(inferItemTags(dagger))
  })

  it('applies a benefit and a price from the selected oath', () => {
    let state = gameReducer(createInitialState(8080), { type: 'NEW_HERO' })
    state = gameReducer(state, { type: 'START_EXPEDITION', difficulty: 3, oathId: 'scarlet' })
    expect(state.expedition?.oathId).toBe('scarlet')
    expect(state.expedition?.modifiers).toEqual(oathById('scarlet').modifiers)
    expect(state.expedition?.modifiers.some((modifier) => modifier.tone === 'boon')).toBe(true)
    expect(state.expedition?.modifiers.some((modifier) => modifier.tone === 'curse')).toBe(true)
  })

  it('marks a three-source specialization active', () => {
    let state = gameReducer(createInitialState(9090), { type: 'NEW_HERO' })
    const weapon = state.hero!.inventory.find((item) => item.slot === 'weapon')!
    weapon.weaponStyle = 'mace'
    weapon.tags = ['heavy']
    state.hero!.perks.push('tree-strength-1')
    state = gameReducer(state, { type: 'START_EXPEDITION', difficulty: 3, oathId: 'scarlet' })
    const heavy = buildSynergies(state.hero!, state.expedition).find((entry) => entry.tag === 'heavy')
    expect(heavy?.count).toBeGreaterThanOrEqual(3)
    expect(heavy?.state).toBe('active')
  })

  it('offers several deterministic rewards and allows one salvage per run', () => {
    let state = gameReducer(createInitialState(12121), { type: 'NEW_HERO' })
    state = gameReducer(state, { type: 'START_EXPEDITION', difficulty: 2, oathId: 'wanderer' })
    const node = state.expedition!.nodes.find((candidate) => candidate.depth === 0)!
    state = gameReducer(state, { type: 'SELECT_NODE', nodeId: node.id })
    state = gameReducer(state, { type: 'ENTER_NODE' })
    state.expedition!.combat!.enemy.hp = 1
    state = gameReducer(state, { type: 'SELECT_ATTACK', zone: 'body' })
    state = gameReducer(state, { type: 'SELECT_BLOCK', zone: 'body' })
    state = gameReducer(state, { type: 'FIGHT' })
    expect(state.expedition?.rewardChoices).toHaveLength(3)
    const scrapBefore = state.hero!.materials.scrap
    state = gameReducer(state, { type: 'SALVAGE_REWARD' })
    expect(state.hero!.materials.scrap).toBeGreaterThan(scrapBefore)
    expect(state.expedition?.rewardSalvageAvailable).toBe(false)
  })

  it('lets a rare rule item make the opening heavy attack free', () => {
    let state = gameReducer(createInitialState(13131), { type: 'NEW_HERO' })
    const weapon = state.hero!.inventory.find((item) => item.slot === 'weapon')!
    weapon.ruleModifier = 'freeHeavyOpener'
    state = gameReducer(state, { type: 'START_EXPEDITION', difficulty: 1, oathId: 'iron' })
    const node = state.expedition!.nodes.find((candidate) => candidate.depth === 0)!
    state = gameReducer(state, { type: 'SELECT_NODE', nodeId: node.id })
    state = gameReducer(state, { type: 'ENTER_NODE' })
    state = gameReducer(state, { type: 'SELECT_ATTACK', zone: 'body' })
    state = gameReducer(state, { type: 'SELECT_BLOCK', zone: 'body' })
    state = gameReducer(state, { type: 'SELECT_TECHNIQUE', technique: 'heavy' })
    const stamina = state.expedition!.combat!.stamina
    state = gameReducer(state, { type: 'FIGHT' })
    expect(state.expedition?.combat?.stamina).toBe(Math.min(4, stamina + 1))
  })
})
