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

export default function OrderDetailsCard({
  order,
  user,
  onCompleteWork,
  onResubmitRevision,
  onApproveWork,
  onSendForRevision,
}) {
  if (!order) return null

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">{order.title}</h2>
          <p className="text-gray-600 mt-2">{order.description}</p>
        </div>
        <span className={`text-sm font-semibold px-4 py-2 rounded-full ${getStatusColor(order.status)}`}>
          {getStatusLabel(order.status)}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-4 pt-4 border-t">
        <div>
          <p className="text-sm text-gray-600">Статус</p>
          <p className="font-medium">{getStatusLabel(order.status)}</p>
        </div>
        <div>
          <p className="text-sm text-gray-600">ID заказа</p>
          <p className="font-medium">#{order.id}</p>
        </div>
      </div>

      {/* Status-specific buttons */}
      {user?.role === 'EXECUTOR' && order.status === 'IN_PROGRESS' && (
        <button
          onClick={onCompleteWork}
          className="w-full mt-4 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 rounded-lg transition"
        >
          Отправить на проверку
        </button>
      )}

      {user?.role === 'EXECUTOR' && order.status === 'NEEDS_REVISION' && (
        <button
          onClick={onResubmitRevision}
          className="w-full mt-4 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 rounded-lg transition"
        >
          ↻ Переотправить на проверку
        </button>
      )}

      {user?.role === 'CUSTOMER' && order.status === 'AWAITING_APPROVAL' && (
        <div className="mt-4 space-y-2">
          <button
            onClick={onApproveWork}
            className="w-full bg-green-600 hover:bg-green-700 text-white font-medium py-2 rounded-lg transition"
          >
            ✓ Принять работу
          </button>
          <button
            onClick={onSendForRevision}
            className="w-full bg-yellow-500 hover:bg-yellow-600 text-white font-medium py-2 rounded-lg transition"
          >
            ⟳ Отправить на доработку
          </button>
        </div>
      )}
    </div>
  )
}
