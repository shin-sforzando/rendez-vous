import { afterEach, describe, expect, it, vi } from 'vitest'
import type { StationWithCoords } from '@/types'
import { findNearbyStations, loadStations, resetStationCache, searchStations } from '../stationData'

const STATIONS: StationWithCoords[] = [
  { id: 1, name: '東京', line_name: 'JR山手線', operator: 'JR東日本', lat: 35.6812, lng: 139.7671 },
  { id: 2, name: '新宿', line_name: 'JR山手線', operator: 'JR東日本', lat: 35.6896, lng: 139.7006 },
  { id: 3, name: '渋谷', line_name: 'JR山手線', operator: 'JR東日本', lat: 35.658, lng: 139.7016 },
  {
    id: 4,
    name: '新宿三丁目',
    line_name: '東京メトロ丸ノ内線',
    operator: '東京メトロ',
    lat: 35.69,
    lng: 139.705,
  },
]

describe('searchStations', () => {
  it('returns empty array for empty query', () => {
    expect(searchStations('', STATIONS)).toEqual([])
    expect(searchStations('   ', STATIONS)).toEqual([])
  })

  it('matches stations whose name contains the query', () => {
    const result = searchStations('新宿', STATIONS)
    expect(result.map((s) => s.name)).toEqual(['新宿', '新宿三丁目'])
  })

  it('trims the query before matching', () => {
    expect(searchStations('  東京  ', STATIONS)).toHaveLength(1)
  })

  it('returns empty array for unmatched query', () => {
    expect(searchStations('ロンドン', STATIONS)).toEqual([])
  })
})

describe('findNearbyStations', () => {
  it('sorts by ascending distance and applies the limit', () => {
    const result = findNearbyStations({ lat: 35.6812, lng: 139.7671 }, STATIONS, 2)
    expect(result).toHaveLength(2)
    expect(result[0].name).toBe('東京')
    for (let i = 1; i < result.length; i++) {
      expect(result[i].distance_meters).toBeGreaterThanOrEqual(result[i - 1].distance_meters)
    }
  })

  it('attaches distance_meters in meters', () => {
    const [closest] = findNearbyStations({ lat: 35.6812, lng: 139.7671 }, STATIONS, 1)
    expect(closest.distance_meters).toBeTypeOf('number')
    expect(closest.distance_meters).toBeLessThan(100)
  })

  it('returns all stations when limit exceeds the dataset', () => {
    const result = findNearbyStations({ lat: 35.6812, lng: 139.7671 }, STATIONS, 99)
    expect(result).toHaveLength(STATIONS.length)
  })
})

describe('loadStations', () => {
  afterEach(() => {
    resetStationCache()
    vi.restoreAllMocks()
  })

  it('fetches and returns the dataset', async () => {
    const fetchMock = vi.fn(() =>
      Promise.resolve({ ok: true, json: () => Promise.resolve(STATIONS) } as Response)
    )
    vi.stubGlobal('fetch', fetchMock)

    const result = await loadStations()
    expect(result).toEqual(STATIONS)
    expect(fetchMock).toHaveBeenCalledWith('/stations.json')
  })

  it('memoizes the result across calls', async () => {
    const fetchMock = vi.fn(() =>
      Promise.resolve({ ok: true, json: () => Promise.resolve(STATIONS) } as Response)
    )
    vi.stubGlobal('fetch', fetchMock)

    await loadStations()
    await loadStations()
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('throws and resets cache on a failed response', async () => {
    const failing = vi.fn(() => Promise.resolve({ ok: false, status: 500 } as Response))
    vi.stubGlobal('fetch', failing)

    await expect(loadStations()).rejects.toThrow('Failed to load station data: 500')

    // Cache was reset, so a subsequent successful call refetches
    const ok = vi.fn(() =>
      Promise.resolve({ ok: true, json: () => Promise.resolve(STATIONS) } as Response)
    )
    vi.stubGlobal('fetch', ok)
    await expect(loadStations()).resolves.toEqual(STATIONS)
  })
})
