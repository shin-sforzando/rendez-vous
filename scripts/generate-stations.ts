import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import type { StationWithCoords } from '../src/types/index.ts'
import { deduplicateStations, extractStations, parseGeoJSON } from './lib/geojson-parser.ts'

/** Output path for the generated static station dataset (served at /stations.json) */
const OUTPUT_PATH = resolve('public/stations.json')

/** Round coordinates to 6 decimals (~0.1 m precision) to keep the asset small */
function round6(value: number): number {
  return Math.round(value * 1e6) / 1e6
}

/** Parse a WKT "POINT(lng lat)" string into [lng, lat], or null if malformed */
function parsePointWkt(wkt: string): [number, number] | null {
  const match = wkt.match(/^POINT\(([-\d.]+) ([-\d.]+)\)$/)
  if (!match) return null
  const lng = Number(match[1])
  const lat = Number(match[2])
  if (Number.isNaN(lng) || Number.isNaN(lat)) return null
  return [lng, lat]
}

function printUsage() {
  console.log('Usage: npx tsx scripts/generate-stations.ts <geojson-file> [--dry-run]')
  console.log('')
  console.log(
    'Generate a static station dataset (public/stations.json) from National Land Numerical Information GeoJSON.'
  )
  console.log('')
  console.log('Options:')
  console.log('  --dry-run  Parse and report counts without writing the output file')
}

function main() {
  const args = process.argv.slice(2)
  const dryRun = args.includes('--dry-run')
  const filePath = args.find((arg) => !arg.startsWith('--'))

  if (!filePath) {
    printUsage()
    process.exit(1)
  }

  const resolvedPath = resolve(filePath)
  console.log(`Reading GeoJSON file: ${resolvedPath}`)

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

  const rawStations = extractStations(geojson)
  console.log(`Station features extracted: ${rawStations.length}`)

  const deduped = deduplicateStations(rawStations)
  console.log(
    `After deduplication: ${deduped.length} (removed ${rawStations.length - deduped.length} duplicates)`
  )

  // Transform WKT location into flat lat/lng and assign a stable sequential id
  const stations: StationWithCoords[] = []
  let skipped = 0
  let id = 1
  for (const station of deduped) {
    const coords = parsePointWkt(station.location)
    if (!coords) {
      skipped++
      continue
    }
    const [lng, lat] = coords
    stations.push({
      id: id++,
      name: station.name,
      line_name: station.line_name,
      operator: station.operator,
      lat: round6(lat),
      lng: round6(lng),
    })
  }

  if (skipped > 0) {
    console.log(`Skipped ${skipped} stations with unparsable location`)
  }

  if (stations.length === 0) {
    console.log('No stations to write.')
    return
  }

  if (dryRun) {
    console.log('')
    console.log('[DRY RUN] No file will be written.')
    console.log('')
    console.log('Sample stations (first 10):')
    for (const station of stations.slice(0, 10)) {
      console.log(
        `  - ${station.name} (${station.line_name ?? 'N/A'}) [${station.operator ?? 'N/A'}] ${station.lat},${station.lng}`
      )
    }
    return
  }

  writeFileSync(OUTPUT_PATH, JSON.stringify(stations))
  console.log('')
  console.log('=== Generation Summary ===')
  console.log(`Stations written: ${stations.length}`)
  console.log(`Output:           ${OUTPUT_PATH}`)
}

try {
  main()
} catch (error: unknown) {
  console.error('Fatal error:', error instanceof Error ? error.message : error)
  process.exit(1)
}
