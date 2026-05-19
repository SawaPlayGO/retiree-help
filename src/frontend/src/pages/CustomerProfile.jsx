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

export default function CustomerProfile() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const { userId } = useParams()
  const fileInputRef = useRef()

  // Check if viewing own profile or someone else's
  const isOwnProfile = !userId || userId === String(user?.id)
  const profileUserId = userId ? parseInt(userId) : user?.id

  const [profile, setProfile] = useState({
    description: isOwnProfile ? (user?.description || '') : '',
  })
  const [userOrders, setUserOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadingOrders, setLoadingOrders] = useState(true)
  const [message, setMessage] = useState('')
  const [avatarPreview, setAvatarPreview] = useState(null)
  const [userInfo, setUserInfo] = useState(null)

  useEffect(() => {
    loadUserProfile()
  }, [userId])

  useEffect(() => {
    if (userInfo?.id) {
      loadUserOrders()
    }
  }, [userInfo?.id])

  const loadUserProfile = async () => {
    try {
      setLoading(true)
      let response
      if (isOwnProfile) {
        response = await userAPI.getMe()
      } else {
        response = await userAPI.getUser(profileUserId)
      }
      console.log('User profile loaded:', response.data)
      console.log('Avatar URL (original):', response.data.avatar_url)
      const fixedUrl = fixAvatarUrl(response.data.avatar_url)
      console.log('Avatar URL (fixed):', fixedUrl)
      setUserInfo(response.data)
      if (response.data.avatar_url) {
        setAvatarPreview(fixedUrl)
      }
      if (response.data.description) {
        setProfile({ description: response.data.description })
      }
    } catch (error) {
      console.error('Failed to fetch user:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadUserOrders = async () => {
    try {
      setLoadingOrders(true)
      // Only load orders for own profile
      if (isOwnProfile) {
        const response = await orderAPI.getMyOrders(0, 100)
        setUserOrders(response.data.items || [])
      } else {
        // For other profiles, we can't load their orders (API limitation)
        setUserOrders([])
      }
    } catch (error) {
      console.error('Failed to fetch orders:', error)
      setUserOrders([])
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

  const getStatusColor = (status) => {
    switch (status) {
      case 'OPEN':
        return 'bg-yellow-100 text-yellow-800'
      case 'IN_PROGRESS':
        return 'bg-blue-100 text-blue-800'
      case 'AWAITING_APPROVAL':
        return 'bg-orange-100 text-orange-800'
      case 'NEEDS_REVISION':
        return 'bg-red-100 text-red-800'
      case 'COMPLETED':
        return 'bg-green-100 text-green-800'
      case 'CANCELLED':
        return 'bg-gray-200 text-gray-700'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusLabel = (status) => {
    const labels = {
      OPEN: 'Открыт',
      IN_PROGRESS: 'В прогрессе',
      AWAITING_APPROVAL: 'Ожидает одобрения',
      NEEDS_REVISION: 'Требует доработки',
      COMPLETED: 'Завершён',
      CANCELLED: 'Отменён',
    }
    return labels[status] || status
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-4xl mx-auto px-4 py-6 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <h1 className="text-3xl font-bold text-gray-900">
              {isOwnProfile ? 'Мой профиль' : `Профиль ${userInfo?.name || `пользователя ${profileUserId}`}`}
            </h1>
            {!isOwnProfile && userInfo?.role && (
              <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
                {userInfo.role === 'CUSTOMER' ? 'Заказчик' : 'Исполнитель'}
              </span>
            )}
          </div>
          <div className="flex gap-4 items-center">
            {isOwnProfile ? (
              <button
                onClick={handleLogout}
                className="bg-red-500 hover:bg-red-600 text-white px-6 py-2 rounded-lg transition"
              >
                Выход
              </button>
            ) : (
              <button
                onClick={() => navigate(-1)}
                className="bg-gray-500 hover:bg-gray-600 text-white px-6 py-2 rounded-lg transition"
              >
                ← Назад
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 py-8">
        {loading ? (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <p className="text-gray-600 text-lg">Загрузка профиля...</p>
          </div>
        ) : !userInfo ? (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <p className="text-gray-600 text-lg">Профиль не найден</p>
          </div>
        ) : (
          <>
            {message && (
              <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded text-blue-600">
                {message}
              </div>
            )}

            {/* For viewing other profiles - simplified view */}
            {!isOwnProfile ? (
              <div className="space-y-6">
                {/* Profile Card */}
                <div className="bg-white rounded-lg shadow p-6">
                  <div className="text-center">
                    {avatarPreview ? (
                      <img
                        src={avatarPreview}
                        alt="Avatar"
                        crossOrigin="anonymous"
                        className="w-32 h-32 rounded-full mx-auto mb-4 object-cover"
                        onError={(e) => {
                          e.target.style.display = 'none'
                        }}
                      />
                    ) : (
                      <div className="w-32 h-32 rounded-full mx-auto mb-4 bg-gray-200 flex items-center justify-center">
                        <span className="text-gray-500">Нет фото</span>
                      </div>
                    )}
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">{userInfo?.username}</h2>
                    <p className="text-gray-600 mb-1">{userInfo?.email}</p>
                    {userInfo?.description && (
                      <p className="text-gray-700 mt-4 italic">{userInfo.description}</p>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <>
                {/* Own profile - full view */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Profile Card */}
          <div className="md:col-span-1 bg-white rounded-lg shadow p-6">
            <div className="text-center">
              {avatarPreview ? (
                <img
                  src={avatarPreview}
                  alt="Avatar"
                  crossOrigin="anonymous"
                  className="w-24 h-24 rounded-full mx-auto mb-4 object-cover"
                  onError={(e) => {
                    console.error('Image load error:', e.target.src)
                    console.error('Error details:', e)
                    e.target.style.display = 'none'
                  }}
                  onLoad={() => {
                    console.log('Avatar loaded successfully:', avatarPreview)
                  }}
                />
              ) : (
                <div className="w-24 h-24 rounded-full mx-auto mb-4 bg-gray-200 flex items-center justify-center">
                  <span className="text-gray-500">Нет фото</span>
                </div>
              )}
              <h2 className="text-xl font-bold text-gray-900 mb-1">{userInfo?.username}</h2>
              <p className="text-gray-600 text-sm mb-4">{userInfo?.email}</p>

              {isOwnProfile && (
                <>
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
                </>
              )}
            </div>
          </div>

          {/* Forms */}
          <div className="md:col-span-2 space-y-8">
            {isOwnProfile && (
              <>
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

            {/* Create Order Button */}
            {isOwnProfile && (
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex flex-col items-center justify-center py-8 space-y-4">
                  <h3 className="text-lg font-bold text-gray-900">Создать новый заказ</h3>
                  <p className="text-gray-600 text-center max-w-md">
                    Опишите вашу задачу, загрузите фото и получите предложения от профессионалов
                  </p>
                  <button
                    onClick={() => navigate('/create-order')}
                    className="bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-8 rounded-lg transition"
                  >
                    ✨ Создать заказ
                  </button>
                </div>
              </div>
            )}
              </>
            )}

            {/* My Orders */}
            <div className="bg-white rounded-lg shadow p-6 col-span-full">
              <h3 className="text-lg font-bold text-gray-900 mb-4">
                {isOwnProfile ? 'Мои заказы' : 'Заказы пользователя'} ({userOrders.length})
              </h3>

              {loadingOrders ? (
                <p className="text-gray-600">Загрузка заказов...</p>
              ) : userOrders.length === 0 ? (
                <p className="text-gray-600">
                  {isOwnProfile ? 'Вы еще не создали ни одного заказа' : 'Нет активных заказов'}
                </p>
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
                        <span>📍 На карте выбранное место</span>
                        <span>🆔 Заказ #{order.id}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
                </div>
              </>
            )}
          </>
        )}
      </main>
    </div>
  )
}
