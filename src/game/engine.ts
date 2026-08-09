import { balance, buyPrice, restPrice, sellPrice } from './balance'
import { resolveFight, winCombat } from './combat'
import { createQuest, createShop } from './economy'
import { resolveEvent } from './events'
import { createExpedition, enterCurrentNode } from './generation'
import { createHero, getActivePerks, getHeroStats, rollPerkChoices } from './progression'
import { createRandomSeed, rngForAction } from './random'
import { contentRegistry } from './registry'
import { addLog, advanceNode, modifierTotal } from './state'
import type { GameAction, GameState } from './types'

export { itemIcon, generateItem, statSummary } from './items'
export { attributeName, enemyIntentReadChance, getActivePerks, getHeroStats } from './progression'

export function createInitialState(seed = createRandomSeed()): GameState {
  return {
    version: 3,
    view: 'welcome',
    seed: seed >>> 0,
    actionSequence: 0,
    hero: null,
    expedition: null,
    quest: null,
    questOffer: null,
    shop: [],
    logs: [],
    fallen: [],
    leaderboard: [],
    perkChoices: [],
    notice: null,
  }
}

export const initialState: GameState = createInitialState()

export function gameReducer(current: GameState, action: GameAction): GameState {
  if (action.type === 'RESET_SAVE') {
    return { ...createInitialState(action.seed), fallen: structuredClone(current.fallen) }
  }
  if (action.type === 'IMPORT_SAVE') {
    if (action.state.hero && current.fallen.some((fallen) => fallen.id === action.state.hero!.id)) {
      const rejected = structuredClone(current)
      rejected.actionSequence += 1
      rejected.notice = 'Этот боец уже пал на этом устройстве. Откат смерти запрещён.'
      return rejected
    }
    const imported = structuredClone(action.state)
    const fallenById = new Map([...imported.fallen, ...current.fallen].map((fallen) => [fallen.id, fallen]))
    imported.fallen = [...fallenById.values()].sort((a, b) => b.score - a.score).slice(0, balance.maxFallenHeroes)
    imported.actionSequence += 1
    imported.notice = 'Сохранение импортировано и проверено.'
    return imported
  }

  const state = structuredClone(current) as GameState
  state.actionSequence = (current.actionSequence ?? 0) + 1

  if (action.type === 'LOAD_LEADERBOARD') {
    state.leaderboard = action.entries
    return state
  }

  const rng = rngForAction(state.seed, state.actionSequence)
  if (action.type === 'NEW_HERO') return createHero(state, rng)

  const hero = state.hero
  if (!hero) return state

  switch (action.type) {
    case 'NAVIGATE':
      state.view = action.view
      if (action.view === 'shop' && !state.shop.length) state.shop = createShop(rng, hero.level)
      break
    case 'SET_DIFFICULTY_NOTICE':
      state.notice = action.notice
      break
    case 'START_EXPEDITION':
      state.expedition = createExpedition(rng, Math.max(1, Math.min(10, action.difficulty)))
      state.view = 'expedition'
      addLog(state, `${hero.name} отправляется в ${state.expedition.name}. Сложность: ${state.expedition.difficulty}.`, 'gold')
      break
    case 'SELECT_NODE':
      if (state.expedition && !state.expedition.combat && !state.expedition.event && !state.expedition.reward) {
        const candidate = state.expedition.nodes.find((node) => node.id === action.nodeId && node.depth === state.expedition!.current && (node.state === 'available' || node.state === 'current'))
        if (candidate) {
          state.expedition.nodes.forEach((node) => {
            if (node.depth === state.expedition!.current && node.state === 'current') node.state = 'available'
          })
          candidate.state = 'current'
          state.expedition.selectedNodeId = candidate.id
        }
      }
      break
    case 'ENTER_NODE':
      if (state.expedition && !state.expedition.complete && !state.expedition.combat && !state.expedition.event && !state.expedition.reward) enterCurrentNode(state, rng)
      break
    case 'SELECT_ATTACK':
      if (state.expedition?.combat) state.expedition.combat.attackZone = action.zone
      break
    case 'SELECT_BLOCK':
      if (state.expedition?.combat) state.expedition.combat.blockZone = action.zone
      break
    case 'SELECT_TECHNIQUE':
      if (state.expedition?.combat) state.expedition.combat.technique = action.technique
      break
    case 'FIGHT':
      if (state.expedition?.combat) resolveFight(state, rng)
      break
    case 'USE_ITEM': {
      const item = hero.inventory.find((candidate) => candidate.id === action.itemId)
      if (!item || item.type !== 'consumable') break
      if (item.effect === 'heal') {
        const healing = state.expedition ? Math.max(0.1, 1 + modifierTotal(state.expedition, 'healing')) : 1
        hero.hp = Math.min(getHeroStats(hero).maxHp, hero.hp + Math.max(1, Math.round((item.amount ?? 20) * healing)))
      }
      if (item.effect === 'focus' && state.expedition?.combat) {
        state.expedition.combat.stamina = Math.min(balance.maxStamina, state.expedition.combat.stamina + (item.amount ?? 2))
      }
      if (item.effect === 'bomb' && state.expedition?.combat) {
        state.expedition.combat.enemy.hp = Math.max(0, state.expedition.combat.enemy.hp - (item.amount ?? 15))
        if (state.expedition.combat.enemy.hp <= 0) winCombat(state, rng)
      }
      hero.inventory = hero.inventory.filter((candidate) => candidate.id !== item.id)
      addLog(state, `${hero.name} использует «${item.name}».`, 'good')
      break
    }
    case 'EVENT_CHOICE':
      if (state.expedition?.event) resolveEvent(state, action.index, rng)
      break
    case 'TAKE_REWARD':
      if (state.expedition?.reward) {
        hero.inventory.push(state.expedition.reward)
        addLog(state, `Добыча отправлена в сумку: ${state.expedition.reward.name}.`, 'good')
        advanceNode(state)
      }
      break
    case 'LEAVE_REWARD':
      if (state.expedition?.reward) advanceNode(state)
      break
    case 'RETURN_HOME':
      if (state.expedition?.complete) {
        addLog(state, `${hero.name} возвращается в убежище с новым грузом историй.`)
        state.expedition = null
        state.view = 'hub'
        state.shop = createShop(rng, hero.level)
      }
      break
    case 'REST': {
      const missing = getHeroStats(hero).maxHp - hero.hp
      const price = restPrice(missing)
      if (missing <= 0) state.notice = 'Ты и так цел. Трактирщик разочарован.'
      else if (hero.gold < price) state.notice = `Нужно ${price} золота.`
      else {
        hero.gold -= price
        hero.hp = getHeroStats(hero).maxHp
        addLog(state, `Ночь, горячая вода и грубая нить возвращают силы. −${price} золота.`, 'good')
      }
      break
    }
    case 'ROLL_QUEST':
      if (hero.gold < 3) state.notice = 'Слухи стоят 3 золота.'
      else { hero.gold -= 3; state.questOffer = createQuest(rng, hero.level) }
      break
    case 'ACCEPT_QUEST':
      if (state.questOffer) {
        state.quest = state.questOffer
        state.questOffer = null
        addLog(state, `Принято задание: ${state.quest.name}.`, 'gold')
      }
      break
    case 'CLAIM_QUEST':
      if (state.quest?.complete) {
        hero.gold += state.quest.rewardGold
        hero.score += state.quest.rewardScore
        addLog(state, `Награда за «${state.quest.name}»: +${state.quest.rewardGold} золота, +${state.quest.rewardScore} очков.`, 'gold')
        state.quest = null
        state.questOffer = createQuest(rng, hero.level)
      }
      break
    case 'BUY': {
      const item = state.shop.find((candidate) => candidate.id === action.itemId)
      if (!item) break
      const price = buyPrice(item.value)
      if (hero.gold < price) state.notice = `Не хватает ${price - hero.gold} золота.`
      else {
        hero.gold -= price
        hero.inventory.push(item)
        state.shop = state.shop.filter((candidate) => candidate.id !== item.id)
        addLog(state, `Куплено: ${item.name}.`)
      }
      break
    }
    case 'SELL': {
      const item = hero.inventory.find((candidate) => candidate.id === action.itemId)
      if (!item || Object.values(hero.equipment).includes(item.id)) {
        state.notice = 'Сначала сними предмет.'
        break
      }
      const value = sellPrice(item.value, getActivePerks(hero).has('scavenger'))
      hero.gold += value
      hero.inventory = hero.inventory.filter((candidate) => candidate.id !== item.id)
      addLog(state, `Продано: ${item.name}. +${value} золота.`)
      break
    }
    case 'EQUIP': {
      const item = hero.inventory.find((candidate) => candidate.id === action.itemId)
      if (item?.type === 'equipment' && item.slot) {
        hero.equipment[item.slot] = item.id
        addLog(state, `Надето: ${item.name}.`, 'good')
      }
      break
    }
    case 'UNEQUIP':
      delete hero.equipment[action.slot]
      break
    case 'ADD_ATTRIBUTE':
      if (hero.unspent > 0) { hero.base[action.attribute] += 1; hero.unspent -= 1 }
      break
    case 'CHOOSE_PERK':
      if (hero.pendingPerks > 0 && state.perkChoices.includes(action.perkId)) {
        hero.perks.push(action.perkId)
        hero.pendingPerks -= 1
        state.perkChoices = []
        addLog(state, `Открыт перк: ${contentRegistry.perks.find((perk) => perk.id === action.perkId)?.name}.`, 'gold')
        rollPerkChoices(state, rng)
      }
      break
    case 'DISMISS_NOTICE':
      state.notice = null
      break
  }
  return state
}
