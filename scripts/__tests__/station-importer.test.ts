import type { SupabaseClient } from '@supabase/supabase-js'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Database } from '../../src/types/database.ts'
import { importStations } from '../lib/station-importer.ts'

type StationInsert = Database['public']['Tables']['stations']['Insert']

function makeStation(name: string, lineName: string): StationInsert {
  return {
    name,
    line_name: lineName,
    operator: 'テスト鉄道',
    location: 'POINT(139.76788 35.6811)',
  }
}

function createMockClient(
  options: {
    existingStations?: { name: string; line_name: string | null }[]
    insertError?: Error
  } = {}
) {
  const { existingStations = [], insertError } = options

  const selectMock = vi.fn().mockReturnValue({
    range: vi.fn().mockResolvedValue({
      data: existingStations,
      error: null,
    }),
  })

  const insertMock = vi.fn().mockReturnValue({
    select: vi
      .fn()
      .mockResolvedValue(
        insertError
          ? { error: { message: insertError.message }, count: null }
          : { error: null, count: null }
      ),
  })

  const fromMock = vi.fn().mockImplementation(() => ({
    select: selectMock,
    insert: insertMock,
  }))

  return {
    client: { from: fromMock } as unknown as SupabaseClient<Database>,
    fromMock,
    insertMock,
  }
}

describe('importStations', () => {
  let stations: StationInsert[]

  beforeEach(() => {
    stations = [
      makeStation('東京', 'JR山手線'),
      makeStation('渋谷', 'JR山手線'),
      makeStation('新宿', 'JR山手線'),
    ]
  })

  it('inserts stations that do not exist in the database', async () => {
    const { client, insertMock } = createMockClient()

    const result = await importStations(client, stations)

    expect(insertMock).toHaveBeenCalledTimes(1)
    expect(result.total).toBe(3)
    expect(result.failed).toBe(0)
    expect(result.errors).toHaveLength(0)
  })

  it('skips stations that already exist in the database', async () => {
    const { client, insertMock } = createMockClient({
      existingStations: [{ name: '東京', line_name: 'JR山手線' }],
    })

    const result = await importStations(client, stations)

    // Insert should be called with only the 2 new stations
    expect(insertMock).toHaveBeenCalledTimes(1)
    const insertedRecords = insertMock.mock.calls[0][0] as StationInsert[]
    expect(insertedRecords).toHaveLength(2)
    expect(insertedRecords.map((s: StationInsert) => s.name)).toEqual(['渋谷', '新宿'])
    expect(result.skippedDuplicate).toBe(1)
  })

  it('does not insert in dry-run mode', async () => {
    const { client, insertMock } = createMockClient()

    const result = await importStations(client, stations, { dryRun: true })

    expect(insertMock).not.toHaveBeenCalled()
    expect(result.total).toBe(3)
    expect(result.inserted).toBe(0)
  })

  it('reports progress via callback', async () => {
    const { client } = createMockClient()
    const progressCalls: unknown[] = []

    await importStations(client, stations, {
      onProgress: (p) => progressCalls.push({ ...p }),
    })

    expect(progressCalls.length).toBeGreaterThan(0)
  })

  it('continues on batch error and records failure', async () => {
    const { client } = createMockClient({
      insertError: new Error('Connection timeout'),
    })

    const result = await importStations(client, stations)

    expect(result.failed).toBe(3)
    expect(result.errors).toHaveLength(1)
    expect(result.errors[0]).toContain('Connection timeout')
  })

  it('handles empty station array', async () => {
    const { client, insertMock } = createMockClient()

    const result = await importStations(client, [])

    expect(insertMock).not.toHaveBeenCalled()
    expect(result.total).toBe(0)
    expect(result.inserted).toBe(0)
    expect(result.skippedDuplicate).toBe(0)
  })

  it('skips all when all stations exist in database', async () => {
    const { client, insertMock } = createMockClient({
      existingStations: [
        { name: '東京', line_name: 'JR山手線' },
        { name: '渋谷', line_name: 'JR山手線' },
        { name: '新宿', line_name: 'JR山手線' },
      ],
    })

    const result = await importStations(client, stations)

    expect(insertMock).not.toHaveBeenCalled()
    expect(result.skippedDuplicate).toBe(3)
    expect(result.inserted).toBe(0)
  })

  it('splits large arrays into batches', async () => {
    // Create 1200 stations to trigger multiple batches (batch size = 500)
    const manyStations = Array.from({ length: 1200 }, (_, i) => makeStation(`駅${i}`, `路線${i}`))

    const { client, insertMock } = createMockClient()

    await importStations(client, manyStations)

    // 1200 / 500 = 3 batches (500 + 500 + 200)
    expect(insertMock).toHaveBeenCalledTimes(3)
    const batch1 = insertMock.mock.calls[0][0] as StationInsert[]
    const batch2 = insertMock.mock.calls[1][0] as StationInsert[]
    const batch3 = insertMock.mock.calls[2][0] as StationInsert[]
    expect(batch1).toHaveLength(500)
    expect(batch2).toHaveLength(500)
    expect(batch3).toHaveLength(200)
  })
})
