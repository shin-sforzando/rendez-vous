import { describe, expect, it } from 'vitest'
import type { NearbyStation } from '@/types'
import { groupStationsByName } from '../stations'

/** Build a NearbyStation with sensible defaults */
function makeStation(overrides: Partial<NearbyStation>): NearbyStation {
  return {
    id: 1,
    name: 'X',
    line_name: 'Line A',
    operator: 'Op',
    lat: 35.0,
    lng: 139.0,
    distance_meters: 100,
    ...overrides,
  }
}

describe('groupStationsByName', () => {
  it('should return an empty array for empty input', () => {
    expect(groupStationsByName([])).toEqual([])
  })

  it('should keep a single-row station as-is', () => {
    const rows: NearbyStation[] = [
      makeStation({
        name: '渋谷',
        line_name: 'JR山手線',
        lat: 35.658,
        lng: 139.7016,
        distance_meters: 120,
      }),
    ]
    const result = groupStationsByName(rows)
    expect(result).toHaveLength(1)
    expect(result[0]).toEqual({
      name: '渋谷',
      lat: 35.658,
      lng: 139.7016,
      distance_meters: 120,
      lines: ['JR山手線'],
    })
  })

  it('should merge rows sharing the same name into one group', () => {
    const rows: NearbyStation[] = [
      makeStation({
        name: '新宿',
        line_name: 'JR山手線',
        lat: 35.6896,
        lng: 139.7006,
        distance_meters: 250,
      }),
      makeStation({
        name: '新宿',
        line_name: 'JR中央線',
        lat: 35.6898,
        lng: 139.7004,
        distance_meters: 280,
      }),
      makeStation({
        name: '新宿',
        line_name: '小田急線',
        lat: 35.6892,
        lng: 139.7002,
        distance_meters: 310,
      }),
    ]
    const result = groupStationsByName(rows)
    expect(result).toHaveLength(1)
    expect(result[0].name).toBe('新宿')
    expect(result[0].lines).toEqual(['JR山手線', 'JR中央線', '小田急線'])
  })

  it('should adopt the closest row coords and distance within a group', () => {
    const rows: NearbyStation[] = [
      makeStation({
        name: '新宿',
        line_name: 'A',
        lat: 1.0,
        lng: 2.0,
        distance_meters: 500,
      }),
      // Closest — should win the lat/lng/distance
      makeStation({
        name: '新宿',
        line_name: 'B',
        lat: 9.99,
        lng: 8.88,
        distance_meters: 100,
      }),
      makeStation({
        name: '新宿',
        line_name: 'C',
        lat: 3.0,
        lng: 4.0,
        distance_meters: 300,
      }),
    ]
    const result = groupStationsByName(rows)
    expect(result).toHaveLength(1)
    expect(result[0].lat).toBe(9.99)
    expect(result[0].lng).toBe(8.88)
    expect(result[0].distance_meters).toBe(100)
  })

  it('should preserve order of first appearance for distinct names', () => {
    const rows: NearbyStation[] = [
      makeStation({ name: '新宿', distance_meters: 100 }),
      makeStation({ name: '代々木', distance_meters: 250 }),
      makeStation({ name: '南新宿', distance_meters: 400 }),
      makeStation({ name: '新宿', line_name: 'extra', distance_meters: 110 }),
    ]
    const result = groupStationsByName(rows)
    expect(result.map((g) => g.name)).toEqual(['新宿', '代々木', '南新宿'])
  })

  it('should deduplicate identical line names within a group', () => {
    const rows: NearbyStation[] = [
      makeStation({ name: '新宿', line_name: 'JR山手線', distance_meters: 100 }),
      makeStation({ name: '新宿', line_name: 'JR山手線', distance_meters: 110 }),
      makeStation({ name: '新宿', line_name: 'JR中央線', distance_meters: 120 }),
    ]
    const result = groupStationsByName(rows)
    expect(result[0].lines).toEqual(['JR山手線', 'JR中央線'])
  })

  it('should handle rows with null line_name', () => {
    const rows: NearbyStation[] = [
      makeStation({ name: '無名', line_name: null, distance_meters: 100 }),
      makeStation({ name: '無名', line_name: 'JR', distance_meters: 110 }),
      makeStation({ name: 'X', line_name: null, distance_meters: 200 }),
    ]
    const result = groupStationsByName(rows)
    expect(result).toHaveLength(2)
    expect(result[0].lines).toEqual(['JR'])
    expect(result[1].lines).toEqual([])
  })
})
