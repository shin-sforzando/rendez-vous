import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import StationSearch from '../StationSearch'

describe('StationSearch', () => {
  it('should render the component', () => {
    render(<StationSearch onSelect={vi.fn()} />)
    expect(screen.getByTestId('station-search')).toBeInTheDocument()
  })

  it('should render the search input', () => {
    render(<StationSearch onSelect={vi.fn()} />)
    expect(screen.getByLabelText('駅名検索')).toBeInTheDocument()
  })

  it('should render the search button', () => {
    render(<StationSearch onSelect={vi.fn()} />)
    expect(screen.getByText('検索')).toBeInTheDocument()
  })

  it('should disable the search button when input is empty', () => {
    render(<StationSearch onSelect={vi.fn()} />)
    expect(screen.getByText('検索')).toBeDisabled()
  })

  it('should enable the search button when input has text', () => {
    render(<StationSearch onSelect={vi.fn()} />)
    fireEvent.change(screen.getByLabelText('駅名検索'), { target: { value: '渋谷' } })
    expect(screen.getByText('検索')).not.toBeDisabled()
  })

  it('should call onSelect when search is submitted', () => {
    const onSelect = vi.fn()
    render(<StationSearch onSelect={onSelect} />)

    fireEvent.change(screen.getByLabelText('駅名検索'), { target: { value: '新宿' } })
    fireEvent.click(screen.getByText('検索'))

    expect(onSelect).toHaveBeenCalledWith({
      name: '新宿',
      latlng: { lat: 0, lng: 0 },
    })
  })

  it('should disable all inputs when disabled prop is true', () => {
    render(<StationSearch onSelect={vi.fn()} disabled={true} />)
    expect(screen.getByLabelText('駅名検索')).toBeDisabled()
    expect(screen.getByText('検索')).toBeDisabled()
  })

  it('should show placeholder text about Supabase', () => {
    render(<StationSearch onSelect={vi.fn()} />)
    expect(screen.getByText(/Supabase 統合後に有効/)).toBeInTheDocument()
  })
})
