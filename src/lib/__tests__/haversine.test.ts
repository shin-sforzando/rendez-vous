import { describe, expect, it } from 'vitest'
import type { LatLng } from '@/types'
import { haversineDistance } from '../haversine'

// Well-known reference points
const TOKYO: LatLng = { lat: 35.6762, lng: 139.6503 }
const OSAKA: LatLng = { lat: 34.6937, lng: 135.5023 }
const NEW_YORK: LatLng = { lat: 40.7128, lng: -74.006 }
const LONDON: LatLng = { lat: 51.5074, lng: -0.1278 }
const NORTH_POLE: LatLng = { lat: 90, lng: 0 }
const SOUTH_POLE: LatLng = { lat: -90, lng: 0 }

describe('haversineDistance', () => {
  it('should return 0 for the same point', () => {
    expect(haversineDistance(TOKYO, TOKYO)).toBe(0)
  })

  it('should calculate Tokyo-Osaka distance (~400 km)', () => {
    const distance = haversineDistance(TOKYO, OSAKA)
    expect(distance).toBeGreaterThan(380)
    expect(distance).toBeLessThan(420)
  })

  it('should calculate Tokyo-New York distance (~10,800 km)', () => {
    const distance = haversineDistance(TOKYO, NEW_YORK)
    expect(distance).toBeGreaterThan(10_500)
    expect(distance).toBeLessThan(11_000)
  })

  it('should calculate London-New York distance (~5,570 km)', () => {
    const distance = haversineDistance(LONDON, NEW_YORK)
    expect(distance).toBeGreaterThan(5_500)
    expect(distance).toBeLessThan(5_650)
  })

  it('should be symmetric (distance A→B === B→A)', () => {
    const ab = haversineDistance(TOKYO, OSAKA)
    const ba = haversineDistance(OSAKA, TOKYO)
    expect(ab).toBeCloseTo(ba, 10)
  })

  it('should calculate pole-to-pole distance (~20,015 km)', () => {
    const distance = haversineDistance(NORTH_POLE, SOUTH_POLE)
    // Half the Earth circumference ≈ 20,015 km
    expect(distance).toBeGreaterThan(19_900)
    expect(distance).toBeLessThan(20_100)
  })

  it('should handle antimeridian crossing', () => {
    const pointA: LatLng = { lat: 0, lng: 179 }
    const pointB: LatLng = { lat: 0, lng: -179 }
    const distance = haversineDistance(pointA, pointB)
    // These points are only ~222 km apart on the equator
    expect(distance).toBeGreaterThan(200)
    expect(distance).toBeLessThan(250)
  })

  it('should return positive values', () => {
    const distance = haversineDistance(TOKYO, NEW_YORK)
    expect(distance).toBeGreaterThan(0)
  })
})
