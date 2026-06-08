import { fireEvent, render, screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type {
  KMedoidResult,
  Location,
  MeetingPointResult,
  NearbyStation,
  StationWithCoords,
} from '@/types'
import ResultCard from '../ResultCard'

const LOCATIONS: Location[] = [
  { id: 'tokyo', label: '東京', latlng: { lat: 35.6762, lng: 139.6503 } },
  { id: 'osaka', label: '大阪', latlng: { lat: 34.6937, lng: 135.5023 } },
  { id: 'nagoya', label: '名古屋', latlng: { lat: 35.1815, lng: 136.9066 } },
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
      expect(screen.getByText('出発地を追加すると、ここに一覧が表示されます')).toBeInTheDocument()
    })

    it('should show location count in heading', () => {
      render(<ResultCard locations={[]} result={null} />)
      expect(screen.getByText('登録済み出発地（0）')).toBeInTheDocument()
    })
  })

  describe('with locations but no result (< 2 locations)', () => {
    it('should show location count heading', () => {
      render(<ResultCard locations={[LOCATIONS[0]]} result={null} />)
      expect(screen.getByText('登録済み出発地（1）')).toBeInTheDocument()
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

  describe('inline descriptions', () => {
    it('should show centroid description with Wikipedia links on 算術平均 and 重心', () => {
      render(<ResultCard locations={LOCATIONS} result={MOCK_RESULT} />)
      expect(screen.getByText(/全座標の/)).toBeInTheDocument()

      const meanLink = screen.getByRole('link', { name: '算術平均' })
      expect(meanLink).toHaveAttribute('href', expect.stringContaining('ja.wikipedia.org'))
      expect(meanLink).toHaveAttribute('target', '_blank')
      expect(meanLink).toHaveAttribute('rel', expect.stringContaining('noopener'))

      const centroidLink = screen.getByRole('link', { name: '重心' })
      expect(centroidLink).toHaveAttribute('href', expect.stringContaining('ja.wikipedia.org'))
      expect(centroidLink).toHaveAttribute('target', '_blank')
      expect(centroidLink).toHaveAttribute('rel', expect.stringContaining('noopener'))
    })

    it('should show geometric median description with Wikipedia links on 幾何中央値 (en) and フェルマー点 (ja)', () => {
      render(<ResultCard locations={LOCATIONS} result={MOCK_RESULT} />)
      expect(screen.getByText(/各点からの直線距離の和が最小となる地点/)).toBeInTheDocument()
      expect(screen.getByText(/三角形の場合は/)).toBeInTheDocument()

      // General n-point name → English Wikipedia
      const geometricMedianLink = screen.getByRole('link', { name: /Geometric median/ })
      expect(geometricMedianLink).toHaveAttribute(
        'href',
        expect.stringContaining('en.wikipedia.org/wiki/Geometric_median')
      )
      expect(geometricMedianLink).toHaveAttribute('target', '_blank')
      expect(geometricMedianLink).toHaveAttribute('rel', expect.stringContaining('noopener'))

      // Triangle special case → Japanese Wikipedia
      const fermatLink = screen.getByRole('link', { name: 'フェルマー点' })
      expect(fermatLink).toHaveAttribute('href', expect.stringContaining('ja.wikipedia.org'))
      expect(fermatLink).toHaveAttribute('target', '_blank')
      expect(fermatLink).toHaveAttribute('rel', expect.stringContaining('noopener'))
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
        { id: 'a', label: '地点A', latlng: { lat: 35.6762, lng: 139.6503 } },
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

    it('should keep up to 3 distinct stations even when many raw rows share a name', () => {
      // Regression: when a reference point coincides with a multi-line station,
      // the first many raw rows all share the same name. The display must still
      // surface up to 3 distinct stations, not collapse to 1.
      const SHINJUKU_HEAVY: NearbyStation[] = [
        ...Array.from({ length: 8 }, (_, i) => ({
          id: 100 + i,
          name: '新宿',
          line_name: `路線${i}`,
          operator: 'op',
          lat: 35.6896,
          lng: 139.7006,
          distance_meters: i * 10,
        })),
        {
          id: 200,
          name: '代々木',
          line_name: 'JR山手線',
          operator: 'JR東日本',
          lat: 35.683,
          lng: 139.702,
          distance_meters: 700,
        },
        {
          id: 201,
          name: '南新宿',
          line_name: '小田急小田原線',
          operator: '小田急',
          lat: 35.685,
          lng: 139.699,
          distance_meters: 900,
        },
      ]
      render(
        <ResultCard
          locations={LOCATIONS}
          result={MOCK_RESULT}
          centroidNearbyStations={[]}
          medianNearbyStations={SHINJUKU_HEAVY}
        />
      )

      const medianSection = screen.getByTestId('nearby-stations-median')
      const items = within(medianSection).getAllByRole('listitem')
      expect(items).toHaveLength(3)
      expect(within(medianSection).getByText('新宿')).toBeInTheDocument()
      expect(within(medianSection).getByText('代々木')).toBeInTheDocument()
      expect(within(medianSection).getByText('南新宿')).toBeInTheDocument()
    })

    it('should display C1/C2/C3 badges for the centroid nearby list', () => {
      render(
        <ResultCard
          locations={LOCATIONS}
          result={MOCK_RESULT}
          centroidNearbyStations={NEARBY_CENTROID}
          medianNearbyStations={[]}
        />
      )

      const centroidSection = screen.getByTestId('nearby-stations-centroid')
      expect(within(centroidSection).getByText('C1')).toBeInTheDocument()
      expect(within(centroidSection).getByText('C2')).toBeInTheDocument()
      expect(within(centroidSection).getByText('C3')).toBeInTheDocument()
    })

    it('should display M1/M2/M3 badges for the median nearby list', () => {
      render(
        <ResultCard
          locations={LOCATIONS}
          result={MOCK_RESULT}
          centroidNearbyStations={[]}
          medianNearbyStations={NEARBY_CENTROID}
        />
      )

      const medianSection = screen.getByTestId('nearby-stations-median')
      expect(within(medianSection).getByText('M1')).toBeInTheDocument()
      expect(within(medianSection).getByText('M2')).toBeInTheDocument()
      expect(within(medianSection).getByText('M3')).toBeInTheDocument()
    })
  })

  describe('suggested station (K-medoid)', () => {
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
        name: '田町',
        line_name: 'JR山手線',
        operator: 'JR東日本',
        lat: 35.6457,
        lng: 139.7475,
        distance_meters: 600,
      },
    ]

    const SHINAGAWA_STATION: StationWithCoords = {
      id: 7,
      name: '品川',
      line_name: 'JR山手線',
      operator: 'JR東日本',
      lat: 35.6284,
      lng: 139.7387,
    }

    const OUTSIDE_STATION: StationWithCoords = {
      id: 999,
      name: '横浜',
      line_name: 'JR東海道線',
      operator: 'JR東日本',
      lat: 35.4659,
      lng: 139.6224,
    }

    it('should not render an inline おすすめ badge in the median list (★ map marker is the sole indicator)', () => {
      const suggestion: KMedoidResult = { station: SHINAGAWA_STATION, totalDistance: 12.3 }
      render(
        <ResultCard
          locations={LOCATIONS}
          result={MOCK_RESULT}
          medianNearbyStations={NEARBY_MEDIAN}
          suggestedStation={suggestion}
        />
      )

      const medianSection = screen.getByTestId('nearby-stations-median')
      expect(within(medianSection).queryByTestId('suggested-badge')).not.toBeInTheDocument()
    })

    it('should not render a standalone suggestion box when the suggested station is in the list', () => {
      const suggestion: KMedoidResult = { station: SHINAGAWA_STATION, totalDistance: 12.3 }
      render(
        <ResultCard
          locations={LOCATIONS}
          result={MOCK_RESULT}
          medianNearbyStations={NEARBY_MEDIAN}
          suggestedStation={suggestion}
        />
      )

      expect(screen.queryByTestId('suggested-station-box')).not.toBeInTheDocument()
    })

    it('should render a standalone suggestion box when the suggested station is not in the displayed list', () => {
      const suggestion: KMedoidResult = { station: OUTSIDE_STATION, totalDistance: 45.6 }
      render(
        <ResultCard
          locations={LOCATIONS}
          result={MOCK_RESULT}
          medianNearbyStations={NEARBY_MEDIAN}
          suggestedStation={suggestion}
        />
      )

      const box = screen.getByTestId('suggested-station-box')
      expect(box).toBeInTheDocument()
      expect(within(box).getByText('横浜')).toBeInTheDocument()
      expect(within(box).getByText('JR東海道線')).toBeInTheDocument()
      // No suggested badge inside the regular nearby list
      const medianSection = screen.getByTestId('nearby-stations-median')
      expect(within(medianSection).queryByTestId('suggested-badge')).not.toBeInTheDocument()
    })

    it('should not render anything K-medoid-related when suggestedStation is null', () => {
      render(
        <ResultCard
          locations={LOCATIONS}
          result={MOCK_RESULT}
          medianNearbyStations={NEARBY_MEDIAN}
          suggestedStation={null}
        />
      )

      expect(screen.queryByTestId('suggested-badge')).not.toBeInTheDocument()
      expect(screen.queryByTestId('suggested-station-box')).not.toBeInTheDocument()
    })

    // Regression: previously isSuggestionInList compared against the raw 20-row pool, so a
    // winner that was in the pool but outside the grouped top-3 display erroneously hid
    // SuggestedStationBox (review feedback on PR #48).
    it('should render SuggestedStationBox when the winner is in the raw rows but outside the displayed top-N', () => {
      // 4 distinct names; only the first 3 are displayed after grouping
      const RAW_FOUR_NAMES: NearbyStation[] = [
        {
          id: 1,
          name: '駅A',
          line_name: 'A線',
          operator: 'X',
          lat: 35.0,
          lng: 139.0,
          distance_meters: 100,
        },
        {
          id: 2,
          name: '駅B',
          line_name: 'B線',
          operator: 'X',
          lat: 35.1,
          lng: 139.1,
          distance_meters: 200,
        },
        {
          id: 3,
          name: '駅C',
          line_name: 'C線',
          operator: 'X',
          lat: 35.2,
          lng: 139.2,
          distance_meters: 300,
        },
        // 4th distinct name — outside the top-3 displayed list
        {
          id: 4,
          name: '代田橋',
          line_name: '京王線',
          operator: '京王',
          lat: 35.67,
          lng: 139.66,
          distance_meters: 500,
        },
      ]
      const DAITABASHI_STATION: StationWithCoords = {
        id: 4,
        name: '代田橋',
        line_name: '京王線',
        operator: '京王',
        lat: 35.67,
        lng: 139.66,
      }
      const suggestion: KMedoidResult = { station: DAITABASHI_STATION, totalDistance: 10.5 }
      render(
        <ResultCard
          locations={LOCATIONS}
          result={MOCK_RESULT}
          medianNearbyStations={RAW_FOUR_NAMES}
          suggestedStation={suggestion}
        />
      )

      const box = screen.getByTestId('suggested-station-box')
      expect(box).toBeInTheDocument()
      expect(within(box).getByText('代田橋')).toBeInTheDocument()
    })

    it('should aggregate all line names for a multi-line winner in SuggestedStationBox', () => {
      // 新宿 appears 3 times (different lines). Place it outside top-3 by giving the
      // first 3 unique stations smaller distances.
      const MULTI_LINE_WINNER_OUTSIDE: NearbyStation[] = [
        {
          id: 1,
          name: '駅A',
          line_name: 'A線',
          operator: 'X',
          lat: 35.0,
          lng: 139.0,
          distance_meters: 100,
        },
        {
          id: 2,
          name: '駅B',
          line_name: 'B線',
          operator: 'X',
          lat: 35.1,
          lng: 139.1,
          distance_meters: 200,
        },
        {
          id: 3,
          name: '駅C',
          line_name: 'C線',
          operator: 'X',
          lat: 35.2,
          lng: 139.2,
          distance_meters: 300,
        },
        {
          id: 4,
          name: '新宿',
          line_name: 'JR山手線',
          operator: 'JR',
          lat: 35.6896,
          lng: 139.7006,
          distance_meters: 500,
        },
        {
          id: 5,
          name: '新宿',
          line_name: 'JR中央線',
          operator: 'JR',
          lat: 35.6898,
          lng: 139.7004,
          distance_meters: 510,
        },
        {
          id: 6,
          name: '新宿',
          line_name: '小田急小田原線',
          operator: '小田急',
          lat: 35.6892,
          lng: 139.7002,
          distance_meters: 520,
        },
      ]
      const SHINJUKU_WINNER: StationWithCoords = {
        id: 4,
        name: '新宿',
        line_name: 'JR山手線',
        operator: 'JR',
        lat: 35.6896,
        lng: 139.7006,
      }
      const suggestion: KMedoidResult = { station: SHINJUKU_WINNER, totalDistance: 8.2 }
      render(
        <ResultCard
          locations={LOCATIONS}
          result={MOCK_RESULT}
          medianNearbyStations={MULTI_LINE_WINNER_OUTSIDE}
          suggestedStation={suggestion}
        />
      )

      const box = screen.getByTestId('suggested-station-box')
      expect(within(box).getByText(/JR山手線/)).toBeInTheDocument()
      expect(within(box).getByText(/JR中央線/)).toBeInTheDocument()
      expect(within(box).getByText(/小田急/)).toBeInTheDocument()
    })
  })

  describe('copy URL button', () => {
    it('should not show copy button when onCopyUrl is not provided', () => {
      render(<ResultCard locations={LOCATIONS} result={MOCK_RESULT} />)
      expect(screen.queryByText('URLをコピー')).not.toBeInTheDocument()
    })

    it('should not show copy button when locations are empty', () => {
      const handleCopy = vi.fn()
      render(<ResultCard locations={[]} result={null} onCopyUrl={handleCopy} />)
      expect(screen.queryByText('URLをコピー')).not.toBeInTheDocument()
    })

    it('should show copy button when locations exist and onCopyUrl is provided', () => {
      const handleCopy = vi.fn()
      render(<ResultCard locations={LOCATIONS} result={MOCK_RESULT} onCopyUrl={handleCopy} />)
      expect(screen.getByText('URLをコピー')).toBeInTheDocument()
    })

    it('should call onCopyUrl when button is clicked', () => {
      const handleCopy = vi.fn()
      render(<ResultCard locations={LOCATIONS} result={MOCK_RESULT} onCopyUrl={handleCopy} />)
      fireEvent.click(screen.getByText('URLをコピー'))
      expect(handleCopy).toHaveBeenCalledTimes(1)
    })

    it('should show copied message when isCopied is true', () => {
      const handleCopy = vi.fn()
      render(
        <ResultCard
          locations={LOCATIONS}
          result={MOCK_RESULT}
          onCopyUrl={handleCopy}
          isCopied={true}
        />
      )
      expect(screen.getByText('コピーしました!')).toBeInTheDocument()
      expect(screen.queryByText('URLをコピー')).not.toBeInTheDocument()
    })

    it('should show copy button with single location (no result)', () => {
      const handleCopy = vi.fn()
      render(<ResultCard locations={[LOCATIONS[0]]} result={null} onCopyUrl={handleCopy} />)
      expect(screen.getByText('URLをコピー')).toBeInTheDocument()
    })
  })

  describe('onFocusMap callback', () => {
    const NEARBY_FOR_FOCUS: NearbyStation[] = [
      {
        id: 1,
        name: '渋谷',
        line_name: 'JR山手線',
        operator: 'JR東日本',
        lat: 35.658,
        lng: 139.7016,
        distance_meters: 100,
      },
      {
        id: 2,
        name: '代々木',
        line_name: 'JR山手線',
        operator: 'JR東日本',
        lat: 35.683,
        lng: 139.702,
        distance_meters: 300,
      },
    ]

    it('should call onFocusMap with the centroid latlng when C badge is clicked', () => {
      const handleFocus = vi.fn()
      render(<ResultCard locations={LOCATIONS} result={MOCK_RESULT} onFocusMap={handleFocus} />)
      fireEvent.click(screen.getByLabelText('地図を中間地点に移動'))
      expect(handleFocus).toHaveBeenCalledTimes(1)
      expect(handleFocus).toHaveBeenCalledWith(MOCK_RESULT.centroid)
    })

    it('should call onFocusMap with the median latlng when M badge is clicked', () => {
      const handleFocus = vi.fn()
      render(<ResultCard locations={LOCATIONS} result={MOCK_RESULT} onFocusMap={handleFocus} />)
      fireEvent.click(screen.getByLabelText('地図を最適地点に移動'))
      expect(handleFocus).toHaveBeenCalledTimes(1)
      expect(handleFocus).toHaveBeenCalledWith(MOCK_RESULT.geometricMedian)
    })

    it('should call onFocusMap with the station latlng when C1 badge is clicked', () => {
      const handleFocus = vi.fn()
      render(
        <ResultCard
          locations={LOCATIONS}
          result={MOCK_RESULT}
          centroidNearbyStations={NEARBY_FOR_FOCUS}
          onFocusMap={handleFocus}
        />
      )
      const centroidSection = screen.getByTestId('nearby-stations-centroid')
      fireEvent.click(within(centroidSection).getByLabelText('地図を渋谷に移動'))
      expect(handleFocus).toHaveBeenCalledTimes(1)
      expect(handleFocus).toHaveBeenCalledWith({ lat: 35.658, lng: 139.7016 })
    })

    it('should call onFocusMap with the station latlng when M2 badge is clicked', () => {
      const handleFocus = vi.fn()
      render(
        <ResultCard
          locations={LOCATIONS}
          result={MOCK_RESULT}
          medianNearbyStations={NEARBY_FOR_FOCUS}
          onFocusMap={handleFocus}
        />
      )
      const medianSection = screen.getByTestId('nearby-stations-median')
      fireEvent.click(within(medianSection).getByLabelText('地図を代々木に移動'))
      expect(handleFocus).toHaveBeenCalledTimes(1)
      expect(handleFocus).toHaveBeenCalledWith({ lat: 35.683, lng: 139.702 })
    })

    it('should not crash when badges are clicked without onFocusMap', () => {
      render(
        <ResultCard
          locations={LOCATIONS}
          result={MOCK_RESULT}
          centroidNearbyStations={NEARBY_FOR_FOCUS}
        />
      )
      fireEvent.click(screen.getByLabelText('地図を中間地点に移動'))
      fireEvent.click(screen.getByLabelText('地図を渋谷に移動'))
      // No assertion — just verifying no exception is thrown
    })

    it('should call onFocusMap with the location latlng when a location row is clicked', () => {
      const handleFocus = vi.fn()
      render(<ResultCard locations={LOCATIONS} result={MOCK_RESULT} onFocusMap={handleFocus} />)
      fireEvent.click(screen.getByLabelText('地図を東京に移動'))
      expect(handleFocus).toHaveBeenCalledTimes(1)
      expect(handleFocus).toHaveBeenCalledWith(LOCATIONS[0].latlng)
    })

    it('should not trigger onFocusMap when the location delete button is clicked', () => {
      const handleFocus = vi.fn()
      const handleRemove = vi.fn()
      render(
        <ResultCard
          locations={LOCATIONS}
          result={MOCK_RESULT}
          onFocusMap={handleFocus}
          onRemove={handleRemove}
        />
      )
      fireEvent.click(screen.getByLabelText('東京を削除'))
      expect(handleRemove).toHaveBeenCalledWith(0)
      expect(handleFocus).not.toHaveBeenCalled()
    })
  })
})
