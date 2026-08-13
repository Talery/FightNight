import { balance } from './balance'
import { nextEnemyIntent } from './generation'
import { generateItem } from './items'
import { canReadEnemyIntent, gainExperience, getActivePerks, getHeroStats, getWeaponStyle, hasUnlockedAbility, killHero } from './progression'
import type { SeededRng } from './random'
import { addLog, currentNode, modifierTotal, runLuck, runScore } from './state'
import type { CombatState, DamageType, Enemy, GameState, StatusEffect, StatusKind, Technique, WeaponStyle, Zone } from './types'
import { tutorialRewards } from './tutorial'
import { buildSynergies, inferItemTags } from './build-identity'
import { equippedRuleModifiers } from './build-identity'

const damageTypeNames: Record<DamageType, string> = { slash: 'рубящий', crush: 'дробящий', pierce: 'колющий', mystic: 'мистический' }
const zoneNames: Record<Zone, string> = { head: 'голову', body: 'корпус', legs: 'ноги' }
const techniqueNames: Record<Technique, string> = { quick: 'Быстрый удар', heavy: 'Тяжёлый удар', feint: 'Финт' }
const statusNames: Record<StatusKind, string> = { bleed: 'кровотечение', poison: 'яд', burn: 'горение', stun: 'оглушение', fear: 'страх', weaken: 'слабость', brokenArmor: 'слом брони' }

function techniqueDamageType(technique: Technique, style: WeaponStyle): DamageType {
  if (style === 'mace') return 'crush'
  if (style === 'spear' || style === 'dagger') return 'pierce'
  if (style === 'relic') return 'mystic'
  return technique === 'quick' ? 'pierce' : technique === 'heavy' ? 'crush' : 'slash'
}

function hasStatus(statuses: StatusEffect[], kind: StatusKind): boolean {
  return statuses.some((status) => status.kind === kind)
}

function addStatus(statuses: StatusEffect[], kind: StatusKind, turns: number, potency = 1): void {
  const current = statuses.find((status) => status.kind === kind)
  if (current) { current.turns = Math.max(current.turns, turns); current.potency = Math.max(current.potency, potency); return }
  statuses.push({ kind, turns, potency })
}

function tickStatuses(statuses: StatusEffect[]): { damage: number; text: string } {
  let damage = 0
  const labels: string[] = []
  for (const status of statuses) {
    const base = balance.statusDamage[status.kind as 'bleed' | 'poison' | 'burn']
    if (base) { const value = base * status.potency; damage += value; labels.push(`${status.kind === 'bleed' ? 'Кровотечение' : status.kind === 'poison' ? 'Яд' : 'Горение'}: ${value}`) }
  }
  return { damage, text: labels.join(', ') }
}

function ageStatuses(statuses: StatusEffect[]): void {
  for (const status of statuses) status.turns -= 1
  for (let index = statuses.length - 1; index >= 0; index -= 1) if (statuses[index].turns <= 0) statuses.splice(index, 1)
}

function statusFromHeroAttack(technique: Technique, zone: Zone): StatusKind | null {
  if (technique === 'quick') return zone === 'body' ? 'poison' : 'bleed'
  if (technique === 'heavy') return zone === 'head' ? 'stun' : 'brokenArmor'
  return zone === 'body' ? 'weaken' : 'fear'
}

function statusFromEnemyAttack(type: DamageType): StatusKind {
  return type === 'slash' ? 'bleed' : type === 'crush' ? 'stun' : type === 'pierce' ? 'poison' : 'burn'
}

function advanceBossPhase(enemy: Enemy): string {
  if (!enemy.boss) return ''
  if (enemy.phase === 1 && enemy.hp <= enemy.maxHp * 2 / 3) {
    enemy.phase = 2
    enemy.power = Math.round(enemy.power * 1.18)
    return ' Босс срывает первую печать: урон растёт.'
  }
  if (enemy.phase === 2 && enemy.hp <= enemy.maxHp / 3) {
    enemy.phase = 3
    enemy.armor += 2
    return ' Босс входит в последнюю фазу: броня крепнет.'
  }
  return ''
}

export function winCombat(state: GameState, rng: SeededRng): void {
  const hero = state.hero!
  const expedition = state.expedition!
  const enemy = expedition.combat!.enemy
  const node = currentNode(expedition)!
  const defeatedNemesis = hero.nemeses.find((nemesis) => nemesis.id === enemy.id)
  if (expedition.tutorial) {
    expedition.combat = null
    expedition.tutorialRewards = tutorialRewards()
    node.state = 'cleared'
    addLog(state, 'Учебный хранитель склоняет клинок. Выбери одну награду.', 'gold')
    return
  }
  const multiplier = expedition.difficulty
  const goldBase = rng.int(5, 10) + multiplier * 3 + (enemy.elite ? 12 : 0) + (enemy.boss ? 24 : 0)
  const activePerks = getActivePerks(hero)
  const gold = Math.round(goldBase * (expedition.condition === 'Кровавая луна' ? 1.2 : 1) * (activePerks.has('tree-trade-1') ? 1.15 : 1))
  const score = runScore(expedition, 12 + multiplier * 9 + expedition.current * 3 + enemy.mutations.length * 12 + (enemy.elite ? 30 : 0) + (enemy.boss ? 65 : 0))
  const xp = 22 + multiplier * 7 + (enemy.elite ? 25 : 0) + (enemy.boss ? 50 : 0)
  hero.gold += gold
  hero.score += score
  hero.victories += 1
  hero.reputation[enemy.faction] = (hero.reputation[enemy.faction] ?? 0) + (enemy.elite ? 2 : 1)
  if (defeatedNemesis) {
    hero.nemeses = hero.nemeses.filter((nemesis) => nemesis.id !== enemy.id)
    addLog(state, `Немезида ${enemy.name} наконец повержена.`, 'gold')
  }
  expedition.earnedGold += gold
  expedition.earnedScore += score
  if (activePerks.has('tree-survival-2')) {
    const maxHp = getHeroStats(hero).maxHp
    hero.hp = Math.min(maxHp, hero.hp + Math.ceil((maxHp - hero.hp) * 0.12))
  }
  if (state.quest && expedition.difficulty >= state.quest.minDifficulty && !state.quest.complete) {
    state.quest.progress += 1
    state.quest.complete = state.quest.progress >= state.quest.goal
    if (state.quest.complete) addLog(state, `Задание «${state.quest.name}» выполнено. Награда ждёт в таверне.`, 'gold')
  }
  gainExperience(state, xp, rng)
  const rewardDifficulty = multiplier + (enemy.elite ? 2 : 0) + (enemy.boss ? 3 : 0)
  const rewardLuck = runLuck(hero, expedition, getHeroStats(hero).luck) + (activePerks.has('grave-luck') ? 4 : 0)
  if (defeatedNemesis) {
    const namedTrophy = generateItem(rng, Math.max(3, multiplier + 2), rewardLuck, false, enemy.faction)
    namedTrophy.name = `${namedTrophy.name} · память о ${defeatedNemesis.name}`
    namedTrophy.description = `Именной трофей. ${defeatedNemesis.originText ?? 'История вражды завершена.'} ${namedTrophy.description}`
    namedTrophy.tags = [...new Set([...(namedTrophy.tags ?? []), 'counter' as const])]
    expedition.rewardChoices = [namedTrophy]
    expedition.reward = namedTrophy
  }
  const faction = enemy.elite || enemy.boss ? enemy.faction : undefined
  const choiceCount = activePerks.has('tree-luck-3') || ((enemy.elite || enemy.boss) && activePerks.has('tree-trade-3')) ? 4 : 3
  const rewards = Array.from({ length: choiceCount }, () => generateItem(rng, rewardDifficulty, rewardLuck, false, faction))
  const desired = new Set(buildSynergies(hero, expedition).filter((entry) => entry.count >= 2).map((entry) => entry.tag))
  const scored = rewards.map((item) => ({ item, overlap: inferItemTags(item).filter((tag) => desired.has(tag)).length, roll: rng.next() }))
  scored.sort((left, right) => {
    if ((expedition.irrelevantRewardStreak ?? 0) >= 2 && desired.size) return right.overlap - left.overlap || right.roll - left.roll
    return (right.roll + right.overlap * .22) - (left.roll + left.overlap * .22)
  })
  if (!expedition.rewardChoices?.length) {
    expedition.rewardChoices = scored.map((entry) => entry.item)
    expedition.reward = scored[0].item
  }
  expedition.irrelevantRewardStreak = scored[0].overlap > 0 || desired.size === 0 ? 0 : (expedition.irrelevantRewardStreak ?? 0) + 1
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
  const active = getActivePerks(hero)
  const rules = equippedRuleModifiers(hero)
  const staminaCost = combat.technique === 'feint' && active.has('tree-agility-1') ? 0 : combat.technique === 'heavy' && combat.turn === 1 && rules.has('freeHeavyOpener') ? 0 : balance.techniqueStamina[combat.technique]
  if (combat.stamina < staminaCost) {
    state.notice = 'Не хватает выносливости для этого приёма.'
    return
  }
  const stats = getHeroStats(hero)
  const effectiveLuck = runLuck(hero, expedition, stats.luck)
  const effectiveArmor = stats.armor + modifierTotal(expedition, 'heroArmor')
  const weaponStyle = getWeaponStyle(hero)
  const enemy = combat.enemy
  const ability = combat.selectedAbility && hasUnlockedAbility(hero, combat.selectedAbility) ? combat.selectedAbility : null
  if (ability && combat.abilityCooldowns[ability] > 0) {
    state.notice = 'Способность ещё восстанавливается.'
    return
  }

  const heroTick = tickStatuses(combat.heroStatuses)
  if (active.has('tree-survival-1')) heroTick.damage = Math.ceil(heroTick.damage / 2)
  if (heroTick.damage) hero.hp = Math.max(0, hero.hp - heroTick.damage)
  const enemyTick = tickStatuses(combat.enemyStatuses)
  if (enemyTick.damage) enemy.hp = Math.max(0, enemy.hp - enemyTick.damage)
  if (hero.hp <= 0 && killHero(state, `пал от ран перед ударом ${enemy.name}`)) return
  if (enemy.hp <= 0) { combat.message = `${enemyTick.text}. ${enemy.name} погибает от состояний.`; winCombat(state, rng); return }
  combat.stamina -= staminaCost
  const enemyBlock = rng.pick(['head', 'body', 'legs'] as Zone[])
  let hitChance = 0.82 + (stats.agility - enemy.agility) * 0.025
  let attackMultiplier = 1
  if (combat.technique === 'quick') hitChance += 0.09
  if (combat.technique === 'heavy') { hitChance -= 0.12; attackMultiplier = 1.65 }
  if (combat.technique === 'feint') { attackMultiplier = 0.82; hitChance += enemyBlock === combat.attackZone ? 0.35 : 0 }
  if (weaponStyle === 'spear' && combat.technique === 'quick') hitChance += 0.08
  let playerDamage = 0
  let abilityText = ''
  let heroAction = ''
  if (ability === 'secondWind') {
    combat.stamina = Math.min(balance.maxStamina, combat.stamina + 2)
    combat.abilityCooldowns.secondWind = balance.abilityCooldown.secondWind
    abilityText = 'Второе дыхание возвращает 2 выносливости. '
  }
  const heroStunned = hasStatus(combat.heroStatuses, 'stun')
  if (heroStunned) {
    heroAction = `${techniqueNames[combat.technique]} в ${zoneNames[combat.attackZone]} сорван: оглушение.`
  } else if (rng.chance(Math.max(0.25, Math.min(0.97, hitChance)))) {
    const blocked = enemyBlock === combat.attackZone && combat.technique !== 'feint'
    const zoneBonus = combat.attackZone === 'head' ? 1.22 : combat.attackZone === 'legs' ? 0.9 : 1
    const lowHpBonus = 1
    const critChance = 0.04 + effectiveLuck * 0.012 + (active.has('executioner') && combat.attackZone === 'head' ? 0.12 : 0) + (weaponStyle === 'dagger' ? 0.08 : 0)
    const critical = rng.chance(critChance)
    const damageType = techniqueDamageType(combat.technique, weaponStyle)
    const armor = enemy.armor + (hasStatus(combat.enemyStatuses, 'brokenArmor') ? -3 : 0) - (weaponStyle === 'mace' ? 2 : weaponStyle === 'relic' ? 3 : 0) - (combat.technique === 'heavy' && active.has('tree-strength-1') ? 3 : 0)
    const heavyPerkMultiplier = combat.technique === 'heavy' ? (active.has('wolf-sinew') ? 1.15 : 1) * (active.has('tree-strength-3') && enemy.hp <= enemy.maxHp / 2 ? 1.35 : 1) : 1
    const bloodMomentum = combat.technique === 'quick' && hasStatus(combat.enemyStatuses, 'bleed') && rules.has('bloodMomentum') ? 1.25 : 1
    const abilityMultiplier = (ability === 'bloodletter' ? 1.35 : 1) * (weaponStyle === 'mace' && combat.technique === 'heavy' ? 1.12 : 1) * (weaponStyle === 'relic' ? 1.1 : 1) * heavyPerkMultiplier * bloodMomentum * (combat.scouting ? 0.45 : 1)
    playerDamage = Math.max(1, Math.round((5 + stats.strength * 1.45 - armor * balance.armorByDamageType[damageType]) * (1 + modifierTotal(expedition, 'heroPower')) * attackMultiplier * zoneBonus * lowHpBonus * abilityMultiplier * (critical ? 1.7 : 1) * (blocked ? 0.25 : 1)))
    enemy.hp = Math.max(0, enemy.hp - playerDamage)
    const phaseText = advanceBossPhase(enemy)
    const inflicted = statusFromHeroAttack(combat.technique, combat.attackZone)
    if (inflicted && rng.chance(combat.technique === 'heavy' ? 0.5 : 0.38)) addStatus(combat.enemyStatuses, inflicted, inflicted === 'stun' ? 1 : 2)
    if (critical && active.has('tree-luck-2')) combat.stamina = Math.min(balance.maxStamina, combat.stamina + 1)
    if (ability === 'bloodletter') { addStatus(combat.enemyStatuses, 'bleed', 3, 2); combat.abilityCooldowns.bloodletter = balance.abilityCooldown.bloodletter; abilityText += 'Кровопускание усиливает рану. ' }
    if (ability === 'guardBreak') { addStatus(combat.enemyStatuses, 'brokenArmor', 3); combat.abilityCooldowns.guardBreak = balance.abilityCooldown.guardBreak; abilityText += 'Ломатель брони вскрывает защиту. ' }
    heroAction = `${techniqueNames[combat.technique]} в ${zoneNames[combat.attackZone]}: −${playerDamage} здоровья${blocked ? ' (враг заблокировал)' : ''}${critical ? ' · КРИТ' : ''}.${inflicted && hasStatus(combat.enemyStatuses, inflicted) ? ` Эффект: ${statusNames[inflicted]}.` : ''}${phaseText}`
  } else if (active.has('tree-luck-1') && rng.chance(0.35)) {
    const armor = Math.max(0, enemy.armor - (combat.technique === 'heavy' && active.has('tree-strength-1') ? 3 : 0))
    playerDamage = Math.max(1, Math.round((5 + stats.strength * 1.45 - armor * 0.7) * attackMultiplier * 0.4))
    enemy.hp = Math.max(0, enemy.hp - playerDamage)
    heroAction = `${techniqueNames[combat.technique]} в ${zoneNames[combat.attackZone]}: скользящий удар, −${playerDamage} здоровья.`
  } else {
    heroAction = `${techniqueNames[combat.technique]} в ${zoneNames[combat.attackZone]}: промах.`
  }
  if (enemy.hp <= 0) {
    const finalHeroAction = abilityText + heroAction
    const finalEnemyAction = 'Повержен — ответной атаки нет.'
    combat.lastExchange = { hero: finalHeroAction, enemy: finalEnemyAction, heroDamage: playerDamage, enemyDamage: 0, heroResult: exchangeResult(finalHeroAction), enemyResult: 'miss' }
    combat.message = `ВЫ → ${enemy.name} · ${finalHeroAction} • ${enemy.name} → ВЫ · ${finalEnemyAction}`
    addLog(state, combat.message, 'good')
    winCombat(state, rng)
    return
  }

  let enemyPower = enemy.power * (1 + modifierTotal(expedition, 'enemyPower'))
  if (enemy.trait === 'Берсерк' && enemy.hp <= enemy.maxHp / 2) enemyPower *= 1.3
  if (enemy.trait === 'Кровопускатель' && combat.turn === 1) enemyPower *= 1.25
  const guarded = combat.blockZone === combat.enemyIntent
  if (guarded && rules.has('perfectGuard')) combat.stamina = Math.min(balance.maxStamina, combat.stamina + 1)
  const evade = Math.min(0.28, Math.max(0.02, (stats.agility - enemy.agility) * 0.018 + effectiveLuck * 0.004))
  if (hasStatus(combat.enemyStatuses, 'fear')) enemyPower *= 0.78
  if (hasStatus(combat.enemyStatuses, 'weaken')) enemyPower *= 0.7
  let enemyDamage = 0
  const enemyStunned = hasStatus(combat.enemyStatuses, 'stun')
  const enemyMissed = !enemyStunned && rng.chance(evade)
  if (!enemyStunned && !enemyMissed) {
    const armor = effectiveArmor + (hasStatus(combat.heroStatuses, 'brokenArmor') ? -3 : 0)
    const guardMultiplier = guarded ? (active.has('tree-defense-1') ? 0.12 : 0.22) : 1
    enemyDamage = Math.max(0, Math.round((enemyPower + rng.int(-2, 3) - armor * balance.armorByDamageType[enemy.damageType]) * guardMultiplier))
    if (combat.turn === 1 && active.has('iron-hide')) enemyDamage = Math.round(enemyDamage * 0.6)
    if (hero.hp <= stats.maxHp / 4 && active.has('tree-survival-3')) enemyDamage = Math.round(enemyDamage * 0.75)
    hero.hp = Math.max(0, hero.hp - enemyDamage)
    if (enemyDamage > 0 && !(guarded && active.has('tree-defense-3')) && rng.chance(0.35)) addStatus(combat.heroStatuses, statusFromEnemyAttack(enemy.damageType), enemy.damageType === 'crush' ? 1 : 2)
  }
  const intentMultiplier = combat.enemyIntentKind === 'crushingBlow' ? 1.5 : combat.enemyIntentKind === 'arcaneBurst' ? 1.25 : 1
  if (!enemyStunned && enemyDamage > 0 && intentMultiplier !== 1) {
    const extraDamage = Math.round(enemyDamage * (intentMultiplier - 1))
    hero.hp = Math.max(0, hero.hp - extraDamage)
    enemyDamage += extraDamage
  }
  if (!enemyStunned && enemyDamage > 0 && !(guarded && active.has('tree-defense-3')) && combat.enemyIntentKind === 'venomousCut') addStatus(combat.heroStatuses, 'poison', 2)
  if (!enemyStunned && enemyDamage > 0 && !(guarded && active.has('tree-defense-3')) && combat.enemyIntentKind === 'arcaneBurst') addStatus(combat.heroStatuses, 'burn', 2)
  if (guarded && active.has('tree-agility-2')) combat.stamina = Math.min(balance.maxStamina, combat.stamina + 1)
  if (guarded && enemyDamage > 0 && active.has('tree-defense-2')) enemy.hp = Math.max(0, enemy.hp - Math.max(1, Math.round(enemyDamage * 0.25)))
  if (enemyMissed && active.has('tree-agility-3')) enemy.hp = Math.max(0, enemy.hp - Math.max(1, Math.round(enemyPower * 0.25)))
  heroAction = abilityText + heroAction
  const enemyAction = enemyStunned
    ? `${intentLabel(combat.enemyIntentKind)} в ${zoneNames[combat.enemyIntent]} сорван: оглушение.`
    : enemyDamage === 0
      ? `${intentLabel(combat.enemyIntentKind)} в ${zoneNames[combat.enemyIntent]}: промах или урон поглощён.`
      : `${intentLabel(combat.enemyIntentKind)} в ${zoneNames[combat.enemyIntent]}: −${enemyDamage} здоровья${guarded ? ' (вы заблокировали)' : ''}.`
  combat.lastExchange = { hero: heroAction, enemy: enemyAction, heroDamage: playerDamage, enemyDamage, heroResult: exchangeResult(heroAction), enemyResult: exchangeResult(enemyAction) }
  combat.message = `ВЫ → ${enemy.name} · ${heroAction} • ${enemy.name} → ВЫ · ${enemyAction}`
  combat.enemyIntentHistory = [...combat.enemyIntentHistory, { zone: combat.enemyIntent, kind: combat.enemyIntentKind }].slice(-3)
  combat.lastSelection = { attackZone: combat.attackZone, blockZone: combat.blockZone, technique: combat.technique }
  combat.enemyBehavior.lastEnemyMissed = !enemyStunned && !guarded && enemyDamage === 0
  combat.enemyBehavior.lastAttackGuarded = guarded
  combat.enemyBehavior.playerAttackZones = [...combat.enemyBehavior.playerAttackZones, combat.attackZone].slice(-2)
  addLog(state, combat.message, enemyDamage > playerDamage ? 'bad' : 'plain')
  if (hero.hp <= 0 && killHero(state, `пал от руки ${enemy.name}`)) return
  if (enemy.hp <= 0) { winCombat(state, rng); return }
  ageStatuses(combat.heroStatuses)
  ageStatuses(combat.enemyStatuses)
  ;(Object.keys(combat.abilityCooldowns) as Array<keyof typeof combat.abilityCooldowns>).forEach((key) => { combat.abilityCooldowns[key] = Math.max(0, combat.abilityCooldowns[key] - 1) })
  combat.turn += 1
  combat.stamina = Math.min(balance.maxStamina, combat.stamina + 1)
  const nextIntent = nextEnemyIntent(rng, enemy, combat.turn, combat.enemyBehavior)
  combat.enemyIntent = nextIntent.zone
  combat.enemyIntentKind = nextIntent.kind
  combat.enemyBehavior = nextIntent.behavior
  combat.enemyIntentRevealed = canReadEnemyIntent(rng, hero, enemy.agility)
  combat.attackZone = null
  combat.blockZone = null
  combat.selectedAbility = null
  combat.scouting = false
}

function intentLabel(kind: CombatState['enemyIntentKind']): string {
  return ({ strike: 'Удар', crushingBlow: 'Сокрушающий удар', venomousCut: 'Ядовитый выпад', arcaneBurst: 'Мистический всплеск' })[kind]
}

function exchangeResult(text: string): NonNullable<CombatState['lastExchange']>['heroResult'] {
  if (/КРИТ/.test(text)) return 'critical'
  if (/Эффект:|ядовитый|мистический/.test(text)) return 'status'
  if (/заблокировал|заблокировали/.test(text)) return 'block'
  if (/промах|сорван|ответной атаки нет/.test(text)) return 'miss'
  return 'hit'
}
