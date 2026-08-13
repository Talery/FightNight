import * as raw from './content'
import type { EquipSlot, EventCategory } from './types'

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
  enemyFactions: raw.enemyFactions,
  enemyArchetypes: raw.enemyArchetypes,
  enemyBehaviorProfiles: raw.enemyBehaviorProfiles,
  expandedEnemyTraits: raw.expandedEnemyTraits,
  expandedEnemyMutations: raw.expandedEnemyMutations,
  bosses: raw.bosses,
  expeditionPlaces: raw.expeditionPlaces,
  expeditionConditions: raw.expeditionConditions,
  biomes: raw.biomes,
  runBoons: raw.runBoons,
  runCurses: raw.runCurses,
  perks: raw.perks,
  eventTemplates: [...raw.eventTemplates, ...raw.generatedEventTemplates],
  eventCategories: raw.eventCategories,
  itemParts: raw.itemParts,
  itemMaterials: raw.itemMaterials,
  itemSuffixes: raw.itemSuffixes,
  itemAffixes: raw.itemAffixes,
  cursedAffixes: raw.cursedAffixes,
  itemSets: raw.itemSets,
  uniqueRelics: raw.uniqueRelics,
  heroMutations: raw.heroMutations,
  questVerbs: raw.questVerbs,
  questTemplates: raw.questTemplates,
}

export type ContentRegistry = typeof contentRegistry

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`Invalid content registry: ${message}`)
}

function assertStringList(value: unknown, name: string): asserts value is string[] {
  assert(Array.isArray(value) && value.length > 0, `${name} must be a non-empty array`)
  value.forEach((entry, index) => assert(typeof entry === 'string' && entry.trim().length > 0, `${name}[${index}] must be a non-empty string`))
  assert(new Set(value.map((entry) => entry.trim().toLocaleLowerCase('ru-RU'))).size === value.length, `${name} contains duplicate entries`)
}

export function validateContentRegistry(registry: ContentRegistry = contentRegistry): true {
  assertStringList(registry.firstNames, 'firstNames')
  assertStringList(registry.epithets, 'epithets')
  assertStringList(registry.enemyNames, 'enemyNames')
  assertStringList(registry.enemyTitles, 'enemyTitles')
  const namePartCount = registry.firstNames.length + registry.epithets.length + registry.enemyNames.length + registry.enemyTitles.length
    + registry.itemMaterials.length + registry.itemSuffixes.length + Object.values(registry.itemParts).reduce((count, part) => count + part.nouns.length, 0)
  assert(namePartCount >= 500, 'name and item pools must contain at least 500 parts')
  assert(registry.enemyFactions.length >= 6, 'enemy factions must be present')
  assert(registry.enemyArchetypes.length === 6, 'enemy archetypes must contain six roles')
  const archetypeIds = registry.enemyArchetypes.map((archetype) => archetype.id)
  assert(registry.enemyBehaviorProfiles.length === archetypeIds.length, 'enemy behavior profiles must cover every archetype')
  assert(new Set(registry.enemyBehaviorProfiles.map((profile) => profile.archetypeId)).size === archetypeIds.length, 'enemy behavior profile archetype ids must be unique')
  registry.enemyBehaviorProfiles.forEach((profile) => {
    assert(archetypeIds.includes(profile.archetypeId), `enemy behavior profile ${profile.archetypeId} has no archetype`)
    assert(profile.description.trim().length > 0, `enemy behavior profile ${profile.archetypeId} needs a description`)
    assert(profile.patterns.length >= 2, `enemy behavior profile ${profile.archetypeId} needs at least two patterns`)
    assert(new Set(profile.patterns.map((pattern) => pattern.id)).size === profile.patterns.length, `enemy behavior profile ${profile.archetypeId} has duplicate pattern ids`)
    profile.patterns.forEach((pattern) => {
      assert(/^[a-z0-9-]+$/.test(pattern.id), `enemy behavior pattern ${pattern.id} has an invalid id`)
      assert(pattern.weight > 0 && Number.isFinite(pattern.weight), `enemy behavior pattern ${pattern.id} has an invalid weight`)
      assert(pattern.sequence.length >= 2 && pattern.sequence.length <= 3, `enemy behavior pattern ${pattern.id} must contain two or three intents`)
      assert(pattern.sequence.every((intent) => ['strike', 'crushingBlow', 'venomousCut', 'arcaneBurst'].includes(intent)), `enemy behavior pattern ${pattern.id} has an invalid intent`)
      assert(pattern.zones.length === pattern.sequence.length && pattern.zones.every((zone) => ['head', 'body', 'legs'].includes(zone)), `enemy behavior pattern ${pattern.id} must map every intent to a zone`)
    })
  })
  assert(registry.expandedEnemyTraits.length >= 60, 'enemy traits must contain at least 60 entries')
  assert(registry.expandedEnemyMutations.length >= 80, 'enemy mutations must contain at least 80 entries')
  assert(registry.bosses.length === 12, 'bosses must contain 12 entries')
  assertStringList(registry.expeditionPlaces, 'expeditionPlaces')
  assert(registry.biomes.length === 8 && new Set(registry.biomes.map((biome) => biome.id)).size === 8, 'biomes must contain 8 unique entries')
  registry.biomes.forEach((biome) => assert(biome.routeArt && biome.combatArt && biome.eventArt, `biome ${biome.id} art is incomplete`))
  assert(registry.itemMaterials.length > 0, 'itemMaterials must be a non-empty array')
  registry.itemMaterials.forEach((material, index) => {
    ;(['masculine', 'feminine', 'neuter', 'plural'] as const).forEach((form) => {
      assert(typeof material[form] === 'string' && material[form].trim().length > 0, `itemMaterials[${index}].${form} must be a non-empty string`)
    })
  })
  assertStringList(registry.itemSuffixes, 'itemSuffixes')
  assertStringList(registry.questVerbs, 'questVerbs')
  assert(registry.questTemplates.length >= 100, 'questTemplates must contain at least 100 entries')
  assert(registry.itemAffixes.length >= 120, 'itemAffixes must contain at least 120 entries')
  assert(new Set(registry.itemAffixes.map((affix) => affix.id)).size === registry.itemAffixes.length, 'item affix ids must be unique')
  assert(registry.uniqueRelics.length >= 40, 'uniqueRelics must contain at least 40 entries')
  assert(registry.heroMutations.length >= 6 && new Set(registry.heroMutations.map((mutation) => mutation.id)).size === registry.heroMutations.length, 'hero mutations must be unique')

  const perkIds = registry.perks.map((perk) => perk.id)
  assert(perkIds.length >= 30 && perkIds.length <= 40 && new Set(perkIds).size === perkIds.length, 'perk ids must be present, unique and contain 30–40 entries')
  registry.perks.forEach((perk) => {
    assert(perk.id && perk.name && perk.description && perk.icon, `perk ${perk.id || '<unknown>'} is incomplete`)
    ;(perk.requires ?? []).forEach((required) => assert(perkIds.includes(required), `perk ${perk.id} has unknown requirement ${required}`))
  })

  const slots: EquipSlot[] = ['weapon', 'head', 'armor', 'gloves', 'boots', 'trinket']
  slots.forEach((slot) => {
    const part = registry.itemParts[slot]
    assert(part, `itemParts.${slot} is missing`)
    assert(Array.isArray(part.nouns) && part.nouns.length > 0, `itemParts.${slot}.nouns must be a non-empty array`)
    part.nouns.forEach((noun, index) => {
      assert(typeof noun.text === 'string' && noun.text.trim().length > 0, `itemParts.${slot}.nouns[${index}].text must be a non-empty string`)
      assert(['masculine', 'feminine', 'neuter', 'plural'].includes(noun.agreement), `itemParts.${slot}.nouns[${index}].agreement is invalid`)
    })
    assertStringList(part.icons, `itemParts.${slot}.icons`)
  })

  assert(registry.eventTemplates.length >= 150, 'eventTemplates must contain at least 150 entries')
  registry.eventTemplates.forEach((event, eventIndex) => {
    assert(event.title && event.description && event.icon, `eventTemplates[${eventIndex}] is incomplete`)
    assert((registry.eventCategories as readonly EventCategory[]).includes(event.category), `eventTemplates[${eventIndex}].category is invalid`)
    assert(event.choices.length > 0, `eventTemplates[${eventIndex}] has no choices`)
    event.choices.forEach((choice, choiceIndex) => {
      assert(choice.length === 4 && typeof choice[0] === 'string' && typeof choice[3] === 'number', `eventTemplates[${eventIndex}].choices[${choiceIndex}] is invalid`)
    })
  })

  return true
}

validateContentRegistry()
