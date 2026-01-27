import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { MeetingPointResult } from '@/types'
import ResultCard from '../ResultCard'

const MOCK_RESULT: MeetingPointResult = {
  centroid: { lat: 35.1838, lng: 137.3531 },
  geometricMedian: { lat: 35.0, lng: 137.0 },
  locations: [
    { name: '東京', latlng: { lat: 35.6762, lng: 139.6503 } },
    { name: '大阪', latlng: { lat: 34.6937, lng: 135.5023 } },
    { name: '名古屋', latlng: { lat: 35.1815, lng: 136.9066 } },
  ],
}

describe('ResultCard', () => {
  it('should render the component', () => {
    render(<ResultCard result={MOCK_RESULT} />)
    expect(screen.getByTestId('result-card')).toBeInTheDocument()
  })

  it('should display centroid coordinates', () => {
    render(<ResultCard result={MOCK_RESULT} />)
    expect(screen.getByText('重心 (Centroid)')).toBeInTheDocument()
    expect(screen.getByText('35.183800, 137.353100')).toBeInTheDocument()
  })

  it('should display geometric median coordinates', () => {
    render(<ResultCard result={MOCK_RESULT} />)
    expect(screen.getByText('幾何中央値 (Geometric Median)')).toBeInTheDocument()
    expect(screen.getByText('35.000000, 137.000000')).toBeInTheDocument()
  })

  it('should display all location names in the distance table', () => {
    render(<ResultCard result={MOCK_RESULT} />)
    expect(screen.getByText('東京')).toBeInTheDocument()
    expect(screen.getByText('大阪')).toBeInTheDocument()
    expect(screen.getByText('名古屋')).toBeInTheDocument()
  })

  it('should display distance values in km', () => {
    render(<ResultCard result={MOCK_RESULT} />)
    // Each location should have distance entries (table cells with km values)
    const cells = screen.getAllByText(/km/)
    // At least 2 totals + distances per location
    expect(cells.length).toBeGreaterThanOrEqual(2)
  })

  it('should display the distance table headers', () => {
    render(<ResultCard result={MOCK_RESULT} />)
    expect(screen.getByText('地点')).toBeInTheDocument()
    expect(screen.getByText('→ 重心')).toBeInTheDocument()
    expect(screen.getByText('→ 幾何中央値')).toBeInTheDocument()
  })

  it('should display total distance row', () => {
    render(<ResultCard result={MOCK_RESULT} />)
    expect(screen.getByText('合計')).toBeInTheDocument()
  })

  it('should format small distances in meters', () => {
    const closeResult: MeetingPointResult = {
      centroid: { lat: 35.6762, lng: 139.6503 },
      geometricMedian: { lat: 35.6762, lng: 139.6503 },
      locations: [{ name: '地点A', latlng: { lat: 35.6762, lng: 139.6503 } }],
    }
    render(<ResultCard result={closeResult} />)
    // Distance should be 0 m when point coincides with centroid/median
    expect(screen.getAllByText('0 m').length).toBeGreaterThanOrEqual(1)
  })
})
