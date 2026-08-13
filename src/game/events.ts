import { generateItem } from './items'
import { balance } from './balance'
import { getActivePerks, getHeroStats, killHero } from './progression'
import type { SeededRng } from './random'
import { contentRegistry } from './registry'
import { addLog, modifierTotal, runLuck, runScore } from './state'
import type { GameState, RunModifier } from './types'
import { recordWorldMemoryChoice } from './world-memory'

function addRandomModifier(state: GameState, rng: SeededRng, tone: RunModifier['tone']): RunModifier {
  const expedition = state.expedition!
  const source = tone === 'boon' ? contentRegistry.runBoons : contentRegistry.runCurses
  const available = source.filter((candidate) => !expedition.modifiers.some((modifier) => modifier.id === candidate.id))
  const picked = rng.pick(available.length ? available : source)
  const modifier = { ...picked } as RunModifier
  expedition.modifiers.push(modifier)
  return modifier
}

export function resolveEvent(state: GameState, index: number, rng: SeededRng): void {
  const expedition = state.expedition!
  const choice = expedition.event?.choices[index]
  if (!choice) return
  const hero = state.hero!
  const stats = getHeroStats(hero)
  let result = ''
  switch (choice.kind) {
    case 'heal': {
      const penalty = expedition.condition === 'Гнилой воздух' ? 0.55 : 1
      const amount = Math.max(1, Math.round(choice.value * penalty * expedition.biome.healingMultiplier * (1 + modifierTotal(expedition, 'healing'))))
      hero.hp = Math.min(stats.maxHp, hero.hp + amount)
      result = `Восстановлено ${amount} здоровья.`
      break
    }
    case 'hurt': {
      hero.hp = Math.max(0, hero.hp - choice.value)
      const gained = runScore(expedition, choice.value * 2)
      hero.score += gained
      expedition.earnedScore += gained
      result = `Потеряно ${choice.value} здоровья, но получено ${gained} очков.`
      break
    }
    case 'gold':
      hero.gold += choice.value + expedition.difficulty * 2
      expedition.earnedGold += choice.value + expedition.difficulty * 2
      result = `Найдено ${choice.value + expedition.difficulty * 2} золота.`
      break
    case 'material':
      hero.materials.scrap += choice.value
      if (choice.value >= 5) hero.materials.ember += 1
      result = `Получено ${choice.value} обломков${choice.value >= 5 ? ' и 1 уголёк' : ''}.`
      break
    case 'sigil':
      expedition.sigils = Math.min(expedition.sigilsRequired, expedition.sigils + choice.value)
      result = `Получена печать пути: ${expedition.sigils}/${expedition.sigilsRequired}.`
      break
    case 'score': {
      if (hero.gold >= 8) hero.gold -= 8
      const gained = runScore(expedition, choice.value)
      hero.score += gained
      expedition.earnedScore += gained
      result = `Круг запомнил решение: +${gained} очков.`
      break
    }
    case 'item':
      if (hero.inventory.length >= balance.inventoryCapacity) result = 'Сумка полна: находку пришлось оставить.'
      else { hero.inventory.push(generateItem(rng, expedition.difficulty, runLuck(hero, expedition, stats.luck))); result = 'Найден новый предмет.' }
      break
    case 'gamble': {
      const lucky = rng.chance(0.43 + runLuck(hero, expedition, stats.luck) * 0.025 + (getActivePerks(hero).has('loaded-dice') ? 0.16 : 0))
      if (lucky) {
        const gained = runScore(expedition, choice.value)
        hero.gold += choice.value
        hero.score += gained
        expedition.earnedGold += choice.value
        expedition.earnedScore += gained
        result = `Риск оправдан: +${choice.value} золота и +${gained} очков.`
      } else {
        const damage = Math.ceil(choice.value * 0.55)
        hero.hp = Math.max(0, hero.hp - damage)
        result = `Неудача: −${damage} здоровья.`
      }
      break
    }
    case 'boon': {
      const boon = addRandomModifier(state, rng, 'boon')
      result = `Получено благословение «${boon.name}»: ${boon.description}`
      break
    }
    case 'curse': {
      const boon = addRandomModifier(state, rng, 'boon')
      const curse = addRandomModifier(state, rng, 'curse')
      const mutationPool = contentRegistry.heroMutations.filter((mutation) => !hero.mutations.includes(mutation.id))
      const mutation = mutationPool.length && rng.chance(0.45) ? rng.pick(mutationPool) : null
      if (mutation) hero.mutations.push(mutation.id)
      if (hero.inventory.length >= balance.inventoryCapacity) result = `Дар «${boon.name}» принят вместе с проклятием «${curse.name}», но сумка не вместила награду.`
      else { hero.inventory.push(generateItem(rng, expedition.difficulty + 3, runLuck(hero, expedition, stats.luck))); result = `Дар «${boon.name}» принят вместе с проклятием «${curse.name}». В сумке появился сильный предмет.` }
      if (mutation) result += ` Тело меняется: «${mutation.name}».`
      break
    }
  }
  result += recordWorldMemoryChoice(hero, expedition.event!.title, index)
  const tone = hero.hp <= 0 || choice.kind === 'hurt' ? 'bad' : choice.kind === 'gold' || choice.kind === 'item' || choice.kind === 'boon' || choice.kind === 'sigil' ? 'good' : 'plain'
  expedition.event!.outcome = { choiceLabel: choice.label, result, tone }
  addLog(state, `${expedition.event!.title} · ${choice.label}: ${result}`, tone)
  if (hero.hp <= 0 && killHero(state, 'не пережил опасную встречу')) return
}
