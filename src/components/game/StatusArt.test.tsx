// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { Tooltip } from '../Tooltip'
import { StatusArt } from './StatusArt'

afterEach(cleanup)

describe('status tooltip', () => {
  it('opens when the status icon is hovered and closes when the pointer leaves', () => {
    render(
      <Tooltip text="Status details">
        <StatusArt status={{ kind: 'poison', turns: 2, potency: 1 }} />
      </Tooltip>,
    )

    const status = screen.getByLabelText(/2/)
    fireEvent.mouseEnter(status)
    expect(document.querySelector('.ui-tooltip')?.textContent).toBe('Status details')

    fireEvent.mouseLeave(status)
    expect(document.querySelector('.ui-tooltip')).toBeNull()
  })

  it('opens from keyboard focus', () => {
    render(
      <Tooltip text="Keyboard status details">
        <StatusArt status={{ kind: 'bleed', turns: 1, potency: 1 }} />
      </Tooltip>,
    )

    fireEvent.focus(screen.getByLabelText(/1/))
    expect(document.querySelector('.ui-tooltip')?.textContent).toBe('Keyboard status details')
  })
})
