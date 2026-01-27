import { describe, expect, it } from 'vitest'
import type { LatLng } from '@/types'
import { centroid, geometricMedian } from '../geo'

// Reference points
const TOKYO: LatLng = { lat: 35.6762, lng: 139.6503 }
const OSAKA: LatLng = { lat: 34.6937, lng: 135.5023 }
const NAGOYA: LatLng = { lat: 35.1815, lng: 136.9066 }
const SAPPORO: LatLng = { lat: 43.0618, lng: 141.3545 }

describe('centroid', () => {
  it('should return the same point for a single input', () => {
    const result = centroid([TOKYO])
    expect(result.lat).toBeCloseTo(TOKYO.lat, 5)
    expect(result.lng).toBeCloseTo(TOKYO.lng, 5)
  })

  it('should return the midpoint for two points', () => {
    const result = centroid([TOKYO, OSAKA])
    const expectedLat = (TOKYO.lat + OSAKA.lat) / 2
    const expectedLng = (TOKYO.lng + OSAKA.lng) / 2
    expect(result.lat).toBeCloseTo(expectedLat, 5)
    expect(result.lng).toBeCloseTo(expectedLng, 5)
  })

  it('should calculate the average of multiple points', () => {
    const points = [TOKYO, OSAKA, NAGOYA]
    const result = centroid(points)
    const expectedLat = (TOKYO.lat + OSAKA.lat + NAGOYA.lat) / 3
    const expectedLng = (TOKYO.lng + OSAKA.lng + NAGOYA.lng) / 3
    expect(result.lat).toBeCloseTo(expectedLat, 5)
    expect(result.lng).toBeCloseTo(expectedLng, 5)
  })

  it('should return the same point when all inputs are identical', () => {
    const result = centroid([TOKYO, TOKYO, TOKYO])
    expect(result.lat).toBeCloseTo(TOKYO.lat, 5)
    expect(result.lng).toBeCloseTo(TOKYO.lng, 5)
  })

  it('should throw for empty input', () => {
    expect(() => centroid([])).toThrow()
  })
})

describe('geometricMedian', () => {
  it('should return the same point for a single input', () => {
    const result = geometricMedian([TOKYO])
    expect(result.lat).toBeCloseTo(TOKYO.lat, 3)
    expect(result.lng).toBeCloseTo(TOKYO.lng, 3)
  })

  it('should return the midpoint for two points', () => {
    const result = geometricMedian([TOKYO, OSAKA])
    const expectedLat = (TOKYO.lat + OSAKA.lat) / 2
    const expectedLng = (TOKYO.lng + OSAKA.lng) / 2
    expect(result.lat).toBeCloseTo(expectedLat, 1)
    expect(result.lng).toBeCloseTo(expectedLng, 1)
  })

  it('should return the same point when all inputs are identical', () => {
    const result = geometricMedian([NAGOYA, NAGOYA, NAGOYA])
    expect(result.lat).toBeCloseTo(NAGOYA.lat, 3)
    expect(result.lng).toBeCloseTo(NAGOYA.lng, 3)
  })

  it('should be more robust to outliers than centroid', () => {
    // Sapporo is far from the other three Kanto/Kansai cities
    const points = [TOKYO, OSAKA, NAGOYA, SAPPORO]
    const c = centroid(points)
    const gm = geometricMedian(points)

    // Geometric median should be closer to the cluster (Tokyo/Osaka/Nagoya)
    // and less pulled toward the outlier (Sapporo)
    // So geometric median's latitude should be lower than centroid's latitude
    expect(gm.lat).toBeLessThan(c.lat)
  })

  it('should converge for clustered points', () => {
    const cluster: LatLng[] = [
      { lat: 35.68, lng: 139.65 },
      { lat: 35.67, lng: 139.66 },
      { lat: 35.69, lng: 139.64 },
    ]
    const result = geometricMedian(cluster)
    // Result should be within the cluster bounding box
    expect(result.lat).toBeGreaterThan(35.66)
    expect(result.lat).toBeLessThan(35.7)
    expect(result.lng).toBeGreaterThan(139.63)
    expect(result.lng).toBeLessThan(139.67)
  })

  it('should return best estimate when max iterations is reached', () => {
    const points = [TOKYO, OSAKA, NAGOYA]
    // With 0 iterations, should return the initial centroid estimate
    const result = geometricMedian(points, { maxIterations: 0 })
    const c = centroid(points)
    expect(result.lat).toBeCloseTo(c.lat, 5)
    expect(result.lng).toBeCloseTo(c.lng, 5)
  })

  it('should throw for empty input', () => {
    expect(() => geometricMedian([])).toThrow()
  })
})
