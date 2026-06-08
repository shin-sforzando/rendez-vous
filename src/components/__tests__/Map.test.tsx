import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import MapView from '../Map'

// Single shared mock map instance so tests can assert on flyTo/setView calls
const mockMap = {
  fitBounds: vi.fn(),
  invalidateSize: vi.fn(),
  getContainer: () => ({ clientWidth: 400, clientHeight: 300 }),
  flyTo: vi.fn(),
  getZoom: vi.fn(() => 6),
}

// Mock react-leaflet components since they require a real DOM with canvas/SVG
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
  Polygon: ({ pathOptions }: { positions: unknown[]; pathOptions: Record<string, unknown> }) => (
    <div data-testid="polygon" data-color={pathOptions.color} />
  ),
  useMap: () => mockMap,
}))

vi.mock('leaflet', () => ({
  divIcon: vi.fn(() => ({})),
  latLngBounds: vi.fn(() => ({})),
}))

describe('Map', () => {
  it('should render the map container', () => {
    render(<MapView locations={[]} />)
    expect(screen.getByTestId('map-container')).toBeInTheDocument()
  })

  it('should render the leaflet map', () => {
    render(<MapView locations={[]} />)
    expect(screen.getByTestId('leaflet-map')).toBeInTheDocument()
  })

  it('should render markers for each location', () => {
    const locations = [
      { id: 'tokyo', label: '東京', latlng: { lat: 35.6762, lng: 139.6503 } },
      { id: 'osaka', label: '大阪', latlng: { lat: 34.6937, lng: 135.5023 } },
    ]
    render(<MapView locations={locations} />)

    const popups = screen.getAllByTestId('popup')
    expect(popups).toHaveLength(2)
    expect(screen.getByText('東京')).toBeInTheDocument()
    expect(screen.getByText('大阪')).toBeInTheDocument()
  })

  it('should render centroid marker with explanation popup including Wikipedia links', () => {
    render(<MapView locations={[]} centroid={{ lat: 35.0, lng: 137.0 }} />)
    expect(screen.getByText('中間地点')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: '算術平均' })).toHaveAttribute(
      'href',
      expect.stringContaining('ja.wikipedia.org')
    )
    expect(screen.getByRole('link', { name: '重心' })).toHaveAttribute(
      'href',
      expect.stringContaining('ja.wikipedia.org')
    )
  })

  it('should render geometric median marker popup linking to Geometric median (en) and フェルマー点 (ja)', () => {
    render(<MapView locations={[]} geometricMedian={{ lat: 35.0, lng: 137.0 }} />)
    expect(screen.getByText('最適地点')).toBeInTheDocument()
    expect(screen.getByText(/各点からの直線距離の和が最小となる地点/)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Geometric median/ })).toHaveAttribute(
      'href',
      expect.stringContaining('en.wikipedia.org/wiki/Geometric_median')
    )
    expect(screen.getByRole('link', { name: 'フェルマー点' })).toHaveAttribute(
      'href',
      expect.stringContaining('ja.wikipedia.org')
    )
  })

  it('should render all marker types together', () => {
    const locations = [{ id: 'nagoya', label: '名古屋', latlng: { lat: 35.1815, lng: 136.9066 } }]
    render(
      <MapView
        locations={locations}
        centroid={{ lat: 35.0, lng: 137.0 }}
        geometricMedian={{ lat: 35.1, lng: 136.9 }}
      />
    )

    const markers = screen.getAllByTestId('marker')
    // 1 location + 1 centroid + 1 geometric median = 3
    expect(markers).toHaveLength(3)
  })

  it('should not render convex hull polygon with fewer than 3 locations', () => {
    const locations = [
      { id: 'tokyo', label: '東京', latlng: { lat: 35.6762, lng: 139.6503 } },
      { id: 'osaka', label: '大阪', latlng: { lat: 34.6937, lng: 135.5023 } },
    ]
    render(<MapView locations={locations} />)
    expect(screen.queryByTestId('polygon')).not.toBeInTheDocument()
  })

  it('should render convex hull polygon with 3 or more locations', () => {
    const locations = [
      { id: 'tokyo', label: '東京', latlng: { lat: 35.6762, lng: 139.6503 } },
      { id: 'osaka', label: '大阪', latlng: { lat: 34.6937, lng: 135.5023 } },
      { id: 'nagoya', label: '名古屋', latlng: { lat: 35.1815, lng: 136.9066 } },
    ]
    render(<MapView locations={locations} />)
    expect(screen.getByTestId('polygon')).toBeInTheDocument()
  })

  describe('nearby station markers (C1-C3 / M1-M3)', () => {
    const SHIBUYA = {
      id: 1,
      name: '渋谷',
      line_name: 'JR山手線',
      operator: 'JR東日本',
      lat: 35.658,
      lng: 139.7016,
      distance_meters: 100,
    }
    const SHINJUKU_YAMANOTE = {
      id: 2,
      name: '新宿',
      line_name: 'JR山手線',
      operator: 'JR東日本',
      lat: 35.6896,
      lng: 139.7006,
      distance_meters: 250,
    }
    const SHINJUKU_CHUO = {
      id: 3,
      name: '新宿',
      line_name: 'JR中央線',
      operator: 'JR東日本',
      lat: 35.6898,
      lng: 139.7004,
      distance_meters: 280,
    }
    const YOYOGI = {
      id: 4,
      name: '代々木',
      line_name: 'JR山手線',
      operator: 'JR東日本',
      lat: 35.683,
      lng: 139.702,
      distance_meters: 400,
    }
    const HARAJUKU = {
      id: 5,
      name: '原宿',
      line_name: 'JR山手線',
      operator: 'JR東日本',
      lat: 35.6702,
      lng: 139.7028,
      distance_meters: 600,
    }

    it('should render C1-C3 markers when centroidNearbyStations has 3 distinct names', () => {
      render(
        <MapView
          locations={[]}
          centroid={{ lat: 35.68, lng: 139.7 }}
          centroidNearbyStations={[SHIBUYA, YOYOGI, HARAJUKU]}
        />
      )
      // 1 centroid + 3 nearby = 4 markers
      const markers = screen.getAllByTestId('marker')
      expect(markers).toHaveLength(4)
      expect(screen.getByText(/渋谷.*\(C1\)/)).toBeInTheDocument()
      expect(screen.getByText(/代々木.*\(C2\)/)).toBeInTheDocument()
      expect(screen.getByText(/原宿.*\(C3\)/)).toBeInTheDocument()
    })

    it('should group same-name rows so M1/M2/M3 are distinct station names', () => {
      render(
        <MapView
          locations={[]}
          geometricMedian={{ lat: 35.69, lng: 139.7 }}
          medianNearbyStations={[SHINJUKU_YAMANOTE, SHINJUKU_CHUO, YOYOGI, HARAJUKU]}
        />
      )
      // 1 median + 3 grouped nearby = 4 markers (the second 新宿 row is merged)
      const markers = screen.getAllByTestId('marker')
      expect(markers).toHaveLength(4)
      expect(screen.getByText(/新宿.*\(M1\)/)).toBeInTheDocument()
      expect(screen.getByText(/代々木.*\(M2\)/)).toBeInTheDocument()
      expect(screen.getByText(/原宿.*\(M3\)/)).toBeInTheDocument()
    })

    it('should not render any C nearby markers when centroidNearbyStations is undefined', () => {
      render(<MapView locations={[]} centroid={{ lat: 35.68, lng: 139.7 }} />)
      const markers = screen.getAllByTestId('marker')
      expect(markers).toHaveLength(1) // only the C marker
      expect(screen.queryByText(/\(C1\)/)).not.toBeInTheDocument()
    })

    it('should cap at 3 markers even when more nearby stations are provided', () => {
      render(
        <MapView
          locations={[]}
          centroid={{ lat: 35.68, lng: 139.7 }}
          centroidNearbyStations={[
            SHIBUYA,
            YOYOGI,
            HARAJUKU,
            { ...SHINJUKU_YAMANOTE, name: '池袋', id: 99 },
            { ...SHINJUKU_YAMANOTE, name: '上野', id: 100 },
          ]}
        />
      )
      // 1 centroid + 3 nearby (capped) = 4 markers
      const markers = screen.getAllByTestId('marker')
      expect(markers).toHaveLength(4)
      expect(screen.queryByText(/池袋/)).not.toBeInTheDocument()
      expect(screen.queryByText(/上野/)).not.toBeInTheDocument()
    })
  })

  describe('suggested station marker', () => {
    const SHINAGAWA = {
      station: {
        id: 7,
        name: '品川',
        line_name: 'JR山手線',
        operator: 'JR東日本',
        lat: 35.6284,
        lng: 139.7387,
      },
      totalDistance: 12.3,
    }

    it('should render a suggested station marker when separated from the geometric median', () => {
      render(
        <MapView
          locations={[]}
          geometricMedian={{ lat: 35.6, lng: 139.7 }}
          suggestedStation={SHINAGAWA}
        />
      )
      // 1 median + 1 suggestion = 2 markers
      const markers = screen.getAllByTestId('marker')
      expect(markers).toHaveLength(2)
      expect(screen.getByText(/おすすめ駅: 品川/)).toBeInTheDocument()
      expect(screen.getByText(/全員からの合計距離:/)).toBeInTheDocument()
    })

    it('should suppress the suggested station marker when it nearly coincides with the median', () => {
      // Median essentially equals the suggested station coordinates
      render(
        <MapView
          locations={[]}
          geometricMedian={{ lat: SHINAGAWA.station.lat, lng: SHINAGAWA.station.lng }}
          suggestedStation={SHINAGAWA}
        />
      )
      // Only the median marker should be rendered
      const markers = screen.getAllByTestId('marker')
      expect(markers).toHaveLength(1)
      expect(screen.queryByText(/おすすめ駅:/)).not.toBeInTheDocument()
    })

    it('should not render any suggestion marker when suggestedStation is null', () => {
      render(
        <MapView
          locations={[]}
          geometricMedian={{ lat: 35.6, lng: 139.7 }}
          suggestedStation={null}
        />
      )
      const markers = screen.getAllByTestId('marker')
      expect(markers).toHaveLength(1)
      expect(screen.queryByText(/おすすめ駅:/)).not.toBeInTheDocument()
    })

    // Keep the ★ popup consistent with ResultCard's SuggestedStationBox so a multi-line
    // winner (e.g. 新宿) shows all lines, not just the row's single line_name.
    it('should aggregate all line names in the ★ popup for a multi-line winner', () => {
      const SHINJUKU_WINNER = {
        station: {
          id: 4,
          name: '新宿',
          line_name: 'JR山手線',
          operator: 'JR',
          lat: 35.6896,
          lng: 139.7006,
        },
        totalDistance: 8.2,
      }
      const MULTI_LINE_ROWS = [
        {
          id: 4,
          name: '新宿',
          line_name: 'JR山手線',
          operator: 'JR',
          lat: 35.6896,
          lng: 139.7006,
          distance_meters: 250,
        },
        {
          id: 5,
          name: '新宿',
          line_name: 'JR中央線',
          operator: 'JR',
          lat: 35.6898,
          lng: 139.7004,
          distance_meters: 260,
        },
        {
          id: 6,
          name: '新宿',
          line_name: '小田急小田原線',
          operator: '小田急',
          lat: 35.6892,
          lng: 139.7002,
          distance_meters: 270,
        },
      ]
      render(
        <MapView
          locations={[]}
          geometricMedian={{ lat: 35.6, lng: 139.7 }}
          suggestedStation={SHINJUKU_WINNER}
          medianNearbyStations={MULTI_LINE_ROWS}
        />
      )
      // Scope to the ★ popup (identified by "おすすめ駅:" header) since M1's popup also
      // shows the same aggregated lines.
      const suggestedPopup = screen.getByText(/おすすめ駅: 新宿/).closest('[data-testid="popup"]')
      expect(suggestedPopup).not.toBeNull()
      expect(suggestedPopup?.textContent).toContain('JR山手線 / JR中央線 / 小田急小田原線')
    })
  })

  describe('focusRequest behavior', () => {
    it('should not call flyTo when focusRequest is null', () => {
      mockMap.flyTo.mockClear()
      render(<MapView locations={[]} focusRequest={null} />)
      expect(mockMap.flyTo).not.toHaveBeenCalled()
    })

    it('should call flyTo with the requested coords when focusRequest is provided', () => {
      mockMap.flyTo.mockClear()
      render(
        <MapView locations={[]} focusRequest={{ latlng: { lat: 35.681, lng: 139.767 }, seq: 1 }} />
      )
      expect(mockMap.flyTo).toHaveBeenCalledTimes(1)
      expect(mockMap.flyTo).toHaveBeenCalledWith(
        [35.681, 139.767],
        expect.any(Number),
        expect.objectContaining({ duration: expect.any(Number) })
      )
    })

    it('should preserve the current zoom if already past the focus minimum', () => {
      mockMap.flyTo.mockClear()
      mockMap.getZoom.mockReturnValueOnce(18) // already zoomed past the focus min
      render(
        <MapView locations={[]} focusRequest={{ latlng: { lat: 35.681, lng: 139.767 }, seq: 1 }} />
      )
      expect(mockMap.flyTo).toHaveBeenCalledWith([35.681, 139.767], 18, expect.anything())
    })

    it('should re-fire flyTo when seq changes even with the same latlng', () => {
      mockMap.flyTo.mockClear()
      const latlng = { lat: 35.681, lng: 139.767 }
      const { rerender } = render(<MapView locations={[]} focusRequest={{ latlng, seq: 1 }} />)
      rerender(<MapView locations={[]} focusRequest={{ latlng, seq: 2 }} />)
      expect(mockMap.flyTo).toHaveBeenCalledTimes(2)
    })

    it('should not re-run MapBounds effect when only focusRequest changes (regression: flyTo would otherwise be overridden)', () => {
      const locations = [
        { id: 'a', label: 'A', latlng: { lat: 35.6, lng: 139.7 } },
        { id: 'b', label: 'B', latlng: { lat: 35.7, lng: 139.8 } },
      ]
      const { rerender } = render(
        <MapView locations={locations} focusRequest={{ latlng: locations[0].latlng, seq: 1 }} />
      )
      // After initial render, MapBounds will have scheduled fitBounds. Snapshot the call count.
      const callsBefore = mockMap.fitBounds.mock.calls.length
      // A re-render driven only by focusRequest should NOT enqueue a new fitBounds invocation
      // (allPositions must remain referentially stable via useMemo).
      rerender(
        <MapView locations={locations} focusRequest={{ latlng: locations[0].latlng, seq: 2 }} />
      )
      const callsAfter = mockMap.fitBounds.mock.calls.length
      expect(callsAfter).toBe(callsBefore)
    })
  })

  describe('reset-to-overview button', () => {
    it('should not render the reset button when there are no positions', () => {
      render(<MapView locations={[]} />)
      expect(screen.queryByLabelText('地図全体を表示')).not.toBeInTheDocument()
    })

    it('should render the reset button when at least one position exists', () => {
      const locations = [{ id: 'a', label: 'A', latlng: { lat: 35.6, lng: 139.7 } }]
      render(<MapView locations={locations} />)
      expect(screen.getByLabelText('地図全体を表示')).toBeInTheDocument()
    })

    it('should call fitBounds when the reset button is clicked', () => {
      const locations = [
        { id: 'a', label: 'A', latlng: { lat: 35.6, lng: 139.7 } },
        { id: 'b', label: 'B', latlng: { lat: 35.7, lng: 139.8 } },
      ]
      render(<MapView locations={locations} />)
      // Clear any fitBounds calls scheduled by MapBounds on mount
      mockMap.fitBounds.mockClear()

      fireEvent.click(screen.getByLabelText('地図全体を表示'))

      expect(mockMap.fitBounds).toHaveBeenCalledTimes(1)
    })
  })
})
