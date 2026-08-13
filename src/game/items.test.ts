import { describe, expect, it } from 'vitest'
import { assembleItemName, statSummary } from './items'
import { itemMaterials } from './content'
import type { Item } from './types'

describe('item summaries', () => {
  it('agrees material adjectives with item gender and number', () => {
    const rusty = itemMaterials.find((material) => material.masculine === 'ржавый')!
    const raven = itemMaterials.find((material) => material.masculine === 'вороний')!

    expect(assembleItemName(rusty, { text: 'меч', agreement: 'masculine' }, 'должника')).toBe('Ржавый меч должника')
    expect(assembleItemName(rusty, { text: 'кираса', agreement: 'feminine' }, 'должника')).toBe('Ржавая кираса должника')
    expect(assembleItemName(rusty, { text: 'копьё', agreement: 'neuter' }, 'должника')).toBe('Ржавое копьё должника')
    expect(assembleItemName(raven, { text: 'перчатки', agreement: 'plural' }, 'должника')).toBe('Вороньи перчатки должника')
  })

  it('shows the numeric effect of named affixes', () => {
    const item: Item = {
      id: 'test-sword',
      name: 'Зазубренный меч дуэлянта',
      type: 'equipment',
      slot: 'weapon',
      rarity: 'common',
      stats: { strength: 1 },
      value: 10,
      description: 'Обычный трофей.',
      affixes: [{
        id: 'maxHp-3-1',
        name: 'Дар неумирания',
        description: 'Даёт Здоровье +3.',
        stat: 'maxHp',
        value: 3,
      }],
    }

    expect(statSummary(item)).toBe('Сила +1 · Дар неумирания (Здоровье +3)')
  })

  it('keeps penalties visible in cursed affixes', () => {
    const item: Item = {
      id: 'test-curse',
      name: 'Проклятый меч',
      type: 'equipment',
      slot: 'weapon',
      rarity: 'epic',
      stats: {},
      value: 10,
      description: 'Проклятый трофей.',
      affixes: [{
        id: 'curse-test',
        name: 'Печать слабости',
        description: 'Сила -2.',
        stat: 'strength',
        value: -2,
        cursed: true,
      }],
    }

    expect(statSummary(item)).toBe('Печать слабости (Сила -2)')
  })
})
