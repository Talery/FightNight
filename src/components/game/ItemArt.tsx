import type { Item } from '../../game/types'
import { itemArtSource } from '../../assets/registry'
import { contentRegistry } from '../../game/registry'

export { itemArtSource } from '../../assets/registry'

export function itemPresentationClasses(item: Item): string {
  return [`rarity-${item.rarity}`, item.affixes?.some((affix) => affix.cursed) ? 'is-cursed' : '', item.uniqueId ? 'is-unique' : '', item.setId ? `item-set-${item.setId}` : ''].filter(Boolean).join(' ')
}

export function itemPresentationLabel(item: Item): string {
  const set = item.setId ? contentRegistry.itemSets.find((candidate) => candidate.id === item.setId) : undefined
  return [item.uniqueId ? 'Уникальная реликвия' : '', item.affixes?.some((affix) => affix.cursed) ? 'Проклято' : '', set ? `Сет: ${set.name}` : ''].filter(Boolean).join(' · ')
}

export function ItemArt({ item, className = '' }: { item: Item; className?: string }) {
  return <img className={`item-art ${itemPresentationClasses(item)} ${className}`.trim()} src={itemArtSource(item)} alt="" aria-hidden="true" />
}
