import { describe, expect, it } from 'vitest'
import type { LatLng } from '@/types'
import { type ECEFCoord, fromECEF, toECEF } from '../ecef'

const EARTH_RADIUS_KM = 6371

// Reference points
const EQUATOR_PRIME_MERIDIAN: LatLng = { lat: 0, lng: 0 }
const EQUATOR_90E: LatLng = { lat: 0, lng: 90 }
const NORTH_POLE: LatLng = { lat: 90, lng: 0 }
const SOUTH_POLE: LatLng = { lat: -90, lng: 0 }
const TOKYO: LatLng = { lat: 35.6762, lng: 139.6503 }

describe('toECEF', () => {
  it('should convert equator/prime meridian to (R, 0, 0)', () => {
    const result = toECEF(EQUATOR_PRIME_MERIDIAN)
    expect(result.x).toBeCloseTo(EARTH_RADIUS_KM, 0)
    expect(result.y).toBeCloseTo(0, 0)
    expect(result.z).toBeCloseTo(0, 0)
  })

  it('should convert equator/90°E to (0, R, 0)', () => {
    const result = toECEF(EQUATOR_90E)
    expect(result.x).toBeCloseTo(0, 0)
    expect(result.y).toBeCloseTo(EARTH_RADIUS_KM, 0)
    expect(result.z).toBeCloseTo(0, 0)
  })

  it('should convert north pole to (0, 0, R)', () => {
    const result = toECEF(NORTH_POLE)
    expect(result.x).toBeCloseTo(0, 0)
    expect(result.y).toBeCloseTo(0, 0)
    expect(result.z).toBeCloseTo(EARTH_RADIUS_KM, 0)
  })

  it('should convert south pole to (0, 0, -R)', () => {
    const result = toECEF(SOUTH_POLE)
    expect(result.x).toBeCloseTo(0, 0)
    expect(result.y).toBeCloseTo(0, 0)
    expect(result.z).toBeCloseTo(-EARTH_RADIUS_KM, 0)
  })

  it('should produce a point at distance R from origin', () => {
    const result = toECEF(TOKYO)
    const distance = Math.sqrt(result.x ** 2 + result.y ** 2 + result.z ** 2)
    expect(distance).toBeCloseTo(EARTH_RADIUS_KM, 0)
  })
})

describe('fromECEF', () => {
  it('should convert (R, 0, 0) to equator/prime meridian', () => {
    const coord: ECEFCoord = { x: EARTH_RADIUS_KM, y: 0, z: 0 }
    const result = fromECEF(coord)
    expect(result.lat).toBeCloseTo(0, 5)
    expect(result.lng).toBeCloseTo(0, 5)
  })

  it('should convert (0, 0, R) to north pole', () => {
    const coord: ECEFCoord = { x: 0, y: 0, z: EARTH_RADIUS_KM }
    const result = fromECEF(coord)
    expect(result.lat).toBeCloseTo(90, 5)
  })

  it('should convert (0, 0, -R) to south pole', () => {
    const coord: ECEFCoord = { x: 0, y: 0, z: -EARTH_RADIUS_KM }
    const result = fromECEF(coord)
    expect(result.lat).toBeCloseTo(-90, 5)
  })
})

describe('toECEF/fromECEF round-trip', () => {
  const testPoints: { name: string; point: LatLng }[] = [
    { name: 'equator/prime meridian', point: EQUATOR_PRIME_MERIDIAN },
    { name: 'equator/90°E', point: EQUATOR_90E },
    { name: 'north pole', point: NORTH_POLE },
    { name: 'south pole', point: SOUTH_POLE },
    { name: 'Tokyo', point: TOKYO },
    { name: 'southern hemisphere', point: { lat: -33.8688, lng: 151.2093 } },
    { name: 'western hemisphere', point: { lat: 40.7128, lng: -74.006 } },
  ]

  for (const { name, point } of testPoints) {
    it(`should round-trip ${name}`, () => {
      const ecef = toECEF(point)
      const result = fromECEF(ecef)
      expect(result.lat).toBeCloseTo(point.lat, 5)
      expect(result.lng).toBeCloseTo(point.lng, 5)
    })
  }
})
