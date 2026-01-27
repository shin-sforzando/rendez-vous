import type { LatLng } from '@/types'
import { haversineDistance } from './haversine'

/**
 * Calculate the centroid (arithmetic mean) of geographic coordinates.
 * Simple average of latitudes and longitudes.
 * @throws Error if points array is empty
 */
export function centroid(points: LatLng[]): LatLng {
  if (points.length === 0) {
    throw new Error('Cannot calculate centroid of empty array')
  }

  const sum = points.reduce((acc, p) => ({ lat: acc.lat + p.lat, lng: acc.lng + p.lng }), {
    lat: 0,
    lng: 0,
  })

  return {
    lat: sum.lat / points.length,
    lng: sum.lng / points.length,
  }
}

const DEFAULT_MAX_ITERATIONS = 1000
const DEFAULT_EPSILON = 1e-7

interface WeiszfeldOptions {
  /** Maximum number of iterations (default: 1000) */
  maxIterations?: number
  /** Convergence threshold in km (default: 1e-7) */
  epsilon?: number
}

/**
 * Calculate the geometric median (Weiszfeld point) of geographic coordinates.
 * Minimizes the sum of distances from all input points.
 * Uses the iterative Weiszfeld algorithm.
 * @throws Error if points array is empty
 */
export function geometricMedian(points: LatLng[], options?: WeiszfeldOptions): LatLng {
  if (points.length === 0) {
    throw new Error('Cannot calculate geometric median of empty array')
  }

  if (points.length <= 2) {
    // For 1-2 points, the geometric median equals the centroid
    return centroid(points)
  }

  const maxIterations = options?.maxIterations ?? DEFAULT_MAX_ITERATIONS
  const epsilon = options?.epsilon ?? DEFAULT_EPSILON

  // Start from the centroid as initial estimate
  let estimate = centroid(points)

  for (let i = 0; i < maxIterations; i++) {
    let weightSum = 0
    let latSum = 0
    let lngSum = 0

    for (const point of points) {
      const dist = haversineDistance(estimate, point)

      // Avoid division by zero when estimate coincides with a data point
      if (dist < epsilon) {
        return { ...point }
      }

      const weight = 1 / dist
      weightSum += weight
      latSum += weight * point.lat
      lngSum += weight * point.lng
    }

    const next: LatLng = {
      lat: latSum / weightSum,
      lng: lngSum / weightSum,
    }

    // Check convergence
    if (haversineDistance(estimate, next) < epsilon) {
      return next
    }

    estimate = next
  }

  return estimate
}
