import type { LatLng } from '@/types'

const EARTH_RADIUS_KM = 6371

/** Earth-Centered, Earth-Fixed (ECEF) coordinate */
export interface ECEFCoord {
  /** X coordinate in kilometers */
  x: number
  /** Y coordinate in kilometers */
  y: number
  /** Z coordinate in kilometers */
  z: number
}

/** Convert degrees to radians */
function toRad(deg: number): number {
  return (deg * Math.PI) / 180
}

/** Convert radians to degrees */
function toDeg(rad: number): number {
  return (rad * 180) / Math.PI
}

/**
 * Convert geographic coordinates to ECEF (Earth-Centered, Earth-Fixed).
 * Assumes a spherical Earth with radius 6371 km.
 */
export function toECEF(point: LatLng): ECEFCoord {
  const latRad = toRad(point.lat)
  const lngRad = toRad(point.lng)
  const cosLat = Math.cos(latRad)

  return {
    x: EARTH_RADIUS_KM * cosLat * Math.cos(lngRad),
    y: EARTH_RADIUS_KM * cosLat * Math.sin(lngRad),
    z: EARTH_RADIUS_KM * Math.sin(latRad),
  }
}

/**
 * Convert ECEF coordinates back to geographic coordinates.
 */
export function fromECEF(coord: ECEFCoord): LatLng {
  const lat = toDeg(Math.asin(coord.z / EARTH_RADIUS_KM))
  const lng = toDeg(Math.atan2(coord.y, coord.x))

  return { lat, lng }
}
