import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { Slider } from '../Slider'

describe('Slider component', () => {
  it('renders with accessible attributes', () => {
    render(<Slider value={50} onChange={() => {}} label="Warmth" min={0} max={100} />)
    const input = screen.getByRole('slider', { name: 'Warmth' })
    expect(input).toBeInTheDocument()
    expect(input).toHaveAttribute('aria-valuenow', '50')
    expect(input).toHaveAttribute('aria-valuemin', '0')
    expect(input).toHaveAttribute('aria-valuemax', '100')
  })

  it('triggers onChange when value changes', () => {
    const handleChange = vi.fn()
    render(<Slider value={40} onChange={handleChange} label="Speaking pace" />)
    const input = screen.getByRole('slider', { name: 'Speaking pace' })
    fireEvent.change(input, { target: { value: '75' } })
    expect(handleChange).toHaveBeenCalledWith(75)
  })

  it('renders track fill with correct width', () => {
    const { container } = render(<Slider value={60} onChange={() => {}} min={0} max={100} />)
    const fillLine = container.querySelector('.bg-pulse')
    expect(fillLine).toBeInTheDocument()
    expect(fillLine).toHaveStyle({ width: '60%' })
  })

  it('hides fill line when showFill is false', () => {
    const { container } = render(<Slider value={60} onChange={() => {}} showFill={false} />)
    const fillLine = container.querySelector('.bg-pulse.transition-\\[width\\]')
    expect(fillLine).toBeNull()
  })
})
