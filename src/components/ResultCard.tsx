import { haversineDistance } from '@/lib/haversine'
import type { Location, MeetingPointResult } from '@/types'

interface ResultCardProps {
  /** All registered locations */
  locations: Location[]
  /** Calculation result (null when fewer than 2 locations) */
  result: MeetingPointResult | null
  /** Callback when a location is removed */
  onRemove?: (index: number) => void
}

/** Format distance in km for display */
function formatDistance(km: number): string {
  if (km < 1) {
    return `${Math.round(km * 1000)} m`
  }
  return `${km.toFixed(1)} km`
}

/** Info icon for tooltip hover target */
function InfoTip({ tip }: { tip: string }) {
  return (
    <div className="tooltip tooltip-bottom" data-tip={tip}>
      <sup className="text-xs opacity-60 cursor-help ml-0.5" role="img" aria-label={tip}>
        &#9432;
      </sup>
    </div>
  )
}

function ResultCard({ locations, result, onRemove }: ResultCardProps) {
  const { centroid, geometricMedian } = result ?? {}

  const centroidTotalDist =
    centroid && result
      ? result.locations.reduce((sum, loc) => sum + haversineDistance(centroid, loc.latlng), 0)
      : null
  const medianTotalDist =
    geometricMedian && result
      ? result.locations.reduce(
          (sum, loc) => sum + haversineDistance(geometricMedian, loc.latlng),
          0
        )
      : null

  return (
    <div data-testid="result-card" className="card bg-base-100 shadow-md">
      <div className="card-body">
        <h2 className="card-title text-lg">
          {result ? '計算結果' : `登録済み地点（${locations.length}）`}
        </h2>

        {/* Empty state */}
        {locations.length === 0 && (
          <p className="text-sm text-base-content/50">地点を追加すると、ここに一覧が表示されます</p>
        )}

        {/* Centroid & Geometric Median summary (only when calculated) */}
        {result &&
          centroid &&
          geometricMedian &&
          centroidTotalDist != null &&
          medianTotalDist != null && (
            <div className="flex flex-col gap-4">
              {/* Centroid */}
              <div className="bg-base-200 border-l-4 border-warning rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="badge badge-warning">C</span>
                  <h3 className="font-semibold">
                    中間地点
                    <InfoTip tip="全員の座標の平均" />
                  </h3>
                </div>
                <p className="text-sm font-mono">
                  {centroid.lat.toFixed(6)}, {centroid.lng.toFixed(6)}
                </p>
                <p className="text-sm mt-1">
                  全員の合計距離: <strong>{formatDistance(centroidTotalDist)}</strong>
                </p>
              </div>

              {/* Geometric Median */}
              <div className="bg-base-200 border-l-4 border-error rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="badge badge-error">M</span>
                  <h3 className="font-semibold">
                    最適地点
                    <InfoTip tip="全員の移動距離の合計が最小となる地点" />
                  </h3>
                </div>
                <p className="text-sm font-mono">
                  {geometricMedian.lat.toFixed(6)}, {geometricMedian.lng.toFixed(6)}
                </p>
                <p className="text-sm mt-1">
                  全員の合計距離: <strong>{formatDistance(medianTotalDist)}</strong>
                </p>
              </div>
            </div>
          )}

        {/* Per-location list */}
        {locations.length > 0 && (
          <div className={result ? 'mt-4' : ''}>
            {result && <h3 className="font-semibold mb-2">各地点からの距離</h3>}
            <ul className="flex flex-col gap-2">
              {locations.map((location, index) => (
                <li key={`${location.name}-${index}`} className="bg-base-200 rounded-lg px-3 py-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="badge badge-primary badge-sm shrink-0">{index + 1}</span>
                      <span className="text-sm font-medium truncate">{location.name}</span>
                    </div>
                    {onRemove && (
                      <button
                        type="button"
                        className="btn btn-ghost btn-xs shrink-0"
                        onClick={() => onRemove(index)}
                        aria-label={`${location.name}を削除`}
                      >
                        ✕
                      </button>
                    )}
                  </div>
                  {result && centroid && geometricMedian && (
                    <div className="flex gap-4 mt-1 ml-7 text-xs text-base-content/70">
                      <span>
                        → C: {formatDistance(haversineDistance(centroid, location.latlng))}
                      </span>
                      <span>
                        → M: {formatDistance(haversineDistance(geometricMedian, location.latlng))}
                      </span>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  )
}

export default ResultCard
