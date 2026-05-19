import { useState, useRef, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { orderAPI, bidAPI, userAPI, imageAPI } from '../services/api'
import StatusProgressWidget from '../components/StatusProgressWidget'
import OrderDetailsCard from '../components/OrderDetailsCard'
import MapDisplay from '../components/MapDisplay'
import NotificationPanel from '../components/NotificationPanel'

// CSS for animations
const animationStyles = `
  @keyframes pulse-wave {
    0% {
      box-shadow: 0 0 0 0 rgba(59, 130, 246, 0.7);
    }
    70% {
      box-shadow: 0 0 0 10px rgba(59, 130, 246, 0);
    }
    100% {
      box-shadow: 0 0 0 0 rgba(59, 130, 246, 0);
    }
  }
  
  .pulse-wave {
    animation: pulse-wave 2s infinite;
  }
  
  @keyframes slide-in {
    from {
      transform: scaleX(0);
      transform-origin: left;
    }
    to {
      transform: scaleX(1);
      transform-origin: left;
    }
  }
  
  .progress-line-active {
    animation: slide-in 0.6s ease-out;
  }

  @keyframes slide-in-right {
    from {
      transform: translateX(400px);
      opacity: 0;
    }
    to {
      transform: translateX(0);
      opacity: 1;
    }
  }

  .animate-slide-in {
    animation: slide-in-right 0.3s ease-out;
  }
`

// Add styles to document
if (typeof document !== 'undefined') {
  const style = document.createElement('style')
  style.textContent = animationStyles
  if (!document.head.querySelector('style[data-order-detail]')) {
    style.setAttribute('data-order-detail', 'true')
    document.head.appendChild(style)
  }
}

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

// Helper function to fix image URL (same as avatar URL)
const fixImageUrl = (url) => {
  if (!url) return null
  let fixedUrl = url
  // Replace frontend port 5731 with MinIO port 9000
  fixedUrl = fixedUrl.replace(':5731/', ':9000/')
  // Ensure http:// prefix exists
  if (!fixedUrl.startsWith('http://') && !fixedUrl.startsWith('https://')) {
    fixedUrl = 'http://' + fixedUrl
  }
  console.log('Converted image URL from', url, 'to', fixedUrl)
  return fixedUrl
}

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
  const [bidComment, setBidComment] = useState('')
  const [submittingBid, setSubmittingBid] = useState(false)
  const [executorHasBid, setExecutorHasBid] = useState(false)
  const [galleryOpen, setGalleryOpen] = useState(false)
  const [currentImageIndex, setCurrentImageIndex] = useState(0)
  const [notifications, setNotifications] = useState([])

  const addNotification = (message, type = 'info') => {
    const id = Date.now()
    setNotifications((prev) => [...prev, { id, message, type }])
  }

  const removeNotification = (id) => {
    setNotifications((prev) => prev.filter((notif) => notif.id !== id))
  }

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
          customerResponse.data.avatar_url = fixAvatarUrl(
            customerResponse.data.avatar_url
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
            executorResponse.data.avatar_url = fixAvatarUrl(
              executorResponse.data.avatar_url
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
                executorResponse.data.avatar_url = fixAvatarUrl(
                  executorResponse.data.avatar_url
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

      // Check if executor has already bid on this order
      if (user?.role === 'EXECUTOR' && orderResponse.data.status === 'OPEN') {
        try {
          const bidsResponse = await bidAPI.getBidsByOrder(orderId)
          const hasExistingBid = bidsResponse.data.some(bid => bid.owner_id === user.id)
          setExecutorHasBid(hasExistingBid)
        } catch (err) {
          console.error('Failed to check executor bid:', err)
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
      addNotification('Исполнитель выбран!', 'success')
      navigate('/customer-profile')
    } catch (error) {
      addNotification(
        error.response?.data?.detail || 'Ошибка при выборе исполнителя',
        'error'
      )
    }
  }

  const handleCompleteWork = async () => {
    if (!order) return

    try {
      await orderAPI.completeWork(order.id)
      setOrder({ ...order, status: 'AWAITING_APPROVAL' })
      addNotification('Работа отправлена на проверку', 'success')
    } catch (error) {
      addNotification(error.response?.data?.detail || 'Ошибка', 'error')
    }
  }

  const handleApproveWork = async () => {
    if (!order) return

    try {
      await orderAPI.approveCompletion(order.id)
      setOrder({ ...order, status: 'COMPLETED' })
      addNotification('Работа одобрена!', 'success')
    } catch (error) {
      addNotification(error.response?.data?.detail || 'Ошибка', 'error')
    }
  }

  const handleSendForRevision = async () => {
    if (!order) return

    try {
      await orderAPI.sendForRevision(order.id)
      setOrder({ ...order, status: 'NEEDS_REVISION' })
      addNotification('Заказ отправлен на доработку', 'success')
    } catch (error) {
      addNotification(
        error.response?.data?.detail || 'Ошибка при отправке на доработку',
        'error'
      )
    }
  }

  const handleResubmitRevision = async () => {
    if (!order) return

    try {
      await orderAPI.resubmitRevision(order.id)
      setOrder({ ...order, status: 'AWAITING_APPROVAL' })
      addNotification('Работа переотправлена на проверку', 'success')
    } catch (error) {
      addNotification(
        error.response?.data?.detail || 'Ошибка при переотправке работы',
        'error'
      )
    }
  }

  const handleSubmitBid = async () => {
    if (!order || !bidComment.trim()) return

    setSubmittingBid(true)
    try {
      await bidAPI.createBid(order.id, bidComment)
      setBidComment('')
      setExecutorHasBid(true)
      addNotification('Ставка отправлена!', 'success')
    } catch (error) {
      addNotification(
        error.response?.data?.detail || 'Ошибка при отправке ставки',
        'error'
      )
    } finally {
      setSubmittingBid(false)
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

  const openGallery = (index) => {
    setCurrentImageIndex(index)
    setGalleryOpen(true)
  }

  const closeGallery = () => {
    setGalleryOpen(false)
  }

  const goToPreviousImage = () => {
    if (order?.image_urls) {
      setCurrentImageIndex((prev) =>
        prev === 0 ? order.image_urls.length - 1 : prev - 1
      )
    }
  }

  const goToNextImage = () => {
    if (order?.image_urls) {
      setCurrentImageIndex((prev) =>
        prev === order.image_urls.length - 1 ? 0 : prev + 1
      )
    }
  }

  const handleKeyDown = (e) => {
    if (!galleryOpen) return
    if (e.key === 'ArrowLeft') goToPreviousImage()
    if (e.key === 'ArrowRight') goToNextImage()
    if (e.key === 'Escape') closeGallery()
  }

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [galleryOpen, order?.image_urls])

  const getStatusProgress = () => {
    const statuses = [
      { key: 'OPEN', label: 'Открыт', icon: '📋' },
      { key: 'IN_PROGRESS', label: 'В работе', icon: '⚙️' },
      { key: 'AWAITING_APPROVAL', label: 'На проверке', icon: '👀' },
      { key: 'COMPLETED', label: 'Завершён', icon: '✓' },
    ]

    // NEEDS_REVISION shows as going back to IN_PROGRESS (index 1)
    let currentIndex
    if (order.status === 'NEEDS_REVISION') {
      currentIndex = 1
    } else {
      currentIndex = statuses.findIndex(s => s.key === order.status)
      currentIndex = currentIndex === -1 ? 0 : currentIndex
    }

    return { statuses, currentIndex }
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
      <NotificationPanel notifications={notifications} onRemove={removeNotification} />
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
            {/* Order Details Card */}
            <OrderDetailsCard
              order={order}
              user={user}
              onCompleteWork={handleCompleteWork}
              onResubmitRevision={handleResubmitRevision}
              onApproveWork={handleApproveWork}
              onSendForRevision={handleSendForRevision}
            />

            {/* Status Progress Widget */}
            <StatusProgressWidget order={order} />

            {/* Location Map */}
            {order && (
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4">📍 Местоположение</h3>
                <MapDisplay latitude={order.latitude} longitude={order.longitude} />
              </div>
            )}

            {/* Images Section */}
            {order.image_urls && order.image_urls.length > 0 && (
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-xl font-bold text-gray-900 mb-4">Фотографии заказа</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                  {order.image_urls.map((imageUrl, idx) => (
                    <div
                      key={idx}
                      className="relative group cursor-pointer"
                      onClick={() => openGallery(idx)}
                    >
                      <img
                        src={fixImageUrl(imageUrl)}
                        alt={`Order image ${idx + 1}`}
                        className="w-full h-32 object-cover rounded-lg group-hover:opacity-75 transition"
                        onError={(e) => {
                          console.error('Image failed to load:', imageUrl)
                          e.target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"%3E%3Crect fill="%23e5e7eb" width="100" height="100"/%3E%3Ctext x="50" y="50" font-size="12" text-anchor="middle" dy=".3em" fill="%239ca3af"%3EError%3C/text%3E%3C/svg%3E'
                        }}
                      />
                      <div className="absolute inset-0 flex items-center justify-center rounded-lg opacity-0 group-hover:opacity-100 transition bg-black bg-opacity-30">
                        <span className="text-white text-2xl">🔍</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Image Gallery Modal */}
            {galleryOpen && order?.image_urls && order.image_urls.length > 0 && (
              <div className="fixed inset-0 bg-black bg-opacity-90 z-50 flex items-center justify-center">
                {/* Close Button */}
                <button
                  onClick={closeGallery}
                  className="absolute top-4 right-4 text-white text-3xl hover:text-gray-300 transition"
                >
                  ✕
                </button>

                {/* Main Image */}
                <div className="flex items-center justify-center w-full h-full px-4">
                  <button
                    onClick={goToPreviousImage}
                    className="absolute left-4 text-white text-4xl hover:text-gray-300 transition p-2 hover:bg-white hover:bg-opacity-10 rounded"
                  >
                    ‹
                  </button>

                  <img
                    src={fixImageUrl(order.image_urls[currentImageIndex])}
                    alt={`Gallery image ${currentImageIndex + 1}`}
                    className="max-w-5xl max-h-screen object-contain"
                    onError={(e) => {
                      e.target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"%3E%3Crect fill="%23404040" width="100" height="100"/%3E%3Ctext x="50" y="50" font-size="12" text-anchor="middle" dy=".3em" fill="%23808080"%3EError%3C/text%3E%3C/svg%3E'
                    }}
                  />

                  <button
                    onClick={goToNextImage}
                    className="absolute right-4 text-white text-4xl hover:text-gray-300 transition p-2 hover:bg-white hover:bg-opacity-10 rounded"
                  >
                    ›
                  </button>
                </div>

                {/* Image Counter */}
                <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 text-white text-center">
                  <p className="text-lg font-medium">
                    {currentImageIndex + 1} / {order.image_urls.length}
                  </p>
                  <p className="text-sm text-gray-300 mt-1">
                    Используй ← → или стрелки клавиатуры, ESC для закрытия
                  </p>
                </div>
              </div>
            )}

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

                {/* Executor Bid Form */}
                {user?.role === 'EXECUTOR' && order.status === 'OPEN' && (
                  <div className="border-t pt-4">
                    <p className="text-xs uppercase text-gray-600 font-semibold mb-3">
                      Создать ставку
                    </p>
                    {executorHasBid ? (
                      <div className="bg-blue-50 border border-blue-200 rounded p-3 text-sm text-blue-700">
                        ✓ Вы уже отправили ставку на этот заказ
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <textarea
                          value={bidComment}
                          onChange={(e) => setBidComment(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                          placeholder="Ваш комментарий..."
                          rows="4"
                        />
                        <button
                          onClick={handleSubmitBid}
                          disabled={submittingBid || !bidComment.trim()}
                          className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-medium py-2 rounded-lg transition"
                        >
                          {submittingBid ? 'Отправка...' : 'Отправить ставку'}
                        </button>
                      </div>
                    )}
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
