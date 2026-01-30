import { divIcon, type LatLngExpression } from 'leaflet'
import { useEffect } from 'react'
import type { LatLng, Location } from '@/types'
import 'leaflet/dist/leaflet.css'
import { MapContainer, Marker, Popup, TileLayer, useMap } from 'react-leaflet'

/** Default center (Japan) and zoom level */
const DEFAULT_CENTER: LatLngExpression = [36.5, 138.0]
const DEFAULT_ZOOM = 6

/** Fit the map view to show all markers */
function MapBounds({ positions }: { positions: LatLng[] }) {
  const map = useMap()

  useEffect(() => {
    if (positions.length > 0) {
      const bounds = positions.map((p): LatLngExpression => [p.lat, p.lng])
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 14 })
    }
  }, [map, positions])

  return null
}

/** Create a colored circle marker icon */
function createCircleIcon(color: string, label?: string): ReturnType<typeof divIcon> {
  return divIcon({
    className: 'custom-marker',
    html: `<div style="
      background-color: ${color};
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

  return (
    <div data-testid="map-container" className="h-96 w-full rounded-lg overflow-hidden">
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

        {locations.map((location, index) => (
          <Marker
            key={`location-${location.name}-${index}`}
            position={[location.latlng.lat, location.latlng.lng]}
            icon={createCircleIcon('#3B82F6', String(index + 1))}
          >
            <Popup>{location.name}</Popup>
          </Marker>
        ))}

        {centroid && (
          <Marker position={[centroid.lat, centroid.lng]} icon={createCircleIcon('#F59E0B', 'C')}>
            <Popup>重心 (Centroid)</Popup>
          </Marker>
        )}

        {geometricMedian && (
          <Marker
            position={[geometricMedian.lat, geometricMedian.lng]}
            icon={createCircleIcon('#EF4444', 'M')}
          >
            <Popup>幾何中央値 (Geometric Median)</Popup>
          </Marker>
        )}
      </MapContainer>
    </div>
  )
}

export default MapView
