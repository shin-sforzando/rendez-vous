/** Geographic coordinate (latitude and longitude) */
export interface LatLng {
  /** Latitude in degrees (-90 to 90) */
  lat: number
  /** Longitude in degrees (-180 to 180) */
  lng: number
}

/** A named location with coordinates */
export interface Location {
  /** Display name for the location */
  name: string
  /** Geographic coordinates */
  latlng: LatLng
}

/** Result of meeting point calculation */
export interface MeetingPointResult {
  /** Centroid (arithmetic mean) of all locations */
  centroid: LatLng
  /** Geometric median (Weiszfeld point) of all locations */
  geometricMedian: LatLng
  /** Input locations used for the calculation */
  locations: Location[]
}
