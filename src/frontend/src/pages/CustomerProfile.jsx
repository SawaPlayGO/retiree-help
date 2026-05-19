import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { userAPI, imageAPI, orderAPI } from '../services/api'

export default function CustomerProfile() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const fileInputRef = useRef()

  const [profile, setProfile] = useState({
    description: user?.description || '',
  })
  const [orderForm, setOrderForm] = useState({
    title: '',
    description: '',
    latitude: 0,
    longitude: 0,
  })
  const [userOrders, setUserOrders] = useState([])
  const [loading, setLoading] = useState(false)
  const [loadingOrders, setLoadingOrders] = useState(true)
  const [message, setMessage] = useState('')
  const [avatarPreview, setAvatarPreview] = useState(user?.avatar_url || null)
  const [userInfo, setUserInfo] = useState(user)

  useEffect(() => {
    loadUserProfile()
  }, [])

  useEffect(() => {
    if (userInfo?.id) {
      loadUserOrders()
    }
  }, [userInfo?.id])

  const loadUserProfile = async () => {
    try {
      const response = await userAPI.getMe()
      setUserInfo(response.data)
      if (response.data.avatar_url) {
        setAvatarPreview(imageAPI.transformAvatarUrl(response.data.avatar_url, response.data.id))
      }
      if (response.data.description) {
        setProfile({ description: response.data.description })
      }
    } catch (error) {
      console.error('Failed to fetch user:', error)
    }
  }

  const loadUserOrders = async () => {
    try {
      setLoadingOrders(true)
      const response = await orderAPI.getMyOrders(0, 100)
      setUserOrders(response.data.items || [])
    } catch (error) {
      console.error('Failed to fetch orders:', error)
    } finally {
      setLoadingOrders(false)
    }
  }

  const handleAvatarChange = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    setLoading(true)
    try {
      const response = await imageAPI.uploadAvatar(file)
      const avatarUrl = response.data.url_avatar || response.data.avatar_url
      setAvatarPreview(avatarUrl)
      setMessage('Аватар загружен')
      setTimeout(() => setMessage(''), 3000)
    } catch (error) {
      console.error('Avatar upload error:', error)
      setMessage(error.response?.data?.detail || 'Ошибка загрузки аватара')
    } finally {
      setLoading(false)
    }
  }

  const handleProfileUpdate = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      await userAPI.updateProfile(profile.description)
      setMessage('Профиль обновлен')
      setTimeout(() => setMessage(''), 3000)
    } catch (error) {
      setMessage(error.response?.data?.detail || 'Ошибка обновления профиля')
    } finally {
      setLoading(false)
    }
  }

  const handleCreateOrder = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const response = await orderAPI.createOrder(
        orderForm.title,
        orderForm.description,
        orderForm.latitude,
        orderForm.longitude
      )
      setMessage('Заказ создан!')
      setOrderForm({
        title: '',
        description: '',
        latitude: 0,
        longitude: 0,
      })
      await loadUserOrders()
      setTimeout(() => navigate(`/order/${response.data.id}`), 1500)
    } catch (error) {
      setMessage(error.response?.data?.detail || 'Ошибка создания заказа')
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'OPEN':
        return 'bg-yellow-100 text-yellow-800'
      case 'IN_PROGRESS':
        return 'bg-blue-100 text-blue-800'
      case 'AWAITING_APPROVAL':
        return 'bg-orange-100 text-orange-800'
      case 'COMPLETED':
        return 'bg-green-100 text-green-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusLabel = (status) => {
    const labels = {
      OPEN: 'Открыт',
      IN_PROGRESS: 'В прогрессе',
      AWAITING_APPROVAL: 'Ожидает одобрения',
      COMPLETED: 'Завершён',
    }
    return labels[status] || status
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-4xl mx-auto px-4 py-6 flex justify-between items-center">
          <h1 className="text-3xl font-bold text-gray-900">Профиль</h1>
          <div className="flex gap-4 items-center">
            {/* Avatar Circle */}
            <div className="w-10 h-10 rounded-full bg-green-600 flex items-center justify-center text-white font-bold overflow-hidden">
              {avatarPreview ? (
                <img
                  src={avatarPreview}
                  alt="Avatar"
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.target.style.display = 'none'
                  }}
                />
              ) : null}
              {!avatarPreview && (
                <span>{userInfo?.username?.[0]?.toUpperCase() || '?'}</span>
              )}
            </div>
            <button
              onClick={handleLogout}
              className="bg-red-500 hover:bg-red-600 text-white px-6 py-2 rounded-lg transition"
            >
              Выход
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 py-8">
        {message && (
          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded text-blue-600">
            {message}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Profile Card */}
          <div className="md:col-span-1 bg-white rounded-lg shadow p-6">
            <div className="text-center">
              {avatarPreview ? (
                <img
                  src={avatarPreview}
                  alt="Avatar"
                  className="w-24 h-24 rounded-full mx-auto mb-4 object-cover"
                  onError={(e) => {
                    console.error('Image load error:', e.target.src)
                    e.target.style.display = 'none'
                  }}
                />
              ) : (
                <div className="w-24 h-24 rounded-full mx-auto mb-4 bg-gray-200 flex items-center justify-center">
                  <span className="text-gray-500">Нет фото</span>
                </div>
              )}
              <h2 className="text-xl font-bold text-gray-900 mb-1">{userInfo?.username}</h2>
              <p className="text-gray-600 text-sm mb-4">{userInfo?.email}</p>

              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-medium py-2 rounded-lg transition"
              >
                Загрузить фото
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleAvatarChange}
                hidden
              />
            </div>
          </div>

          {/* Forms */}
          <div className="md:col-span-2 space-y-8">
            {/* Update Profile */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Обновить профиль</h3>
              <form onSubmit={handleProfileUpdate} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Описание
                  </label>
                  <textarea
                    value={profile.description}
                    onChange={(e) =>
                      setProfile({ ...profile, description: e.target.value })
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Расскажите о себе..."
                    rows="4"
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-medium py-2 rounded-lg transition"
                >
                  {loading ? 'Сохранение...' : 'Сохранить'}
                </button>
              </form>
            </div>

            {/* Create Order */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Создать заказ</h3>
              <form onSubmit={handleCreateOrder} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Название
                  </label>
                  <input
                    type="text"
                    value={orderForm.title}
                    onChange={(e) =>
                      setOrderForm({ ...orderForm, title: e.target.value })
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Краткое описание заказа"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Подробное описание
                  </label>
                  <textarea
                    value={orderForm.description}
                    onChange={(e) =>
                      setOrderForm({ ...orderForm, description: e.target.value })
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Опишите, что вам нужно..."
                    rows="3"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Широта
                    </label>
                    <input
                      type="number"
                      step="0.0001"
                      value={orderForm.latitude}
                      onChange={(e) =>
                        setOrderForm({
                          ...orderForm,
                          latitude: parseFloat(e.target.value),
                        })
                      }
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Долгота
                    </label>
                    <input
                      type="number"
                      step="0.0001"
                      value={orderForm.longitude}
                      onChange={(e) =>
                        setOrderForm({
                          ...orderForm,
                          longitude: parseFloat(e.target.value),
                        })
                      }
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-medium py-2 rounded-lg transition"
                >
                  {loading ? 'Создание...' : 'Создать заказ'}
                </button>
              </form>
            </div>

            {/* My Orders */}
            <div className="bg-white rounded-lg shadow p-6 col-span-full">
              <h3 className="text-lg font-bold text-gray-900 mb-4">
                Мои заказы ({userOrders.length})
              </h3>

              {loadingOrders ? (
                <p className="text-gray-600">Загрузка заказов...</p>
              ) : userOrders.length === 0 ? (
                <p className="text-gray-600">Вы еще не создали ни одного заказа</p>
              ) : (
                <div className="grid grid-cols-1 gap-4">
                  {userOrders.map(order => (
                    <div
                      key={order.id}
                      className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition cursor-pointer"
                      onClick={() => navigate(`/order/${order.id}`)}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex-1">
                          <h4 className="font-bold text-gray-900">{order.title}</h4>
                          <p className="text-gray-600 text-sm">{order.description}</p>
                        </div>
                        <span
                          className={`text-xs font-semibold px-3 py-1 rounded-full whitespace-nowrap ml-2 ${getStatusColor(
                            order.status
                          )}`}
                        >
                          {getStatusLabel(order.status)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-sm text-gray-500 mt-2">
                        <span>
                          📍 {order.latitude.toFixed(4)}, {order.longitude.toFixed(4)}
                        </span>
                        <span>🆔 Заказ #{order.id}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
