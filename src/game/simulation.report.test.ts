import { expect, it } from 'vitest'
import { formatSimulationSummary, simulateExpeditions } from './simulation'

it('prints the 1,000-run balance summary', () => {
  const summary = simulateExpeditions(1, 1_000, 3)
  console.log(`\n${formatSimulationSummary(summary)}\n`)
  expect(summary.completed).toBe(1_000)
  expect(summary.softlocks).toBe(0)
}, 15_000)
