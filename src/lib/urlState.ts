import type { Location } from '@/types'

/** Maximum number of locations to encode in URL */
const MAX_URL_LOCATIONS = 10

/** Decimal precision for coordinates (~11m accuracy) */
const COORD_PRECISION = 4

/**
 * Serialize locations into a URL search string.
 * Format: `locations=label1,lat1,lng1|label2,lat2,lng2`
 * Each label is percent-encoded; coordinates are rounded to 4 decimal places.
 */
export function serializeLocations(locations: Location[]): string {
  if (locations.length === 0) return ''
  const capped = locations.slice(0, MAX_URL_LOCATIONS)
  const encoded = capped
    .map(
      (loc) =>
        `${encodeURIComponent(loc.label)},${loc.latlng.lat.toFixed(COORD_PRECISION)},${loc.latlng.lng.toFixed(COORD_PRECISION)}`
    )
    .join('|')
  return `locations=${encoded}`
}

/**
 * Extract the raw (still percent-encoded) value of a query parameter.
 * Unlike URLSearchParams.get(), this does NOT decode percent-encoded characters,
 * which is critical because we use `|` as an entry delimiter and labels may
 * contain `%7C` (encoded `|`).
 */
function getRawParam(search: string, key: string): string | null {
  const cleaned = search.startsWith('?') ? search.slice(1) : search
  for (const pair of cleaned.split('&')) {
    const eqIndex = pair.indexOf('=')
    const k = eqIndex === -1 ? pair : pair.slice(0, eqIndex)
    if (decodeURIComponent(k) === key) {
      return eqIndex === -1 ? '' : pair.slice(eqIndex + 1)
    }
  }
  return null
}

/**
 * Deserialize a URL search string into locations.
 * Invalid entries (missing fields, non-numeric coords, out-of-range) are silently skipped.
 */
export function deserializeLocations(search: string): Location[] {
  const raw = getRawParam(search, 'locations')
  if (!raw) return []

  // Split on literal `|` — encoded `%7C` inside labels stays intact
  const entries = raw.split('|')
  const locations: Location[] = []

  for (const entry of entries) {
    if (locations.length >= MAX_URL_LOCATIONS) break

    const parts = entry.split(',')
    if (parts.length < 3) continue

    // Coordinates are always the last two parts (never percent-encoded)
    const lng = Number(parts[parts.length - 1])
    const lat = Number(parts[parts.length - 2])
    // Label is everything before the last two parts, decoded
    const label = decodeURIComponent(parts.slice(0, -2).join(','))

    if (!label || Number.isNaN(lat) || Number.isNaN(lng)) continue
    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) continue

    locations.push({ label, latlng: { lat, lng } })
  }

  return locations
}

/**
 * Restore locations from the current page URL.
 * Intended as a lazy initializer for `useState`.
 */
export function getInitialLocationsFromUrl(): Location[] {
  if (typeof window === 'undefined') return []
  return deserializeLocations(window.location.search)
}

/**
 * Build a complete shareable URL for the given locations.
 */
export function buildShareUrl(locations: Location[]): string {
  if (typeof window === 'undefined') return ''
  const base = `${window.location.origin}${window.location.pathname}`
  const query = serializeLocations(locations)
  return query ? `${base}?${query}` : base
}
