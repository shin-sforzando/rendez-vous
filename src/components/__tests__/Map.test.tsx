import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import MapView from '../Map'

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
  useMap: () => ({
    fitBounds: vi.fn(),
  }),
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
      { name: '東京', latlng: { lat: 35.6762, lng: 139.6503 } },
      { name: '大阪', latlng: { lat: 34.6937, lng: 135.5023 } },
    ]
    render(<MapView locations={locations} />)

    const popups = screen.getAllByTestId('popup')
    expect(popups).toHaveLength(2)
    expect(screen.getByText('東京')).toBeInTheDocument()
    expect(screen.getByText('大阪')).toBeInTheDocument()
  })

  it('should render centroid marker with explanation popup', () => {
    render(<MapView locations={[]} centroid={{ lat: 35.0, lng: 137.0 }} />)
    expect(screen.getByText('中間地点')).toBeInTheDocument()
    expect(screen.getByText('全員の座標の平均')).toBeInTheDocument()
  })

  it('should render geometric median marker with explanation popup', () => {
    render(<MapView locations={[]} geometricMedian={{ lat: 35.0, lng: 137.0 }} />)
    expect(screen.getByText('最適地点')).toBeInTheDocument()
    expect(screen.getByText('全員の移動距離の合計が最小となる地点')).toBeInTheDocument()
  })

  it('should render all marker types together', () => {
    const locations = [{ name: '名古屋', latlng: { lat: 35.1815, lng: 136.9066 } }]
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
      { name: '東京', latlng: { lat: 35.6762, lng: 139.6503 } },
      { name: '大阪', latlng: { lat: 34.6937, lng: 135.5023 } },
    ]
    render(<MapView locations={locations} />)
    expect(screen.queryByTestId('polygon')).not.toBeInTheDocument()
  })

  it('should render convex hull polygon with 3 or more locations', () => {
    const locations = [
      { name: '東京', latlng: { lat: 35.6762, lng: 139.6503 } },
      { name: '大阪', latlng: { lat: 34.6937, lng: 135.5023 } },
      { name: '名古屋', latlng: { lat: 35.1815, lng: 136.9066 } },
    ]
    render(<MapView locations={locations} />)
    expect(screen.getByTestId('polygon')).toBeInTheDocument()
  })
})
