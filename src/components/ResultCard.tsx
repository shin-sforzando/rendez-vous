import { useMemo } from 'react'
import { haversineDistance } from '@/lib/haversine'
import { groupStationsByName } from '@/lib/stations'
import type { KMedoidResult, LatLng, Location, MeetingPointResult, NearbyStation } from '@/types'

/** Maximum number of distinct nearby stations (by name) shown in each list */
const NEARBY_DISPLAY_LIMIT = 3

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
  /** K-medoid suggested station (minimizes total distance from all participants) */
  suggestedStation?: KMedoidResult | null
  /** Whether nearby station data is loading */
  isLoadingNearbyStations?: boolean
  /** Callback to copy share URL to clipboard */
  onCopyUrl?: () => void
  /** Whether the URL was just copied */
  isCopied?: boolean
  /** Request the map to fly to a specific point (e.g., on badge click) */
  onFocusMap?: (latlng: LatLng) => void
}

/** Format distance in km for display */
function formatDistance(km: number): string {
  if (km < 1) {
    return `${Math.round(km * 1000)} m`
  }
  return `${km.toFixed(1)} km`
}

/** Nearby station list displayed within C/M cards */
function NearbyStationList({
  stations,
  isLoading,
  testId,
  labelPrefix,
  badgeColorClass,
  onFocus,
}: {
  stations: NearbyStation[]
  isLoading: boolean
  testId: string
  /** Prefix used for the rank badge (e.g., 'C' or 'M') to match map markers */
  labelPrefix: 'C' | 'M'
  /** DaisyUI badge color modifier class (e.g., 'badge-warning', 'badge-error') */
  badgeColorClass: string
  /** Click handler that focuses the map on the grouped station's coords */
  onFocus?: (latlng: LatLng) => void
}) {
  const grouped = groupStationsByName(stations).slice(0, NEARBY_DISPLAY_LIMIT)

  return (
    <div data-testid={testId} className="mt-2 border-t border-base-300 pt-2">
      <p className="text-xs font-semibold mb-1">最寄り駅</p>
      {isLoading ? (
        <p className="text-xs text-base-content/50">最寄り駅を検索中...</p>
      ) : grouped.length === 0 ? (
        <p className="text-xs text-base-content/50">駅が見つかりませんでした</p>
      ) : (
        <ul className="flex flex-col gap-1.5">
          {grouped.map((group, i) => {
            const label = `${labelPrefix}${i + 1}`
            return (
              <li key={group.name}>
                <button
                  type="button"
                  onClick={() => onFocus?.({ lat: group.lat, lng: group.lng })}
                  aria-label={`地図を${group.name}に移動`}
                  className="w-full text-left cursor-pointer hover:bg-base-300/50 rounded px-1 -mx-1 py-0.5 transition-colors block"
                >
                  <span className="flex items-center gap-1.5 text-xs">
                    <span className={`badge ${badgeColorClass} badge-xs shrink-0`}>{label}</span>
                    <span className="font-medium">{group.name}</span>
                    <span className="ml-auto shrink-0 tabular-nums">
                      {formatDistance(group.distance_meters / 1000)}
                    </span>
                  </span>
                  {group.lines.length > 0 && (
                    <span className="block text-[11px] text-base-content/50 ml-7 mt-0.5 leading-relaxed">
                      {group.lines.join(' / ')}
                    </span>
                  )}
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

/** Standalone suggestion box shown when the K-medoid winner is not in the displayed nearby list */
function SuggestedStationBox({
  suggestion,
  lines,
}: {
  suggestion: KMedoidResult
  /** Aggregated line names from all rows of the winning station (multi-line stations like 新宿) */
  lines?: string[]
}) {
  const { station, totalDistance } = suggestion
  const displayLines =
    lines && lines.length > 0 ? lines : station.line_name ? [station.line_name] : []
  return (
    <div data-testid="suggested-station-box" className="mt-2 border-t border-base-300 pt-2">
      <p className="text-xs font-semibold mb-1">
        <span className="badge badge-accent badge-xs mr-1">おすすめ</span>
        全員からの合計距離が最小の駅
      </p>
      <div className="flex items-center gap-1.5 text-xs">
        <span className="font-medium">{station.name}</span>
        <span className="ml-auto shrink-0 tabular-nums">
          合計 <strong>{formatDistance(totalDistance)}</strong>
        </span>
      </div>
      {displayLines.length > 0 && (
        <p className="text-[11px] text-base-content/50 ml-0.5 mt-0.5 leading-relaxed">
          {displayLines.join(' / ')}
        </p>
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
  suggestedStation,
  isLoadingNearbyStations,
  onCopyUrl,
  isCopied,
  onFocusMap,
}: ResultCardProps) {
  const suggestedName = suggestedStation?.station.name ?? null

  // Group once here so both isSuggestionInList and SuggestedStationBox's multi-line
  // aggregation read from the same canonical view of the median nearby data.
  const groupedMedianAll = useMemo(
    () => groupStationsByName(medianNearbyStations ?? []),
    [medianNearbyStations]
  )

  // Compare against the actually-displayed top-N grouped names (not the raw rows).
  // The raw pool has up to 20 rows incl. multi-line duplicates; the rendered list
  // is grouped+sliced, so checking the raw rows can yield a false positive when
  // the K-medoid winner is in the pool but not in the displayed top-N.
  const isSuggestionInList =
    suggestedName != null &&
    groupedMedianAll.slice(0, NEARBY_DISPLAY_LIMIT).some((g) => g.name === suggestedName)

  // Aggregated line names for the winner (e.g. 新宿 with 山手線/中央線/小田急).
  const suggestedStationLines = useMemo(
    () =>
      suggestedName == null
        ? undefined
        : groupedMedianAll.find((g) => g.name === suggestedName)?.lines,
    [suggestedName, groupedMedianAll]
  )

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
        <h2 className="card-title text-lg">{result ? '結果' : `出発地（${locations.length}）`}</h2>

        {/* Empty state */}
        {locations.length === 0 && (
          <p className="text-sm text-base-content/50">
            出発地を追加すると、ここに一覧が表示されます
          </p>
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
                <div className="flex items-center gap-2 mb-1">
                  <button
                    type="button"
                    onClick={() => onFocusMap?.(centroid)}
                    aria-label="地図を中間地点に移動"
                    className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity"
                  >
                    <span className="badge badge-warning">C</span>
                    <span className="font-semibold">中間地点</span>
                  </button>
                </div>
                <p className="text-[11px] text-base-content/50 leading-relaxed mb-2">
                  全座標の
                  <a
                    href="https://ja.wikipedia.org/wiki/%E7%AE%97%E8%A1%93%E5%B9%B3%E5%9D%87"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline hover:text-primary"
                  >
                    算術平均
                  </a>
                  。
                  <a
                    href="https://ja.wikipedia.org/wiki/%E9%87%8D%E5%BF%83"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline hover:text-primary"
                  >
                    重心
                  </a>
                  （Centroid）とも呼ばれる。
                </p>
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
                    labelPrefix="C"
                    badgeColorClass="badge-warning"
                    onFocus={onFocusMap}
                  />
                )}
              </div>

              {/* Geometric Median */}
              <div className="bg-base-200 border-l-4 border-error rounded-lg p-4">
                <div className="flex items-center gap-2 mb-1">
                  <button
                    type="button"
                    onClick={() => onFocusMap?.(geometricMedian)}
                    aria-label="地図を最適地点に移動"
                    className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity"
                  >
                    <span className="badge badge-error">M</span>
                    <span className="font-semibold">最適地点</span>
                  </button>
                </div>
                <p className="text-[11px] text-base-content/50 leading-relaxed mb-2">
                  各点からの直線距離の和が最小となる地点。一般には
                  <a
                    href="https://en.wikipedia.org/wiki/Geometric_median"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline hover:text-primary"
                  >
                    幾何中央値（Geometric median）
                  </a>
                  、三角形の場合は
                  <a
                    href="https://ja.wikipedia.org/wiki/%E3%83%95%E3%82%A7%E3%83%AB%E3%83%9E%E3%83%BC%E7%82%B9"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline hover:text-primary"
                  >
                    フェルマー点
                  </a>
                  と呼ばれる。
                </p>
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
                    labelPrefix="M"
                    badgeColorClass="badge-error"
                    onFocus={onFocusMap}
                  />
                )}
                {suggestedStation && !isSuggestionInList && (
                  <SuggestedStationBox
                    suggestion={suggestedStation}
                    lines={suggestedStationLines}
                  />
                )}
              </div>
            </div>
          )}

        {/* Per-location list */}
        {locations.length > 0 && (
          <div className={result ? 'mt-4' : ''}>
            {result && <h3 className="font-semibold mb-2">各出発地からの距離</h3>}
            <ul className="flex flex-col gap-2">
              {locations.map((location, index) => (
                <li key={location.id} className="bg-base-200 rounded-lg px-3 py-2">
                  <div className="flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => onFocusMap?.(location.latlng)}
                      aria-label={`地図を${location.label}に移動`}
                      className="flex items-center gap-1.5 min-w-0 cursor-pointer hover:opacity-80 transition-opacity text-left flex-1"
                    >
                      <span className="badge badge-primary badge-sm shrink-0">{index + 1}</span>
                      <span className="text-sm font-medium truncate">{location.label}</span>
                    </button>
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

        {/* Copy URL button */}
        {locations.length > 0 && onCopyUrl && (
          <button type="button" className="btn btn-outline btn-sm mt-4 w-full" onClick={onCopyUrl}>
            {isCopied ? 'コピーしました!' : 'URLをコピー'}
          </button>
        )}
      </div>
    </div>
  )
}

export default ResultCard
