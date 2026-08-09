import { balance } from './balance'
import type { Expedition, GameState, Hero, LogEntry, RunModifier } from './types'

export function addLog(state: GameState, text: string, tone: LogEntry['tone'] = 'plain'): void {
  const time = state.actionSequence
  const serial = state.logs.filter((entry) => entry.id.startsWith(`log-${time}-`)).length
  state.logs = [{ id: `log-${time}-${serial}`, time, text, tone }, ...state.logs].slice(0, balance.maxLogs)
}

export function currentNode(expedition: Expedition) {
  return expedition.nodes.find((node) => node.id === expedition.selectedNodeId) ?? null
}

export function modifierTotal(expedition: Expedition, stat: RunModifier['stat']): number {
  return expedition.modifiers.filter((modifier) => modifier.stat === stat).reduce((sum, modifier) => sum + modifier.value, 0)
}

export function runLuck(hero: Hero, expedition: Expedition, heroLuck: number): number {
  const conditionBonus = expedition.condition === 'Благословение ворона' ? 3 : 0
  return heroLuck + modifierTotal(expedition, 'luck') + conditionBonus
}

export function runScore(expedition: Expedition, base: number): number {
  return Math.max(0, Math.round(base * (1 + modifierTotal(expedition, 'score'))))
}

export function advanceNode(state: GameState): void {
  const expedition = state.expedition!
  const node = currentNode(expedition)
  if (!node) return
  node.state = 'cleared'
  expedition.nodes.forEach((candidate) => {
    if (candidate.depth === expedition.current && candidate.id !== node.id) candidate.state = 'locked'
  })
  expedition.combat = null
  expedition.event = null
  expedition.reward = null
  const lastDepth = Math.max(...expedition.nodes.map((candidate) => candidate.depth))
  if (expedition.current >= lastDepth) {
    expedition.complete = true
    const finishScore = runScore(expedition, expedition.difficulty * 35)
    state.hero!.score += finishScore
    expedition.earnedScore += finishScore
    addLog(state, `${expedition.name} пройдены. Круг присуждает ${finishScore} очков.`, 'gold')
    return
  }
  expedition.current += 1
  expedition.selectedNodeId = null
  expedition.nodes.forEach((candidate) => {
    if (candidate.depth === expedition.current) candidate.state = 'available'
  })
  state.hero!.deepest = Math.max(state.hero!.deepest, expedition.current + 1)
}
