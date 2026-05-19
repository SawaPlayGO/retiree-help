import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { orderAPI, bidAPI, userAPI, imageAPI } from '../services/api'

export default function OrderDetail() {
  const { orderId } = useParams()
  const navigate = useNavigate()
  const { user, logout } = useAuth()

  const [order, setOrder] = useState(null)
  const [bids, setBids] = useState([])
  const [bidExecutors, setBidExecutors] = useState({})
  const [executor, setExecutor] = useState(null)
  const [customer, setCustomer] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedBidId, setSelectedBidId] = useState(null)

  useEffect(() => {
    loadOrder()
  }, [orderId])

  const loadOrder = async () => {
    try {
      const orderResponse = await orderAPI.getOrder(orderId)
      setOrder(orderResponse.data)

      // Load customer info
      try {
        const customerResponse = await userAPI.getUser(orderResponse.data.owner_id)
        if (customerResponse.data.avatar_url) {
          customerResponse.data.avatar_url = imageAPI.transformAvatarUrl(
            customerResponse.data.avatar_url,
            orderResponse.data.owner_id
          )
        }
        setCustomer(customerResponse.data)
      } catch (err) {
        console.error(`Failed to load customer ${orderResponse.data.owner_id}:`, err)
      }

      // Load executor info if assigned
      if (orderResponse.data.executor_id) {
        try {
          const executorResponse = await userAPI.getUser(orderResponse.data.executor_id)
          if (executorResponse.data.avatar_url) {
            executorResponse.data.avatar_url = imageAPI.transformAvatarUrl(
              executorResponse.data.avatar_url,
              orderResponse.data.executor_id
            )
          }
          setExecutor(executorResponse.data)
        } catch (err) {
          console.error(`Failed to load executor ${orderResponse.data.executor_id}:`, err)
        }
      }

      // Load bids if customer and order is open
      if (user?.role === 'CUSTOMER' && orderResponse.data.status === 'OPEN') {
        try {
          const bidsResponse = await bidAPI.getBidsByOrder(orderId)
          setBids(bidsResponse.data)

          // Load executor info for each bid
          const executors = {}
          for (const bid of bidsResponse.data) {
            try {
              const executorResponse = await userAPI.getUser(bid.owner_id)
              if (executorResponse.data.avatar_url) {
                executorResponse.data.avatar_url = imageAPI.transformAvatarUrl(
                  executorResponse.data.avatar_url,
                  bid.owner_id
                )
              }
              executors[bid.owner_id] = executorResponse.data
            } catch (err) {
              console.error(`Failed to load executor ${bid.owner_id}:`, err)
            }
          }
          setBidExecutors(executors)
        } catch (err) {
          console.error('Failed to load bids:', err)
        }
      }
    } catch (err) {
      setError(err.response?.data?.detail || 'Ошибка загрузки заказа')
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const handleSelectExecutor = async (bidId, executorId) => {
    if (!order) return

    try {
      await orderAPI.assignExecutor(order.id, executorId)
      alert('Исполнитель выбран!')
      navigate('/customer-profile')
    } catch (error) {
      alert(error.response?.data?.detail || 'Ошибка при выборе исполнителя')
    }
  }

  const handleCompleteWork = async () => {
    if (!order) return

    try {
      await orderAPI.completeWork(order.id)
      setOrder({ ...order, status: 'AWAITING_APPROVAL' })
      alert('Работа отправлена на проверку')
    } catch (error) {
      alert(error.response?.data?.detail || 'Ошибка')
    }
  }

  const handleApproveWork = async () => {
    if (!order) return

    try {
      await orderAPI.approveCompletion(order.id)
      setOrder({ ...order, status: 'COMPLETED' })
      alert('Работа одобрена!')
    } catch (error) {
      alert(error.response?.data?.detail || 'Ошибка')
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-600">Загрузка...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <button
            onClick={() => navigate('/executor-home')}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg"
          >
            Вернуться
          </button>
        </div>
      </div>
    )
  }

  if (!order) return null

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-6 flex justify-between items-center">
          <button
            onClick={() => navigate(-1)}
            className="text-blue-600 hover:text-blue-700 font-medium"
          >
            ← Назад
          </button>
          <h1 className="text-2xl font-bold text-gray-900">{order.title}</h1>
          <button
            onClick={handleLogout}
            className="bg-red-500 hover:bg-red-600 text-white px-6 py-2 rounded-lg transition"
          >
            Выход
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Order Details */}
          <div className="lg:col-span-2 space-y-6">
            {/* Order Info */}
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">{order.title}</h2>
                  <p className="text-gray-600 mt-2">{order.description}</p>
                </div>
                <span
                  className={`text-sm font-semibold px-4 py-2 rounded-full ${getStatusColor(
                    order.status
                  )}`}
                >
                  {getStatusLabel(order.status)}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                <div>
                  <p className="text-sm text-gray-600">Координаты</p>
                  <p className="font-medium">
                    {order.latitude.toFixed(4)}, {order.longitude.toFixed(4)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">ID заказа</p>
                  <p className="font-medium">{order.id}</p>
                </div>
              </div>

              {/* Status-specific buttons */}
              {user?.role === 'EXECUTOR' && order.status === 'IN_PROGRESS' && (
                <button
                  onClick={handleCompleteWork}
                  className="w-full mt-4 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 rounded-lg transition"
                >
                  Отправить на проверку
                </button>
              )}

              {user?.role === 'CUSTOMER' && order.status === 'AWAITING_APPROVAL' && (
                <div className="mt-4 space-y-2">
                  <button
                    onClick={handleApproveWork}
                    className="w-full bg-green-600 hover:bg-green-700 text-white font-medium py-2 rounded-lg transition"
                  >
                    ✓ Принять работу
                  </button>
                  <button
                    className="w-full bg-yellow-500 hover:bg-yellow-600 text-white font-medium py-2 rounded-lg transition cursor-not-allowed opacity-50"
                    disabled
                  >
                    ⟳ Отправить на доработку
                  </button>
                </div>
              )}
            </div>

            {/* Bids Section */}
            {user?.role === 'CUSTOMER' && order.status === 'OPEN' && (
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-xl font-bold text-gray-900 mb-4">
                  Ставки ({bids.length})
                </h3>

                {bids.length === 0 ? (
                  <p className="text-gray-600">Пока нет ставок</p>
                ) : (
                  <div className="space-y-4">
                    {bids.map(bid => {
                      const executor = bidExecutors[bid.owner_id]
                      return (
                        <div
                          key={bid.id}
                          className={`border rounded-lg p-4 cursor-pointer transition ${
                            selectedBidId === bid.id
                              ? 'border-blue-500 bg-blue-50'
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                          onClick={() => setSelectedBidId(bid.id)}
                        >
                          <div className="flex justify-between items-start mb-2">
                            <div className="flex items-center gap-3 flex-1">
                              {executor?.avatar_url && (
                                <img
                                  src={executor.avatar_url}
                                  alt={executor.name}
                                  className="w-10 h-10 rounded-full object-cover"
                                />
                              )}
                              <div>
                                <h4
                                  className="font-bold text-gray-900 hover:text-blue-600 transition"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    navigate(`/executor-profile/${bid.owner_id}`)
                                  }}
                                >
                                  {executor?.name || `Исполнитель ${bid.owner_id}`}
                                </h4>
                                {executor?.description && (
                                  <p className="text-xs text-gray-600">
                                    {executor.description}
                                  </p>
                                )}
                              </div>
                            </div>
                            <span className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded">
                              Ставка #{bid.id}
                            </span>
                          </div>
                          <p className="text-gray-600">{bid.comment}</p>
                          {selectedBidId === bid.id && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                handleSelectExecutor(bid.id, bid.owner_id)
                              }}
                              className="mt-3 w-full bg-green-600 hover:bg-green-700 text-white font-medium py-2 rounded-lg transition"
                            >
                              Выбрать этого исполнителя
                            </button>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow p-6 sticky top-8">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Информация</h3>

              <div className="space-y-4">
                <div>
                  <p className="text-xs uppercase text-gray-600 font-semibold">Статус</p>
                  <p className="font-medium text-gray-900">{getStatusLabel(order.status)}</p>
                </div>

                {order.executor_id && executor && (
                  <div>
                    <p className="text-xs uppercase text-gray-600 font-semibold">
                      Исполнитель
                    </p>
                    <button
                      onClick={() => navigate(`/executor-profile/${order.executor_id}`)}
                      className="font-medium text-blue-600 hover:text-blue-800 hover:underline"
                    >
                      {executor.name || `Исполнитель ${order.executor_id}`}
                    </button>
                  </div>
                )}

                {customer && (
                  <div>
                    <p className="text-xs uppercase text-gray-600 font-semibold">
                      Заказчик
                    </p>
                    <button
                      onClick={() => navigate(`/customer-profile/${order.owner_id}`)}
                      className="font-medium text-blue-600 hover:text-blue-800 hover:underline"
                    >
                      {customer.name || `Пользователь ${order.owner_id}`}
                    </button>
                  </div>
                )}

                {order.images && order.images.length > 0 && (
                  <div>
                    <p className="text-xs uppercase text-gray-600 font-semibold mb-2">
                      Изображения
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      {order.images.map((img, idx) => (
                        <div key={idx} className="relative">
                          <img
                            src={img.image_url}
                            alt="Order"
                            className="w-full h-20 object-cover rounded"
                            onError={(e) => {
                              console.error('Image failed to load:', img.image_url)
                              e.target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"%3E%3Crect fill="%23e5e7eb" width="100" height="100"/%3E%3Ctext x="50" y="50" font-size="10" text-anchor="middle" dy=".3em" fill="%239ca3af"%3ENo image%3C/text%3E%3C/svg%3E'
                            }}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
