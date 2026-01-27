import type { LatLng } from '@/types'

/**
 * Calculate the centroid (arithmetic mean) of geographic coordinates.
 * Simple average of latitudes and longitudes.
 */
export function centroid(_points: LatLng[]): LatLng {
  // TODO: Implement centroid calculation
  throw new Error('Not implemented')
}

/**
 * Calculate the geometric median (Weiszfeld point) of geographic coordinates.
 * Minimizes the sum of distances from all input points.
 * Uses the iterative Weiszfeld algorithm.
 */
export function geometricMedian(_points: LatLng[]): LatLng {
  // TODO: Implement Weiszfeld algorithm
  throw new Error('Not implemented')
}
