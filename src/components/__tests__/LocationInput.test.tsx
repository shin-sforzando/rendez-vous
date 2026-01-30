import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import LocationInput from '../LocationInput'

describe('LocationInput', () => {
  it('should render the component', () => {
    render(<LocationInput locations={[]} onAdd={vi.fn()} onRemove={vi.fn()} />)
    expect(screen.getByTestId('location-input')).toBeInTheDocument()
  })

  it('should render input fields', () => {
    render(<LocationInput locations={[]} onAdd={vi.fn()} onRemove={vi.fn()} />)
    expect(screen.getByLabelText('名前')).toBeInTheDocument()
    expect(screen.getByLabelText('緯度')).toBeInTheDocument()
    expect(screen.getByLabelText('経度')).toBeInTheDocument()
  })

  it('should call onAdd with valid input', () => {
    const onAdd = vi.fn()
    render(<LocationInput locations={[]} onAdd={onAdd} onRemove={vi.fn()} />)

    fireEvent.change(screen.getByLabelText('名前'), { target: { value: '東京駅' } })
    fireEvent.change(screen.getByLabelText('緯度'), { target: { value: '35.6812' } })
    fireEvent.change(screen.getByLabelText('経度'), { target: { value: '139.7671' } })
    fireEvent.click(screen.getByText('追加'))

    expect(onAdd).toHaveBeenCalledWith({
      name: '東京駅',
      latlng: { lat: 35.6812, lng: 139.7671 },
    })
  })

  it('should clear inputs after successful add', () => {
    render(<LocationInput locations={[]} onAdd={vi.fn()} onRemove={vi.fn()} />)

    const nameInput = screen.getByLabelText('名前') as HTMLInputElement
    const latInput = screen.getByLabelText('緯度') as HTMLInputElement
    const lngInput = screen.getByLabelText('経度') as HTMLInputElement

    fireEvent.change(nameInput, { target: { value: '渋谷' } })
    fireEvent.change(latInput, { target: { value: '35.659' } })
    fireEvent.change(lngInput, { target: { value: '139.7' } })
    fireEvent.click(screen.getByText('追加'))

    expect(nameInput.value).toBe('')
    expect(latInput.value).toBe('')
    expect(lngInput.value).toBe('')
  })

  it('should not call onAdd with empty name', () => {
    const onAdd = vi.fn()
    render(<LocationInput locations={[]} onAdd={onAdd} onRemove={vi.fn()} />)

    fireEvent.change(screen.getByLabelText('緯度'), { target: { value: '35.0' } })
    fireEvent.change(screen.getByLabelText('経度'), { target: { value: '139.0' } })
    fireEvent.click(screen.getByText('追加'))

    expect(onAdd).not.toHaveBeenCalled()
  })

  it('should not call onAdd with invalid latitude', () => {
    const onAdd = vi.fn()
    render(<LocationInput locations={[]} onAdd={onAdd} onRemove={vi.fn()} />)

    fireEvent.change(screen.getByLabelText('名前'), { target: { value: 'test' } })
    fireEvent.change(screen.getByLabelText('緯度'), { target: { value: '91' } })
    fireEvent.change(screen.getByLabelText('経度'), { target: { value: '139.0' } })
    fireEvent.click(screen.getByText('追加'))

    expect(onAdd).not.toHaveBeenCalled()
  })

  it('should not call onAdd with invalid longitude', () => {
    const onAdd = vi.fn()
    render(<LocationInput locations={[]} onAdd={onAdd} onRemove={vi.fn()} />)

    fireEvent.change(screen.getByLabelText('名前'), { target: { value: 'test' } })
    fireEvent.change(screen.getByLabelText('緯度'), { target: { value: '35.0' } })
    fireEvent.change(screen.getByLabelText('経度'), { target: { value: '181' } })
    fireEvent.click(screen.getByText('追加'))

    expect(onAdd).not.toHaveBeenCalled()
  })

  it('should display registered locations', () => {
    const locations = [
      { name: '東京', latlng: { lat: 35.6762, lng: 139.6503 } },
      { name: '大阪', latlng: { lat: 34.6937, lng: 135.5023 } },
    ]
    render(<LocationInput locations={locations} onAdd={vi.fn()} onRemove={vi.fn()} />)

    expect(screen.getByTestId('location-list')).toBeInTheDocument()
    expect(screen.getByText('東京')).toBeInTheDocument()
    expect(screen.getByText('大阪')).toBeInTheDocument()
    expect(screen.getByText('登録済み地点 (2/10)')).toBeInTheDocument()
  })

  it('should call onRemove when delete button is clicked', () => {
    const onRemove = vi.fn()
    const locations = [{ name: '東京', latlng: { lat: 35.6762, lng: 139.6503 } }]
    render(<LocationInput locations={locations} onAdd={vi.fn()} onRemove={onRemove} />)

    fireEvent.click(screen.getByLabelText('東京を削除'))
    expect(onRemove).toHaveBeenCalledWith(0)
  })

  it('should disable inputs when max locations reached', () => {
    const locations = Array.from({ length: 10 }, (_, i) => ({
      name: `地点${i + 1}`,
      latlng: { lat: 35 + i * 0.1, lng: 139 + i * 0.1 },
    }))
    render(<LocationInput locations={locations} onAdd={vi.fn()} onRemove={vi.fn()} />)

    expect(screen.getByLabelText('名前')).toBeDisabled()
    expect(screen.getByLabelText('緯度')).toBeDisabled()
    expect(screen.getByLabelText('経度')).toBeDisabled()
    expect(screen.getByText('上限 (10地点) に達しました')).toBeInTheDocument()
  })
})
