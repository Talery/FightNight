import { cloneElement, useEffect, useId, useState } from 'react'
import { createPortal } from 'react-dom'
import type { FocusEventHandler, KeyboardEventHandler, MouseEventHandler, ReactElement } from 'react'

type HintableProps = {
  onMouseEnter?: MouseEventHandler<HTMLElement>
  onMouseLeave?: MouseEventHandler<HTMLElement>
  onFocus?: FocusEventHandler<HTMLElement>
  onBlur?: FocusEventHandler<HTMLElement>
  onKeyDown?: KeyboardEventHandler<HTMLElement>
  'aria-describedby'?: string
}

type TooltipPosition = {
  x: number
  y: number
  side: 'top' | 'bottom'
}

export function Tooltip({ text, children }: { text: string; children: ReactElement<HintableProps> }) {
  const id = useId()
  const [position, setPosition] = useState<TooltipPosition | null>(null)
  const childProps = children.props

  const show = (element: HTMLElement) => {
    const rect = element.getBoundingClientRect()
    const width = Math.min(300, window.innerWidth - 24)
    const half = width / 2
    const x = Math.max(12 + half, Math.min(window.innerWidth - 12 - half, rect.left + rect.width / 2))
    const side = rect.top < 125 ? 'bottom' : 'top'
    setPosition({ x, y: side === 'top' ? rect.top - 10 : rect.bottom + 10, side })
  }

  useEffect(() => {
    if (!position) return
    const close = () => setPosition(null)
    window.addEventListener('scroll', close, true)
    window.addEventListener('resize', close)
    return () => {
      window.removeEventListener('scroll', close, true)
      window.removeEventListener('resize', close)
    }
  }, [position])

  const trigger = cloneElement(children, {
    'aria-describedby': [childProps['aria-describedby'], id].filter(Boolean).join(' '),
    onMouseEnter: (event) => { childProps.onMouseEnter?.(event); show(event.currentTarget) },
    onMouseLeave: (event) => { childProps.onMouseLeave?.(event); setPosition(null) },
    onFocus: (event) => { childProps.onFocus?.(event); show(event.currentTarget) },
    onBlur: (event) => { childProps.onBlur?.(event); setPosition(null) },
    onKeyDown: (event) => {
      childProps.onKeyDown?.(event)
      if (event.key === 'Escape') setPosition(null)
      else if (!position) show(event.currentTarget)
    },
  })

  return (
    <>
      {trigger}
      {createPortal(
        <>
          <span id={id} className="sr-only">{text}</span>
          {position && <span aria-hidden="true" className={`ui-tooltip ${position.side}`} style={{ left: position.x, top: position.y }}>{text}</span>}
        </>,
        document.body,
      )}
    </>
  )
}
