import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { orderAPI, imageAPI } from '../services/api'
import MapPicker from '../components/MapPicker'
import NotificationPanel from '../components/NotificationPanel'

export default function CreateOrder() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const fileInputRef = useRef()

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    latitude: 0,
    longitude: 0,
  })

  const [images, setImages] = useState([])
  const [imagePreviews, setImagePreviews] = useState([])
  const [loading, setLoading] = useState(false)
  const [notifications, setNotifications] = useState([])

  const addNotification = (message, type = 'info') => {
    const id = Date.now()
    setNotifications((prev) => [...prev, { id, message, type }])
  }

  const removeNotification = (id) => {
    setNotifications((prev) => prev.filter((notif) => notif.id !== id))
  }

  const handleImageSelect = (e) => {
    const files = Array.from(e.target.files)

    // Validate file types
    const validFiles = files.filter((file) => {
      if (!file.type.startsWith('image/')) {
        addNotification(`${file.name} - не является изображением`, 'error')
        return false
      }
      return true
    })

    if (validFiles.length + images.length > 10) {
      addNotification('Максимум 10 фотографий', 'error')
      return
    }

    setImages((prev) => [...prev, ...validFiles])

    // Create previews
    validFiles.forEach((file) => {
      const reader = new FileReader()
      reader.onload = (e) => {
        setImagePreviews((prev) => [...prev, e.target.result])
      }
      reader.readAsDataURL(file)
    })
  }

  const removeImage = (index) => {
    setImages((prev) => prev.filter((_, i) => i !== index))
    setImagePreviews((prev) => prev.filter((_, i) => i !== index))
  }

    const handleCoordinatesChange = (newCoords) => {
    setFormData((prev) => ({
        ...prev,
        latitude: newCoords.latitude,
        longitude: newCoords.longitude,
    }))
    }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!formData.title.trim()) {
      addNotification('Введите название заказа', 'error')
      return
    }

    if (!formData.description.trim()) {
      addNotification('Введите описание заказа', 'error')
      return
    }

    setLoading(true)

    try {
      // Create order
      const orderResponse = await orderAPI.createOrder(
        formData.title,
        formData.description,
        formData.latitude,
        formData.longitude
      )

      const orderId = orderResponse.data.id
      addNotification('Заказ создан!', 'success')

      // Upload images if any
      if (images.length > 0) {
        try {
          await imageAPI.uploadOrderImages(orderId, images)
          addNotification(`${images.length} фото загружены!`, 'success')
        } catch (imageError) {
          addNotification(
            imageError.response?.data?.detail || 'Ошибка при загрузке фото',
            'error'
          )
        }
      }

      // Navigate to order detail
      setTimeout(() => navigate(`/order/${orderId}`), 1500)
    } catch (error) {
      addNotification(error.response?.data?.detail || 'Ошибка создания заказа', 'error')
    } finally {
      setLoading(false)
    }
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-600">Требуется вход в систему</p>
      </div>
    )
  }

  if (user.role !== 'CUSTOMER') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-600">Только клиенты могут создавать заказы</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <NotificationPanel notifications={notifications} onRemove={removeNotification} />

      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-4xl mx-auto px-4 py-6 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">Создать новый заказ</h1>
          <button
            onClick={() => navigate('/customer-profile')}
            className="text-gray-600 hover:text-gray-900"
          >
            ← Назад
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 py-8">
        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Order Details */}
          <div className="bg-white rounded-lg shadow p-6 space-y-4">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Информация о заказе</h2>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Название заказа *
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) =>
                setFormData((prev) => ({
                    ...prev,
                    title: e.target.value,
                }))
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Например: Ремонт кровли"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Подробное описание *
              </label>
              <textarea
                value={formData.description}
                onChange={(e) =>
                setFormData((prev) => ({
                    ...prev,
                    description: e.target.value,
                }))
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Опишите, что вам нужно, какой результат вы ожидаете..."
                rows="5"
                required
              />
            </div>
          </div>

          {/* Location */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Выберите место на карте</h2>
            <MapPicker
              latitude={formData.latitude}
              longitude={formData.longitude}
              onChange={handleCoordinatesChange}
            />
          </div>

          {/* Images */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Фотографии</h2>

            <div className="mb-4">
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/*"
                onChange={handleImageSelect}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-500 transition text-gray-600 hover:text-blue-600 font-medium"
              >
                📸 Нажмите чтобы добавить фото (максимум 10)
              </button>
            </div>

            {/* Image Previews */}
            {imagePreviews.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {imagePreviews.map((preview, idx) => (
                  <div key={idx} className="relative group">
                    <img
                      src={preview}
                      alt={`Preview ${idx + 1}`}
                      className="w-full h-24 object-cover rounded-lg"
                    />
                    <button
                      type="button"
                      onClick={() => removeImage(idx)}
                      className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center opacity-0 group-hover:opacity-100 transition"
                    >
                      ✕
                    </button>
                    <p className="text-xs text-gray-600 mt-1 truncate">
                      {images[idx].name}
                    </p>
                  </div>
                ))}
              </div>
            )}

            <p className="text-xs text-gray-500 mt-3">
              💡 Загруженные фотографии помогут исполнителям лучше понять вашу задачу
            </p>
          </div>

          {/* Submit Button */}
          <div className="flex gap-4">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-bold py-3 rounded-lg transition"
            >
              {loading ? 'Создание...' : 'Создать заказ'}
            </button>
            <button
              type="button"
              onClick={() => navigate('/customer-profile')}
              className="px-6 py-3 border border-gray-300 rounded-lg font-medium hover:bg-gray-50 transition"
            >
              Отменить
            </button>
          </div>
        </form>
      </main>
    </div>
  )
}
