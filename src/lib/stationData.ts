import { haversineDistance } from '@/lib/haversine'
import type { LatLng, NearbyStation, StationWithCoords } from '@/types'

/** Public path of the generated static station dataset */
const STATIONS_URL = '/stations.json'

/**
 * Module-level cache so the dataset is fetched at most once per session,
 * shared across every hook/consumer that needs it.
 */
let cache: Promise<StationWithCoords[]> | null = null

/**
 * Load the full station dataset from the static asset.
 * The result is memoized; concurrent callers share a single fetch.
 */
export function loadStations(): Promise<StationWithCoords[]> {
  if (cache === null) {
    cache = fetch(STATIONS_URL)
      .then((res) => {
        if (!res.ok) {
          throw new Error(`Failed to load station data: ${res.status}`)
        }
        return res.json() as Promise<StationWithCoords[]>
      })
      .catch((err: unknown) => {
        // Reset cache so a later call can retry after a transient failure
        cache = null
        throw err
      })
  }
  return cache
}

/** Reset the in-memory cache (test helper). */
export function resetStationCache(): void {
  cache = null
}

/**
 * Filter stations whose name contains the query substring.
 * Mirrors the previous server-side `search_stations` semantics.
 */
export function searchStations(query: string, stations: StationWithCoords[]): StationWithCoords[] {
  const trimmed = query.trim()
  if (!trimmed) return []
  return stations.filter((station) => station.name.includes(trimmed))
}

/**
 * Find the nearest stations to a point, sorted by ascending distance.
 * Replaces the previous PostGIS `find_nearby_stations` RPC using haversine.
 */
export function findNearbyStations(
  point: LatLng,
  stations: StationWithCoords[],
  limit: number
): NearbyStation[] {
  return stations
    .map((station) => ({
      ...station,
      distance_meters: haversineDistance(point, { lat: station.lat, lng: station.lng }) * 1000,
    }))
    .sort((a, b) => a.distance_meters - b.distance_meters)
    .slice(0, limit)
}
