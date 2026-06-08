import { divIcon, type LatLngExpression, type Map as LeafletMap, latLngBounds } from 'leaflet'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { haversineDistance } from '@/lib/haversine'
import { groupStationsByName } from '@/lib/stations'
import type { KMedoidResult, LatLng, Location, MapFocusRequest, NearbyStation } from '@/types'
import 'leaflet/dist/leaflet.css'
import { MapContainer, Marker, Polygon, Popup, TileLayer, useMap } from 'react-leaflet'

/** Default center (Japan) and zoom level */
const DEFAULT_CENTER: LatLngExpression = [36.5, 138.0]
const DEFAULT_ZOOM = 6

/** Minimum zoom level to apply when focusing on a clicked point */
const FOCUS_MIN_ZOOM = 15

/** Shared "fit map to show all positions" logic, used by both MapBounds and MapReset */
function fitMapToPositions(map: LeafletMap, positions: LatLng[]) {
  if (positions.length === 0) return
  map.invalidateSize()
  const latlngs: LatLngExpression[] = positions.map((p) => [p.lat, p.lng])
  const container = map.getContainer()
  const minDimension = Math.min(container.clientWidth, container.clientHeight)
  const padding = Math.max(20, Math.min(50, minDimension * 0.1))
  map.fitBounds(latLngBounds(latlngs), {
    padding: [padding, padding],
    maxZoom: 14,
  })
}

/** Animate the map to a requested focus point (driven by ResultCard badge clicks) */
function MapFocus({ request }: { request: MapFocusRequest | null | undefined }) {
  const map = useMap()

  useEffect(() => {
    if (!request) return
    const targetZoom = Math.max(map.getZoom(), FOCUS_MIN_ZOOM)
    map.flyTo([request.latlng.lat, request.latlng.lng], targetZoom, { duration: 0.6 })
    // Depend on seq so repeated clicks on the same point still trigger a re-focus
  }, [request, map])

  return null
}

/** Reset the map view to fit all positions when an external trigger counter increments */
function MapReset({ trigger, positions }: { trigger: number; positions: LatLng[] }) {
  const map = useMap()
  // Always read the latest positions without re-running on positions change
  const positionsRef = useRef(positions)
  positionsRef.current = positions
  // Track the previous trigger so initial mount is skipped (MapBounds handles initial fit)
  const prevTriggerRef = useRef(trigger)

  useEffect(() => {
    if (prevTriggerRef.current === trigger) return
    prevTriggerRef.current = trigger
    fitMapToPositions(map, positionsRef.current)
  }, [trigger, map])

  return null
}

/** Fit the map view to show all markers (mount + locations change). */
function MapBounds({ positions }: { positions: LatLng[] }) {
  const map = useMap()

  useEffect(() => {
    if (positions.length === 0) return
    // Use requestAnimationFrame to ensure DOM layout is complete
    requestAnimationFrame(() => {
      // Double RAF to ensure layout is fully calculated (especially on mobile)
      requestAnimationFrame(() => fitMapToPositions(map, positions))
    })
  }, [map, positions])

  return null
}

/** Create a colored circle marker icon using DaisyUI CSS variables */
function createCircleIcon(
  cssColor: string,
  label?: string,
  size: number = 24
): ReturnType<typeof divIcon> {
  // Scale border and font with size to keep proportions readable for small variants
  const border = size >= 24 ? 2 : 1.5
  const fontSize = size >= 24 ? 11 : 9
  return divIcon({
    className: 'custom-marker',
    html: `<div style="
      background-color: ${cssColor};
      width: ${size}px;
      height: ${size}px;
      border-radius: 50%;
      border: ${border}px solid white;
      box-shadow: 0 2px 4px rgba(0,0,0,0.3);
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-size: ${fontSize}px;
      font-weight: bold;
    ">${label ?? ''}</div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
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

/** Threshold in km below which the suggested station marker is suppressed (visually overlaps M) */
const SUGGESTION_OVERLAP_THRESHOLD_KM = 0.05

/** Number of nearby station markers to render on the map per reference point (C/M) */
const NEARBY_MARKER_LIMIT = 3

/** Size in pixels for the small nearby-station marker variant */
const NEARBY_MARKER_SIZE = 18

/** Format meters as a short km string for marker popups */
function formatMetersAsKm(meters: number): string {
  return `${(meters / 1000).toFixed(2)} km`
}

interface MapProps {
  /** User-input locations */
  locations: Location[]
  /** Centroid result (optional) */
  centroid?: LatLng
  /** Geometric median result (optional) */
  geometricMedian?: LatLng
  /** K-medoid suggested station (optional) */
  suggestedStation?: KMedoidResult | null
  /** Nearby stations for the centroid (raw rows; grouped/sliced internally) */
  centroidNearbyStations?: NearbyStation[]
  /** Nearby stations for the geometric median (raw rows; grouped/sliced internally) */
  medianNearbyStations?: NearbyStation[]
  /** Externally-driven request to fly the map to a specific point */
  focusRequest?: MapFocusRequest | null
}

function MapView({
  locations,
  centroid,
  geometricMedian,
  suggestedStation,
  centroidNearbyStations,
  medianNearbyStations,
  focusRequest,
}: MapProps) {
  const centroidTop = useMemo(
    () => groupStationsByName(centroidNearbyStations ?? []).slice(0, NEARBY_MARKER_LIMIT),
    [centroidNearbyStations]
  )
  const medianTop = useMemo(
    () => groupStationsByName(medianNearbyStations ?? []).slice(0, NEARBY_MARKER_LIMIT),
    [medianNearbyStations]
  )
  // Suppress the suggestion marker when it visually coincides with the Median marker
  const showSuggestionMarker =
    suggestedStation != null &&
    (geometricMedian == null ||
      haversineDistance(
        { lat: suggestedStation.station.lat, lng: suggestedStation.station.lng },
        geometricMedian
      ) > SUGGESTION_OVERLAP_THRESHOLD_KM)

  // Memoized so that re-renders triggered by unrelated state (e.g. focusRequest) do not
  // produce a new array reference, which would cause MapBounds to re-run fitBounds and
  // override the active flyTo animation.
  const allPositions: LatLng[] = useMemo(
    () => [
      ...locations.map((l) => l.latlng),
      ...(centroid ? [centroid] : []),
      ...(geometricMedian ? [geometricMedian] : []),
      ...(showSuggestionMarker && suggestedStation
        ? [{ lat: suggestedStation.station.lat, lng: suggestedStation.station.lng }]
        : []),
    ],
    [locations, centroid, geometricMedian, showSuggestionMarker, suggestedStation]
  )

  const hullPositions: LatLngExpression[] = useMemo(() => {
    const points = locations.map((l) => l.latlng)
    if (points.length < 3) return []
    return convexHull(points).map((p) => [p.lat, p.lng] as LatLngExpression)
  }, [locations])

  const [resetTrigger, setResetTrigger] = useState(0)
  const handleResetView = useCallback(() => {
    setResetTrigger((n) => n + 1)
  }, [])

  return (
    <div
      data-testid="map-container"
      className="relative h-[60vh] lg:h-full min-h-60 w-full rounded-lg overflow-hidden"
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
        <MapReset trigger={resetTrigger} positions={allPositions} />
        <MapFocus request={focusRequest} />

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
            key={location.id}
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
              全座標の
              <a
                href="https://ja.wikipedia.org/wiki/%E7%AE%97%E8%A1%93%E5%B9%B3%E5%9D%87"
                target="_blank"
                rel="noopener noreferrer"
              >
                算術平均
              </a>
              。
              <a
                href="https://ja.wikipedia.org/wiki/%E9%87%8D%E5%BF%83"
                target="_blank"
                rel="noopener noreferrer"
              >
                重心
              </a>
              （Centroid）とも呼ばれる。
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
              各点からの直線距離の和が最小となる地点。一般には
              <a
                href="https://en.wikipedia.org/wiki/Geometric_median"
                target="_blank"
                rel="noopener noreferrer"
              >
                幾何中央値（Geometric median）
              </a>
              、三角形の場合は
              <a
                href="https://ja.wikipedia.org/wiki/%E3%83%95%E3%82%A7%E3%83%AB%E3%83%9E%E3%83%BC%E7%82%B9"
                target="_blank"
                rel="noopener noreferrer"
              >
                フェルマー点
              </a>
              と呼ばれる。
            </Popup>
          </Marker>
        )}

        {centroidTop.map((group, i) => (
          <Marker
            key={`centroid-near-${group.name}`}
            position={[group.lat, group.lng]}
            icon={createCircleIcon('var(--color-warning)', `C${i + 1}`, NEARBY_MARKER_SIZE)}
          >
            <Popup>
              <strong>
                {group.name} (C{i + 1})
              </strong>
              {group.lines.length > 0 && (
                <>
                  <br />
                  {group.lines.join(' / ')}
                </>
              )}
              <br />
              中間地点から: {formatMetersAsKm(group.distance_meters)}
            </Popup>
          </Marker>
        ))}

        {medianTop.map((group, i) => (
          <Marker
            key={`median-near-${group.name}`}
            position={[group.lat, group.lng]}
            icon={createCircleIcon('var(--color-error)', `M${i + 1}`, NEARBY_MARKER_SIZE)}
          >
            <Popup>
              <strong>
                {group.name} (M{i + 1})
              </strong>
              {group.lines.length > 0 && (
                <>
                  <br />
                  {group.lines.join(' / ')}
                </>
              )}
              <br />
              最適地点から: {formatMetersAsKm(group.distance_meters)}
            </Popup>
          </Marker>
        ))}

        {showSuggestionMarker && suggestedStation && (
          <Marker
            position={[suggestedStation.station.lat, suggestedStation.station.lng]}
            icon={createCircleIcon('var(--color-accent)', '★')}
          >
            <Popup>
              <strong>おすすめ駅: {suggestedStation.station.name}</strong>
              <br />
              {suggestedStation.station.line_name && (
                <>
                  {suggestedStation.station.line_name}
                  <br />
                </>
              )}
              全員からの合計距離: {suggestedStation.totalDistance.toFixed(1)} km
            </Popup>
          </Marker>
        )}
      </MapContainer>

      {/* Reset-to-overview button (shown only when there is something to fit) */}
      {allPositions.length > 0 && (
        <div className="tooltip tooltip-left absolute top-2 right-2 z-1000" data-tip="全体を表示">
          <button
            type="button"
            onClick={handleResetView}
            aria-label="地図全体を表示"
            className="btn btn-sm btn-circle bg-base-100 shadow-md hover:bg-base-200"
          >
            <span aria-hidden="true">⛶</span>
          </button>
        </div>
      )}

      {/* Data source attribution */}
      <div className="absolute bottom-6 right-2 z-1000 text-xs text-base-content/70 bg-base-100/80 px-2 py-0.5 rounded">
        駅データ:{' '}
        <a
          href="https://nlftp.mlit.go.jp/ksj/gml/datalist/KsjTmplt-N02-2024.html"
          target="_blank"
          rel="noopener noreferrer"
          className="underline hover:text-primary"
        >
          国土交通省 国土数値情報
        </a>{' '}
        (2025年6月)
      </div>
    </div>
  )
}

export default MapView
