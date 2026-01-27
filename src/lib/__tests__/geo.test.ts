import { describe, expect, it } from 'vitest'
import type { LatLng } from '@/types'
import { centroid, geometricMedian } from '../geo'
import { haversineDistance } from '../haversine'

// Reference points
const TOKYO: LatLng = { lat: 35.6762, lng: 139.6503 }
const OSAKA: LatLng = { lat: 34.6937, lng: 135.5023 }
const NAGOYA: LatLng = { lat: 35.1815, lng: 136.9066 }
const SAPPORO: LatLng = { lat: 43.0618, lng: 141.3545 }
const FUKUOKA: LatLng = { lat: 33.5904, lng: 130.4017 }
const SENDAI: LatLng = { lat: 38.2682, lng: 140.8694 }
const HIROSHIMA: LatLng = { lat: 34.3853, lng: 132.4553 }
const YOKOHAMA: LatLng = { lat: 35.4437, lng: 139.638 }
const KOBE: LatLng = { lat: 34.6901, lng: 135.1956 }
const KYOTO: LatLng = { lat: 35.0116, lng: 135.7681 }

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

describe('centroid with 10 points', () => {
  const TEN_CITIES: LatLng[] = [
    TOKYO,
    OSAKA,
    NAGOYA,
    SAPPORO,
    FUKUOKA,
    SENDAI,
    HIROSHIMA,
    YOKOHAMA,
    KOBE,
    KYOTO,
  ]

  it('should correctly calculate centroid of 10 points', () => {
    const result = centroid(TEN_CITIES)
    const expectedLat = TEN_CITIES.reduce((s, p) => s + p.lat, 0) / 10
    const expectedLng = TEN_CITIES.reduce((s, p) => s + p.lng, 0) / 10
    expect(result.lat).toBeCloseTo(expectedLat, 5)
    expect(result.lng).toBeCloseTo(expectedLng, 5)
  })

  it('should place centroid within the bounding box of 10 points', () => {
    const result = centroid(TEN_CITIES)
    const lats = TEN_CITIES.map((p) => p.lat)
    const lngs = TEN_CITIES.map((p) => p.lng)
    expect(result.lat).toBeGreaterThanOrEqual(Math.min(...lats))
    expect(result.lat).toBeLessThanOrEqual(Math.max(...lats))
    expect(result.lng).toBeGreaterThanOrEqual(Math.min(...lngs))
    expect(result.lng).toBeLessThanOrEqual(Math.max(...lngs))
  })
})

describe('geometricMedian with 10 points', () => {
  const TEN_CITIES: LatLng[] = [
    TOKYO,
    OSAKA,
    NAGOYA,
    SAPPORO,
    FUKUOKA,
    SENDAI,
    HIROSHIMA,
    YOKOHAMA,
    KOBE,
    KYOTO,
  ]

  it('should converge for 10 points', () => {
    const result = geometricMedian(TEN_CITIES)
    // Result should be a valid coordinate within Japan's bounding box
    expect(result.lat).toBeGreaterThan(30)
    expect(result.lat).toBeLessThan(46)
    expect(result.lng).toBeGreaterThan(128)
    expect(result.lng).toBeLessThan(146)
  })

  it('should minimize total distance better than centroid for 10 points', () => {
    const gm = geometricMedian(TEN_CITIES)
    const c = centroid(TEN_CITIES)

    const gmTotalDist = TEN_CITIES.reduce((sum, p) => sum + haversineDistance(gm, p), 0)
    const cTotalDist = TEN_CITIES.reduce((sum, p) => sum + haversineDistance(c, p), 0)

    // Geometric median should have equal or lower total distance
    expect(gmTotalDist).toBeLessThanOrEqual(cTotalDist + 1)
  })

  it('should be less affected by outlier (Sapporo) than centroid', () => {
    const gm = geometricMedian(TEN_CITIES)
    const c = centroid(TEN_CITIES)

    // Most cities are in Kanto-Kansai (lat ~34-36).
    // Sapporo (lat ~43) pulls centroid north more than geometric median.
    expect(gm.lat).toBeLessThan(c.lat)
  })
})

describe('edge case: collinear points (roughly on a line)', () => {
  // Points along the Tokaido axis: Tokyo → Yokohama → Nagoya → Kyoto → Osaka
  const COLLINEAR: LatLng[] = [TOKYO, YOKOHAMA, NAGOYA, KYOTO, OSAKA]

  it('centroid should lie on the line segment bounding box', () => {
    const result = centroid(COLLINEAR)
    const lats = COLLINEAR.map((p) => p.lat)
    const lngs = COLLINEAR.map((p) => p.lng)
    expect(result.lat).toBeGreaterThanOrEqual(Math.min(...lats))
    expect(result.lat).toBeLessThanOrEqual(Math.max(...lats))
    expect(result.lng).toBeGreaterThanOrEqual(Math.min(...lngs))
    expect(result.lng).toBeLessThanOrEqual(Math.max(...lngs))
  })

  it('geometricMedian should converge for collinear points', () => {
    const result = geometricMedian(COLLINEAR)
    const lats = COLLINEAR.map((p) => p.lat)
    const lngs = COLLINEAR.map((p) => p.lng)
    expect(result.lat).toBeGreaterThanOrEqual(Math.min(...lats) - 0.1)
    expect(result.lat).toBeLessThanOrEqual(Math.max(...lats) + 0.1)
    expect(result.lng).toBeGreaterThanOrEqual(Math.min(...lngs) - 0.1)
    expect(result.lng).toBeLessThanOrEqual(Math.max(...lngs) + 0.1)
  })

  it('geometricMedian should favor the middle of collinear points', () => {
    // For collinear points, geometric median should be near the physical median
    // Nagoya is roughly the middle point geographically
    const result = geometricMedian(COLLINEAR)
    const distToNagoya = haversineDistance(result, NAGOYA)
    const distToTokyo = haversineDistance(result, TOKYO)
    const distToOsaka = haversineDistance(result, OSAKA)

    // Should be closer to Nagoya (center) than to the endpoints
    expect(distToNagoya).toBeLessThan(distToTokyo)
    expect(distToNagoya).toBeLessThan(distToOsaka)
  })
})

describe('edge case: dense cluster with sparse outliers', () => {
  // 7 points tightly clustered in central Tokyo, 3 distant outliers
  const TOKYO_CLUSTER: LatLng[] = [
    { lat: 35.681, lng: 139.767 }, // Tokyo Station
    { lat: 35.69, lng: 139.7 }, // Shinjuku
    { lat: 35.659, lng: 139.7 }, // Shibuya
    { lat: 35.729, lng: 139.711 }, // Ikebukuro
    { lat: 35.671, lng: 139.764 }, // Ginza
    { lat: 35.714, lng: 139.777 }, // Ueno
    { lat: 35.689, lng: 139.691 }, // Yoyogi
  ]
  const OUTLIERS: LatLng[] = [SAPPORO, FUKUOKA, HIROSHIMA]
  const ALL_POINTS = [...TOKYO_CLUSTER, ...OUTLIERS]

  it('centroid should be pulled away from cluster by outliers', () => {
    const clusterOnly = centroid(TOKYO_CLUSTER)
    const withOutliers = centroid(ALL_POINTS)

    // Outliers are south/north, so centroid should shift noticeably
    const drift = haversineDistance(clusterOnly, withOutliers)
    expect(drift).toBeGreaterThan(50) // significant drift in km
  })

  it('geometricMedian should stay closer to the dense cluster', () => {
    const gm = geometricMedian(ALL_POINTS)
    const clusterCenter = centroid(TOKYO_CLUSTER)

    // Geometric median should remain near central Tokyo
    const gmToCluster = haversineDistance(gm, clusterCenter)
    expect(gmToCluster).toBeLessThan(100) // within 100km of cluster center
  })

  it('geometricMedian should be closer to cluster than centroid is', () => {
    const gm = geometricMedian(ALL_POINTS)
    const c = centroid(ALL_POINTS)
    const clusterCenter = centroid(TOKYO_CLUSTER)

    const gmDist = haversineDistance(gm, clusterCenter)
    const cDist = haversineDistance(c, clusterCenter)

    expect(gmDist).toBeLessThan(cDist)
  })
})

describe('edge case: duplicate points (weighted)', () => {
  it('should weight toward the duplicated point', () => {
    // 8 copies of Osaka + 1 Tokyo + 1 Sapporo
    // Geometric median should be very close to Osaka
    const points: LatLng[] = [...Array(8).fill(OSAKA), TOKYO, SAPPORO] as LatLng[]

    const gm = geometricMedian(points)
    const distToOsaka = haversineDistance(gm, OSAKA)
    const distToTokyo = haversineDistance(gm, TOKYO)

    // Should be very close to Osaka (the dominant point)
    expect(distToOsaka).toBeLessThan(50)
    expect(distToOsaka).toBeLessThan(distToTokyo)
  })
})
