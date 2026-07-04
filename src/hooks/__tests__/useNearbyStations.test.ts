import { renderHook, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { loadStations } from '@/lib/stationData'
import type { StationWithCoords } from '@/types'
import { useNearbyStations } from '../useNearbyStations'

const TEST_STATIONS: StationWithCoords[] = [
  { id: 1, name: '東京', line_name: 'JR山手線', operator: 'JR東日本', lat: 35.6812, lng: 139.7671 },
  { id: 2, name: '新宿', line_name: 'JR山手線', operator: 'JR東日本', lat: 35.6896, lng: 139.7006 },
  { id: 3, name: '渋谷', line_name: 'JR山手線', operator: 'JR東日本', lat: 35.658, lng: 139.7016 },
  { id: 4, name: '池袋', line_name: 'JR山手線', operator: 'JR東日本', lat: 35.7295, lng: 139.7109 },
  { id: 5, name: '品川', line_name: 'JR山手線', operator: 'JR東日本', lat: 35.6284, lng: 139.7387 },
]

// Mock the dataset loader; keep the real nearest-station implementation
vi.mock('@/lib/stationData', async (importActual) => {
  const actual = await importActual<typeof import('@/lib/stationData')>()
  return {
    ...actual,
    loadStations: vi.fn(() => Promise.resolve(TEST_STATIONS)),
  }
})

describe('useNearbyStations', () => {
  it('should return empty results when point is null', () => {
    const { result } = renderHook(() => useNearbyStations(null))
    expect(result.current.stations).toEqual([])
    expect(result.current.isLoading).toBe(false)
    expect(result.current.error).toBeNull()
  })

  it('should return nearby stations sorted by distance for valid coordinates', async () => {
    // Tokyo Station coordinates
    const { result } = renderHook(() => useNearbyStations({ lat: 35.6812, lng: 139.7671 }))

    await waitFor(() => expect(result.current.stations).toHaveLength(3))

    // Verify sorted by distance (ascending)
    const distances = result.current.stations.map((s) => s.distance_meters)
    for (let i = 1; i < distances.length; i++) {
      expect(distances[i]).toBeGreaterThanOrEqual(distances[i - 1])
    }
  })

  it('should return closest station first for Tokyo Station coordinates', async () => {
    const { result } = renderHook(() => useNearbyStations({ lat: 35.6812, lng: 139.7671 }))

    // The station "東京" is at the same coords, so it should be first
    await waitFor(() => expect(result.current.stations[0]?.name).toBe('東京'))
    expect(result.current.stations[0].distance_meters).toBeLessThan(100)
  })

  it('should respect the limit parameter', async () => {
    const { result } = renderHook(() => useNearbyStations({ lat: 35.6812, lng: 139.7671 }, 2))
    await waitFor(() => expect(result.current.stations).toHaveLength(2))
  })

  it('should return all stations when limit exceeds available', async () => {
    const { result } = renderHook(() => useNearbyStations({ lat: 35.6812, lng: 139.7671 }, 10))
    await waitFor(() => expect(result.current.stations).toHaveLength(5))
  })

  it('should include distance_meters in each station', async () => {
    const { result } = renderHook(() => useNearbyStations({ lat: 35.6812, lng: 139.7671 }))

    await waitFor(() => expect(result.current.stations.length).toBeGreaterThan(0))
    for (const station of result.current.stations) {
      expect(station.distance_meters).toBeTypeOf('number')
      expect(station.distance_meters).toBeGreaterThanOrEqual(0)
    }
  })

  it('should update results when coordinates change', async () => {
    const { result, rerender } = renderHook(({ point }) => useNearbyStations(point), {
      initialProps: {
        point: { lat: 35.6812, lng: 139.7671 } as { lat: number; lng: number } | null,
      },
    })

    await waitFor(() => expect(result.current.stations[0]?.name).toBe('東京'))

    // Move to Shibuya area
    rerender({ point: { lat: 35.658, lng: 139.7016 } })

    // Closest station should now be Shibuya
    await waitFor(() => expect(result.current.stations[0]?.name).toBe('渋谷'))
  })

  it('should surface an error when loading fails', async () => {
    vi.mocked(loadStations).mockRejectedValueOnce(new Error('network down'))

    const { result } = renderHook(() => useNearbyStations({ lat: 35.6812, lng: 139.7671 }))

    await waitFor(() => expect(result.current.error).toBe('network down'))
    expect(result.current.stations).toEqual([])
    expect(result.current.isLoading).toBe(false)
  })

  it('should reset to empty when point becomes null', async () => {
    const { result, rerender } = renderHook(({ point }) => useNearbyStations(point), {
      initialProps: {
        point: { lat: 35.6812, lng: 139.7671 } as { lat: number; lng: number } | null,
      },
    })

    await waitFor(() => expect(result.current.stations).toHaveLength(3))

    rerender({ point: null })

    await waitFor(() => expect(result.current.stations).toEqual([]))
  })
})
