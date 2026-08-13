import { ArrowDown, Droplet, Flame, FlaskConical, Ghost, ShieldOff, Zap } from 'lucide-react'
import type { ComponentPropsWithoutRef } from 'react'
import type { LucideIcon } from 'lucide-react'
import type { StatusEffect, StatusKind } from '../../game/types'

const statusDefinitions: Record<StatusKind, { label: string; description: string; icon: LucideIcon }> = {
  bleed: { label: 'Кровотечение', description: 'Наносит 3 урона в начале хода.', icon: Droplet },
  poison: { label: 'Яд', description: 'Наносит 4 урона в начале хода.', icon: FlaskConical },
  burn: { label: 'Горение', description: 'Наносит 5 урона в начале хода.', icon: Flame },
  stun: { label: 'Оглушение', description: 'Пропуск следующего удара.', icon: Zap },
  fear: { label: 'Страх', description: 'Урон снижен на 22%.', icon: Ghost },
  weaken: { label: 'Слабость', description: 'Урон снижен на 30%.', icon: ArrowDown },
  brokenArmor: { label: 'Слом брони', description: 'Броня снижена на 3.', icon: ShieldOff },
}

export function statusLabel(kind: StatusKind): string {
  return statusDefinitions[kind].label
}

export function statusHint(status: StatusEffect): string {
  const definition = statusDefinitions[status.kind]
  return `${definition.label}: действует ещё ${status.turns} ход(а). ${definition.description}`
}

type StatusArtProps = { status: StatusEffect } & Omit<ComponentPropsWithoutRef<'span'>, 'children'>

export function StatusArt({ status, className = '', ...props }: StatusArtProps) {
  const definition = statusDefinitions[status.kind]
  const Icon = definition.icon
  return (
    <span {...props} className={`status-chip status-${status.kind} ${className}`.trim()} tabIndex={props.tabIndex ?? 0} aria-label={props['aria-label'] ?? `${definition.label}, ${status.turns} ход(а)`}>
      <Icon aria-hidden="true" />
      <b>{definition.label}</b>
      <small>{status.turns}</small>
    </span>
  )
}
