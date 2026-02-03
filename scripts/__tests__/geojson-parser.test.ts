import { describe, expect, it } from 'vitest'
import { deduplicateStations, extractStations, parseGeoJSON } from '../lib/geojson-parser.ts'

describe('parseGeoJSON', () => {
  it('parses a valid FeatureCollection', () => {
    const input = {
      type: 'FeatureCollection',
      features: [],
    }
    const result = parseGeoJSON(input)
    expect(result.type).toBe('FeatureCollection')
    expect(result.features).toEqual([])
  })

  it('throws for null input', () => {
    expect(() => parseGeoJSON(null)).toThrow('input must be an object')
  })

  it('throws for non-object input', () => {
    expect(() => parseGeoJSON('string')).toThrow('input must be an object')
  })

  it('throws for wrong type field', () => {
    expect(() => parseGeoJSON({ type: 'Feature', features: [] })).toThrow(
      'expected type "FeatureCollection"'
    )
  })

  it('throws when features is not an array', () => {
    expect(() => parseGeoJSON({ type: 'FeatureCollection', features: 'not-array' })).toThrow(
      '"features" must be an array'
    )
  })

  it('throws when features is missing', () => {
    expect(() => parseGeoJSON({ type: 'FeatureCollection' })).toThrow('"features" must be an array')
  })
})

describe('extractStations', () => {
  const makeFeature = (
    geometryType: string,
    coordinates: number[] | number[][],
    properties: Record<string, string | undefined>
  ) => ({
    type: 'Feature' as const,
    geometry: { type: geometryType, coordinates },
    properties,
  })

  it('extracts Point features with station name', () => {
    const geojson = {
      type: 'FeatureCollection' as const,
      features: [
        makeFeature('Point', [139.76788, 35.6811], {
          N02_003: '東海道新幹線',
          N02_004: '東海旅客鉄道',
          N02_005: '東京',
        }),
      ],
    }
    const result = extractStations(geojson)
    expect(result).toHaveLength(1)
    expect(result[0]).toEqual({
      name: '東京',
      line_name: '東海道新幹線',
      operator: '東海旅客鉄道',
      location: 'POINT(139.76788 35.6811)',
    })
  })

  it('extracts LineString features using centroid coordinates', () => {
    // Real data: 渋谷 on 山手線 has a LineString geometry
    const geojson = {
      type: 'FeatureCollection' as const,
      features: [
        makeFeature(
          'LineString',
          [
            [139.70221, 35.65723],
            [139.70201, 35.65746],
            [139.70174, 35.65785],
            [139.70137, 35.6588],
            [139.70129, 35.65907],
          ],
          {
            N02_003: '山手線',
            N02_004: '東日本旅客鉄道',
            N02_005: '渋谷',
          }
        ),
      ],
    }
    const result = extractStations(geojson)
    expect(result).toHaveLength(1)
    expect(result[0].name).toBe('渋谷')
    expect(result[0].line_name).toBe('山手線')
    // Centroid of 5 points
    expect(result[0].location).toMatch(/^POINT\(139\.70\d+ 35\.65\d+\)$/)
  })

  it('skips LineString features without station name', () => {
    const geojson = {
      type: 'FeatureCollection' as const,
      features: [
        makeFeature(
          'LineString',
          [
            [139.76, 35.68],
            [139.77, 35.69],
          ],
          {
            N02_003: 'JR山手線',
            N02_004: 'JR東日本',
          }
        ),
      ],
    }
    const result = extractStations(geojson)
    expect(result).toHaveLength(0)
  })

  it('skips features without station name (N02_005)', () => {
    const geojson = {
      type: 'FeatureCollection' as const,
      features: [
        makeFeature('Point', [139.76788, 35.6811], {
          N02_003: '東海道新幹線',
          N02_004: '東海旅客鉄道',
        }),
      ],
    }
    const result = extractStations(geojson)
    expect(result).toHaveLength(0)
  })

  it('skips features with empty station name', () => {
    const geojson = {
      type: 'FeatureCollection' as const,
      features: [
        makeFeature('Point', [139.76788, 35.6811], {
          N02_003: '東海道新幹線',
          N02_004: '東海旅客鉄道',
          N02_005: '  ',
        }),
      ],
    }
    const result = extractStations(geojson)
    expect(result).toHaveLength(0)
  })

  it('maps coordinates to POINT(lng lat) format', () => {
    // Real data: 大阪 on 大阪環状線
    const geojson = {
      type: 'FeatureCollection' as const,
      features: [
        makeFeature('Point', [135.496, 34.7024], {
          N02_003: '大阪環状線',
          N02_004: '西日本旅客鉄道',
          N02_005: '大阪',
        }),
      ],
    }
    const result = extractStations(geojson)
    expect(result[0].location).toBe('POINT(135.496 34.7024)')
  })

  it('handles null line_name and operator gracefully', () => {
    const geojson = {
      type: 'FeatureCollection' as const,
      features: [
        makeFeature('Point', [139.76788, 35.6811], {
          N02_005: '東京',
        }),
      ],
    }
    const result = extractStations(geojson)
    expect(result[0].line_name).toBeNull()
    expect(result[0].operator).toBeNull()
  })

  it('trims whitespace from station name and line name', () => {
    const geojson = {
      type: 'FeatureCollection' as const,
      features: [
        makeFeature('Point', [139.76788, 35.6811], {
          N02_003: ' 東海道新幹線 ',
          N02_004: ' 東海旅客鉄道 ',
          N02_005: ' 東京 ',
        }),
      ],
    }
    const result = extractStations(geojson)
    expect(result[0].name).toBe('東京')
    expect(result[0].line_name).toBe('東海道新幹線')
    expect(result[0].operator).toBe('東海旅客鉄道')
  })

  it('extracts multiple stations from mixed geometry types', () => {
    const geojson = {
      type: 'FeatureCollection' as const,
      features: [
        // Point with station name -> extracted
        makeFeature('Point', [139.76788, 35.6811], {
          N02_005: '東京',
          N02_003: '東海道新幹線',
          N02_004: '東海旅客鉄道',
        }),
        // LineString with station name -> extracted
        makeFeature(
          'LineString',
          [
            [139.70221, 35.65723],
            [139.70129, 35.65907],
          ],
          {
            N02_005: '渋谷',
            N02_003: '山手線',
            N02_004: '東日本旅客鉄道',
          }
        ),
        // LineString without station name -> skipped
        makeFeature(
          'LineString',
          [
            [139.76807, 35.68296],
            [139.76746, 35.67936],
          ],
          {
            N02_003: '東海道新幹線',
          }
        ),
        // Point without station name -> skipped
        makeFeature('Point', [135.496, 34.7024], {
          N02_003: '大阪環状線',
        }),
      ],
    }
    const result = extractStations(geojson)
    expect(result).toHaveLength(2)
    expect(result[0].name).toBe('東京')
    expect(result[1].name).toBe('渋谷')
  })

  it('skips unsupported geometry types (Polygon)', () => {
    const geojson = {
      type: 'FeatureCollection' as const,
      features: [
        makeFeature(
          'Polygon',
          [
            [
              [139.76, 35.68],
              [139.77, 35.69],
              [139.78, 35.68],
              [139.76, 35.68],
            ],
          ],
          {
            N02_005: '東京',
          }
        ),
      ],
    }
    const result = extractStations(geojson)
    expect(result).toHaveLength(0)
  })
})

describe('deduplicateStations', () => {
  it('removes duplicate stations with same name and line_name', () => {
    const stations = [
      {
        name: '東京',
        line_name: '東海道新幹線',
        operator: '東海旅客鉄道',
        location: 'POINT(139.76788 35.6811)',
      },
      {
        name: '東京',
        line_name: '東海道新幹線',
        operator: '東海旅客鉄道',
        location: 'POINT(139.76788 35.6811)',
      },
    ]
    const result = deduplicateStations(stations)
    expect(result).toHaveLength(1)
  })

  it('preserves stations with same name on different lines', () => {
    const stations = [
      {
        name: '渋谷',
        line_name: '山手線',
        operator: '東日本旅客鉄道',
        location: 'POINT(139.70175 35.65815)',
      },
      {
        name: '渋谷',
        line_name: '東急東横線',
        operator: '東急電鉄',
        location: 'POINT(139.70175 35.65815)',
      },
    ]
    const result = deduplicateStations(stations)
    expect(result).toHaveLength(2)
  })

  it('handles null line_name in deduplication key', () => {
    const stations = [
      { name: '東京', line_name: null, operator: null, location: 'POINT(139.76788 35.6811)' },
      { name: '東京', line_name: null, operator: null, location: 'POINT(139.76788 35.6811)' },
    ]
    const result = deduplicateStations(stations)
    expect(result).toHaveLength(1)
  })

  it('keeps first occurrence when duplicates exist', () => {
    const stations = [
      {
        name: '東京',
        line_name: '東海道新幹線',
        operator: '東海旅客鉄道',
        location: 'POINT(139.76788 35.6811)',
      },
      {
        name: '東京',
        line_name: '東海道新幹線',
        operator: '別の会社',
        location: 'POINT(139.76800 35.6812)',
      },
    ]
    const result = deduplicateStations(stations)
    expect(result).toHaveLength(1)
    expect(result[0].operator).toBe('東海旅客鉄道')
  })

  it('returns empty array for empty input', () => {
    expect(deduplicateStations([])).toEqual([])
  })
})
