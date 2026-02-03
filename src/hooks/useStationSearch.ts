import { useEffect, useState } from 'react'
import { isSupabaseAvailable, supabase } from '@/lib/supabase'
import type { StationWithCoords } from '@/types'

interface UseStationSearchOptions {
  debounceMs?: number
}

interface UseStationSearchResult {
  stations: StationWithCoords[]
  isLoading: boolean
  error: string | null
  isUsingMockData: boolean
}

const MOCK_STATIONS: StationWithCoords[] = [
  { id: 1, name: '東京', line_name: 'JR山手線', operator: 'JR東日本', lat: 35.6812, lng: 139.7671 },
  { id: 2, name: '新宿', line_name: 'JR山手線', operator: 'JR東日本', lat: 35.6896, lng: 139.7006 },
  { id: 3, name: '渋谷', line_name: 'JR山手線', operator: 'JR東日本', lat: 35.658, lng: 139.7016 },
  { id: 4, name: '池袋', line_name: 'JR山手線', operator: 'JR東日本', lat: 35.7295, lng: 139.7109 },
  { id: 5, name: '品川', line_name: 'JR山手線', operator: 'JR東日本', lat: 35.6284, lng: 139.7387 },
]

function searchMockStations(query: string): StationWithCoords[] {
  if (!query.trim()) return []
  return MOCK_STATIONS.filter((s) => s.name.includes(query.trim()))
}

/**
 * Custom hook for station search with debounce.
 * Uses Supabase when configured, falls back to mock data otherwise.
 */
export function useStationSearch(
  query: string,
  options?: UseStationSearchOptions
): UseStationSearchResult {
  const [stations, setStations] = useState<StationWithCoords[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [debouncedQuery, setDebouncedQuery] = useState(query)

  const debounceMs = options?.debounceMs ?? 300
  const isUsingMockData = !isSupabaseAvailable()

  // Debounce the query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query)
    }, debounceMs)
    return () => clearTimeout(timer)
  }, [query, debounceMs])

  // Execute search when debounced query changes
  useEffect(() => {
    if (!debouncedQuery.trim()) {
      setStations([])
      setError(null)
      setIsLoading(false)
      return
    }

    if (isUsingMockData) {
      setStations(searchMockStations(debouncedQuery))
      return
    }

    let cancelled = false
    setIsLoading(true)
    setError(null)

    supabase
      ?.rpc('search_stations', { query: debouncedQuery.trim() })
      .then(({ data, error: apiError }) => {
        if (cancelled) return
        if (apiError) {
          setError(apiError.message)
          setStations([])
        } else {
          setStations((data as StationWithCoords[]) ?? [])
        }
      })
      .catch((err: unknown) => {
        if (cancelled) return
        const message = err instanceof Error ? err.message : 'Unknown error'
        setError(message)
        setStations([])
      })
      .finally(() => {
        if (cancelled) return
        setIsLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [debouncedQuery, isUsingMockData])

  return { stations, isLoading, error, isUsingMockData }
}
