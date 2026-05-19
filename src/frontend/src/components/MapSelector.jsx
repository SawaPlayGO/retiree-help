import { useRef, useEffect, useState } from 'react'

export default function MapSelector({ latitude, longitude, onChange }) {
  const canvasRef = useRef(null)
  const [isDragging, setIsDragging] = useState(false)

  // Draw map representation
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    const width = canvas.width
    const height = canvas.height

    // Background
    ctx.fillStyle = '#e5e7eb'
    ctx.fillRect(0, 0, width, height)

    // Grid
    ctx.strokeStyle = '#d1d5db'
    ctx.lineWidth = 1
    for (let i = 0; i <= width; i += 40) {
      ctx.beginPath()
      ctx.moveTo(i, 0)
      ctx.lineTo(i, height)
      ctx.stroke()
    }
    for (let i = 0; i <= height; i += 40) {
      ctx.beginPath()
      ctx.moveTo(0, i)
      ctx.lineTo(width, i)
      ctx.stroke()
    }

    // Border
    ctx.strokeStyle = '#999'
    ctx.lineWidth = 2
    ctx.strokeRect(0, 0, width, height)

    // Marker
    const x = ((longitude + 180) / 360) * width
    const y = ((latitude + 90) / 180) * height

    if (x >= 0 && x <= width && y >= 0 && y <= height) {
      // Marker circle
      ctx.fillStyle = '#ef4444'
      ctx.beginPath()
      ctx.arc(x, y, 8, 0, Math.PI * 2)
      ctx.fill()

      // Marker border
      ctx.strokeStyle = '#fff'
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.arc(x, y, 8, 0, Math.PI * 2)
      ctx.stroke()
    }

    // Label
    ctx.fillStyle = '#000'
    ctx.font = '12px Arial'
    ctx.fillText(`Широта: ${latitude.toFixed(4)}`, 10, 20)
    ctx.fillText(`Долгота: ${longitude.toFixed(4)}`, 10, 35)
  }, [latitude, longitude])

  const handleCanvasClick = (e) => {
    const canvas = canvasRef.current
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

    const newLongitude = (x / canvas.width) * 360 - 180
    const newLatitude = (y / canvas.height) * 180 - 90

    onChange({
      latitude: Math.max(-90, Math.min(90, newLatitude)),
      longitude: Math.max(-180, Math.min(180, newLongitude)),
    })
  }

  const handleCanvasMouseDown = () => {
    setIsDragging(true)
  }

  const handleCanvasMouseUp = () => {
    setIsDragging(false)
  }

  const handleCanvasMouseMove = (e) => {
    if (!isDragging) return
    handleCanvasClick(e)
  }

  return (
    <div className="space-y-4">
      <div className="border-2 border-gray-300 rounded-lg overflow-hidden bg-white">
        <canvas
          ref={canvasRef}
          width={500}
          height={300}
          onClick={handleCanvasClick}
          onMouseDown={handleCanvasMouseDown}
          onMouseUp={handleCanvasMouseUp}
          onMouseMove={handleCanvasMouseMove}
          className="w-full cursor-crosshair block"
          title="Нажмите или перетащите для выбора координат"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Широта</label>
          <input
            type="number"
            step="0.0001"
            min="-90"
            max="90"
            value={latitude}
            onChange={(e) =>
              onChange({
                latitude: Math.max(-90, Math.min(90, parseFloat(e.target.value) || 0)),
                longitude,
              })
            }
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Долгота</label>
          <input
            type="number"
            step="0.0001"
            min="-180"
            max="180"
            value={longitude}
            onChange={(e) =>
              onChange({
                latitude,
                longitude: Math.max(-180, Math.min(180, parseFloat(e.target.value) || 0)),
              })
            }
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      <p className="text-xs text-gray-500">
        💡 Нажимайте на карту или перетаскивайте красный маркер для выбора местоположения
      </p>
    </div>
  )
}
