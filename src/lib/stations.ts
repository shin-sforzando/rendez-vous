import type { NearbyStation } from '@/types'

/** A station group keyed by name, with representative coords and aggregated line names. */
export interface GroupedStation {
  /** Station name (e.g., "新宿") */
  name: string
  /** Latitude of the closest row in the group */
  lat: number
  /** Longitude of the closest row in the group */
  lng: number
  /** Distance of the closest row in meters */
  distance_meters: number
  /** Unique, ordered list of line names across rows in the group */
  lines: string[]
}

/**
 * Group flat station rows by name. For each group, keep the lat/lng/distance
 * of the closest row and aggregate line names (deduplicated, first-seen order).
 * Preserves the order of first appearance of each distinct name.
 */
export function groupStationsByName(stations: NearbyStation[]): GroupedStation[] {
  const groups = new Map<
    string,
    { lat: number; lng: number; distance_meters: number; lines: string[] }
  >()
  for (const s of stations) {
    const existing = groups.get(s.name)
    if (existing) {
      if (s.distance_meters < existing.distance_meters) {
        existing.distance_meters = s.distance_meters
        existing.lat = s.lat
        existing.lng = s.lng
      }
      if (s.line_name && !existing.lines.includes(s.line_name)) {
        existing.lines.push(s.line_name)
      }
    } else {
      groups.set(s.name, {
        lat: s.lat,
        lng: s.lng,
        distance_meters: s.distance_meters,
        lines: s.line_name ? [s.line_name] : [],
      })
    }
  }
  return Array.from(groups, ([name, data]) => ({ name, ...data }))
}
