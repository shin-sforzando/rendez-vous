import { fireEvent, render, screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { Location, MeetingPointResult, NearbyStation } from '@/types'
import ResultCard from '../ResultCard'

const LOCATIONS: Location[] = [
  { label: '東京', latlng: { lat: 35.6762, lng: 139.6503 } },
  { label: '大阪', latlng: { lat: 34.6937, lng: 135.5023 } },
  { label: '名古屋', latlng: { lat: 35.1815, lng: 136.9066 } },
]

const MOCK_RESULT: MeetingPointResult = {
  centroid: { lat: 35.1838, lng: 137.3531 },
  geometricMedian: { lat: 35.0, lng: 137.0 },
  locations: LOCATIONS,
}

describe('ResultCard', () => {
  describe('empty state', () => {
    it('should render the component with no locations', () => {
      render(<ResultCard locations={[]} result={null} />)
      expect(screen.getByTestId('result-card')).toBeInTheDocument()
    })

    it('should show empty state message when no locations', () => {
      render(<ResultCard locations={[]} result={null} />)
      expect(screen.getByText('地点を追加すると、ここに一覧が表示されます')).toBeInTheDocument()
    })

    it('should show location count in heading', () => {
      render(<ResultCard locations={[]} result={null} />)
      expect(screen.getByText('登録済み地点（0）')).toBeInTheDocument()
    })
  })

  describe('with locations but no result (< 2 locations)', () => {
    it('should show location count heading', () => {
      render(<ResultCard locations={[LOCATIONS[0]]} result={null} />)
      expect(screen.getByText('登録済み地点（1）')).toBeInTheDocument()
    })

    it('should display the location name', () => {
      render(<ResultCard locations={[LOCATIONS[0]]} result={null} />)
      expect(screen.getByText('東京')).toBeInTheDocument()
    })

    it('should not show distance info without result', () => {
      render(<ResultCard locations={[LOCATIONS[0]]} result={null} />)
      expect(screen.queryByText(/→ C:/)).not.toBeInTheDocument()
    })
  })

  describe('with result (>= 2 locations)', () => {
    it('should show calculation result heading', () => {
      render(<ResultCard locations={LOCATIONS} result={MOCK_RESULT} />)
      expect(screen.getByText('計算結果')).toBeInTheDocument()
    })

    it('should display centroid card with label and coordinates', () => {
      render(<ResultCard locations={LOCATIONS} result={MOCK_RESULT} />)
      expect(screen.getByText('中間地点')).toBeInTheDocument()
      expect(screen.getByText('35.183800, 137.353100')).toBeInTheDocument()
    })

    it('should display geometric median card with label and coordinates', () => {
      render(<ResultCard locations={LOCATIONS} result={MOCK_RESULT} />)
      expect(screen.getByText('最適地点')).toBeInTheDocument()
      expect(screen.getByText('35.000000, 137.000000')).toBeInTheDocument()
    })

    it('should display all location names', () => {
      render(<ResultCard locations={LOCATIONS} result={MOCK_RESULT} />)
      expect(screen.getByText('東京')).toBeInTheDocument()
      expect(screen.getByText('大阪')).toBeInTheDocument()
      expect(screen.getByText('名古屋')).toBeInTheDocument()
    })

    it('should display distance values in km', () => {
      render(<ResultCard locations={LOCATIONS} result={MOCK_RESULT} />)
      const kmTexts = screen.getAllByText(/km/)
      // 2 total distances (centroid + median cards) + distances per location
      expect(kmTexts.length).toBeGreaterThanOrEqual(2)
    })

    it('should show per-location distance to C and M', () => {
      render(<ResultCard locations={LOCATIONS} result={MOCK_RESULT} />)
      const cDistances = screen.getAllByText(/→ C:/)
      const mDistances = screen.getAllByText(/→ M:/)
      expect(cDistances).toHaveLength(3)
      expect(mDistances).toHaveLength(3)
    })

    it('should display numbered badges for each location', () => {
      render(<ResultCard locations={LOCATIONS} result={MOCK_RESULT} />)
      expect(screen.getByText('1')).toBeInTheDocument()
      expect(screen.getByText('2')).toBeInTheDocument()
      expect(screen.getByText('3')).toBeInTheDocument()
    })

    it('should display C and M badges in summary cards', () => {
      render(<ResultCard locations={LOCATIONS} result={MOCK_RESULT} />)
      expect(screen.getByText('C')).toBeInTheDocument()
      expect(screen.getByText('M')).toBeInTheDocument()
    })
  })

  describe('info tips', () => {
    it('should show info tip for centroid', () => {
      render(<ResultCard locations={LOCATIONS} result={MOCK_RESULT} />)
      expect(
        screen.getByLabelText('すべての座標の平均値。重心（Centroid）とも呼ばれる。')
      ).toBeInTheDocument()
    })

    it('should show info tip for geometric median', () => {
      render(<ResultCard locations={LOCATIONS} result={MOCK_RESULT} />)
      expect(
        screen.getByLabelText(
          '各点からの直線距離の和が最小となる地点。幾何中央値、ユークリッド最小和点、トリチェリ点とも呼ばれる。'
        )
      ).toBeInTheDocument()
    })
  })

  describe('removing locations', () => {
    it('should call onRemove when delete button is clicked', () => {
      const handleRemove = vi.fn()
      render(<ResultCard locations={LOCATIONS} result={MOCK_RESULT} onRemove={handleRemove} />)

      fireEvent.click(screen.getByLabelText('東京を削除'))
      expect(handleRemove).toHaveBeenCalledWith(0)
    })

    it('should not show delete buttons when onRemove is not provided', () => {
      render(<ResultCard locations={LOCATIONS} result={MOCK_RESULT} />)
      expect(screen.queryByLabelText('東京を削除')).not.toBeInTheDocument()
    })
  })

  describe('distance formatting', () => {
    it('should format small distances in meters', () => {
      const closeLocations: Location[] = [
        { label: '地点A', latlng: { lat: 35.6762, lng: 139.6503 } },
      ]
      const closeResult: MeetingPointResult = {
        centroid: { lat: 35.6762, lng: 139.6503 },
        geometricMedian: { lat: 35.6762, lng: 139.6503 },
        locations: closeLocations,
      }
      render(<ResultCard locations={closeLocations} result={closeResult} />)
      expect(screen.getAllByText('0 m').length).toBeGreaterThanOrEqual(1)
    })
  })

  describe('nearby stations', () => {
    // Multi-line test data: 東京 has 3 lines, 大手町 has 2 lines
    const NEARBY_CENTROID: NearbyStation[] = [
      {
        id: 1,
        name: '東京',
        line_name: 'JR山手線',
        operator: 'JR東日本',
        lat: 35.6812,
        lng: 139.7671,
        distance_meters: 0,
      },
      {
        id: 2,
        name: '東京',
        line_name: '東海道線',
        operator: 'JR東日本',
        lat: 35.6812,
        lng: 139.7671,
        distance_meters: 41,
      },
      {
        id: 3,
        name: '東京',
        line_name: '丸ノ内線',
        operator: '東京地下鉄',
        lat: 35.6819,
        lng: 139.7648,
        distance_meters: 224,
      },
      {
        id: 4,
        name: '大手町',
        line_name: '東西線',
        operator: '東京地下鉄',
        lat: 35.6847,
        lng: 139.7659,
        distance_meters: 406,
      },
      {
        id: 5,
        name: '大手町',
        line_name: '三田線',
        operator: '東京都',
        lat: 35.6841,
        lng: 139.7626,
        distance_meters: 516,
      },
      {
        id: 6,
        name: '二重橋前',
        line_name: null,
        operator: '東京地下鉄',
        lat: 35.6805,
        lng: 139.7618,
        distance_meters: 488,
      },
    ]

    const NEARBY_MEDIAN: NearbyStation[] = [
      {
        id: 7,
        name: '品川',
        line_name: 'JR山手線',
        operator: 'JR東日本',
        lat: 35.6284,
        lng: 139.7387,
        distance_meters: 400,
      },
      {
        id: 8,
        name: '品川',
        line_name: '京急本線',
        operator: '京急',
        lat: 35.6284,
        lng: 139.7387,
        distance_meters: 420,
      },
    ]

    it('should maintain existing behavior when nearby station props are not provided', () => {
      render(<ResultCard locations={LOCATIONS} result={MOCK_RESULT} />)
      expect(screen.queryByTestId('nearby-stations-centroid')).not.toBeInTheDocument()
      expect(screen.queryByTestId('nearby-stations-median')).not.toBeInTheDocument()
    })

    it('should not render nearby stations when result is null', () => {
      render(
        <ResultCard
          locations={[]}
          result={null}
          centroidNearbyStations={NEARBY_CENTROID}
          medianNearbyStations={NEARBY_MEDIAN}
        />
      )
      expect(screen.queryByTestId('nearby-stations-centroid')).not.toBeInTheDocument()
      expect(screen.queryByTestId('nearby-stations-median')).not.toBeInTheDocument()
    })

    it('should show loading state for nearby stations', () => {
      render(
        <ResultCard
          locations={LOCATIONS}
          result={MOCK_RESULT}
          centroidNearbyStations={[]}
          medianNearbyStations={[]}
          isLoadingNearbyStations={true}
        />
      )

      const centroidSection = screen.getByTestId('nearby-stations-centroid')
      expect(within(centroidSection).getByText('最寄り駅を検索中...')).toBeInTheDocument()

      const medianSection = screen.getByTestId('nearby-stations-median')
      expect(within(medianSection).getByText('最寄り駅を検索中...')).toBeInTheDocument()
    })

    it('should group stations by name for centroid', () => {
      render(
        <ResultCard
          locations={LOCATIONS}
          result={MOCK_RESULT}
          centroidNearbyStations={NEARBY_CENTROID}
          medianNearbyStations={[]}
        />
      )

      const centroidSection = screen.getByTestId('nearby-stations-centroid')
      // 6 raw rows grouped into 3 unique stations
      const items = within(centroidSection).getAllByRole('listitem')
      expect(items).toHaveLength(3)
      expect(within(centroidSection).getByText('東京')).toBeInTheDocument()
      expect(within(centroidSection).getByText('大手町')).toBeInTheDocument()
      expect(within(centroidSection).getByText('二重橋前')).toBeInTheDocument()
    })

    it('should group stations by name for geometric median', () => {
      render(
        <ResultCard
          locations={LOCATIONS}
          result={MOCK_RESULT}
          centroidNearbyStations={[]}
          medianNearbyStations={NEARBY_MEDIAN}
        />
      )

      const medianSection = screen.getByTestId('nearby-stations-median')
      // 2 raw rows grouped into 1 unique station
      const items = within(medianSection).getAllByRole('listitem')
      expect(items).toHaveLength(1)
      expect(within(medianSection).getByText('品川')).toBeInTheDocument()
    })

    it('should display line names joined with slash separator', () => {
      render(
        <ResultCard
          locations={LOCATIONS}
          result={MOCK_RESULT}
          centroidNearbyStations={NEARBY_CENTROID}
          medianNearbyStations={[]}
        />
      )

      const centroidSection = screen.getByTestId('nearby-stations-centroid')
      expect(
        within(centroidSection).getByText('JR山手線 / 東海道線 / 丸ノ内線')
      ).toBeInTheDocument()
      expect(within(centroidSection).getByText('東西線 / 三田線')).toBeInTheDocument()
    })

    it('should not display line names when all are null', () => {
      render(
        <ResultCard
          locations={LOCATIONS}
          result={MOCK_RESULT}
          centroidNearbyStations={NEARBY_CENTROID}
          medianNearbyStations={[]}
        />
      )

      // Station "二重橋前" has line_name: null
      const centroidSection = screen.getByTestId('nearby-stations-centroid')
      const items = within(centroidSection).getAllByRole('listitem')
      const nijubashiItem = items[2]
      // Should have name and distance but no line text
      expect(nijubashiItem).toHaveTextContent('二重橋前')
      expect(nijubashiItem).not.toHaveTextContent('/')
    })

    it('should display distance using the closest line for each station', () => {
      render(
        <ResultCard
          locations={LOCATIONS}
          result={MOCK_RESULT}
          centroidNearbyStations={NEARBY_CENTROID}
          medianNearbyStations={[]}
        />
      )

      const centroidSection = screen.getByTestId('nearby-stations-centroid')
      // 東京: min distance = 0m → "0 m"
      expect(within(centroidSection).getByText('0 m')).toBeInTheDocument()
      // 大手町: min distance = 406m → "406 m"
      expect(within(centroidSection).getByText('406 m')).toBeInTheDocument()
      // 二重橋前: min distance = 488m → "488 m"
      expect(within(centroidSection).getByText('488 m')).toBeInTheDocument()
    })

    it('should display numbered badges for each grouped station', () => {
      render(
        <ResultCard
          locations={LOCATIONS}
          result={MOCK_RESULT}
          centroidNearbyStations={NEARBY_CENTROID}
          medianNearbyStations={[]}
        />
      )

      const centroidSection = screen.getByTestId('nearby-stations-centroid')
      const badges = within(centroidSection).getAllByText(/^[123]$/)
      expect(badges).toHaveLength(3)
    })
  })
})
