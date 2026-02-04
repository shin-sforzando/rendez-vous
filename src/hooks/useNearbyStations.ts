import { useEffect, useState } from 'react'
import { haversineDistance } from '@/lib/haversine'
import { isSupabaseAvailable, supabase } from '@/lib/supabase'
import type { LatLng, NearbyStation, StationWithCoords } from '@/types'

const DEFAULT_LIMIT = 3

const MOCK_STATIONS: StationWithCoords[] = [
  { id: 1, name: '東京', line_name: 'JR山手線', operator: 'JR東日本', lat: 35.6812, lng: 139.7671 },
  { id: 2, name: '新宿', line_name: 'JR山手線', operator: 'JR東日本', lat: 35.6896, lng: 139.7006 },
  { id: 3, name: '渋谷', line_name: 'JR山手線', operator: 'JR東日本', lat: 35.658, lng: 139.7016 },
  { id: 4, name: '池袋', line_name: 'JR山手線', operator: 'JR東日本', lat: 35.7295, lng: 139.7109 },
  { id: 5, name: '品川', line_name: 'JR山手線', operator: 'JR東日本', lat: 35.6284, lng: 139.7387 },
]

function findNearbyMockStations(point: LatLng, limit: number): NearbyStation[] {
  return MOCK_STATIONS.map((station) => ({
    ...station,
    distance_meters: haversineDistance(point, { lat: station.lat, lng: station.lng }) * 1000,
  }))
    .sort((a, b) => a.distance_meters - b.distance_meters)
    .slice(0, limit)
}

interface UseNearbyStationsResult {
  stations: NearbyStation[]
  isLoading: boolean
  error: string | null
  isUsingMockData: boolean
}

/**
 * Custom hook to find nearby stations for a given coordinate.
 * Uses Supabase when configured, falls back to mock data otherwise.
 */
export function useNearbyStations(
  point: LatLng | null,
  limit = DEFAULT_LIMIT
): UseNearbyStationsResult {
  const [stations, setStations] = useState<NearbyStation[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isUsingMockData = !isSupabaseAvailable()

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

    const pointValue: LatLng = { lat, lng }

    if (isUsingMockData) {
      setStations(findNearbyMockStations(pointValue, limit))
      return
    }

    let cancelled = false
    setIsLoading(true)
    setError(null)

    supabase
      ?.rpc('find_nearby_stations', { lat, lng, limit_count: limit })
      .then(({ data, error: apiError }) => {
        if (cancelled) return
        if (apiError) {
          setError(apiError.message)
          setStations([])
        } else {
          setStations((data as NearbyStation[]) ?? [])
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
  }, [lat, lng, limit, isUsingMockData])

  return { stations, isLoading, error, isUsingMockData }
}
