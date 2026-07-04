import { useEffect, useState } from 'react'
import { loadStations, searchStations } from '@/lib/stationData'
import type { StationWithCoords } from '@/types'

interface UseStationSearchOptions {
  debounceMs?: number
}

interface UseStationSearchResult {
  stations: StationWithCoords[]
  isLoading: boolean
  error: string | null
}

/**
 * Custom hook for station search with debounce.
 * Searches locally against the static station dataset.
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

    let cancelled = false
    setIsLoading(true)
    setError(null)

    loadStations()
      .then((all) => {
        if (cancelled) return
        setStations(searchStations(debouncedQuery, all))
      })
      .catch((err: unknown) => {
        if (cancelled) return
        const message = err instanceof Error ? err.message : '不明なエラーが発生しました'
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
  }, [debouncedQuery])

  return { stations, isLoading, error }
}
