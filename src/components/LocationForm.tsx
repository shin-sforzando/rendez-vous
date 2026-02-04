import { useState } from 'react'
import { useStationSearch } from '@/hooks/useStationSearch'
import type { Location } from '@/types'
import type { StationWithCoords } from '@/types/database'

interface LocationFormProps {
  /** Callback when a location is added */
  onAdd: (location: Location) => void
  /** Whether adding is disabled (e.g., max locations reached) */
  disabled?: boolean
}

/**
 * Unified location input form.
 * Supports station search (auto-fills coordinates) and direct coordinate entry.
 */
function LocationForm({ onAdd, disabled = false }: LocationFormProps) {
  const [label, setLabel] = useState('')
  const [stationQuery, setStationQuery] = useState('')
  const [lat, setLat] = useState('')
  const [lng, setLng] = useState('')
  const [selectedStation, setSelectedStation] = useState<StationWithCoords | null>(null)

  const { stations, isLoading, error, isUsingMockData } = useStationSearch(stationQuery)

  function handleStationSelect(station: StationWithCoords) {
    setSelectedStation(station)
    setStationQuery('')
    setLat(String(station.lat))
    setLng(String(station.lng))
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (disabled) return

    const parsedLat = Number.parseFloat(lat)
    const parsedLng = Number.parseFloat(lng)

    if (Number.isNaN(parsedLat) || parsedLat < -90 || parsedLat > 90) return
    if (Number.isNaN(parsedLng) || parsedLng < -180 || parsedLng > 180) return

    // Build display label from user input and/or station name
    let displayLabel = ''
    const trimmedLabel = label.trim()
    if (selectedStation) {
      displayLabel = trimmedLabel
        ? `${trimmedLabel}（${selectedStation.name}）`
        : selectedStation.name
    } else {
      displayLabel = trimmedLabel || `${parsedLat.toFixed(4)}, ${parsedLng.toFixed(4)}`
    }

    onAdd({ label: displayLabel, latlng: { lat: parsedLat, lng: parsedLng } })

    setLabel('')
    setStationQuery('')
    setLat('')
    setLng('')
    setSelectedStation(null)
  }

  return (
    <div data-testid="location-form" className="card bg-base-100 shadow-md">
      <div className="card-body">
        <h2 className="card-title text-lg">地点を追加</h2>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          {/* Label (optional) */}
          <div className="form-control">
            <label htmlFor="form-label" className="label">
              <span className="label-text">ラベル（任意）</span>
            </label>
            <input
              id="form-label"
              type="text"
              placeholder="例: Aさん、職場"
              className="input input-bordered w-full"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              disabled={disabled}
            />
          </div>

          {/* Station search */}
          <div className="form-control">
            <label htmlFor="form-station" className="label">
              <span className="label-text">駅名で検索</span>
            </label>
            <input
              id="form-station"
              type="text"
              placeholder="駅名を入力..."
              className="input input-bordered w-full"
              value={stationQuery}
              onChange={(e) => {
                setStationQuery(e.target.value)
                setSelectedStation(null)
              }}
              disabled={disabled}
              aria-label="駅名検索"
            />
          </div>

          {isUsingMockData && (
            <div className="text-sm text-warning">
              Supabase未設定のため、サンプルデータを使用しています
            </div>
          )}

          {error && (
            <div className="text-sm text-error" role="alert">
              検索エラー: {error}
            </div>
          )}

          {/* Station search results */}
          {stationQuery.trim() && !error && (
            <div className="max-h-48 overflow-y-auto">
              {isLoading ? (
                <output className="flex justify-center py-3" aria-label="検索中">
                  <span className="loading loading-spinner loading-sm" />
                </output>
              ) : stations.length > 0 ? (
                <ul
                  className="menu menu-compact bg-base-200 rounded-box"
                  data-testid="station-results"
                >
                  {stations.map((station) => (
                    <li key={station.id}>
                      <button
                        type="button"
                        onClick={() => handleStationSelect(station)}
                        disabled={disabled}
                      >
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

          {/* Selected station indicator */}
          {selectedStation && (
            <div
              className="bg-base-200 rounded-lg px-3 py-2 text-sm"
              data-testid="selected-station"
            >
              {selectedStation.name}
              {selectedStation.line_name && (
                <span className="opacity-60">（{selectedStation.line_name}）</span>
              )}
            </div>
          )}

          {/* Coordinates (auto-filled from station or manual entry) */}
          <div className="flex gap-2">
            <div className="form-control flex-1">
              <label htmlFor="form-lat" className="label">
                <span className="label-text">緯度</span>
              </label>
              <input
                id="form-lat"
                type="number"
                step="any"
                placeholder="35.6762"
                className="input input-bordered w-full"
                value={lat}
                onChange={(e) => {
                  setLat(e.target.value)
                  setSelectedStation(null)
                }}
                disabled={disabled}
              />
            </div>
            <div className="form-control flex-1">
              <label htmlFor="form-lng" className="label">
                <span className="label-text">経度</span>
              </label>
              <input
                id="form-lng"
                type="number"
                step="any"
                placeholder="139.6503"
                className="input input-bordered w-full"
                value={lng}
                onChange={(e) => {
                  setLng(e.target.value)
                  setSelectedStation(null)
                }}
                disabled={disabled}
              />
            </div>
          </div>

          <button type="submit" className="btn btn-primary" disabled={disabled}>
            {disabled ? '上限に達しました' : '追加'}
          </button>
        </form>
      </div>
    </div>
  )
}

export default LocationForm
