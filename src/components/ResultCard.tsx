import { haversineDistance } from '@/lib/haversine'
import type { Location, MeetingPointResult, NearbyStation } from '@/types'

interface ResultCardProps {
  /** All registered locations */
  locations: Location[]
  /** Calculation result (null when fewer than 2 locations) */
  result: MeetingPointResult | null
  /** Callback when a location is removed */
  onRemove?: (index: number) => void
  /** Nearby stations for the centroid */
  centroidNearbyStations?: NearbyStation[]
  /** Nearby stations for the geometric median */
  medianNearbyStations?: NearbyStation[]
  /** Whether nearby station data is loading */
  isLoadingNearbyStations?: boolean
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

/** Group flat station rows by name, preserving order of first appearance */
function groupStationsByName(
  stations: NearbyStation[]
): { name: string; distance_meters: number; lines: string[] }[] {
  const groups = new Map<string, { distance_meters: number; lines: string[] }>()
  for (const s of stations) {
    const existing = groups.get(s.name)
    if (existing) {
      if (s.distance_meters < existing.distance_meters) {
        existing.distance_meters = s.distance_meters
      }
      if (s.line_name && !existing.lines.includes(s.line_name)) {
        existing.lines.push(s.line_name)
      }
    } else {
      groups.set(s.name, {
        distance_meters: s.distance_meters,
        lines: s.line_name ? [s.line_name] : [],
      })
    }
  }
  return Array.from(groups, ([name, data]) => ({ name, ...data }))
}

/** Nearby station list displayed within C/M cards */
function NearbyStationList({
  stations,
  isLoading,
  testId,
}: {
  stations: NearbyStation[]
  isLoading: boolean
  testId: string
}) {
  const grouped = groupStationsByName(stations)

  return (
    <div data-testid={testId} className="mt-2 border-t border-base-300 pt-2">
      <p className="text-xs font-semibold mb-1">最寄り駅</p>
      {isLoading ? (
        <p className="text-xs text-base-content/50">最寄り駅を検索中...</p>
      ) : grouped.length === 0 ? (
        <p className="text-xs text-base-content/50">駅が見つかりませんでした</p>
      ) : (
        <ul className="flex flex-col gap-1.5">
          {grouped.map((group, i) => (
            <li key={group.name}>
              <div className="flex items-center gap-1.5 text-xs">
                <span className="badge badge-outline badge-xs shrink-0">{i + 1}</span>
                <span className="font-medium">{group.name}</span>
                <span className="ml-auto shrink-0 tabular-nums">
                  {formatDistance(group.distance_meters / 1000)}
                </span>
              </div>
              {group.lines.length > 0 && (
                <p className="text-[11px] text-base-content/50 ml-5 mt-0.5 leading-relaxed">
                  {group.lines.join(' / ')}
                </p>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function ResultCard({
  locations,
  result,
  onRemove,
  centroidNearbyStations,
  medianNearbyStations,
  isLoadingNearbyStations,
}: ResultCardProps) {
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
                    <InfoTip tip="すべての座標の平均値。重心（Centroid）とも呼ばれる。" />
                  </h3>
                </div>
                <p className="text-sm font-mono">
                  {centroid.lat.toFixed(6)}, {centroid.lng.toFixed(6)}
                </p>
                <p className="text-sm mt-1">
                  全員の合計距離: <strong>{formatDistance(centroidTotalDist)}</strong>
                </p>
                {centroidNearbyStations && (
                  <NearbyStationList
                    stations={centroidNearbyStations}
                    isLoading={isLoadingNearbyStations ?? false}
                    testId="nearby-stations-centroid"
                  />
                )}
              </div>

              {/* Geometric Median */}
              <div className="bg-base-200 border-l-4 border-error rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="badge badge-error">M</span>
                  <h3 className="font-semibold">
                    最適地点
                    <InfoTip tip="各点からの直線距離の和が最小となる地点。幾何中央値、ユークリッド最小和点、トリチェリ点とも呼ばれる。" />
                  </h3>
                </div>
                <p className="text-sm font-mono">
                  {geometricMedian.lat.toFixed(6)}, {geometricMedian.lng.toFixed(6)}
                </p>
                <p className="text-sm mt-1">
                  全員の合計距離: <strong>{formatDistance(medianTotalDist)}</strong>
                </p>
                {medianNearbyStations && (
                  <NearbyStationList
                    stations={medianNearbyStations}
                    isLoading={isLoadingNearbyStations ?? false}
                    testId="nearby-stations-median"
                  />
                )}
              </div>
            </div>
          )}

        {/* Per-location list */}
        {locations.length > 0 && (
          <div className={result ? 'mt-4' : ''}>
            {result && <h3 className="font-semibold mb-2">各地点からの距離</h3>}
            <ul className="flex flex-col gap-2">
              {locations.map((location, index) => (
                <li key={`${location.label}-${index}`} className="bg-base-200 rounded-lg px-3 py-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="badge badge-primary badge-sm shrink-0">{index + 1}</span>
                      <span className="text-sm font-medium truncate">{location.label}</span>
                    </div>
                    {onRemove && (
                      <button
                        type="button"
                        className="btn btn-ghost btn-xs shrink-0"
                        onClick={() => onRemove(index)}
                        aria-label={`${location.label}を削除`}
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
