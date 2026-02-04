import { act, renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { useNearbyStations } from '../useNearbyStations'

// Mock the supabase module to force mock data mode
vi.mock('@/lib/supabase', () => ({
  supabase: null,
  isSupabaseAvailable: () => false,
}))

describe('useNearbyStations (mock data mode)', () => {
  it('should return empty results when point is null', () => {
    const { result } = renderHook(() => useNearbyStations(null))
    expect(result.current.stations).toEqual([])
    expect(result.current.isLoading).toBe(false)
    expect(result.current.error).toBeNull()
    expect(result.current.isUsingMockData).toBe(true)
  })

  it('should return nearby stations sorted by distance for valid coordinates', () => {
    // Tokyo Station coordinates
    const { result } = renderHook(() => useNearbyStations({ lat: 35.6812, lng: 139.7671 }))

    expect(result.current.stations).toHaveLength(3)
    expect(result.current.isUsingMockData).toBe(true)

    // Verify sorted by distance (ascending)
    const distances = result.current.stations.map((s) => s.distance_meters)
    for (let i = 1; i < distances.length; i++) {
      expect(distances[i]).toBeGreaterThanOrEqual(distances[i - 1])
    }
  })

  it('should return closest station first for Tokyo Station coordinates', () => {
    const { result } = renderHook(() => useNearbyStations({ lat: 35.6812, lng: 139.7671 }))

    // The mock station "東京" is at the same coords, so it should be first
    expect(result.current.stations[0].name).toBe('東京')
    expect(result.current.stations[0].distance_meters).toBeLessThan(100)
  })

  it('should respect the limit parameter', () => {
    const { result } = renderHook(() => useNearbyStations({ lat: 35.6812, lng: 139.7671 }, 2))
    expect(result.current.stations).toHaveLength(2)
  })

  it('should return all mock stations when limit exceeds available', () => {
    const { result } = renderHook(() => useNearbyStations({ lat: 35.6812, lng: 139.7671 }, 10))
    expect(result.current.stations).toHaveLength(5)
  })

  it('should include distance_meters in each station', () => {
    const { result } = renderHook(() => useNearbyStations({ lat: 35.6812, lng: 139.7671 }))

    for (const station of result.current.stations) {
      expect(station.distance_meters).toBeTypeOf('number')
      expect(station.distance_meters).toBeGreaterThanOrEqual(0)
    }
  })

  it('should update results when coordinates change', () => {
    const { result, rerender } = renderHook(({ point }) => useNearbyStations(point), {
      initialProps: {
        point: { lat: 35.6812, lng: 139.7671 } as { lat: number; lng: number } | null,
      },
    })

    const firstStations = result.current.stations.map((s) => s.name)

    // Move to Shibuya area
    rerender({ point: { lat: 35.658, lng: 139.7016 } })

    const secondStations = result.current.stations.map((s) => s.name)
    // Closest station should now be Shibuya
    expect(secondStations[0]).toBe('渋谷')
    expect(secondStations).not.toEqual(firstStations)
  })

  it('should reset to empty when point becomes null', async () => {
    const { result, rerender } = renderHook(({ point }) => useNearbyStations(point), {
      initialProps: {
        point: { lat: 35.6812, lng: 139.7671 } as { lat: number; lng: number } | null,
      },
    })

    expect(result.current.stations).toHaveLength(3)

    await act(async () => {
      rerender({ point: null })
    })

    expect(result.current.stations).toEqual([])
  })
})
