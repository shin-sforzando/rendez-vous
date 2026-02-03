import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useStationSearch } from '../useStationSearch'

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

describe('useStationSearch (Supabase mode)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockResponse = { data: [], error: null }
  })

  it('should indicate Supabase mode', () => {
    const { result } = renderHook(() => useStationSearch(''))
    expect(result.current.isUsingMockData).toBe(false)
  })

  it('should call Supabase RPC on initial render with query', async () => {
    renderHook(() => useStationSearch('東京'))

    await waitFor(() => {
      expect(mockRpc).toHaveBeenCalledWith('search_stations', { query: '東京' })
    })
  })

  it('should return station data from Supabase RPC', async () => {
    mockResponse = {
      data: [
        {
          id: 1,
          name: '東京',
          line_name: 'JR山手線',
          operator: 'JR東日本',
          lat: 35.6812,
          lng: 139.7671,
        },
      ],
      error: null,
    }

    const { result } = renderHook(() => useStationSearch('東京'))

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
    })
  })

  it('should handle Supabase API error', async () => {
    mockResponse = { data: null, error: { message: 'Connection refused' } }

    const { result } = renderHook(() => useStationSearch('東京'))

    await waitFor(() => {
      expect(result.current.error).toBe('Connection refused')
    })

    expect(result.current.stations).toEqual([])
  })

  it('should set isLoading then resolve', async () => {
    let resolvePromise!: (value: unknown) => void
    mockRpc.mockReturnValueOnce(
      new Promise((r) => {
        resolvePromise = r
      })
    )

    const { result } = renderHook(() => useStationSearch('東京'))

    // isLoading should be true while waiting
    expect(result.current.isLoading).toBe(true)

    await act(async () => {
      resolvePromise({ data: [], error: null })
    })

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })
  })
})
