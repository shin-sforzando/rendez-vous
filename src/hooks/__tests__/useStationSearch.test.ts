import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { loadStations } from '@/lib/stationData'
import type { StationWithCoords } from '@/types'
import { useStationSearch } from '../useStationSearch'

const TEST_STATIONS: StationWithCoords[] = [
  { id: 1, name: '東京', line_name: 'JR山手線', operator: 'JR東日本', lat: 35.6812, lng: 139.7671 },
  { id: 2, name: '新宿', line_name: 'JR山手線', operator: 'JR東日本', lat: 35.6896, lng: 139.7006 },
  { id: 3, name: '渋谷', line_name: 'JR山手線', operator: 'JR東日本', lat: 35.658, lng: 139.7016 },
  { id: 4, name: '池袋', line_name: 'JR山手線', operator: 'JR東日本', lat: 35.7295, lng: 139.7109 },
  { id: 5, name: '品川', line_name: 'JR山手線', operator: 'JR東日本', lat: 35.6284, lng: 139.7387 },
]

// Mock the dataset loader; keep the real search implementation
vi.mock('@/lib/stationData', async (importActual) => {
  const actual = await importActual<typeof import('@/lib/stationData')>()
  return {
    ...actual,
    loadStations: vi.fn(() => Promise.resolve(TEST_STATIONS)),
  }
})

describe('useStationSearch', () => {
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
  })

  it('should return matching stations after debounce', async () => {
    const { result, rerender } = renderHook(({ query }) => useStationSearch(query), {
      initialProps: { query: '' },
    })

    // Change query from empty to '東京'
    rerender({ query: '東京' })

    // Before debounce fires, no results yet
    expect(result.current.stations).toEqual([])

    // Advance past debounce delay and flush the async load
    await act(async () => {
      await vi.advanceTimersByTimeAsync(300)
    })

    expect(result.current.stations).toHaveLength(1)
    expect(result.current.stations[0].name).toBe('東京')
  })

  it('should return no results for unmatched query', async () => {
    const { result } = renderHook(() => useStationSearch('ロンドン'))

    await act(async () => {
      await vi.advanceTimersByTimeAsync(300)
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
      await vi.advanceTimersByTimeAsync(300)
    })

    expect(result.current.stations).toHaveLength(1)
    expect(result.current.stations[0].name).toBe('東京')
  })

  it('should clear results when query becomes empty', async () => {
    const { result, rerender } = renderHook(({ query }) => useStationSearch(query), {
      initialProps: { query: '東京' },
    })

    await act(async () => {
      await vi.advanceTimersByTimeAsync(300)
    })
    expect(result.current.stations).toHaveLength(1)

    rerender({ query: '' })
    await act(async () => {
      await vi.advanceTimersByTimeAsync(300)
    })

    expect(result.current.stations).toEqual([])
  })

  it('should surface an error when loading fails', async () => {
    vi.mocked(loadStations).mockRejectedValueOnce(new Error('network down'))

    const { result } = renderHook(() => useStationSearch('東京'))

    await act(async () => {
      await vi.advanceTimersByTimeAsync(300)
    })

    expect(result.current.error).toBe('network down')
    expect(result.current.stations).toEqual([])
    expect(result.current.isLoading).toBe(false)
  })

  it('should support custom debounce time', async () => {
    const { result } = renderHook(() => useStationSearch('新宿', { debounceMs: 100 }))

    await act(async () => {
      await vi.advanceTimersByTimeAsync(100)
    })

    expect(result.current.stations).toHaveLength(1)
    expect(result.current.stations[0].name).toBe('新宿')
  })
})
