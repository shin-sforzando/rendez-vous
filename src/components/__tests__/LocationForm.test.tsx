import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import LocationForm from '../LocationForm'

const mockUseStationSearch = vi.fn()
vi.mock('@/hooks/useStationSearch', () => ({
  useStationSearch: (...args: unknown[]) => mockUseStationSearch(...args),
}))

function setMockStationSearch(overrides: Record<string, unknown> = {}) {
  mockUseStationSearch.mockReturnValue({
    stations: [],
    isLoading: false,
    error: null,
    isUsingMockData: false,
    ...overrides,
  })
}

describe('LocationForm', () => {
  const onAdd = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    setMockStationSearch()
  })

  describe('basic rendering', () => {
    it('should render the form', () => {
      render(<LocationForm onAdd={onAdd} />)
      expect(screen.getByTestId('location-form')).toBeInTheDocument()
    })

    it('should render label, station search, lat, lng fields and submit button', () => {
      render(<LocationForm onAdd={onAdd} />)
      expect(screen.getByLabelText('ラベル（任意）')).toBeInTheDocument()
      expect(screen.getByLabelText('駅名検索')).toBeInTheDocument()
      expect(screen.getByLabelText('緯度')).toBeInTheDocument()
      expect(screen.getByLabelText('経度')).toBeInTheDocument()
      expect(screen.getByText('追加')).toBeInTheDocument()
    })
  })

  describe('manual coordinate entry', () => {
    it('should add a location with label and coordinates', () => {
      render(<LocationForm onAdd={onAdd} />)

      fireEvent.change(screen.getByLabelText('ラベル（任意）'), { target: { value: '自宅' } })
      fireEvent.change(screen.getByLabelText('緯度'), { target: { value: '35.6812' } })
      fireEvent.change(screen.getByLabelText('経度'), { target: { value: '139.7671' } })
      fireEvent.click(screen.getByText('追加'))

      expect(onAdd).toHaveBeenCalledWith({
        name: '自宅',
        latlng: { lat: 35.6812, lng: 139.7671 },
      })
    })

    it('should use coordinates as name when label is empty', () => {
      render(<LocationForm onAdd={onAdd} />)

      fireEvent.change(screen.getByLabelText('緯度'), { target: { value: '35.6812' } })
      fireEvent.change(screen.getByLabelText('経度'), { target: { value: '139.7671' } })
      fireEvent.click(screen.getByText('追加'))

      expect(onAdd).toHaveBeenCalledWith({
        name: '35.6812, 139.7671',
        latlng: { lat: 35.6812, lng: 139.7671 },
      })
    })

    it('should not submit with invalid latitude', () => {
      render(<LocationForm onAdd={onAdd} />)

      fireEvent.change(screen.getByLabelText('緯度'), { target: { value: '91' } })
      fireEvent.change(screen.getByLabelText('経度'), { target: { value: '139' } })
      fireEvent.click(screen.getByText('追加'))

      expect(onAdd).not.toHaveBeenCalled()
    })

    it('should not submit with invalid longitude', () => {
      render(<LocationForm onAdd={onAdd} />)

      fireEvent.change(screen.getByLabelText('緯度'), { target: { value: '35' } })
      fireEvent.change(screen.getByLabelText('経度'), { target: { value: '181' } })
      fireEvent.click(screen.getByText('追加'))

      expect(onAdd).not.toHaveBeenCalled()
    })

    it('should reset form after submission', () => {
      render(<LocationForm onAdd={onAdd} />)

      fireEvent.change(screen.getByLabelText('ラベル（任意）'), { target: { value: '自宅' } })
      fireEvent.change(screen.getByLabelText('緯度'), { target: { value: '35.6812' } })
      fireEvent.change(screen.getByLabelText('経度'), { target: { value: '139.7671' } })
      fireEvent.click(screen.getByText('追加'))

      expect(screen.getByLabelText('ラベル（任意）')).toHaveValue('')
      expect(screen.getByLabelText('緯度')).toHaveValue(null)
      expect(screen.getByLabelText('経度')).toHaveValue(null)
    })
  })

  describe('station search', () => {
    it('should show station search results', () => {
      setMockStationSearch({
        stations: [
          {
            id: 1,
            name: '東京',
            line_name: 'JR山手線',
            operator: 'JR東日本',
            lat: 35.6812,
            lng: 139.7671,
          },
        ],
      })
      render(<LocationForm onAdd={onAdd} />)

      fireEvent.change(screen.getByLabelText('駅名検索'), { target: { value: '東京' } })

      expect(screen.getByTestId('station-results')).toBeInTheDocument()
      expect(screen.getByText('東京')).toBeInTheDocument()
      expect(screen.getByText('JR山手線')).toBeInTheDocument()
    })

    it('should auto-fill coordinates when a station is selected', () => {
      setMockStationSearch({
        stations: [
          {
            id: 1,
            name: '東京',
            line_name: 'JR山手線',
            operator: 'JR東日本',
            lat: 35.6812,
            lng: 139.7671,
          },
        ],
      })
      render(<LocationForm onAdd={onAdd} />)

      fireEvent.change(screen.getByLabelText('駅名検索'), { target: { value: '東京' } })
      fireEvent.click(screen.getByText('東京'))

      expect(screen.getByLabelText('緯度')).toHaveValue(35.6812)
      expect(screen.getByLabelText('経度')).toHaveValue(139.7671)
    })

    it('should show selected station indicator', () => {
      setMockStationSearch({
        stations: [
          {
            id: 1,
            name: '東京',
            line_name: 'JR山手線',
            operator: 'JR東日本',
            lat: 35.6812,
            lng: 139.7671,
          },
        ],
      })
      render(<LocationForm onAdd={onAdd} />)

      fireEvent.change(screen.getByLabelText('駅名検索'), { target: { value: '東京' } })
      fireEvent.click(screen.getByText('東京'))

      expect(screen.getByTestId('selected-station')).toBeInTheDocument()
    })

    it('should use station name when submitted without label', () => {
      setMockStationSearch({
        stations: [
          {
            id: 1,
            name: '東京',
            line_name: 'JR山手線',
            operator: 'JR東日本',
            lat: 35.6812,
            lng: 139.7671,
          },
        ],
      })
      render(<LocationForm onAdd={onAdd} />)

      fireEvent.change(screen.getByLabelText('駅名検索'), { target: { value: '東京' } })
      fireEvent.click(screen.getByText('東京'))
      fireEvent.click(screen.getByText('追加'))

      expect(onAdd).toHaveBeenCalledWith({
        name: '東京',
        latlng: { lat: 35.6812, lng: 139.7671 },
      })
    })

    it('should combine label and station name when both provided', () => {
      setMockStationSearch({
        stations: [
          {
            id: 1,
            name: '東京',
            line_name: 'JR山手線',
            operator: 'JR東日本',
            lat: 35.6812,
            lng: 139.7671,
          },
        ],
      })
      render(<LocationForm onAdd={onAdd} />)

      fireEvent.change(screen.getByLabelText('ラベル（任意）'), { target: { value: '鈴木' } })
      fireEvent.change(screen.getByLabelText('駅名検索'), { target: { value: '東京' } })
      fireEvent.click(screen.getByText('東京'))
      fireEvent.click(screen.getByText('追加'))

      expect(onAdd).toHaveBeenCalledWith({
        name: '鈴木（東京）',
        latlng: { lat: 35.6812, lng: 139.7671 },
      })
    })

    it('should show loading spinner during search', () => {
      setMockStationSearch({ isLoading: true })
      render(<LocationForm onAdd={onAdd} />)

      fireEvent.change(screen.getByLabelText('駅名検索'), { target: { value: '東京' } })

      expect(screen.getByLabelText('検索中')).toBeInTheDocument()
    })

    it('should show no results message', () => {
      setMockStationSearch({ stations: [] })
      render(<LocationForm onAdd={onAdd} />)

      fireEvent.change(screen.getByLabelText('駅名検索'), { target: { value: 'zzz' } })

      expect(screen.getByText('検索結果がありません')).toBeInTheDocument()
    })

    it('should show error message', () => {
      setMockStationSearch({ error: '接続エラー' })
      render(<LocationForm onAdd={onAdd} />)

      expect(screen.getByText('検索エラー: 接続エラー')).toBeInTheDocument()
    })

    it('should show mock data warning', () => {
      setMockStationSearch({ isUsingMockData: true })
      render(<LocationForm onAdd={onAdd} />)

      expect(
        screen.getByText('Supabase未設定のため、サンプルデータを使用しています')
      ).toBeInTheDocument()
    })
  })

  describe('coordinate edit clears station', () => {
    it('should clear selected station when latitude is edited', () => {
      setMockStationSearch({
        stations: [
          {
            id: 1,
            name: '東京',
            line_name: 'JR山手線',
            operator: 'JR東日本',
            lat: 35.6812,
            lng: 139.7671,
          },
        ],
      })
      render(<LocationForm onAdd={onAdd} />)

      fireEvent.change(screen.getByLabelText('駅名検索'), { target: { value: '東京' } })
      fireEvent.click(screen.getByText('東京'))
      expect(screen.getByTestId('selected-station')).toBeInTheDocument()

      fireEvent.change(screen.getByLabelText('緯度'), { target: { value: '36.0' } })
      expect(screen.queryByTestId('selected-station')).not.toBeInTheDocument()
    })

    it('should clear selected station when longitude is edited', () => {
      setMockStationSearch({
        stations: [
          {
            id: 1,
            name: '東京',
            line_name: 'JR山手線',
            operator: 'JR東日本',
            lat: 35.6812,
            lng: 139.7671,
          },
        ],
      })
      render(<LocationForm onAdd={onAdd} />)

      fireEvent.change(screen.getByLabelText('駅名検索'), { target: { value: '東京' } })
      fireEvent.click(screen.getByText('東京'))
      expect(screen.getByTestId('selected-station')).toBeInTheDocument()

      fireEvent.change(screen.getByLabelText('経度'), { target: { value: '140.0' } })
      expect(screen.queryByTestId('selected-station')).not.toBeInTheDocument()
    })
  })

  describe('disabled state', () => {
    it('should show disabled message on submit button', () => {
      render(<LocationForm onAdd={onAdd} disabled={true} />)
      expect(screen.getByText('上限に達しました')).toBeInTheDocument()
    })

    it('should disable all input fields', () => {
      render(<LocationForm onAdd={onAdd} disabled={true} />)
      expect(screen.getByLabelText('ラベル（任意）')).toBeDisabled()
      expect(screen.getByLabelText('駅名検索')).toBeDisabled()
      expect(screen.getByLabelText('緯度')).toBeDisabled()
      expect(screen.getByLabelText('経度')).toBeDisabled()
    })
  })
})
