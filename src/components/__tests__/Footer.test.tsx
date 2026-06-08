import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import Footer from '@/components/Footer'

describe('Footer', () => {
  it('renders copyright text with author name', () => {
    render(<Footer />)
    expect(screen.getByText(/© 2024/)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'shin-sforzando' })).toBeInTheDocument()
  })

  it('renders author profile link with correct href', () => {
    render(<Footer />)
    const link = screen.getByRole('link', { name: 'shin-sforzando' })
    expect(link).toHaveAttribute('href', 'https://github.com/shin-sforzando')
    expect(link).toHaveAttribute('target', '_blank')
    expect(link).toHaveAttribute('rel', 'noopener noreferrer')
  })

  it('renders GitHub repository link with correct href', () => {
    render(<Footer />)
    const link = screen.getByRole('link', { name: /GitHub repository/ })
    expect(link).toHaveAttribute('href', 'https://github.com/shin-sforzando/rendez-vous')
    expect(link).toHaveAttribute('target', '_blank')
    expect(link).toHaveAttribute('rel', 'noopener noreferrer')
  })

  it('merges custom className onto the root element', () => {
    const { container } = render(<Footer className="hidden lg:flex" />)
    const footer = container.querySelector('footer')
    expect(footer).not.toBeNull()
    expect(footer?.className).toContain('hidden')
    expect(footer?.className).toContain('lg:flex')
  })
})
