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
`

// Add styles to document
if (typeof document !== 'undefined') {
  const style = document.createElement('style')
  style.textContent = animationStyles
  if (!document.head.querySelector('style[data-status-progress]')) {
    style.setAttribute('data-status-progress', 'true')
    document.head.appendChild(style)
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

const getStatusProgress = (order) => {
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

export default function StatusProgressWidget({ order }) {
  if (!order) return null

  const progress = getStatusProgress(order)

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-bold text-gray-900 mb-6">Статус заказа</h3>
      <div className="flex items-center justify-between">
        {progress.statuses.map((status, idx) => {
          const isActive = idx <= progress.currentIndex
          const isCurrent = idx === progress.currentIndex

          return (
            <div key={status.key} className="flex flex-col items-center flex-1">
              {/* Progress Circle */}
              <div
                className={`relative w-12 h-12 rounded-full flex items-center justify-center text-2xl transition-all duration-300 ${
                  isCurrent
                    ? 'bg-blue-100 pulse-wave ring-2 ring-blue-500'
                    : isActive
                    ? 'bg-green-100 ring-2 ring-green-500'
                    : 'bg-gray-100 ring-2 ring-gray-300'
                }`}
              >
                {status.icon}
              </div>

              {/* Status Label */}
              <p
                className={`text-xs font-semibold mt-3 text-center transition-colors ${
                  isCurrent
                    ? 'text-blue-600'
                    : isActive
                    ? 'text-green-600'
                    : 'text-gray-500'
                }`}
              >
                {status.label}
              </p>

              {/* Progress Line */}
              {idx < progress.statuses.length - 1 && (
                <div className="w-full h-1 bg-gray-200 mt-3 relative flex-grow-0 md:min-w-[40px]">
                  {isActive && (
                    <div className="h-full bg-green-500 progress-line-active"></div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
