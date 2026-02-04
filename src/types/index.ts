/** Geographic coordinate (latitude and longitude) */
export interface LatLng {
  /** Latitude in degrees (-90 to 90) */
  lat: number
  /** Longitude in degrees (-180 to 180) */
  lng: number
}

/** A labeled location with coordinates */
export interface Location {
  /** Display label for the location */
  label: string
  /** Geographic coordinates */
  latlng: LatLng
}

export type { Database, Station, StationWithCoords } from './database'

/** Result of meeting point calculation */
export interface MeetingPointResult {
  /** Centroid (arithmetic mean) of all locations */
  centroid: LatLng
  /** Geometric median (Weiszfeld point) of all locations */
  geometricMedian: LatLng
  /** Input locations used for the calculation */
  locations: Location[]
}
