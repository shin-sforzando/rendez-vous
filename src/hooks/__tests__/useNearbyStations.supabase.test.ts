import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useNearbyStations } from '../useNearbyStations'

// Mock response holder
let mockResponse: { data: unknown[] | null; error: { message: string } | null } = {
  data: [],
  error: null,
}

const mockRpc = vi.fn(() => Promise.resolve(mockResponse))

vi.mock('@/lib/supabase', () => ({
  supabase: { rpc: (...args: unknown[]) => mockRpc(...args) },
  isSupabaseAvailable: () => true,
}))

describe('useNearbyStations (Supabase mode)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockResponse = { data: [], error: null }
  })

  it('should indicate Supabase mode', () => {
    const { result } = renderHook(() => useNearbyStations(null))
    expect(result.current.isUsingMockData).toBe(false)
  })

  it('should not call RPC when point is null', () => {
    renderHook(() => useNearbyStations(null))
    expect(mockRpc).not.toHaveBeenCalled()
  })

  it('should call RPC with correct parameters', async () => {
    renderHook(() => useNearbyStations({ lat: 35.6812, lng: 139.7671 }))

    await waitFor(() => {
      expect(mockRpc).toHaveBeenCalledWith('find_nearby_stations', {
        lat: 35.6812,
        lng: 139.7671,
        limit_count: 3,
      })
    })
  })

  it('should pass custom limit to RPC', async () => {
    renderHook(() => useNearbyStations({ lat: 35.6812, lng: 139.7671 }, 5))

    await waitFor(() => {
      expect(mockRpc).toHaveBeenCalledWith('find_nearby_stations', {
        lat: 35.6812,
        lng: 139.7671,
        limit_count: 5,
      })
    })
  })

  it('should return station data from RPC', async () => {
    mockResponse = {
      data: [
        {
          id: 1,
          name: '東京',
          line_name: 'JR山手線',
          operator: 'JR東日本',
          lat: 35.6812,
          lng: 139.7671,
          distance_meters: 150.5,
        },
      ],
      error: null,
    }

    const { result } = renderHook(() => useNearbyStations({ lat: 35.68, lng: 139.76 }))

    await waitFor(() => {
      expect(result.current.stations).toHaveLength(1)
    })

    expect(result.current.stations[0]).toEqual({
      id: 1,
      name: '東京',
      line_name: 'JR山手線',
      operator: 'JR東日本',
      lat: 35.6812,
      lng: 139.7671,
      distance_meters: 150.5,
    })
  })

  it('should handle API error', async () => {
    mockResponse = { data: null, error: { message: 'Connection refused' } }

    const { result } = renderHook(() => useNearbyStations({ lat: 35.68, lng: 139.76 }))

    await waitFor(() => {
      expect(result.current.error).toBe('Connection refused')
    })

    expect(result.current.stations).toEqual([])
  })

  it('should handle network-level promise rejection', async () => {
    mockRpc.mockReturnValueOnce(Promise.reject(new Error('Failed to fetch')))

    const { result } = renderHook(() => useNearbyStations({ lat: 35.68, lng: 139.76 }))

    await waitFor(() => {
      expect(result.current.error).toBe('Failed to fetch')
    })

    expect(result.current.stations).toEqual([])
    expect(result.current.isLoading).toBe(false)
  })

  it('should set isLoading then resolve', async () => {
    let resolvePromise!: (value: unknown) => void
    mockRpc.mockReturnValueOnce(
      new Promise((r) => {
        resolvePromise = r
      })
    )

    const { result } = renderHook(() => useNearbyStations({ lat: 35.68, lng: 139.76 }))

    expect(result.current.isLoading).toBe(true)

    await act(async () => {
      resolvePromise({ data: [], error: null })
    })

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })
  })

  it('should handle race condition with cancelled flag', async () => {
    let resolvePromise!: (value: unknown) => void
    mockRpc.mockReturnValueOnce(
      new Promise((r) => {
        resolvePromise = r
      })
    )

    const { result, rerender } = renderHook(({ point }) => useNearbyStations(point), {
      initialProps: { point: { lat: 35.68, lng: 139.76 } as { lat: number; lng: number } | null },
    })

    expect(result.current.isLoading).toBe(true)

    // Set point to null while fetch is in-flight
    rerender({ point: null })

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.stations).toEqual([])

    // Resolve the dangling promise (should be ignored due to cancelled flag)
    await act(async () => {
      resolvePromise({
        data: [{ id: 1, name: 'stale', distance_meters: 100 }],
        error: null,
      })
    })

    // Should still be empty, not populated with stale data
    expect(result.current.stations).toEqual([])
  })
})
