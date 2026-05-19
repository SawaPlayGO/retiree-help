import { useEffect, useRef, useState } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

// Fix for default marker icons
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
})

export default function MapPicker({ latitude, longitude, onChange }) {
  const mapRef = useRef(null)
  const mapInstanceRef = useRef(null)
  const markerRef = useRef(null)
  const [mapLoaded, setMapLoaded] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  // Request user's current location
  const requestGeolocation = () => {
    setLoading(true)
    setError(null)

    if (!navigator.geolocation) {
      setError('Ваш браузер не поддерживает геолокацию')
      setLoading(false)
      return
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude: lat, longitude: lng } = position.coords
        onChange({ latitude: lat, longitude: lng })
        setLoading(false)
      },
      (err) => {
        console.error('Geolocation error:', err)
        if (err.code === err.PERMISSION_DENIED) {
          setError('Вы запретили доступ к геолокации. Включите его в настройках браузера.')
        } else if (err.code === err.POSITION_UNAVAILABLE) {
          setError('Местоположение не найдено. Проверьте подключение.')
        } else {
          setError('Ошибка при получении местоположения')
        }
        setLoading(false)
      }
    )
  }

  // Auto-request geolocation on mount
  useEffect(() => {
    if (latitude === 40 && longitude === 20) {
      // Only auto-request if we still have default values
      requestGeolocation()
    }
  }, [])

  // Initialize map
  useEffect(() => {
    if (mapLoaded) return

    const map = L.map(mapRef.current, {
      attributionControl: false,
    }).setView([latitude || 40, longitude || 20], 13)

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
    }).addTo(map)

    mapInstanceRef.current = map
    setMapLoaded(true)

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove()
        mapInstanceRef.current = null
      }
    }
  }, [])

  // Update marker when coordinates change
  useEffect(() => {
    if (!mapInstanceRef.current || !mapLoaded) return

    if (markerRef.current) {
      markerRef.current.setLatLng([latitude, longitude])
    } else {
      markerRef.current = L.marker([latitude, longitude], {
        draggable: true,
      }).addTo(mapInstanceRef.current)

      markerRef.current.on('dragend', () => {
        const { lat, lng } = markerRef.current.getLatLng()
        onChange({ latitude: lat, longitude: lng })
      })
    }

    mapInstanceRef.current.setView([latitude, longitude], 13)
  }, [latitude, longitude, mapLoaded, onChange])

  // Handle map click
  useEffect(() => {
    if (!mapInstanceRef.current || !mapLoaded) return

    const handleMapClick = (e) => {
      const { lat, lng } = e.latlng
      onChange({ latitude: lat, longitude: lng })

      if (markerRef.current) {
        markerRef.current.setLatLng([lat, lng])
      } else {
        markerRef.current = L.marker([lat, lng], {
          draggable: true,
        }).addTo(mapInstanceRef.current)

        markerRef.current.on('dragend', () => {
          const { lat, lng } = markerRef.current.getLatLng()
          onChange({ latitude: lat, longitude: lng })
        })
      }
    }

    mapInstanceRef.current.on('click', handleMapClick)

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.off('click', handleMapClick)
      }
    }
  }, [mapLoaded, onChange])

  return (
    <div className="space-y-3">
      <div
        ref={mapRef}
        className="w-full h-96 rounded-lg border-2 border-gray-300 shadow-md z-0"
        style={{ minHeight: '400px' }}
      />
      <div className="flex items-center justify-between bg-blue-50 p-3 rounded-lg border border-blue-200">
        <div className="flex-1">
          <p className="text-sm text-blue-800">
            📍 Нажмите на карту или перетащите маркер для выбора местоположения
          </p>
          {error && (
            <p className="text-sm text-red-600 mt-2">⚠️ {error}</p>
          )}
        </div>
        <div className="flex items-center gap-3 ml-4">
          <button
            type="button"
            onClick={requestGeolocation}
            disabled={loading}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white text-sm px-3 py-2 rounded-lg transition whitespace-nowrap"
          >
            {loading ? 'Загрузка...' : '📍 Мое местоположение'}
          </button>
          <span className="text-xs bg-blue-200 text-blue-900 px-3 py-1 rounded-full font-mono">
            {latitude.toFixed(4)}, {longitude.toFixed(4)}
          </span>
        </div>
      </div>
    </div>
  )
}
