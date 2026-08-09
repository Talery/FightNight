import { balance } from './balance'
import { generateItem } from './items'
import { canReadEnemyIntent, gainExperience, getActivePerks, getHeroStats, killHero } from './progression'
import type { SeededRng } from './random'
import { addLog, currentNode, modifierTotal, runLuck, runScore } from './state'
import type { GameState, Zone } from './types'

export function winCombat(state: GameState, rng: SeededRng): void {
  const hero = state.hero!
  const expedition = state.expedition!
  const enemy = expedition.combat!.enemy
  const node = currentNode(expedition)!
  const multiplier = expedition.difficulty
  const goldBase = rng.int(5, 10) + multiplier * 3 + (enemy.elite ? 12 : 0) + (enemy.boss ? 24 : 0)
  const gold = Math.round(goldBase * (expedition.condition === 'Кровавая луна' ? 1.2 : 1))
  const score = runScore(expedition, 12 + multiplier * 9 + expedition.current * 3 + enemy.mutations.length * 12 + (enemy.elite ? 30 : 0) + (enemy.boss ? 65 : 0))
  const xp = 22 + multiplier * 7 + (enemy.elite ? 25 : 0) + (enemy.boss ? 50 : 0)
  hero.gold += gold
  hero.score += score
  hero.victories += 1
  expedition.earnedGold += gold
  expedition.earnedScore += score
  if (getActivePerks(hero).has('second-breath')) hero.hp = Math.min(getHeroStats(hero).maxHp, hero.hp + 8)
  if (state.quest && expedition.difficulty >= state.quest.minDifficulty && !state.quest.complete) {
    state.quest.progress += 1
    state.quest.complete = state.quest.progress >= state.quest.goal
    if (state.quest.complete) addLog(state, `Задание «${state.quest.name}» выполнено. Награда ждёт в таверне.`, 'gold')
  }
  gainExperience(state, xp, rng)
  expedition.reward = generateItem(rng, multiplier + (enemy.elite ? 2 : 0) + (enemy.boss ? 3 : 0), runLuck(hero, expedition, getHeroStats(hero).luck))
  node.state = 'current'
  addLog(state, `${enemy.name} повержен: +${xp} опыта, +${gold} золота, +${score} очков.`, 'good')
}

export function resolveFight(state: GameState, rng: SeededRng): void {
  const hero = state.hero!
  const expedition = state.expedition!
  const combat = expedition.combat!
  if (!combat.attackZone || !combat.blockZone) {
    state.notice = 'Выбери зону удара и зону защиты.'
    return
  }
  const staminaCost = balance.techniqueStamina[combat.technique]
  if (combat.stamina < staminaCost) {
    state.notice = 'Не хватает выносливости для этого приёма.'
    return
  }
  const stats = getHeroStats(hero)
  const effectiveLuck = runLuck(hero, expedition, stats.luck)
  const effectiveArmor = stats.armor + modifierTotal(expedition, 'heroArmor')
  const active = getActivePerks(hero)
  const enemy = combat.enemy
  combat.stamina -= staminaCost
  const enemyBlock = rng.pick(['head', 'body', 'legs'] as Zone[])
  let hitChance = 0.82 + (stats.agility - enemy.agility) * 0.025
  let attackMultiplier = 1
  if (combat.technique === 'quick') hitChance += 0.09
  if (combat.technique === 'heavy') { hitChance -= 0.12; attackMultiplier = 1.65 }
  if (combat.technique === 'feint') { attackMultiplier = 0.82; hitChance += enemyBlock === combat.attackZone ? 0.35 : 0 }
  let playerDamage = 0
  if (rng.chance(Math.max(0.25, Math.min(0.97, hitChance)))) {
    const blocked = enemyBlock === combat.attackZone && combat.technique !== 'feint'
    const zoneBonus = combat.attackZone === 'head' ? 1.22 : combat.attackZone === 'legs' ? 0.9 : 1
    const lowHpBonus = active.has('blood-price') && hero.hp <= stats.maxHp / 3 ? 1.3 : 1
    const critChance = 0.04 + effectiveLuck * 0.012 + (active.has('executioner') && combat.attackZone === 'head' ? 0.12 : 0)
    const critical = rng.chance(critChance)
    playerDamage = Math.max(1, Math.round((5 + stats.strength * 1.45 - enemy.armor * 0.7) * (1 + modifierTotal(expedition, 'heroPower')) * attackMultiplier * zoneBonus * lowHpBonus * (critical ? 1.7 : 1) * (blocked ? 0.25 : 1)))
    enemy.hp = Math.max(0, enemy.hp - playerDamage)
    combat.message = `${blocked ? 'Защита смягчает удар. ' : ''}${critical ? 'Критический удар! ' : ''}${enemy.name} получает ${playerDamage} урона.`
  } else {
    combat.message = `${enemy.name} уходит с линии удара.`
  }
  if (enemy.hp <= 0) {
    winCombat(state, rng)
    return
  }

  let enemyPower = enemy.power * (1 + modifierTotal(expedition, 'enemyPower'))
  if (enemy.trait === 'Берсерк' && enemy.hp <= enemy.maxHp / 2) enemyPower *= 1.3
  if (enemy.trait === 'Кровопускатель' && combat.turn === 1) enemyPower *= 1.25
  const guarded = combat.blockZone === combat.enemyIntent
  const evade = Math.min(0.28, Math.max(0.02, (stats.agility - enemy.agility) * 0.018 + effectiveLuck * 0.004))
  let enemyDamage = 0
  if (!rng.chance(evade)) {
    enemyDamage = Math.max(0, Math.round((enemyPower + rng.int(-2, 3) - effectiveArmor * 0.75) * (guarded ? 0.22 : 1)))
    hero.hp = Math.max(0, hero.hp - enemyDamage)
  }
  combat.message += enemyDamage === 0 ? ' Ответный выпад не достигает цели.' : guarded ? ` Блок удержан: получено ${enemyDamage}.` : ` Ответный удар: −${enemyDamage} здоровья.`
  addLog(state, combat.message, enemyDamage > playerDamage ? 'bad' : 'plain')
  if (hero.hp <= 0 && killHero(state, `пал от руки ${enemy.name}`)) return
  combat.turn += 1
  combat.stamina = Math.min(balance.maxStamina, combat.stamina + 1)
  combat.enemyIntent = rng.pick(['head', 'body', 'legs'] as Zone[])
  combat.enemyIntentRevealed = canReadEnemyIntent(rng, hero, enemy.agility)
  combat.attackZone = null
  combat.blockZone = null
}
