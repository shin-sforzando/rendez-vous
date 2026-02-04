import { fireEvent, render, screen, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App'

// Mock react-leaflet components (same pattern as Map.test.tsx)
vi.mock('react-leaflet', () => ({
  MapContainer: ({ children, className }: { children: React.ReactNode; className: string }) => (
    <div data-testid="leaflet-map" className={className}>
      {children}
    </div>
  ),
  TileLayer: () => <div data-testid="tile-layer" />,
  Marker: ({
    children,
  }: {
    children: React.ReactNode
    position: [number, number]
    icon?: unknown
  }) => <div data-testid="marker">{children}</div>,
  Popup: ({ children }: { children: React.ReactNode }) => <div data-testid="popup">{children}</div>,
  Polygon: () => <div data-testid="polygon" />,
  useMap: () => ({
    fitBounds: vi.fn(),
  }),
}))

vi.mock('leaflet', () => ({
  divIcon: vi.fn(() => ({})),
  latLngBounds: vi.fn(() => ({})),
}))

// Mock useStationSearch hook
const mockUseStationSearch = vi.fn()
vi.mock('@/hooks/useStationSearch', () => ({
  useStationSearch: (...args: unknown[]) => mockUseStationSearch(...args),
}))

// Mock useNearbyStations hook
const mockUseNearbyStations = vi.fn()
vi.mock('@/hooks/useNearbyStations', () => ({
  useNearbyStations: (...args: unknown[]) => mockUseNearbyStations(...args),
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

function setMockNearbyStations(overrides: Record<string, unknown> = {}) {
  mockUseNearbyStations.mockReturnValue({
    stations: [],
    isLoading: false,
    error: null,
    isUsingMockData: false,
    ...overrides,
  })
}

/** Helper to add a location via manual coordinate entry */
function addLocationViaForm(label: string, lat: string, lng: string) {
  if (label) {
    fireEvent.change(screen.getByLabelText('ラベル（任意）'), { target: { value: label } })
  }
  fireEvent.change(screen.getByLabelText('緯度'), { target: { value: lat } })
  fireEvent.change(screen.getByLabelText('経度'), { target: { value: lng } })
  fireEvent.click(screen.getByText('追加'))
}

describe('App', () => {
  beforeEach(() => {
    // Clear URL query params so getInitialLocationsFromUrl starts fresh
    window.history.replaceState(null, '', window.location.pathname)
    setMockStationSearch()
    setMockNearbyStations()
  })

  describe('basic rendering', () => {
    it('should render the app logo in the navbar', () => {
      render(<App />)
      expect(screen.getByAltText('rendez-vous')).toBeInTheDocument()
    })

    it('should render the LocationForm component', () => {
      render(<App />)
      expect(screen.getByTestId('location-form')).toBeInTheDocument()
    })

    it('should render the MapView component', () => {
      render(<App />)
      expect(screen.getByTestId('map-container')).toBeInTheDocument()
    })

    it('should render the ResultCard component (always visible)', () => {
      render(<App />)
      expect(screen.getByTestId('result-card')).toBeInTheDocument()
    })

    it('should show empty state in ResultCard when no locations', () => {
      render(<App />)
      expect(screen.getByText('登録済み地点（0）')).toBeInTheDocument()
    })

    it('should render theme toggle', () => {
      render(<App />)
      expect(screen.getByLabelText('テーマ切り替え')).toBeInTheDocument()
    })
  })

  describe('adding locations', () => {
    it('should add a location via manual coordinates', () => {
      render(<App />)
      addLocationViaForm('東京駅', '35.6812', '139.7671')

      const resultCard = screen.getByTestId('result-card')
      expect(within(resultCard).getByText('東京駅')).toBeInTheDocument()
      expect(screen.getByText('登録済み地点（1）')).toBeInTheDocument()
    })

    it('should add a location via station search', () => {
      setMockStationSearch({
        stations: [
          {
            id: 1,
            name: '新宿',
            line_name: 'JR山手線',
            operator: 'JR東日本',
            lat: 35.6896,
            lng: 139.7006,
          },
        ],
      })
      render(<App />)

      fireEvent.change(screen.getByLabelText('駅名検索'), { target: { value: '新宿' } })
      fireEvent.click(screen.getByText('新宿'))
      fireEvent.click(screen.getByText('追加'))

      const resultCard = screen.getByTestId('result-card')
      expect(within(resultCard).getByText('新宿')).toBeInTheDocument()
    })

    it('should not show calculation result with only one location', () => {
      render(<App />)
      addLocationViaForm('東京駅', '35.6812', '139.7671')

      expect(screen.getByText('登録済み地点（1）')).toBeInTheDocument()
      expect(screen.queryByText('計算結果')).not.toBeInTheDocument()
    })
  })

  describe('calculation and display', () => {
    it('should show calculation result when two or more locations are added', () => {
      render(<App />)
      addLocationViaForm('東京駅', '35.6812', '139.7671')
      addLocationViaForm('新宿駅', '35.6896', '139.7006')

      expect(screen.getByText('計算結果')).toBeInTheDocument()
    })

    it('should display centroid and geometric median on map', () => {
      render(<App />)
      addLocationViaForm('東京駅', '35.6812', '139.7671')
      addLocationViaForm('新宿駅', '35.6896', '139.7006')

      // Both appear in map popup and ResultCard
      expect(screen.getAllByText('中間地点').length).toBeGreaterThanOrEqual(1)
      expect(screen.getAllByText('最適地点').length).toBeGreaterThanOrEqual(1)
    })

    it('should render correct number of markers for two locations', () => {
      render(<App />)
      addLocationViaForm('東京駅', '35.6812', '139.7671')
      addLocationViaForm('新宿駅', '35.6896', '139.7006')

      // 2 location markers + 1 centroid + 1 geometric median = 4
      const markers = screen.getAllByTestId('marker')
      expect(markers).toHaveLength(4)
    })
  })

  describe('removing locations', () => {
    it('should remove a location', () => {
      render(<App />)
      addLocationViaForm('東京駅', '35.6812', '139.7671')
      addLocationViaForm('新宿駅', '35.6896', '139.7006')

      fireEvent.click(screen.getByLabelText('東京駅を削除'))

      const resultCard = screen.getByTestId('result-card')
      expect(within(resultCard).queryByText('東京駅')).not.toBeInTheDocument()
      expect(within(resultCard).getByText('新宿駅')).toBeInTheDocument()
    })

    it('should hide calculation result when locations drop below two', () => {
      render(<App />)
      addLocationViaForm('東京駅', '35.6812', '139.7671')
      addLocationViaForm('新宿駅', '35.6896', '139.7006')

      expect(screen.getByText('計算結果')).toBeInTheDocument()

      fireEvent.click(screen.getByLabelText('東京駅を削除'))

      expect(screen.queryByText('計算結果')).not.toBeInTheDocument()
      expect(screen.getByText('登録済み地点（1）')).toBeInTheDocument()
    })
  })

  describe('location limit', () => {
    it('should disable form when max locations reached', () => {
      render(<App />)

      // Add 10 locations to reach the limit
      for (let i = 0; i < 10; i++) {
        addLocationViaForm(`地点${i + 1}`, String(35 + i * 0.1), String(139 + i * 0.1))
      }

      expect(screen.getByLabelText('駅名検索')).toBeDisabled()
      expect(screen.getByText('上限に達しました')).toBeInTheDocument()
    })
  })

  describe('mixed input sources', () => {
    it('should handle locations from both station search and manual input', () => {
      setMockStationSearch({
        stations: [
          {
            id: 1,
            name: '渋谷',
            line_name: 'JR山手線',
            operator: 'JR東日本',
            lat: 35.658,
            lng: 139.7016,
          },
        ],
      })
      render(<App />)

      // Add via station search
      fireEvent.change(screen.getByLabelText('駅名検索'), { target: { value: '渋谷' } })
      fireEvent.click(screen.getByText('渋谷'))
      fireEvent.click(screen.getByText('追加'))

      // Add via manual input
      addLocationViaForm('横浜駅', '35.4657', '139.6225')

      const resultCard = screen.getByTestId('result-card')
      expect(within(resultCard).getByText('渋谷')).toBeInTheDocument()
      expect(within(resultCard).getByText('横浜駅')).toBeInTheDocument()
      expect(screen.getByText('計算結果')).toBeInTheDocument()
    })
  })

  describe('nearby stations integration', () => {
    it('should call useNearbyStations with null when no result', () => {
      render(<App />)

      // The hook should have been called with null for both centroid and median
      expect(mockUseNearbyStations).toHaveBeenCalledWith(null)
    })

    it('should call useNearbyStations with coordinates when result exists', () => {
      render(<App />)
      addLocationViaForm('東京駅', '35.6812', '139.7671')
      addLocationViaForm('新宿駅', '35.6896', '139.7006')

      // After adding 2 locations, the hook should have been called with coordinate objects
      const calls = mockUseNearbyStations.mock.calls
      const lastCalls = calls.slice(-2)

      // Both calls should have LatLng objects (not null)
      const hasCoordCalls = lastCalls.some(
        (call: unknown[]) => call[0] !== null && typeof call[0] === 'object'
      )
      expect(hasCoordCalls).toBe(true)
    })
  })
})
