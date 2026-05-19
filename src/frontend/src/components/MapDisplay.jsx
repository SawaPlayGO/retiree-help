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

export default function MapDisplay({ latitude, longitude }) {
  const mapRef = useRef(null)
  const mapInstanceRef = useRef(null)
  const markerRef = useRef(null)
  const [mapLoaded, setMapLoaded] = useState(false)
  const [address, setAddress] = useState('Загрузка адреса...')
  const [loadingAddress, setLoadingAddress] = useState(true)

  // Fetch address from coordinates using Nominatim
  useEffect(() => {
    const fetchAddress = async () => {
      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`
        )
        const data = await response.json()
        
        // Extract readable address
        const addressParts = []
        if (data.address) {
          const { house_number, road, suburb, city, town, county, state, postcode } = data.address
          if (house_number) addressParts.push(house_number)
          if (road) addressParts.push(road)
          if (suburb) addressParts.push(suburb)
          if (city) addressParts.push(city)
          if (town) addressParts.push(town)
          if (state) addressParts.push(state)
        }
        
        const finalAddress = addressParts.length > 0 
          ? addressParts.join(', ') 
          : data.address?.display_name || `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`
        
        setAddress(finalAddress)
      } catch (error) {
        console.error('Failed to fetch address:', error)
        setAddress(`${latitude.toFixed(4)}, ${longitude.toFixed(4)}`)
      } finally {
        setLoadingAddress(false)
      }
    }

    fetchAddress()
  }, [latitude, longitude])

  // Initialize map
  useEffect(() => {
    if (mapLoaded || !mapRef.current) return

    const map = L.map(mapRef.current, {
      attributionControl: false,
    }).setView([latitude, longitude], 15)

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
    }).addTo(map)

    // Add marker
    markerRef.current = L.marker([latitude, longitude]).addTo(map)

    mapInstanceRef.current = map
    setMapLoaded(true)

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove()
        mapInstanceRef.current = null
      }
    }
  }, [])

  // Update marker position if coordinates change
  useEffect(() => {
    if (!mapInstanceRef.current || !mapLoaded) return

    if (markerRef.current) {
      markerRef.current.setLatLng([latitude, longitude])
    }
    mapInstanceRef.current.setView([latitude, longitude], 15)
  }, [latitude, longitude, mapLoaded])

  return (
    <div className="space-y-3">
      <div
        ref={mapRef}
        className="w-full h-80 rounded-lg border-2 border-gray-300 shadow-md"
        style={{ minHeight: '320px' }}
      />
      
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-lg border border-blue-200">
        <p className="text-xs text-gray-500 mb-1">📍 Местоположение заказа</p>
        <p className="text-sm font-semibold text-gray-900 break-words">
          {loadingAddress ? (
            <span className="text-gray-500">Определение адреса...</span>
          ) : (
            address
          )}
        </p>
        <p className="text-xs text-gray-600 mt-2">
          Координаты: {latitude.toFixed(4)}°, {longitude.toFixed(4)}°
        </p>
      </div>
    </div>
  )
}
