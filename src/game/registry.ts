import * as raw from './content'
import type { EquipSlot } from './types'

export const contentRegistry = {
  zones: raw.zones,
  slotNames: raw.slotNames,
  firstNames: raw.firstNames,
  funnyNames: raw.funnyNames,
  epithets: raw.epithets,
  enemyNames: raw.enemyNames,
  enemyTitles: raw.enemyTitles,
  enemyTraits: raw.enemyTraits,
  enemyMutations: raw.enemyMutations,
  expeditionPlaces: raw.expeditionPlaces,
  expeditionConditions: raw.expeditionConditions,
  runBoons: raw.runBoons,
  runCurses: raw.runCurses,
  perks: raw.perks,
  eventTemplates: raw.eventTemplates,
  itemParts: raw.itemParts,
  itemMaterials: raw.itemMaterials,
  itemSuffixes: raw.itemSuffixes,
  questVerbs: raw.questVerbs,
}

export type ContentRegistry = typeof contentRegistry

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`Invalid content registry: ${message}`)
}

function assertStringList(value: unknown, name: string): asserts value is string[] {
  assert(Array.isArray(value) && value.length > 0, `${name} must be a non-empty array`)
  value.forEach((entry, index) => assert(typeof entry === 'string' && entry.trim().length > 0, `${name}[${index}] must be a non-empty string`))
}

export function validateContentRegistry(registry: ContentRegistry = contentRegistry): true {
  assertStringList(registry.firstNames, 'firstNames')
  assertStringList(registry.epithets, 'epithets')
  assertStringList(registry.enemyNames, 'enemyNames')
  assertStringList(registry.enemyTitles, 'enemyTitles')
  assertStringList(registry.expeditionPlaces, 'expeditionPlaces')
  assertStringList(registry.itemMaterials, 'itemMaterials')
  assertStringList(registry.itemSuffixes, 'itemSuffixes')
  assertStringList(registry.questVerbs, 'questVerbs')

  const perkIds = registry.perks.map((perk) => perk.id)
  assert(perkIds.length > 0 && new Set(perkIds).size === perkIds.length, 'perk ids must be present and unique')
  registry.perks.forEach((perk) => {
    assert(perk.id && perk.name && perk.description && perk.icon, `perk ${perk.id || '<unknown>'} is incomplete`)
  })

  const slots: EquipSlot[] = ['weapon', 'head', 'armor', 'gloves', 'boots', 'trinket']
  slots.forEach((slot) => {
    const part = registry.itemParts[slot]
    assert(part, `itemParts.${slot} is missing`)
    assertStringList(part.nouns, `itemParts.${slot}.nouns`)
    assertStringList(part.icons, `itemParts.${slot}.icons`)
  })

  assert(registry.eventTemplates.length > 0, 'eventTemplates must not be empty')
  registry.eventTemplates.forEach((event, eventIndex) => {
    assert(event.title && event.description && event.icon, `eventTemplates[${eventIndex}] is incomplete`)
    assert(event.choices.length > 0, `eventTemplates[${eventIndex}] has no choices`)
    event.choices.forEach((choice, choiceIndex) => {
      assert(choice.length === 4 && typeof choice[0] === 'string' && typeof choice[3] === 'number', `eventTemplates[${eventIndex}].choices[${choiceIndex}] is invalid`)
    })
  })

  return true
}

validateContentRegistry()
