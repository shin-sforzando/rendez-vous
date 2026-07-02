import { useEffect, useState } from 'react'
import { findNearbyStations, loadStations } from '@/lib/stationData'
import type { LatLng, NearbyStation } from '@/types'

const DEFAULT_LIMIT = 3

interface UseNearbyStationsResult {
  stations: NearbyStation[]
  isLoading: boolean
  error: string | null
}

/**
 * Custom hook to find nearby stations for a given coordinate.
 * Computes distances locally from the static station dataset.
 */
export function useNearbyStations(
  point: LatLng | null,
  limit = DEFAULT_LIMIT
): UseNearbyStationsResult {
  const [stations, setStations] = useState<NearbyStation[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Use primitive values to avoid infinite loops from object reference changes
  const lat = point?.lat ?? null
  const lng = point?.lng ?? null

  useEffect(() => {
    if (lat === null || lng === null) {
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
        setStations(findNearbyStations({ lat, lng }, all, limit))
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
  }, [lat, lng, limit])

  return { stations, isLoading, error }
}
