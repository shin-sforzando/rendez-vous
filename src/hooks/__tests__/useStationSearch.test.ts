import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useStationSearch } from '../useStationSearch'

// Mock the supabase module
vi.mock('@/lib/supabase', () => ({
  supabase: null,
  isSupabaseAvailable: () => false,
}))

describe('useStationSearch (mock data mode)', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('should return empty results for empty query', () => {
    const { result } = renderHook(() => useStationSearch(''))
    expect(result.current.stations).toEqual([])
    expect(result.current.isLoading).toBe(false)
    expect(result.current.error).toBeNull()
    expect(result.current.isUsingMockData).toBe(true)
  })

  it('should return matching stations after debounce', async () => {
    const { result, rerender } = renderHook(({ query }) => useStationSearch(query), {
      initialProps: { query: '' },
    })

    // Change query from empty to '東京'
    rerender({ query: '東京' })

    // Before debounce fires, no results yet
    expect(result.current.stations).toEqual([])

    // Advance past debounce delay
    await act(async () => {
      vi.advanceTimersByTime(300)
    })

    expect(result.current.stations).toHaveLength(1)
    expect(result.current.stations[0].name).toBe('東京')
  })

  it('should return no results for unmatched query', async () => {
    const { result } = renderHook(() => useStationSearch('ロンドン'))

    await act(async () => {
      vi.advanceTimersByTime(300)
    })

    expect(result.current.stations).toEqual([])
  })

  it('should debounce rapid query changes', async () => {
    const { result, rerender } = renderHook(
      ({ query }) => useStationSearch(query, { debounceMs: 300 }),
      { initialProps: { query: '東' } }
    )

    // Rapidly change query before debounce fires
    rerender({ query: '東京' })

    await act(async () => {
      vi.advanceTimersByTime(300)
    })

    expect(result.current.stations).toHaveLength(1)
    expect(result.current.stations[0].name).toBe('東京')
  })

  it('should clear results when query becomes empty', async () => {
    const { result, rerender } = renderHook(({ query }) => useStationSearch(query), {
      initialProps: { query: '東京' },
    })

    await act(async () => {
      vi.advanceTimersByTime(300)
    })
    expect(result.current.stations).toHaveLength(1)

    rerender({ query: '' })
    await act(async () => {
      vi.advanceTimersByTime(300)
    })

    expect(result.current.stations).toEqual([])
  })

  it('should support custom debounce time', async () => {
    const { result } = renderHook(() => useStationSearch('新宿', { debounceMs: 100 }))

    await act(async () => {
      vi.advanceTimersByTime(100)
    })

    expect(result.current.stations).toHaveLength(1)
    expect(result.current.stations[0].name).toBe('新宿')
  })

  it('should indicate mock data mode', () => {
    const { result } = renderHook(() => useStationSearch(''))
    expect(result.current.isUsingMockData).toBe(true)
  })
})
