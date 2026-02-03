import type { Database } from '../../src/types/database.ts'

type StationInsert = Database['public']['Tables']['stations']['Insert']

/** GeoJSON Feature with properties from 国土数値情報 railway dataset */
interface RailwayFeature {
  type: 'Feature'
  geometry: {
    type: string
    coordinates: number[] | number[][]
  }
  properties: {
    /** Railway type classification */
    N02_001?: string
    /** Operator category (JR / private) */
    N02_002?: string
    /** Line name */
    N02_003?: string
    /** Operating company name */
    N02_004?: string
    /** Station name (station features only) */
    N02_005?: string
    /** Station code (station features only) */
    N02_005c?: string
  }
}

/** GeoJSON FeatureCollection */
interface RailwayFeatureCollection {
  type: 'FeatureCollection'
  features: RailwayFeature[]
}

/**
 * Validate and parse raw input as a GeoJSON FeatureCollection.
 * Throws if the input is not a valid FeatureCollection structure.
 */
export function parseGeoJSON(raw: unknown): RailwayFeatureCollection {
  if (raw === null || typeof raw !== 'object') {
    throw new Error('Invalid GeoJSON: input must be an object')
  }

  const obj = raw as Record<string, unknown>

  if (obj.type !== 'FeatureCollection') {
    throw new Error(`Invalid GeoJSON: expected type "FeatureCollection", got "${String(obj.type)}"`)
  }

  if (!Array.isArray(obj.features)) {
    throw new Error('Invalid GeoJSON: "features" must be an array')
  }

  return raw as RailwayFeatureCollection
}

/**
 * Extract coordinates from a feature's geometry.
 * - Point: use coordinates directly
 * - LineString: compute centroid (average of all coordinate pairs)
 * Returns [lng, lat] or null if unsupported geometry.
 */
function extractCoordinates(geometry: RailwayFeature['geometry']): [number, number] | null {
  if (geometry.type === 'Point') {
    const coords = geometry.coordinates as number[]
    if (coords.length >= 2 && typeof coords[0] === 'number' && typeof coords[1] === 'number') {
      return [coords[0], coords[1]]
    }
    return null
  }

  if (geometry.type === 'LineString') {
    const coords = geometry.coordinates as number[][]
    if (coords.length === 0) return null

    let sumLng = 0
    let sumLat = 0
    let count = 0
    for (const pair of coords) {
      if (pair.length >= 2 && typeof pair[0] === 'number' && typeof pair[1] === 'number') {
        sumLng += pair[0]
        sumLat += pair[1]
        count++
      }
    }
    if (count === 0) return null
    return [sumLng / count, sumLat / count]
  }

  return null
}

/**
 * Extract station records from a parsed GeoJSON FeatureCollection.
 * Supports Point and LineString geometries (LineString uses centroid).
 * Filters for features with a valid station name (N02_005).
 */
export function extractStations(geojson: RailwayFeatureCollection): StationInsert[] {
  const stations: StationInsert[] = []

  for (const feature of geojson.features) {
    const name = feature.properties?.N02_005
    // Skip features without a station name
    if (!name || name.trim() === '') {
      continue
    }

    const coords = extractCoordinates(feature.geometry)
    if (!coords) {
      continue
    }

    const [lng, lat] = coords

    stations.push({
      name: name.trim(),
      line_name: feature.properties?.N02_003?.trim() ?? null,
      operator: feature.properties?.N02_004?.trim() ?? null,
      location: `POINT(${lng} ${lat})`,
    })
  }

  return stations
}

/**
 * Remove duplicate stations based on name + line_name composite key.
 * Stations with the same name on different lines are preserved.
 */
export function deduplicateStations(stations: StationInsert[]): StationInsert[] {
  const seen = new Set<string>()
  const result: StationInsert[] = []

  for (const station of stations) {
    const key = `${station.name}::${station.line_name ?? ''}`
    if (!seen.has(key)) {
      seen.add(key)
      result.push(station)
    }
  }

  return result
}
