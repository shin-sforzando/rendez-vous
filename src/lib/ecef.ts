import type { LatLng } from '@/types'

/** Earth-Centered, Earth-Fixed (ECEF) coordinate */
export interface ECEFCoord {
  /** X coordinate in kilometers */
  x: number
  /** Y coordinate in kilometers */
  y: number
  /** Z coordinate in kilometers */
  z: number
}

/**
 * Convert geographic coordinates to ECEF (Earth-Centered, Earth-Fixed).
 * Assumes a spherical Earth with radius 6371 km.
 */
export function toECEF(_point: LatLng): ECEFCoord {
  // TODO: Implement conversion
  throw new Error('Not implemented')
}

/**
 * Convert ECEF coordinates back to geographic coordinates.
 */
export function fromECEF(_coord: ECEFCoord): LatLng {
  // TODO: Implement conversion
  throw new Error('Not implemented')
}
