import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { Location, MeetingPointResult } from '@/types'
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
      expect(screen.getByLabelText('全員の座標の平均')).toBeInTheDocument()
    })

    it('should show info tip for geometric median', () => {
      render(<ResultCard locations={LOCATIONS} result={MOCK_RESULT} />)
      expect(screen.getByLabelText('全員の移動距離の合計が最小となる地点')).toBeInTheDocument()
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
})
