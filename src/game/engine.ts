import { balance, buyPrice, restPrice, sellPrice } from './balance'
import { resolveFight, winCombat } from './combat'
import { createQuest, createShop } from './economy'
import { resolveEvent } from './events'
import { createExpedition, enterCurrentNode } from './generation'
import { createHero, getActivePerks, getHeroStats, hasUnlockedAbility, rollPerkChoices } from './progression'
import { createRandomSeed, rngForAction, SeededRng } from './random'
import { contentRegistry } from './registry'
import { createTutorialExpedition, prepareTutorialTurn } from './tutorial'
import { addLog, advanceNode, modifierTotal } from './state'
import type { GameAction, GameState, NemesisRecord } from './types'

export { itemIcon, generateItem, statSummary } from './items'
export { attributeName, enemyIntentReadChance, getActivePerks, getHeroStats, getUnlockedAbilities, getWeaponStyle, hasUnlockedAbility } from './progression'

export function createInitialState(seed = createRandomSeed()): GameState {
  return {
    version: 18,
    view: 'welcome',
    seed: seed >>> 0,
    actionSequence: 0,
    hero: null,
    dailyReturnHero: null,
    expedition: null,
    quest: null,
    questOffer: null,
    shop: [],
    logs: [],
    fallen: [],
    leaderboard: [],
    perkChoices: [],
    notice: null,
    tutorial: { completed: false, skipped: false, interactionMade: false },
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

  const heroIsFallen = state.fallen.some((fallen) => fallen.id === hero.id)
  if (heroIsFallen) {
    state.expedition = null
    state.view = action.type === 'NAVIGATE' && action.view === 'hall' ? 'hall' : 'dead'
    return state
  }

  switch (action.type) {
    case 'NAVIGATE':
      state.view = action.view
      if (action.view === 'shop' && !state.shop.length) state.shop = createShop(rng, hero.level)
      break
    case 'SET_DIFFICULTY_NOTICE':
      state.notice = action.notice
      break
    case 'START_EXPEDITION':
      state.expedition = createExpedition(rng, Math.max(1, Math.min(10, action.difficulty)), false, action.oathId ?? 'iron')
      state.view = 'expedition'
      addLog(state, `${hero.name} отправляется в ${state.expedition.name}. Сложность: ${state.expedition.difficulty}.`, 'gold')
      const nearbyNemeses = hero.nemeses.filter((nemesis) => !nemesis.biomeId || nemesis.biomeId === state.expedition!.biome.id)
      if (nearbyNemeses.length) state.notice = `В этом биоме замечены следы Немезиды: ${nearbyNemeses.map((nemesis) => `${nemesis.name}${nemesis.epithet ? ` ${nemesis.epithet}` : ''}`).join(', ')}. Точная комната неизвестна.`
      break
    case 'START_TUTORIAL':
      if (state.expedition) break
      state.expedition = createTutorialExpedition()
      state.tutorial.interactionMade = false
      state.view = 'expedition'
      break
    case 'SKIP_TUTORIAL':
      if (!state.expedition?.tutorial) break
      state.expedition = null
      state.tutorial.skipped = true
      state.tutorial.interactionMade = false
      state.view = 'hub'
      state.notice = 'Обучение пропущено. Его можно повторить в настройках убежища.'
      break
    case 'CHOOSE_TUTORIAL_REWARD': {
      const rewards = state.expedition?.tutorialRewards
      const reward = rewards?.find((item) => item.id === action.itemId)
      if (!state.expedition?.tutorial || !reward) break
      if (hero.inventory.length >= balance.inventoryCapacity) { state.notice = `Сумка заполнена: освободи место (${balance.inventoryCapacity}).`; break }
      hero.inventory.push(reward)
      state.tutorial.completed = true
      state.tutorial.skipped = false
      state.tutorial.interactionMade = false
      state.expedition = null
      state.view = 'hub'
      state.notice = `Обучение пройдено. Награда: ${reward.name}.`
      break
    }
    case 'START_DAILY_EXPEDITION':
      if (state.expedition) break
      state.dailyReturnHero = structuredClone(hero)
      const dailyState = createHero(createInitialState(action.seed >>> 0), new SeededRng(action.seed >>> 0))
      state.hero = dailyState.hero
      state.expedition = createExpedition(new SeededRng(action.seed), 6, true, 'wanderer')
      state.view = 'expedition'
      addLog(state, `Ежедневный претендент вступает в забег с фиксированным стартовым билдом. Seed: ${state.expedition.seedCode}.`, 'gold')
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
      if (state.expedition?.combat && (!state.expedition.tutorial || state.expedition.combat.turn === 1 || state.expedition.combat.turn > 3)) state.expedition.combat.attackZone = action.zone
      break
    case 'SELECT_BLOCK':
      if (state.expedition?.combat && (!state.expedition.tutorial || state.expedition.combat.turn === 2 || state.expedition.combat.turn > 3)) state.expedition.combat.blockZone = action.zone
      break
    case 'SELECT_TECHNIQUE':
      if (state.expedition?.combat && (!state.expedition.tutorial || state.expedition.combat.turn >= 3)) {
        state.expedition.combat.technique = action.technique
        if (state.expedition.tutorial && state.expedition.combat.turn === 3) state.tutorial.interactionMade = true
      }
      break
    case 'SELECT_ABILITY':
      if (state.expedition?.combat) state.expedition.combat.selectedAbility = action.abilityId === null || hasUnlockedAbility(hero, action.abilityId) ? action.abilityId : null
      break
    case 'SCOUT_INTENT':
      if (state.expedition?.combat && !state.expedition.combat.scouting) {
        if (state.expedition.combat.stamina < 1) state.notice = 'Для разведки нужна 1 выносливость.'
        else {
          state.expedition.combat.stamina -= 1
          state.expedition.combat.scouting = true
          state.expedition.combat.enemyIntentRevealed = true
          state.expedition.combat.message = 'Ты замедляешь атаку и читаешь точную зону врага. Урон этого хода будет снижен.'
        }
      }
      break
    case 'REPEAT_COMBAT_SELECTION':
      if (state.expedition?.combat?.lastSelection) {
        const selection = state.expedition.combat.lastSelection
        state.expedition.combat.attackZone = selection.attackZone
        state.expedition.combat.blockZone = selection.blockZone
        state.expedition.combat.technique = selection.technique
      }
      break
    case 'FIGHT':
      if (state.expedition?.combat) {
        if (state.expedition.tutorial && state.expedition.combat.turn === 3 && !state.tutorial.interactionMade) { state.notice = 'Сначала выбери приём и посмотри на его расход выносливости.'; break }
        const previousTurn = state.expedition.combat.turn
        resolveFight(state, rng)
        if (state.expedition?.tutorial && state.expedition.combat && state.expedition.combat.turn !== previousTurn) {
          state.tutorial.interactionMade = false
          prepareTutorialTurn(state.expedition.combat)
        }
      }
      break
    case 'SPARE_ENEMY': {
      const combat = state.expedition?.combat
      if (!combat || combat.enemy.boss || combat.enemy.hp > combat.enemy.maxHp * 0.25) { state.notice = 'Пощадить можно только раненого небоссового врага.'; break }
      const previous = hero.nemeses.find((nemesis) => nemesis.id === combat.enemy.id)
      const scars = ['со шрамом через глаз', 'с рассечённой маской', 'с клеймом пощады']
      const epithets = ['Непрощённый', 'Вернувшийся', 'Должник Круга']
      const counters = ['guarded', 'relentless', 'watchful'] as const
      const favoriteIntent = combat.enemyIntentHistory.length
        ? [...[...combat.enemyIntentHistory, { zone: combat.enemyIntent, kind: combat.enemyIntentKind }].reduce((counts, intent) => counts.set(intent.kind, (counts.get(intent.kind) ?? 0) + 1), new Map<typeof combat.enemyIntentKind, number>()).entries()].sort((a, b) => b[1] - a[1])[0][0]
        : combat.enemyIntentKind
      const nemesisRecord: NemesisRecord = {
        id: combat.enemy.id, name: combat.enemy.name, faction: combat.enemy.faction, archetype: combat.enemy.archetype,
        power: previous?.power ?? combat.enemy.power + 2, armor: previous?.armor ?? combat.enemy.armor + 1,
        encounters: Math.min(4, (previous?.encounters ?? 0) + (previous ? 1 : 0)), origin: 'mercy',
        originText: previous?.originText ?? `Пощажён в ${state.expedition!.name} на ходу ${combat.turn}.`, favoriteIntent,
        scar: previous?.scar ?? rng.pick(scars), epithet: previous?.epithet ?? rng.pick(epithets), counterMutation: previous?.counterMutation ?? rng.pick(counters),
        biomeId: previous?.biomeId ?? state.expedition!.biome.id,
      }
      hero.nemeses = [nemesisRecord, ...hero.nemeses.filter((nemesis) => nemesis.id !== combat.enemy.id)].slice(0, 3)
      hero.reputation[combat.enemy.faction] = (hero.reputation[combat.enemy.faction] ?? 0) - (previous ? 2 : 1)
      addLog(state, `${combat.enemy.name} уходит, запомнив твоё лицо. Теперь это Немезида.`, 'bad')
      advanceNode(state)
      break
    }
    case 'USE_ITEM': {
      const item = hero.inventory.find((candidate) => candidate.id === action.itemId)
      if (!item || item.type !== 'consumable') break
      if (item.effect === 'heal') {
        const healing = state.expedition ? Math.max(0.1, 1 + modifierTotal(state.expedition, 'healing')) : 1
        const perkHealing = getActivePerks(hero).has('thick-blood') ? 1.5 : 1
        hero.hp = Math.min(getHeroStats(hero).maxHp, hero.hp + Math.max(1, Math.round((item.amount ?? 20) * healing * perkHealing)))
      }
      if (item.effect === 'focus' && state.expedition?.combat) {
        state.expedition.combat.stamina = Math.min(balance.maxStamina, state.expedition.combat.stamina + (item.amount ?? 2))
      }
      if (item.effect === 'bomb' && state.expedition?.combat) {
        state.expedition.combat.enemy.hp = Math.max(0, state.expedition.combat.enemy.hp - (item.amount ?? 15))
        if (state.expedition.combat.enemy.hp <= 0) winCombat(state, rng)
      }
      const retained = getActivePerks(hero).has('tree-trade-2') && rng.chance(0.35)
      if (!retained) hero.inventory = hero.inventory.filter((candidate) => candidate.id !== item.id)
      addLog(state, `${hero.name} использует «${item.name}».`, 'good')
      break
    }
    case 'EVENT_CHOICE':
      if (state.expedition?.event && !state.expedition.event.outcome) resolveEvent(state, action.index, rng)
      break
    case 'CONTINUE_EVENT':
      if (state.expedition?.event?.outcome) advanceNode(state)
      break
    case 'TAKE_REWARD':
      if (state.expedition?.reward && hero.inventory.length >= balance.inventoryCapacity) {
        state.notice = `Сумка заполнена: освободи место (${balance.inventoryCapacity}).`
      } else if (state.expedition?.reward) {
        hero.inventory.push(state.expedition.reward)
        addLog(state, `Добыча отправлена в сумку: ${state.expedition.reward.name}.`, 'good')
        advanceNode(state)
      }
      break
    case 'SELECT_REWARD':
      if (state.expedition?.rewardChoices?.some((item) => item.id === action.itemId)) state.expedition.reward = state.expedition.rewardChoices.find((item) => item.id === action.itemId)!
      break
    case 'SALVAGE_REWARD':
      if (state.expedition?.reward && state.expedition.rewardSalvageAvailable) {
        const scrap = Math.max(1, Math.ceil(state.expedition.reward.value / 18))
        hero.materials.scrap += scrap
        state.expedition.rewardSalvageAvailable = false
        addLog(state, `Награда разобрана: +${scrap} обломков. Право разбора в этом походе потрачено.`, 'good')
        advanceNode(state)
      }
      break
    case 'LEAVE_REWARD':
      if (state.expedition?.reward) advanceNode(state)
      break
    case 'RETURN_HOME':
      if (state.expedition?.complete) {
        const finishedDaily = state.expedition.daily
        const dailyScore = hero.score
        if (finishedDaily && state.dailyReturnHero) {
          state.hero = state.dailyReturnHero
          state.dailyReturnHero = null
          addLog(state, `Ежедневный забег завершён: ${dailyScore} очков. Кампания бойца не изменилась.`, 'gold')
        } else addLog(state, `${hero.name} возвращается в убежище с новым грузом историй.`)
        state.expedition = null
        state.view = 'hub'
        state.shop = createShop(rng, state.hero!.level)
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
    case 'RISKY_REST': {
      const missing = getHeroStats(hero).maxHp - hero.hp
      const price = Math.max(1, Math.ceil(restPrice(missing) / 2))
      if (missing <= 0) state.notice = 'Рисковать лечением, когда ты цел, бессмысленно.'
      else if (hero.gold < price) state.notice = `Нужно ${price} золота.`
      else if (rng.chance(0.7)) { hero.gold -= price; hero.hp = getHeroStats(hero).maxHp; addLog(state, `Подпольный лекарь справился. −${price} золота.`, 'good') }
      else { hero.gold -= price; hero.hp = Math.max(1, hero.hp - Math.ceil(missing * 0.25)); addLog(state, 'Подпольный лекарь сделал только хуже.', 'bad') }
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
        if (state.quest.faction) hero.reputation[state.quest.faction] = (hero.reputation[state.quest.faction] ?? 0) + 2
        addLog(state, `Награда за «${state.quest.name}»: +${state.quest.rewardGold} золота, +${state.quest.rewardScore} очков.`, 'gold')
        state.quest = null
        state.questOffer = createQuest(rng, hero.level)
      }
      break
    case 'BUY': {
      const item = state.shop.find((candidate) => candidate.id === action.itemId)
      if (!item) break
      const price = buyPrice(item.value)
      if (hero.inventory.length >= balance.inventoryCapacity) state.notice = `Сумка заполнена: максимум ${balance.inventoryCapacity} предмета.`
      else if (hero.gold < price) state.notice = `Не хватает ${price - hero.gold} золота.`
      else {
        hero.gold -= price
        hero.inventory.push(item)
        state.shop = state.shop.filter((candidate) => candidate.id !== item.id)
        addLog(state, `Куплено: ${item.name}.`)
      }
      break
    }
    case 'HAGGLE_BUY': {
      const item = state.shop.find((candidate) => candidate.id === action.itemId)
      if (!item) break
      const price = Math.ceil(buyPrice(item.value) * (rng.chance(0.35 + Math.min(0.35, getHeroStats(hero).luck * 0.025)) ? 0.72 : 1.08))
      if (hero.inventory.length >= balance.inventoryCapacity) state.notice = `Сумка заполнена: максимум ${balance.inventoryCapacity} предмета.`
      else if (hero.gold < price) state.notice = `После торга нужно ${price} золота.`
      else { hero.gold -= price; hero.inventory.push(item); state.shop = state.shop.filter((candidate) => candidate.id !== item.id); addLog(state, `Торг завершён: «${item.name}» за ${price} золота.`, price < buyPrice(item.value) ? 'good' : 'bad') }
      break
    }
    case 'REFRESH_SHOP':
      if (hero.gold < 4) state.notice = 'Новый ассортимент стоит 4 золота.'
      else { hero.gold -= 4; state.shop = createShop(rng, hero.level); addLog(state, 'Мирра выкладывает новый товар.', 'plain') }
      break
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
    case 'UPGRADE_ITEM': {
      const item = hero.inventory.find((candidate) => candidate.id === action.itemId)
      if (!item || item.type !== 'equipment') break
      const level = item.upgradeLevel ?? 0
      const cost = balance.forgeUpgradeBaseScrap + level * 3
      if (hero.materials.scrap < cost) { state.notice = `Для улучшения нужно ${cost} обломков.`; break }
      const stat = (Object.keys(item.stats)[0] ?? 'strength') as keyof typeof hero.base
      item.stats[stat] = (item.stats[stat] ?? 0) + (stat === 'maxHp' ? 3 : 1)
      item.upgradeLevel = level + 1
      hero.materials.scrap -= cost
      addLog(state, `Кузница улучшает «${item.name}» до +${item.upgradeLevel}.`, 'good')
      break
    }
    case 'DISMANTLE_ITEM': {
      const item = hero.inventory.find((candidate) => candidate.id === action.itemId)
      if (!item || item.type !== 'equipment' || Object.values(hero.equipment).includes(item.id)) { state.notice = 'Сначала сними предмет.'; break }
      const rank = balance.rarityRank[item.rarity]
      hero.materials.scrap += rank + (item.upgradeLevel ?? 0)
      if (rank >= 3) hero.materials.ember += 1
      if (rank >= 5) hero.materials.essence += 1
      hero.inventory = hero.inventory.filter((candidate) => candidate.id !== item.id)
      addLog(state, `«${item.name}» разобран в кузнице.`, 'plain')
      break
    }
    case 'REFORGE_ITEM': {
      const item = hero.inventory.find((candidate) => candidate.id === action.itemId)
      if (!item || item.type !== 'equipment') break
      if (hero.materials.scrap < balance.forgeReforgeScrap || hero.materials.ember < balance.forgeReforgeEmber) { state.notice = `Для перековки нужно ${balance.forgeReforgeScrap} обломков и ${balance.forgeReforgeEmber} уголёк.`; break }
      const stat = rng.pick(['strength', 'agility', 'luck', 'armor', 'maxHp'] as const)
      item.stats = { [stat]: stat === 'maxHp' ? rng.int(8, 15) : rng.int(2, 4) }
      hero.materials.scrap -= balance.forgeReforgeScrap
      hero.materials.ember -= balance.forgeReforgeEmber
      addLog(state, `Кузница перековала «${item.name}»: теперь её главный дар — ${stat}.`, 'gold')
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
      if (hero.pendingPerks > 0 && state.perkChoices.includes(action.perkId) && (contentRegistry.perks.find((perk) => perk.id === action.perkId)?.requires ?? []).every((required) => hero.perks.includes(required))) {
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
