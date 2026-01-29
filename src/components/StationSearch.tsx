import { useState } from 'react'
import type { Location } from '@/types'

interface StationSearchProps {
  /** Callback when a station is selected */
  onSelect: (location: Location) => void
  /** Whether selection is disabled (e.g., max locations reached) */
  disabled?: boolean
}

/** Placeholder for station search - requires Supabase integration (Phase 4) */
function StationSearch({ onSelect, disabled = false }: StationSearchProps) {
  const [query, setQuery] = useState('')

  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    if (disabled) return
    // TODO: Implement station search via Supabase (Phase 4, Issue #9)
    // For now, this is a UI shell that will be connected later
    if (query.trim()) {
      onSelect({
        name: query.trim(),
        latlng: { lat: 0, lng: 0 },
      })
    }
  }

  return (
    <div data-testid="station-search" className="card bg-base-100 shadow-md">
      <div className="card-body">
        <h2 className="card-title text-lg">駅を検索</h2>

        <form onSubmit={handleSearch} className="flex gap-2">
          <div className="form-control flex-1">
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
          <button type="submit" className="btn btn-secondary" disabled={disabled || !query.trim()}>
            検索
          </button>
        </form>

        <div className="text-sm text-base-content/50 mt-2">
          <p>※ 駅検索は Supabase 統合後に有効になります</p>
        </div>
      </div>
    </div>
  )
}

export default StationSearch
