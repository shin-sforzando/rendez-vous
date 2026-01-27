import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import App from './App'

describe('App', () => {
  it('should render the app title', () => {
    render(<App />)
    expect(screen.getByText('rendez-vous')).toBeInTheDocument()
  })

  it('should render the description text', () => {
    render(<App />)
    expect(screen.getByText('最適な待ち合わせ場所を見つけよう')).toBeInTheDocument()
  })

  it('should apply DaisyUI hero layout classes', () => {
    const { container } = render(<App />)
    const heroElement = container.querySelector('.hero')
    expect(heroElement).toBeInTheDocument()
  })
})
