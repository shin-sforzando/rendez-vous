import { renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Location } from '@/types'
import { useLocationUrlSync } from '../useLocationUrlSync'

const TOKYO: Location = { label: '東京', latlng: { lat: 35.6812, lng: 139.7671 } }
const OSAKA: Location = { label: '大阪', latlng: { lat: 34.6937, lng: 135.5023 } }

describe('useLocationUrlSync', () => {
  let replaceStateSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    replaceStateSpy = vi.spyOn(window.history, 'replaceState')
  })

  afterEach(() => {
    replaceStateSpy.mockRestore()
  })

  it('should call replaceState with locations query param', () => {
    renderHook(() => useLocationUrlSync([TOKYO]))

    expect(replaceStateSpy).toHaveBeenCalledTimes(1)
    const url = replaceStateSpy.mock.calls[0][2] as string
    expect(url).toContain('?locations=')
    expect(url).toContain(encodeURIComponent('東京'))
  })

  it('should strip query param when locations are empty', () => {
    renderHook(() => useLocationUrlSync([]))

    expect(replaceStateSpy).toHaveBeenCalledTimes(1)
    const url = replaceStateSpy.mock.calls[0][2] as string
    expect(url).not.toContain('?')
  })

  it('should update URL when locations change', () => {
    const { rerender } = renderHook(({ locs }) => useLocationUrlSync(locs), {
      initialProps: { locs: [TOKYO] },
    })

    rerender({ locs: [TOKYO, OSAKA] })

    expect(replaceStateSpy).toHaveBeenCalledTimes(2)
    const url = replaceStateSpy.mock.calls[1][2] as string
    expect(url).toContain(encodeURIComponent('大阪'))
  })

  it('should use replaceState not pushState', () => {
    const pushStateSpy = vi.spyOn(window.history, 'pushState')
    renderHook(() => useLocationUrlSync([TOKYO]))

    expect(pushStateSpy).not.toHaveBeenCalled()
    pushStateSpy.mockRestore()
  })
})
