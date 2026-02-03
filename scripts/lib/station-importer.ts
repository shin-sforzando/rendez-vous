import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '../../src/types/database.ts'

type StationInsert = Database['public']['Tables']['stations']['Insert']

const BATCH_SIZE = 500

export interface ImportProgress {
  total: number
  inserted: number
  skipped: number
  failed: number
  currentBatch: number
  totalBatches: number
}

export interface ImportResult {
  total: number
  inserted: number
  skippedDuplicate: number
  failed: number
  errors: string[]
}

/**
 * Fetch existing station keys (name + line_name) from the database
 * to avoid inserting duplicates.
 */
async function fetchExistingKeys(client: SupabaseClient<Database>): Promise<Set<string>> {
  const keys = new Set<string>()
  const pageSize = 1000
  let offset = 0

  // Paginate through all existing stations
  while (true) {
    const { data, error } = await client
      .from('stations')
      .select('name, line_name')
      .range(offset, offset + pageSize - 1)

    if (error) {
      throw new Error(`Failed to fetch existing stations: ${error.message}`)
    }

    if (!data || data.length === 0) {
      break
    }

    for (const row of data) {
      keys.add(`${row.name}::${row.line_name ?? ''}`)
    }

    if (data.length < pageSize) {
      break
    }
    offset += pageSize
  }

  return keys
}

/**
 * Filter out stations that already exist in the database.
 */
function filterNewStations(
  stations: StationInsert[],
  existingKeys: Set<string>
): { newStations: StationInsert[]; skippedCount: number } {
  const newStations: StationInsert[] = []
  let skippedCount = 0

  for (const station of stations) {
    const key = `${station.name}::${station.line_name ?? ''}`
    if (existingKeys.has(key)) {
      skippedCount++
    } else {
      newStations.push(station)
    }
  }

  return { newStations, skippedCount }
}

/**
 * Import stations into Supabase in batches.
 * Supports dry-run mode and progress reporting.
 */
export async function importStations(
  client: SupabaseClient<Database>,
  stations: StationInsert[],
  options: {
    dryRun?: boolean
    onProgress?: (progress: ImportProgress) => void
  } = {}
): Promise<ImportResult> {
  const { dryRun = false, onProgress } = options
  const errors: string[] = []

  // Phase 2: Check existing records in database
  const existingKeys = dryRun ? new Set<string>() : await fetchExistingKeys(client)
  const { newStations, skippedCount } = filterNewStations(stations, existingKeys)

  if (dryRun) {
    return {
      total: stations.length,
      inserted: 0,
      skippedDuplicate: 0,
      failed: 0,
      errors: [],
    }
  }

  const totalBatches = Math.ceil(newStations.length / BATCH_SIZE)
  let inserted = 0
  let failed = 0

  for (let i = 0; i < newStations.length; i += BATCH_SIZE) {
    const batch = newStations.slice(i, i + BATCH_SIZE)
    const currentBatch = Math.floor(i / BATCH_SIZE) + 1

    const { error, count } = await client
      .from('stations')
      .insert(batch)
      .select('id', { count: 'exact', head: true })

    if (error) {
      const msg = `Batch ${currentBatch}/${totalBatches} failed: ${error.message}`
      errors.push(msg)
      failed += batch.length
    } else {
      inserted += count ?? batch.length
    }

    onProgress?.({
      total: stations.length,
      inserted,
      skipped: skippedCount,
      failed,
      currentBatch,
      totalBatches,
    })
  }

  return {
    total: stations.length,
    inserted,
    skippedDuplicate: skippedCount,
    failed,
    errors,
  }
}
