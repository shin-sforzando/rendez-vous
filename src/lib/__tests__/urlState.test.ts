import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import type { Location } from '@/types'
import {
  buildShareUrl,
  deserializeLocations,
  getInitialLocationsFromUrl,
  serializeLocations,
} from '../urlState'

const TOKYO: Location = { label: '東京', latlng: { lat: 35.6812, lng: 139.7671 } }
const OSAKA: Location = { label: '大阪', latlng: { lat: 34.6937, lng: 135.5023 } }

describe('serializeLocations', () => {
  it('should return empty string for empty array', () => {
    expect(serializeLocations([])).toBe('')
  })

  it('should serialize a single location', () => {
    const result = serializeLocations([TOKYO])
    expect(result).toBe(`locations=${encodeURIComponent('東京')},35.6812,139.7671`)
  })

  it('should serialize multiple locations joined by %7C', () => {
    const result = serializeLocations([TOKYO, OSAKA])
    expect(result).toContain('%7C')
    expect(result).not.toContain('|')
    const parts = result.replace('locations=', '').split('%7C')
    expect(parts).toHaveLength(2)
  })

  it('should round coordinates to 4 decimal places', () => {
    const loc: Location = { label: 'test', latlng: { lat: 35.12345678, lng: 139.98765432 } }
    const result = serializeLocations([loc])
    expect(result).toContain('35.1235')
    expect(result).toContain('139.9877')
  })

  it('should cap at 10 locations', () => {
    const many = Array.from({ length: 15 }, (_, i) => ({
      label: `地点${i}`,
      latlng: { lat: 35 + i * 0.01, lng: 139 + i * 0.01 },
    }))
    const result = serializeLocations(many)
    const parts = result.replace('locations=', '').split('%7C')
    expect(parts).toHaveLength(10)
  })

  it('should encode special characters in labels', () => {
    const loc: Location = { label: 'A,B&C', latlng: { lat: 35.0, lng: 139.0 } }
    const result = serializeLocations([loc])
    // Commas and ampersands in the label should be encoded
    expect(result).toContain(encodeURIComponent('A,B&C'))
    expect(result).not.toContain('A,B&C,35')
  })
})

describe('deserializeLocations', () => {
  it('should return empty array for empty search string', () => {
    expect(deserializeLocations('')).toEqual([])
  })

  it('should return empty array when locations param is missing', () => {
    expect(deserializeLocations('?foo=bar')).toEqual([])
  })

  it('should parse a single location', () => {
    const search = `?locations=${encodeURIComponent('東京')},35.6812,139.7671`
    const result = deserializeLocations(search)
    expect(result).toHaveLength(1)
    expect(result[0].label).toBe('東京')
    expect(result[0].latlng.lat).toBe(35.6812)
    expect(result[0].latlng.lng).toBe(139.7671)
  })

  it('should parse multiple locations with literal pipe delimiter', () => {
    const search = `?locations=${encodeURIComponent('東京')},35.6812,139.7671|${encodeURIComponent('大阪')},34.6937,135.5023`
    const result = deserializeLocations(search)
    expect(result).toHaveLength(2)
    expect(result[0].label).toBe('東京')
    expect(result[1].label).toBe('大阪')
  })

  it('should parse multiple locations with encoded %7C delimiter (Slack-shared URLs)', () => {
    const search = `?locations=${encodeURIComponent('東京')},35.6812,139.7671%7C${encodeURIComponent('大阪')},34.6937,135.5023`
    const result = deserializeLocations(search)
    expect(result).toHaveLength(2)
    expect(result[0].label).toBe('東京')
    expect(result[1].label).toBe('大阪')
  })

  it('should skip entries with missing fields', () => {
    const search = '?locations=東京,35.6812'
    const result = deserializeLocations(search)
    expect(result).toEqual([])
  })

  it('should skip entries with non-numeric coordinates', () => {
    const search = '?locations=test,abc,139.7671'
    const result = deserializeLocations(search)
    expect(result).toEqual([])
  })

  it('should skip entries with out-of-range latitude', () => {
    const search = '?locations=test,91.0,139.0'
    const result = deserializeLocations(search)
    expect(result).toEqual([])
  })

  it('should skip entries with out-of-range longitude', () => {
    const search = '?locations=test,35.0,181.0'
    const result = deserializeLocations(search)
    expect(result).toEqual([])
  })

  it('should keep valid entries and skip invalid ones', () => {
    const search = `?locations=${encodeURIComponent('東京')},35.6812,139.7671|bad,entry|${encodeURIComponent('大阪')},34.6937,135.5023`
    const result = deserializeLocations(search)
    expect(result).toHaveLength(2)
    expect(result[0].label).toBe('東京')
    expect(result[1].label).toBe('大阪')
  })

  it('should cap at 10 locations with literal pipe', () => {
    const entries = Array.from(
      { length: 15 },
      (_, i) => `loc${i},${35 + i * 0.01},${139 + i * 0.01}`
    )
    const search = `?locations=${entries.join('|')}`
    const result = deserializeLocations(search)
    expect(result).toHaveLength(10)
  })

  it('should cap at 10 locations with encoded pipe', () => {
    const entries = Array.from(
      { length: 15 },
      (_, i) => `loc${i},${35 + i * 0.01},${139 + i * 0.01}`
    )
    const search = `?locations=${entries.join('%7C')}`
    const result = deserializeLocations(search)
    expect(result).toHaveLength(10)
  })

  it('should skip entries with empty label', () => {
    const search = '?locations=,35.0,139.0'
    const result = deserializeLocations(search)
    expect(result).toEqual([])
  })

  it('should accept boundary coordinates', () => {
    const search = '?locations=north-pole,90,0|south-west,-90,-180'
    const result = deserializeLocations(search)
    expect(result).toHaveLength(2)
    expect(result[0].latlng.lat).toBe(90)
    expect(result[1].latlng.lng).toBe(-180)
  })
})

describe('serializeLocations / deserializeLocations roundtrip', () => {
  it('should roundtrip a simple set of locations', () => {
    const original = [TOKYO, OSAKA]
    const serialized = serializeLocations(original)
    const restored = deserializeLocations(`?${serialized}`)
    expect(restored).toHaveLength(2)
    expect(restored[0].label).toBe('東京')
    expect(restored[1].label).toBe('大阪')
    // Coordinates may differ slightly due to rounding
    expect(restored[0].latlng.lat).toBeCloseTo(TOKYO.latlng.lat, 4)
    expect(restored[0].latlng.lng).toBeCloseTo(TOKYO.latlng.lng, 4)
  })

  it('should roundtrip labels with special characters', () => {
    const original: Location[] = [{ label: 'A,B&C D', latlng: { lat: 35.0, lng: 139.0 } }]
    const serialized = serializeLocations(original)
    const restored = deserializeLocations(`?${serialized}`)
    expect(restored).toHaveLength(1)
    expect(restored[0].label).toBe('A,B&C D')
  })
})

describe('getInitialLocationsFromUrl', () => {
  const originalLocation = window.location

  beforeEach(() => {
    Object.defineProperty(window, 'location', {
      writable: true,
      value: { ...originalLocation, search: '' },
    })
  })

  afterEach(() => {
    Object.defineProperty(window, 'location', {
      writable: true,
      value: originalLocation,
    })
  })

  it('should return empty array when no query params', () => {
    window.location.search = ''
    expect(getInitialLocationsFromUrl()).toEqual([])
  })

  it('should parse locations from window.location.search', () => {
    window.location.search = `?locations=${encodeURIComponent('東京')},35.6812,139.7671`
    const result = getInitialLocationsFromUrl()
    expect(result).toHaveLength(1)
    expect(result[0].label).toBe('東京')
  })
})

describe('buildShareUrl', () => {
  it('should return base URL for empty locations', () => {
    const result = buildShareUrl([])
    expect(result).toBe(`${window.location.origin}${window.location.pathname}`)
  })

  it('should include locations query param', () => {
    const result = buildShareUrl([TOKYO])
    expect(result).toContain('?locations=')
    expect(result).toContain(encodeURIComponent('東京'))
  })

  it('should start with the current origin', () => {
    const result = buildShareUrl([TOKYO])
    expect(result.startsWith(window.location.origin)).toBe(true)
  })
})
