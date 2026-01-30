import { haversineDistance } from '@/lib/haversine'
import type { MeetingPointResult } from '@/types'

interface ResultCardProps {
  /** Calculation result to display */
  result: MeetingPointResult
}

/** Format distance in km for display */
function formatDistance(km: number): string {
  if (km < 1) {
    return `${Math.round(km * 1000)} m`
  }
  return `${km.toFixed(1)} km`
}

function ResultCard({ result }: ResultCardProps) {
  const { centroid, geometricMedian, locations } = result

  const centroidTotalDist = locations.reduce(
    (sum, loc) => sum + haversineDistance(centroid, loc.latlng),
    0
  )
  const medianTotalDist = locations.reduce(
    (sum, loc) => sum + haversineDistance(geometricMedian, loc.latlng),
    0
  )

  return (
    <div data-testid="result-card" className="card bg-base-100 shadow-md">
      <div className="card-body">
        <h2 className="card-title text-lg">計算結果</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Centroid */}
          <div className="bg-amber-50 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="badge badge-warning">C</span>
              <h3 className="font-semibold">重心 (Centroid)</h3>
            </div>
            <p className="text-sm font-mono">
              {centroid.lat.toFixed(6)}, {centroid.lng.toFixed(6)}
            </p>
            <p className="text-sm mt-1">
              全員の合計距離: <strong>{formatDistance(centroidTotalDist)}</strong>
            </p>
          </div>

          {/* Geometric Median */}
          <div className="bg-red-50 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="badge badge-error">M</span>
              <h3 className="font-semibold">幾何中央値 (Geometric Median)</h3>
            </div>
            <p className="text-sm font-mono">
              {geometricMedian.lat.toFixed(6)}, {geometricMedian.lng.toFixed(6)}
            </p>
            <p className="text-sm mt-1">
              全員の合計距離: <strong>{formatDistance(medianTotalDist)}</strong>
            </p>
          </div>
        </div>

        {/* Per-location distances */}
        <div className="mt-4">
          <h3 className="font-semibold mb-2">各地点からの距離</h3>
          <div className="overflow-x-auto">
            <table className="table table-sm">
              <thead>
                <tr>
                  <th>地点</th>
                  <th>→ 重心</th>
                  <th>→ 幾何中央値</th>
                </tr>
              </thead>
              <tbody>
                {locations.map((location, index) => {
                  const distToCentroid = haversineDistance(centroid, location.latlng)
                  const distToMedian = haversineDistance(geometricMedian, location.latlng)
                  return (
                    <tr key={`${location.name}-${index}`}>
                      <td>
                        <span className="badge badge-primary badge-sm mr-1">{index + 1}</span>
                        {location.name}
                      </td>
                      <td>{formatDistance(distToCentroid)}</td>
                      <td>{formatDistance(distToMedian)}</td>
                    </tr>
                  )
                })}
              </tbody>
              <tfoot>
                <tr className="font-semibold">
                  <td>合計</td>
                  <td>{formatDistance(centroidTotalDist)}</td>
                  <td>{formatDistance(medianTotalDist)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ResultCard
