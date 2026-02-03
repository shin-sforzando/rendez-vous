import { useState } from 'react'
import { useStationSearch } from '@/hooks/useStationSearch'
import type { Location } from '@/types'
import type { StationWithCoords } from '@/types/database'

interface StationSearchProps {
  /** Callback when a station is selected */
  onSelect: (location: Location) => void
  /** Whether selection is disabled (e.g., max locations reached) */
  disabled?: boolean
}

/** Station search with real-time Supabase query and mock data fallback */
function StationSearch({ onSelect, disabled = false }: StationSearchProps) {
  const [query, setQuery] = useState('')
  const { stations, isLoading, error, isUsingMockData } = useStationSearch(query)

  function handleSelect(station: StationWithCoords) {
    if (disabled) return
    onSelect({
      name: station.line_name ? `${station.name}（${station.line_name}）` : station.name,
      latlng: { lat: station.lat, lng: station.lng },
    })
    setQuery('')
  }

  return (
    <div data-testid="station-search" className="card bg-base-100 shadow-md">
      <div className="card-body">
        <h2 className="card-title text-lg">駅を検索</h2>

        <div className="form-control">
          <input
            type="text"
            placeholder="駅名を入力..."
            className="input input-bordered w-full"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            disabled={disabled}
            aria-label="駅名検索"
          />
        </div>

        {isUsingMockData && (
          <div className="text-sm text-warning mt-1">
            Supabase未設定のため、サンプルデータを使用しています
          </div>
        )}

        {error && (
          <div className="text-sm text-error mt-1" role="alert">
            検索エラー: {error}
          </div>
        )}

        {query.trim() && (
          <div className="mt-2 max-h-60 overflow-y-auto">
            {isLoading ? (
              <output className="flex justify-center py-4" aria-label="検索中">
                <span className="loading loading-spinner loading-sm" />
              </output>
            ) : stations.length > 0 ? (
              <ul className="menu menu-compact bg-base-200 rounded-box">
                {stations.map((station) => (
                  <li key={station.id}>
                    <button type="button" onClick={() => handleSelect(station)} disabled={disabled}>
                      <span className="font-medium">{station.name}</span>
                      {station.line_name && (
                        <span className="text-xs opacity-60">{station.line_name}</span>
                      )}
                      {station.operator && (
                        <span className="text-xs opacity-40">{station.operator}</span>
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-base-content/50 py-2">検索結果がありません</p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default StationSearch
