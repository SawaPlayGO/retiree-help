import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { orderAPI, bidAPI, userAPI, imageAPI } from '../services/api'

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

export default function HomeExecutor() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const [orders, setOrders] = useState([])
  const [customers, setCustomers] = useState({})
  const [userAvatar, setUserAvatar] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    loadOrders()
    loadUserAvatar()
  }, [])

  const loadOrders = async () => {
    try {
      setLoading(true)
      const response = await orderAPI.getAllOrders(0, 100)
      setOrders(response.data.items || [])

      // Load customer info for each order
      const customersMap = {}
      for (const order of response.data.items || []) {
        try {
          const customerResponse = await userAPI.getUser(order.owner_id)
          // Transform avatar URL if it exists
          if (customerResponse.data.avatar_url) {
            customerResponse.data.avatar_url = fixAvatarUrl(
              customerResponse.data.avatar_url
            )
          }
          customersMap[order.owner_id] = customerResponse.data
        } catch (err) {
          console.error(`Failed to load customer ${order.owner_id}:`, err)
        }
      }
      setCustomers(customersMap)
    } catch (err) {
      setError(err.response?.data?.detail || 'Ошибка загрузки заказов')
      console.error('Failed to load orders:', err)
    } finally {
      setLoading(false)
    }
  }

  const loadUserAvatar = async () => {
    try {
      const response = await userAPI.getMe()
      if (response.data.avatar_url) {
        setUserAvatar(fixAvatarUrl(response.data.avatar_url))
      }
    } catch (err) {
      console.error('Failed to load user avatar:', err)
    }
  }

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const handleOrderClick = (order) => {
    navigate(`/order/${order.id}`)
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
        <div className="max-w-7xl mx-auto px-4 py-6 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Доступные заказы</h1>
          </div>
          <div className="flex gap-4 items-center">
            <button
              onClick={() => navigate('/executor-profile')}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg transition"
            >
              Мой профиль
            </button>
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
      <main className="max-w-7xl mx-auto px-4 py-8">
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded text-red-600">
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <p className="text-gray-600">Загрузка заказов...</p>
          </div>
        ) : (
          <div className="space-y-4">
            {orders.length === 0 ? (
              <div className="bg-white rounded-lg shadow p-8 text-center">
                <p className="text-gray-600">Нет доступных заказов</p>
              </div>
            ) : (
              orders.map(order => (
                <div
                  key={order.id}
                  onClick={() => handleOrderClick(order)}
                  className="bg-white rounded-lg shadow p-6 cursor-pointer transition hover:shadow-lg"
                >
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex-1">
                          <h3 className="text-xl font-bold text-gray-900">
                            {order.title}
                          </h3>
                          <p className="text-gray-600 text-sm mt-1">
                            {order.description}
                          </p>
                        </div>
                        <span
                          className={`text-xs font-semibold px-3 py-1 rounded-full whitespace-nowrap ml-2 ${getStatusColor(
                            order.status
                          )}`}
                        >
                          {getStatusLabel(order.status)}
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-sm text-gray-500 mt-4">
                        <div>
                          📍 На карте выбранное место
                        </div>
                        <div>
                          🆔{' '}
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              navigate(`/customer-profile/${order.owner_id}`)
                            }}
                            className="font-medium text-blue-600 hover:text-blue-800 hover:underline"
                          >
                            {customers[order.owner_id]?.name || `Заказчик ${order.owner_id}`}
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
      </main>
    </div>
  )
}
