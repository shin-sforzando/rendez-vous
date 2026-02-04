import { divIcon, type LatLngExpression, latLngBounds } from 'leaflet'
import { useEffect, useMemo } from 'react'
import type { LatLng, Location } from '@/types'
import 'leaflet/dist/leaflet.css'
import { MapContainer, Marker, Polygon, Popup, TileLayer, useMap } from 'react-leaflet'

/** Default center (Japan) and zoom level */
const DEFAULT_CENTER: LatLngExpression = [36.5, 138.0]
const DEFAULT_ZOOM = 6

/** Fit the map view to show all markers */
function MapBounds({ positions }: { positions: LatLng[] }) {
  const map = useMap()

  useEffect(() => {
    if (positions.length > 0) {
      const latlngs: LatLngExpression[] = positions.map((p) => [p.lat, p.lng])
      map.fitBounds(latLngBounds(latlngs), { padding: [50, 50], maxZoom: 14 })
    }
  }, [map, positions])

  return null
}

/** Create a colored circle marker icon using DaisyUI CSS variables */
function createCircleIcon(cssColor: string, label?: string): ReturnType<typeof divIcon> {
  return divIcon({
    className: 'custom-marker',
    html: `<div style="
      background-color: ${cssColor};
      width: 24px;
      height: 24px;
      border-radius: 50%;
      border: 2px solid white;
      box-shadow: 0 2px 4px rgba(0,0,0,0.3);
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-size: 11px;
      font-weight: bold;
    ">${label ?? ''}</div>`,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  })
}

/** Compute convex hull of points using Graham Scan algorithm */
function convexHull(points: LatLng[]): LatLng[] {
  if (points.length < 3) return [...points]

  const sorted = [...points].sort((a, b) => a.lng - b.lng || a.lat - b.lat)

  function cross(o: LatLng, a: LatLng, b: LatLng): number {
    return (a.lng - o.lng) * (b.lat - o.lat) - (a.lat - o.lat) * (b.lng - o.lng)
  }

  // Build lower hull
  const lower: LatLng[] = []
  for (const p of sorted) {
    while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 0) {
      lower.pop()
    }
    lower.push(p)
  }

  // Build upper hull
  const upper: LatLng[] = []
  for (const p of sorted.reverse()) {
    while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], p) <= 0) {
      upper.pop()
    }
    upper.push(p)
  }

  // Remove last point of each half (duplicate of the other half's first point)
  lower.pop()
  upper.pop()
  return [...lower, ...upper]
}

interface MapProps {
  /** User-input locations */
  locations: Location[]
  /** Centroid result (optional) */
  centroid?: LatLng
  /** Geometric median result (optional) */
  geometricMedian?: LatLng
}

function MapView({ locations, centroid, geometricMedian }: MapProps) {
  const allPositions: LatLng[] = [
    ...locations.map((l) => l.latlng),
    ...(centroid ? [centroid] : []),
    ...(geometricMedian ? [geometricMedian] : []),
  ]

  const hullPositions: LatLngExpression[] = useMemo(() => {
    const points = locations.map((l) => l.latlng)
    if (points.length < 3) return []
    return convexHull(points).map((p) => [p.lat, p.lng] as LatLngExpression)
  }, [locations])

  return (
    <div
      data-testid="map-container"
      className="h-[60vh] lg:h-[calc(100vh-6rem)] min-h-60 w-full rounded-lg overflow-hidden"
    >
      <MapContainer
        center={DEFAULT_CENTER}
        zoom={DEFAULT_ZOOM}
        className="h-full w-full"
        scrollWheelZoom={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <MapBounds positions={allPositions} />

        {/* Convex hull polygon (3+ locations) */}
        {hullPositions.length >= 3 && (
          <Polygon
            positions={hullPositions}
            pathOptions={{
              color: 'var(--color-secondary)',
              fillColor: 'var(--color-secondary)',
              fillOpacity: 0.08,
              weight: 2,
              dashArray: '8 6',
              opacity: 0.7,
            }}
          />
        )}

        {locations.map((location, index) => (
          <Marker
            key={`location-${location.label}-${index}`}
            position={[location.latlng.lat, location.latlng.lng]}
            icon={createCircleIcon('var(--color-primary)', String(index + 1))}
          >
            <Popup>{location.label}</Popup>
          </Marker>
        ))}

        {centroid && (
          <Marker
            position={[centroid.lat, centroid.lng]}
            icon={createCircleIcon('var(--color-warning)', 'C')}
          >
            <Popup>
              <strong>中間地点</strong>
              <br />
              全員の座標の平均
            </Popup>
          </Marker>
        )}

        {geometricMedian && (
          <Marker
            position={[geometricMedian.lat, geometricMedian.lng]}
            icon={createCircleIcon('var(--color-error)', 'M')}
          >
            <Popup>
              <strong>最適地点</strong>
              <br />
              全員の移動距離の合計が最小となる地点
            </Popup>
          </Marker>
        )}
      </MapContainer>
    </div>
  )
}

export default MapView
