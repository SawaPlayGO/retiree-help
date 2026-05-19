import { useState, useRef, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { userAPI, imageAPI, orderAPI } from '../services/api'

// Helper function to fix MinIO URL port
const fixAvatarUrl = (url) => {
  if (!url) return null
  let fixedUrl = url
  // Replace frontend port 5731 with MinIO port 9000
  fixedUrl = fixedUrl.replace(':5731/', ':9000/')
  // Ensure http:// prefix exists
  if (!fixedUrl.startsWith('http://') && !fixedUrl.startsWith('https://')) {
    fixedUrl = 'http://' + fixedUrl
  }
  console.log('Converted avatar URL from', url, 'to', fixedUrl)
  return fixedUrl
}

export default function ExecutorProfile() {
  const { user, logout } = useAuth()
  const { userId } = useParams()
  const navigate = useNavigate()
  const fileInputRef = useRef()

  // Определяем - это свой профиль или чужой
  const isOwnProfile = !userId || userId === String(user?.id)
  const profileUserId = userId ? parseInt(userId) : user?.id

  const [profile, setProfile] = useState({
    description: user?.description || '',
  })
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')
  const [avatarPreview, setAvatarPreview] = useState(fixAvatarUrl(user?.avatar_url) || null)
  const [userInfo, setUserInfo] = useState(user)
  const [completedOrders, setCompletedOrders] = useState([])
  const [loadingOrders, setLoadingOrders] = useState(false)

  useEffect(() => {
    loadUserProfile()
  }, [profileUserId, userId])

  const loadUserProfile = async () => {
    setLoading(true)
    try {
      const response = await userAPI.getUser(profileUserId)
      setUserInfo(response.data)
      if (response.data.avatar_url) {
        setAvatarPreview(fixAvatarUrl(response.data.avatar_url))
      }
      if (response.data.description) {
        setProfile({ description: response.data.description })
      }

      // Load completed orders if viewing own profile
      if (isOwnProfile) {
        await loadCompletedOrders()
      }
    } catch (error) {
      console.error('Failed to fetch user:', error)
      setMessage('Ошибка загрузки профиля')
    } finally {
      setLoading(false)
    }
  }

  const loadCompletedOrders = async () => {
    setLoadingOrders(true)
    try {
      const response = await orderAPI.getExecutorBidOrders()
      // Filter only completed orders where executor_id matches
      const completed = response.data.items.filter(
        order => order.status === 'COMPLETED' && order.executor_id === profileUserId
      )
      setCompletedOrders(completed)
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
      const fixedUrl = fixAvatarUrl(avatarUrl)
      setAvatarPreview(fixedUrl)
      // Reload user profile to get updated avatar_url
      await loadUserProfile()
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

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-600">Загрузка профиля...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-4xl mx-auto px-4 py-6 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate(-1)}
              className="text-blue-600 hover:text-blue-700 font-medium"
            >
              ← Назад
            </button>
            <h1 className="text-3xl font-bold text-gray-900">
              {isOwnProfile ? 'Мой профиль' : 'Профиль исполнителя'}
            </h1>
          </div>
          <div className="flex gap-4 items-center">
            {isOwnProfile && (
              <button
                onClick={() => navigate('/executor-home')}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg transition"
              >
                Список Заказов
              </button>
            )}
            {isOwnProfile && (
              <button
                onClick={handleLogout}
                className="bg-red-500 hover:bg-red-600 text-white px-6 py-2 rounded-lg transition"
              >
                Выход
              </button>
            )}
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
                  <span className="text-gray-500 text-center text-xs">Нет фото</span>
                </div>
              )}
              <h2 className="text-xl font-bold text-gray-900 mb-1">
                {userInfo?.username}
              </h2>
              <p className="text-gray-600 text-sm mb-1">{userInfo?.email}</p>
              <p className="text-gray-600 text-sm mb-4 font-medium">Исполнитель</p>

              {isOwnProfile && (
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={loading}
                  className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-medium py-2 rounded-lg transition"
                >
                  Загрузить фото
                </button>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleAvatarChange}
                hidden
              />
            </div>
          </div>

          {/* Profile Form or View */}
          <div className="md:col-span-2 space-y-8">
            {isOwnProfile ? (
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4">
                  Редактировать профиль
                </h3>
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
                      placeholder="Расскажите о себе, вашем опыте и квалификации..."
                      rows="6"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-medium py-2 rounded-lg transition"
                  >
                    {loading ? 'Сохранение...' : 'Сохранить профиль'}
                  </button>
                </form>
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4">О профиле</h3>
                <div>
                  <p className="text-sm text-gray-600 mb-2">Описание:</p>
                  <p className="text-gray-900">
                    {userInfo?.description || 'Описание не заполнено'}
                  </p>
                </div>
              </div>
            )}

            {/* Completed Orders - only for own profile */}
            {isOwnProfile && (
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4">
                  Выполненные заказы ({completedOrders.length})
                </h3>

                {loadingOrders ? (
                  <p className="text-gray-600">Загрузка заказов...</p>
                ) : completedOrders.length === 0 ? (
                  <p className="text-gray-600">Пока нет выполненных заказов</p>
                ) : (
                  <div className="space-y-4">
                    {completedOrders.map(order => (
                      <div
                        key={order.id}
                        className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 transition cursor-pointer"
                        onClick={() => navigate(`/order/${order.id}`)}
                      >
                        <div className="flex justify-between items-start mb-2">
                          <h4 className="font-bold text-gray-900">{order.title}</h4>
                          <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                            Завершён
                          </span>
                        </div>
                        <p className="text-gray-600 text-sm mb-2">
                          {order.description}
                        </p>
                        <p className="text-xs text-gray-500">
                          ID заказа: {order.id}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
