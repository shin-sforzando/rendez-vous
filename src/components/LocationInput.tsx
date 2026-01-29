import { useState } from 'react'
import type { Location } from '@/types'

/** Maximum number of locations allowed */
const MAX_LOCATIONS = 10

interface LocationInputProps {
  /** Current list of locations */
  locations: Location[]
  /** Callback when a location is added */
  onAdd: (location: Location) => void
  /** Callback when a location is removed */
  onRemove: (index: number) => void
}

function LocationInput({ locations, onAdd, onRemove }: LocationInputProps) {
  const [name, setName] = useState('')
  const [lat, setLat] = useState('')
  const [lng, setLng] = useState('')

  const canAdd = locations.length < MAX_LOCATIONS

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!canAdd) return

    const parsedLat = Number.parseFloat(lat)
    const parsedLng = Number.parseFloat(lng)

    if (!name.trim()) return
    if (Number.isNaN(parsedLat) || parsedLat < -90 || parsedLat > 90) return
    if (Number.isNaN(parsedLng) || parsedLng < -180 || parsedLng > 180) return

    onAdd({
      name: name.trim(),
      latlng: { lat: parsedLat, lng: parsedLng },
    })

    setName('')
    setLat('')
    setLng('')
  }

  return (
    <div data-testid="location-input" className="card bg-base-100 shadow-md">
      <div className="card-body">
        <h2 className="card-title text-lg">地点を追加</h2>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <div className="form-control">
            <label htmlFor="location-name" className="label">
              <span className="label-text">名前</span>
            </label>
            <input
              id="location-name"
              type="text"
              placeholder="例: 東京駅"
              className="input input-bordered w-full"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={!canAdd}
            />
          </div>

          <div className="flex gap-2">
            <div className="form-control flex-1">
              <label htmlFor="location-lat" className="label">
                <span className="label-text">緯度</span>
              </label>
              <input
                id="location-lat"
                type="number"
                step="any"
                placeholder="35.6762"
                className="input input-bordered w-full"
                value={lat}
                onChange={(e) => setLat(e.target.value)}
                disabled={!canAdd}
              />
            </div>
            <div className="form-control flex-1">
              <label htmlFor="location-lng" className="label">
                <span className="label-text">経度</span>
              </label>
              <input
                id="location-lng"
                type="number"
                step="any"
                placeholder="139.6503"
                className="input input-bordered w-full"
                value={lng}
                onChange={(e) => setLng(e.target.value)}
                disabled={!canAdd}
              />
            </div>
          </div>

          <button type="submit" className="btn btn-primary" disabled={!canAdd}>
            {canAdd ? '追加' : `上限 (${MAX_LOCATIONS}地点) に達しました`}
          </button>
        </form>

        {locations.length > 0 && (
          <div className="mt-4">
            <h3 className="font-semibold mb-2">
              登録済み地点 ({locations.length}/{MAX_LOCATIONS})
            </h3>
            <ul className="space-y-1" data-testid="location-list">
              {locations.map((location, index) => (
                <li
                  key={`${location.name}-${index}`}
                  className="flex items-center justify-between bg-base-200 rounded-lg px-3 py-2"
                >
                  <span className="flex items-center gap-2">
                    <span className="badge badge-primary badge-sm">{index + 1}</span>
                    <span>{location.name}</span>
                    <span className="text-xs text-base-content/50">
                      ({location.latlng.lat.toFixed(4)}, {location.latlng.lng.toFixed(4)})
                    </span>
                  </span>
                  <button
                    type="button"
                    className="btn btn-ghost btn-xs"
                    onClick={() => onRemove(index)}
                    aria-label={`${location.name}を削除`}
                  >
                    ✕
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  )
}

export default LocationInput
