import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import StationSearch from '../StationSearch'

// Mock the useStationSearch hook to control its return values
const mockUseStationSearch = vi.fn()
vi.mock('@/hooks/useStationSearch', () => ({
  useStationSearch: (...args: unknown[]) => mockUseStationSearch(...args),
}))

function setMockReturn(overrides: Record<string, unknown> = {}) {
  mockUseStationSearch.mockReturnValue({
    stations: [],
    isLoading: false,
    error: null,
    isUsingMockData: false,
    ...overrides,
  })
}

describe('StationSearch', () => {
  it('should render the component', () => {
    setMockReturn()
    render(<StationSearch onSelect={vi.fn()} />)
    expect(screen.getByTestId('station-search')).toBeInTheDocument()
  })

  it('should render the search input', () => {
    setMockReturn()
    render(<StationSearch onSelect={vi.fn()} />)
    expect(screen.getByLabelText('駅名検索')).toBeInTheDocument()
  })

  it('should disable input when disabled prop is true', () => {
    setMockReturn()
    render(<StationSearch onSelect={vi.fn()} disabled={true} />)
    expect(screen.getByLabelText('駅名検索')).toBeDisabled()
  })

  it('should show mock data notice when using mock data', () => {
    setMockReturn({ isUsingMockData: true })
    render(<StationSearch onSelect={vi.fn()} />)
    expect(screen.getByText(/サンプルデータを使用しています/)).toBeInTheDocument()
  })

  it('should not show mock data notice when using Supabase', () => {
    setMockReturn({ isUsingMockData: false })
    render(<StationSearch onSelect={vi.fn()} />)
    expect(screen.queryByText(/サンプルデータを使用しています/)).not.toBeInTheDocument()
  })

  it('should show error message', () => {
    setMockReturn({ error: 'Network error' })
    render(<StationSearch onSelect={vi.fn()} />)
    expect(screen.getByRole('alert')).toHaveTextContent('検索エラー: Network error')
  })

  it('should show loading spinner when searching', () => {
    setMockReturn({ isLoading: true })
    const { container } = render(<StationSearch onSelect={vi.fn()} />)

    // Type a query to show the results area
    fireEvent.change(screen.getByLabelText('駅名検索'), { target: { value: '東京' } })

    expect(container.querySelector('.loading-spinner')).toBeInTheDocument()
  })

  it('should show station results', () => {
    setMockReturn({
      stations: [
        {
          id: 1,
          name: '東京',
          line_name: 'JR山手線',
          operator: 'JR東日本',
          lat: 35.68,
          lng: 139.77,
        },
      ],
    })
    render(<StationSearch onSelect={vi.fn()} />)

    // Type a query to show the results area
    fireEvent.change(screen.getByLabelText('駅名検索'), { target: { value: '東京' } })

    expect(screen.getByText('東京')).toBeInTheDocument()
    expect(screen.getByText('JR山手線')).toBeInTheDocument()
    expect(screen.getByText('JR東日本')).toBeInTheDocument()
  })

  it('should call onSelect with location when a station is clicked', () => {
    const onSelect = vi.fn()
    setMockReturn({
      stations: [
        {
          id: 1,
          name: '新宿',
          line_name: 'JR山手線',
          operator: 'JR東日本',
          lat: 35.69,
          lng: 139.7,
        },
      ],
    })
    render(<StationSearch onSelect={onSelect} />)

    fireEvent.change(screen.getByLabelText('駅名検索'), { target: { value: '新宿' } })
    fireEvent.click(screen.getByText('新宿'))

    expect(onSelect).toHaveBeenCalledWith({
      name: '新宿（JR山手線）',
      latlng: { lat: 35.69, lng: 139.7 },
    })
  })

  it('should show "no results" message when query has no matches', () => {
    setMockReturn({ stations: [] })
    render(<StationSearch onSelect={vi.fn()} />)

    fireEvent.change(screen.getByLabelText('駅名検索'), { target: { value: 'ロンドン' } })

    expect(screen.getByText('検索結果がありません')).toBeInTheDocument()
  })

  it('should clear query after selecting a station', () => {
    setMockReturn({
      stations: [{ id: 1, name: '渋谷', line_name: null, operator: null, lat: 35.66, lng: 139.7 }],
    })
    render(<StationSearch onSelect={vi.fn()} />)

    const input = screen.getByLabelText('駅名検索')
    fireEvent.change(input, { target: { value: '渋谷' } })
    fireEvent.click(screen.getByText('渋谷'))

    expect(input).toHaveValue('')
  })

  it('should format name without line_name when null', () => {
    const onSelect = vi.fn()
    setMockReturn({
      stations: [{ id: 1, name: '渋谷', line_name: null, operator: null, lat: 35.66, lng: 139.7 }],
    })
    render(<StationSearch onSelect={onSelect} />)

    fireEvent.change(screen.getByLabelText('駅名検索'), { target: { value: '渋谷' } })
    fireEvent.click(screen.getByText('渋谷'))

    expect(onSelect).toHaveBeenCalledWith({
      name: '渋谷',
      latlng: { lat: 35.66, lng: 139.7 },
    })
  })
})
