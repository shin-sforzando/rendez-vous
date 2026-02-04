import { useEffect } from 'react'
import { serializeLocations } from '@/lib/urlState'
import type { Location } from '@/types'

/**
 * Sync locations to the browser URL using `history.replaceState`.
 * Uses `replaceState` instead of `pushState` to avoid polluting browser history.
 */
export function useLocationUrlSync(locations: Location[]): void {
  useEffect(() => {
    const query = serializeLocations(locations)
    const url = query ? `${window.location.pathname}?${query}` : window.location.pathname
    window.history.replaceState(null, '', url)
  }, [locations])
}
