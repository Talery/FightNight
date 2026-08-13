import { gameReducer, createInitialState, getHeroStats } from './engine'
import { collectRunSummary, createRunSummaryCollector } from './run-summary'
import type { GameAction, GameState, RunSummary, Technique, Zone } from './types'

export interface SimulationSummary {
  seedFrom: number
  runs: number
  completed: number
  softlocks: number
  outcomes: Record<RunSummary['outcome'], number>
  deathByRoomsEntered: Record<string, number>
  combatTurns: { min: number; median: number; p90: number; max: number; average: number }
  fightLength: { min: number; median: number; p90: number; max: number; average: number }
  techniques: Record<Technique, number>
  techniqueShare: Record<Technique, number>
  averageDamageTaken: number
  averageHealingReceived: number
  averageRewardsSelected: number
}

const zones: Zone[] = ['body', 'head', 'legs']

function percentile(values: number[], fraction: number): number {
  if (!values.length) return 0
  const sorted = [...values].sort((left, right) => left - right)
  return sorted[Math.min(sorted.length - 1, Math.max(0, Math.ceil(sorted.length * fraction) - 1))]
}

function round(value: number): number {
  return Math.round(value * 100) / 100
}

export function nextBotAction(state: GameState, step: number): GameAction | null {
  const run = state.expedition
  const hero = state.hero
  if (!run || !hero || run.complete) return null
  if (run.reward) return hero.inventory.length < 24 ? { type: 'TAKE_REWARD' } : { type: 'LEAVE_REWARD' }
  if (run.event) {
    if (run.event.outcome) return { type: 'CONTINUE_EVENT' }
    const missingHp = getHeroStats(hero).maxHp - hero.hp
    const healing = run.event.choices.findIndex((choice) => choice.kind === 'heal')
    return { type: 'EVENT_CHOICE', index: missingHp >= 12 && healing >= 0 ? healing : 0 }
  }
  if (run.combat) {
    const heal = hero.inventory.find((item) => item.type === 'consumable' && item.effect === 'heal')
    if (heal && hero.hp <= getHeroStats(hero).maxHp * 0.38) return { type: 'USE_ITEM', itemId: heal.id }
    if (!run.combat.attackZone) return { type: 'SELECT_ATTACK', zone: zones[(run.combat.turn + step) % zones.length] }
    if (!run.combat.blockZone) {
      const learnedPattern = run.combat.enemyIntentHistory.length > 0
      return { type: 'SELECT_BLOCK', zone: run.combat.enemyIntentRevealed || learnedPattern ? run.combat.enemyIntent : zones[(step + 1) % zones.length] }
    }
    const technique: Technique = run.combat.stamina >= 2 && run.combat.turn % 3 === 0 ? 'heavy' : run.combat.stamina >= 1 && run.combat.turn % 3 === 1 ? 'feint' : 'quick'
    if (run.combat.technique !== technique) return { type: 'SELECT_TECHNIQUE', technique }
    return { type: 'FIGHT' }
  }
  if (run.selectedNodeId) return { type: 'ENTER_NODE' }
  const available = run.nodes.filter((node) => node.depth === run.current && node.state === 'available')
  const preferred = hero.hp <= getHeroStats(hero).maxHp * 0.5
    ? available.find((node) => node.type === 'camp' || node.type === 'merchant')
    : null
  const node = preferred ?? available[0]
  return node ? { type: 'SELECT_NODE', nodeId: node.id } : null
}

export function simulateExpeditions(seedFrom: number, runs: number, difficulty = 3, maxSteps = 500): SimulationSummary {
  const reports: RunSummary[] = []
  const fightLengths: number[] = []
  let softlocks = 0
  for (let offset = 0; offset < runs; offset += 1) {
    let state = gameReducer(createInitialState((seedFrom + offset) >>> 0), { type: 'NEW_HERO' })
    let collector = createRunSummaryCollector()
    const start: GameAction = { type: 'START_EXPEDITION', difficulty }
    let next = gameReducer(state, start)
    collector = collectRunSummary(collector, state, start, next).collector
    state = next
    let completed: RunSummary | null = null
    let currentFightTurns = 0

    for (let step = 0; step < maxSteps && !completed; step += 1) {
      const action = nextBotAction(state, step)
      if (!action) break
      const wasInCombat = Boolean(state.expedition?.combat)
      if (action.type === 'FIGHT') currentFightTurns += 1
      next = gameReducer(state, action)
      const collection = collectRunSummary(collector, state, action, next)
      collector = collection.collector
      completed = collection.completed
      if (wasInCombat && !next.expedition?.combat) {
        if (currentFightTurns > 0) fightLengths.push(currentFightTurns)
        currentFightTurns = 0
      }
      state = next
    }
    if (completed) reports.push(completed)
    else softlocks += 1
  }

  const outcomes = { victory: 0, death: 0, abandoned: 0 }
  const deathByRoomsEntered: Record<string, number> = {}
  const techniques = { quick: 0, heavy: 0, feint: 0 }
  for (const report of reports) {
    outcomes[report.outcome] += 1
    if (report.outcome === 'death') deathByRoomsEntered[String(report.roomsEntered)] = (deathByRoomsEntered[String(report.roomsEntered)] ?? 0) + 1
    ;(Object.keys(techniques) as Technique[]).forEach((technique) => { techniques[technique] += report.techniques[technique] })
  }
  const totalTechniques = Object.values(techniques).reduce((sum, count) => sum + count, 0)
  const turns = reports.map((report) => report.combatTurns)
  const distribution = (values: number[]) => ({
    min: values.length ? Math.min(...values) : 0,
    median: percentile(values, 0.5),
    p90: percentile(values, 0.9),
    max: values.length ? Math.max(...values) : 0,
    average: values.length ? round(values.reduce((sum, value) => sum + value, 0) / values.length) : 0,
  })
  const average = (selector: (report: RunSummary) => number) => reports.length ? reports.reduce((sum, report) => sum + selector(report), 0) / reports.length : 0
  return {
    seedFrom: seedFrom >>> 0,
    runs,
    completed: reports.length,
    softlocks,
    outcomes,
    deathByRoomsEntered,
    combatTurns: {
      min: turns.length ? Math.min(...turns) : 0,
      median: percentile(turns, 0.5),
      p90: percentile(turns, 0.9),
      max: turns.length ? Math.max(...turns) : 0,
      average: round(average((report) => report.combatTurns)),
    },
    fightLength: distribution(fightLengths),
    techniques,
    techniqueShare: {
      quick: totalTechniques ? round(techniques.quick / totalTechniques) : 0,
      heavy: totalTechniques ? round(techniques.heavy / totalTechniques) : 0,
      feint: totalTechniques ? round(techniques.feint / totalTechniques) : 0,
    },
    averageDamageTaken: round(average((report) => report.damageTaken)),
    averageHealingReceived: round(average((report) => report.healingReceived)),
    averageRewardsSelected: round(average((report) => report.selectedRewardIds.length)),
  }
}

export function formatSimulationSummary(summary: SimulationSummary): string {
  const deaths = Object.entries(summary.deathByRoomsEntered).sort(([left], [right]) => Number(left) - Number(right)).map(([depth, count]) => `${depth}:${count}`).join(', ') || 'нет'
  return [
    `Автосимуляция: ${summary.completed}/${summary.runs} завершено, softlock ${summary.softlocks}`,
    `Исходы: победа ${summary.outcomes.victory}, смерть ${summary.outcomes.death}, прервано ${summary.outcomes.abandoned}`,
    `Боевые ходы: min ${summary.combatTurns.min}, p50 ${summary.combatTurns.median}, p90 ${summary.combatTurns.p90}, max ${summary.combatTurns.max}, avg ${summary.combatTurns.average}`,
    `Длина боя: min ${summary.fightLength.min}, p50 ${summary.fightLength.median}, p90 ${summary.fightLength.p90}, max ${summary.fightLength.max}, avg ${summary.fightLength.average}`,
    `Приёмы: быстрый ${summary.techniqueShare.quick}, тяжёлый ${summary.techniqueShare.heavy}, финт ${summary.techniqueShare.feint}`,
    `Среднее: урон ${summary.averageDamageTaken}, лечение ${summary.averageHealingReceived}, награды ${summary.averageRewardsSelected}`,
    `Смерти после N комнат: ${deaths}`,
  ].join('\n')
}
