/** Supabase database schema type definitions */
export interface Database {
  public: {
    Tables: {
      stations: {
        Row: Station
        Insert: Omit<Station, 'id' | 'created_at'>
        Update: Partial<Omit<Station, 'id' | 'created_at'>>
      }
    }
  }
}

/** Raw station record from Supabase (PostGIS POINT format) */
export interface Station {
  id: number
  name: string
  line_name: string | null
  operator: string | null
  /** PostGIS GEOGRAPHY(POINT, 4326) as string, e.g. "POINT(139.7671 35.6812)" */
  location: string
  created_at: string
}

/** Station with parsed latitude/longitude coordinates */
export interface StationWithCoords {
  id: number
  name: string
  line_name: string | null
  operator: string | null
  lat: number
  lng: number
}
