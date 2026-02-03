import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { deduplicateStations, extractStations, parseGeoJSON } from './lib/geojson-parser.ts'
import { importStations } from './lib/station-importer.ts'
import { createAdminClient } from './lib/supabase-admin.ts'

function printUsage() {
  console.log('Usage: npx tsx scripts/import-stations.ts <geojson-file> [--dry-run]')
  console.log('')
  console.log('Import railway station data from 国土数値情報 GeoJSON into Supabase.')
  console.log('')
  console.log('Options:')
  console.log('  --dry-run  Parse and validate without inserting into database')
}

async function main() {
  const args = process.argv.slice(2)
  const dryRun = args.includes('--dry-run')
  const filePath = args.find((arg) => !arg.startsWith('--'))

  if (!filePath) {
    printUsage()
    process.exit(1)
  }

  const resolvedPath = resolve(filePath)
  console.log(`Reading GeoJSON file: ${resolvedPath}`)

  // Read and parse GeoJSON
  let rawContent: string
  try {
    rawContent = readFileSync(resolvedPath, 'utf-8')
  } catch {
    console.error(`Error: Cannot read file "${resolvedPath}"`)
    process.exit(1)
  }

  let rawJson: unknown
  try {
    rawJson = JSON.parse(rawContent)
  } catch {
    console.error('Error: File is not valid JSON')
    process.exit(1)
  }

  const geojson = parseGeoJSON(rawJson)
  console.log(`Total features in file: ${geojson.features.length}`)

  // Extract and deduplicate stations
  const rawStations = extractStations(geojson)
  console.log(`Station features extracted: ${rawStations.length}`)

  const stations = deduplicateStations(rawStations)
  const deduped = rawStations.length - stations.length
  console.log(`After deduplication: ${stations.length} (removed ${deduped} duplicates)`)

  if (stations.length === 0) {
    console.log('No stations to import.')
    return
  }

  if (dryRun) {
    console.log('')
    console.log('[DRY RUN] No records will be inserted.')
    console.log('')
    console.log('Sample stations (first 10):')
    for (const station of stations.slice(0, 10)) {
      console.log(
        `  - ${station.name} (${station.line_name ?? 'N/A'}) [${station.operator ?? 'N/A'}] ${station.location}`
      )
    }
    return
  }

  // Create admin client and import
  const client = createAdminClient()

  console.log('')
  console.log('Starting import...')

  const result = await importStations(client, stations, {
    onProgress: (progress) => {
      process.stdout.write(
        `\rBatch ${progress.currentBatch}/${progress.totalBatches} | ` +
          `Inserted: ${progress.inserted} | Skipped: ${progress.skipped} | Failed: ${progress.failed}`
      )
    },
  })

  console.log('')
  console.log('')
  console.log('=== Import Summary ===')
  console.log(`Total parsed:       ${result.total}`)
  console.log(`Inserted:           ${result.inserted}`)
  console.log(`Skipped (existing): ${result.skippedDuplicate}`)
  console.log(`Failed:             ${result.failed}`)

  if (result.errors.length > 0) {
    console.log('')
    console.log('Errors:')
    for (const error of result.errors) {
      console.log(`  - ${error}`)
    }
  }

  if (result.failed > 0) {
    process.exit(1)
  }
}

main().catch((error: unknown) => {
  console.error('Fatal error:', error instanceof Error ? error.message : error)
  process.exit(1)
})
