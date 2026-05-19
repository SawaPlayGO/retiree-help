import { useEffect } from 'react'

const getNotificationStyles = (type) => {
  switch (type) {
    case 'success':
      return 'bg-green-50 border-green-200 text-green-800'
    case 'error':
      return 'bg-red-50 border-red-200 text-red-800'
    case 'info':
      return 'bg-blue-50 border-blue-200 text-blue-800'
    default:
      return 'bg-gray-50 border-gray-200 text-gray-800'
  }
}

const getNotificationIcon = (type) => {
  switch (type) {
    case 'success':
      return '✓'
    case 'error':
      return '✕'
    case 'info':
      return 'ℹ'
    default:
      return '●'
  }
}

export default function NotificationPanel({ notifications, onRemove }) {
  return (
    <div className="fixed top-0 right-0 z-50 pt-4 pr-4 max-w-sm">
      <div className="space-y-3">
        {notifications.map((notification) => (
          <NotificationItem
            key={notification.id}
            notification={notification}
            onRemove={onRemove}
          />
        ))}
      </div>
    </div>
  )
}

function NotificationItem({ notification, onRemove }) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onRemove(notification.id)
    }, 4000)

    return () => clearTimeout(timer)
  }, [notification.id, onRemove])

  return (
    <div
      className={`animate-slide-in border rounded-lg p-4 shadow-lg flex items-start gap-3 ${getNotificationStyles(
        notification.type
      )}`}
    >
      <span className="flex-shrink-0 text-lg font-bold">
        {getNotificationIcon(notification.type)}
      </span>
      <div className="flex-1 min-w-0">
        <p className="font-medium">{notification.message}</p>
      </div>
      <button
        onClick={() => onRemove(notification.id)}
        className="flex-shrink-0 hover:opacity-70 transition"
      >
        ✕
      </button>
    </div>
  )
}
