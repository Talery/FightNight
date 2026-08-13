import { describe, expect, it } from 'vitest'
import { REGRESSION_SEEDS } from './regression-seeds'
import { formatSimulationSummary, simulateExpeditions } from './simulation'

describe('deterministic expedition simulator', () => {
  it('produces the same statistical summary for the same seed range', () => {
    const first = simulateExpeditions(1, 40, 3)
    const second = simulateExpeditions(1, 40, 3)
    expect(second).toEqual(first)
    expect(first.completed).toBe(40)
    expect(first.softlocks).toBe(0)
    expect(first.outcomes.victory + first.outcomes.death).toBe(40)
    expect(first.fightLength.median).toBeGreaterThan(0)
    expect(first.fightLength.median).toBeGreaterThanOrEqual(4)
    expect(first.fightLength.median).toBeLessThanOrEqual(8)
    expect(first.techniqueShare.quick).toBeGreaterThanOrEqual(0.1)
    expect(first.techniqueShare.heavy).toBeGreaterThanOrEqual(0.1)
    expect(first.techniqueShare.feint).toBeGreaterThanOrEqual(0.1)
    expect(first.deathByRoomsEntered['1'] ?? 0).toBeLessThanOrEqual(4)
    expect(Object.values(first.techniques).reduce((sum, count) => sum + count, 0)).toBeGreaterThan(0)
  })

  it('formats a human-readable balance report with distributions', () => {
    const report = formatSimulationSummary(simulateExpeditions(401, 20, 5))
    expect(report).toMatch(/20\/20 завершено/)
    expect(report).toMatch(/p50 .*p90/)
    expect(report).toMatch(/Длина боя/)
    expect(report).toMatch(/быстрый .*тяжёлый .*финт/)
    expect(report).toMatch(/урон .*лечение .*награды/)
    expect(report).toMatch(/Смерти после N комнат/)
  })

  it('keeps the fixed 20-seed regression set deterministic and softlock-free', () => {
    expect(REGRESSION_SEEDS).toHaveLength(20)
    expect(new Set(REGRESSION_SEEDS).size).toBe(20)
    for (const seed of REGRESSION_SEEDS) {
      const first = simulateExpeditions(seed, 1, 3)
      const second = simulateExpeditions(seed, 1, 3)
      expect(second, `seed ${seed}`).toEqual(first)
      expect(first.completed, `seed ${seed}`).toBe(1)
      expect(first.softlocks, `seed ${seed}`).toBe(0)
    }
  })
})
