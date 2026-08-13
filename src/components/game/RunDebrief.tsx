import { Clipboard, HeartPulse, Route, Shield, Swords } from 'lucide-react'
import { buildSynergies } from '../../game/build-identity'
import type { GameState, RunSummary, Technique, Zone } from '../../game/types'

const techniqueNames: Record<Technique, string> = { quick: 'быстрый удар', heavy: 'тяжёлый удар', feint: 'финт' }
const zoneNames: Record<Zone, string> = { head: 'голова', body: 'корпус', legs: 'ноги' }

function maximum<T extends string>(values: Record<T, number>): T {
  return (Object.entries(values) as Array<[T, number]>).sort((left, right) => right[1] - left[1])[0][0]
}

export function explainRun(summary: RunSummary): string {
  if (summary.outcome !== 'death') return `Путь пройден за ${summary.combatTurns} боевых ходов.`
  if (summary.damageTaken > summary.healingReceived * 3 && summary.healingReceived === 0) return `Главная причина: ${summary.deathCause}. За поход получено ${summary.damageTaken} урона без восстановления здоровья.`
  if (summary.damageTaken > summary.healingReceived * 2) return `Главная причина: ${summary.deathCause}. Входящий урон (${summary.damageTaken}) сильно превысил лечение (${summary.healingReceived}).`
  return `Главная причина: ${summary.deathCause}. Последний бой исчерпал запас здоровья после ${summary.combatTurns} боевых ходов.`
}

export function RunDebrief({ summary, state }: { summary: RunSummary; state: GameState }) {
  const technique = maximum(summary.techniques)
  const attack = maximum(summary.attackZones)
  const block = maximum(summary.blockZones)
  const synergy = state.hero ? buildSynergies(state.hero, state.expedition)[0] : null
  const mainSource = Object.entries(summary.damageBySource).sort((left, right) => right[1] - left[1])[0]
  const openZone = maximum(summary.unblockedDamageByZone)
  return <section className="run-debrief" aria-label="Разбор забега"><h2>Разбор пути</h2><p className={summary.outcome === 'death' ? 'cause' : ''}>{explainRun(summary)}</p><div className="debrief-grid"><span><Route /><small>Маршрут</small><b>{summary.roomsCleared}/{summary.roomsEntered} комнат</b></span><span><Swords /><small>Любимый приём</small><b>{techniqueNames[technique]} · {summary.techniques[technique]}</b></span><span><Shield /><small>Частая защита</small><b>{zoneNames[block]} · {summary.blockZones[block]}</b></span><span><HeartPulse /><small>Урон / лечение</small><b>{summary.damageTaken} / {summary.healingReceived}</b></span></div><p>Чаще всего атаковал: <b>{zoneNames[attack]}</b>. {synergy ? <>Сильнейший почерк: <b>{synergy.name} {synergy.count}/3</b>.</> : 'Выраженная синергия не сформировалась.'}</p>{mainSource && <p>Больше всего урона нанёс <b>{mainSource[0]}: {mainSource[1]}</b>. Незакрытая зона с наибольшим уроном: <b>{zoneNames[openZone]} — {summary.unblockedDamageByZone[openZone]}</b>. Урон, совпавший с действием состояний: <b>{summary.statusDamage}</b>.</p>}<button className="text-button" onClick={() => void navigator.clipboard?.writeText(summary.seedCode)}><Clipboard size={14} /> Seed {summary.seedCode}</button></section>
}
