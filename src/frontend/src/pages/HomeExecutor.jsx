import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { orderAPI, bidAPI, userAPI, imageAPI } from '../services/api'

export default function HomeExecutor() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const [orders, setOrders] = useState([])
  const [customers, setCustomers] = useState({})
  const [userAvatar, setUserAvatar] = useState(null)
  const [selectedOrder, setSelectedOrder] = useState(null)
  const [bidComment, setBidComment] = useState('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
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
            customerResponse.data.avatar_url = imageAPI.transformAvatarUrl(
              customerResponse.data.avatar_url,
              order.owner_id
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
        setUserAvatar(imageAPI.transformAvatarUrl(response.data.avatar_url, response.data.id))
      }
    } catch (err) {
      console.error('Failed to load user avatar:', err)
    }
  }

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const handleOrderSelect = (order) => {
    setSelectedOrder(order)
    setBidComment('')
  }

  const handleSubmitBid = async () => {
    if (!selectedOrder) return

    setSubmitting(true)
    try {
      await bidAPI.createBid(selectedOrder.id, bidComment)
      setOrders(
        orders.map(order =>
          order.id === selectedOrder.id
            ? order
            : order
        )
      )
      setBidComment('')
      setSelectedOrder(null)
      alert('Ставка отправлена!')
      await loadOrders()
    } catch (error) {
      alert(error.response?.data?.detail || 'Ошибка при отправке ставки')
    } finally {
      setSubmitting(false)
    }
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
        <div className="max-w-7xl mx-auto px-4 py-6 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Доступные заказы</h1>
            <p className="text-gray-600">Привет, {user?.username}!</p>
          </div>
          <div className="flex gap-4 items-center">
            {/* Avatar Circle */}
            <div className="w-10 h-10 rounded-full bg-purple-600 flex items-center justify-center text-white font-bold overflow-hidden">
              {userAvatar ? (
                <img
                  src={userAvatar}
                  alt="Avatar"
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.target.style.display = 'none'
                  }}
                />
              ) : null}
              {!userAvatar && (
                <span>{user?.username?.[0]?.toUpperCase() || '?'}</span>
              )}
            </div>

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
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Orders List */}
            <div className="lg:col-span-2">
              <div className="space-y-4">
                {orders.length === 0 ? (
                  <div className="bg-white rounded-lg shadow p-8 text-center">
                    <p className="text-gray-600">Нет доступных заказов</p>
                  </div>
                ) : (
                  orders.map(order => (
                    <div
                      key={order.id}
                      onClick={() => handleOrderSelect(order)}
                      className={`bg-white rounded-lg shadow p-6 cursor-pointer transition hover:shadow-lg ${
                        selectedOrder?.id === order.id ? 'ring-2 ring-blue-500' : ''
                      }`}
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
                          📍 {order.latitude.toFixed(4)}, {order.longitude.toFixed(4)}
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
            </div>

            {/* Bid Form */}
            <div className="lg:col-span-1">
              {selectedOrder ? (
                <div className="bg-white rounded-lg shadow p-6 sticky top-8">
                  <h3 className="text-lg font-bold text-gray-900 mb-4">
                    Создать ставку
                  </h3>

                  <div className="mb-4 pb-4 border-b">
                    <p className="text-sm font-medium text-gray-700">
                      {selectedOrder.title}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      ID заказа: {selectedOrder.id}
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Комментарий
                    </label>
                    <textarea
                      value={bidComment}
                      onChange={(e) => setBidComment(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                      placeholder="Ваш комментарий к заказу..."
                      rows="5"
                    />
                  </div>

                  <button
                    onClick={handleSubmitBid}
                    disabled={submitting || !bidComment.trim()}
                    className="w-full mt-4 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-medium py-2 rounded-lg transition"
                  >
                    {submitting ? 'Отправка...' : 'Отправить ставку'}
                  </button>

                  <button
                    onClick={() => setSelectedOrder(null)}
                    className="w-full mt-2 bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium py-2 rounded-lg transition"
                  >
                    Отмена
                  </button>
                </div>
              ) : (
                <div className="bg-white rounded-lg shadow p-6">
                  <p className="text-gray-600 text-center">
                    Выберите заказ из списка, чтобы создать ставку
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
