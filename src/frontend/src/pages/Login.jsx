import { useState } from 'react'
import { useNavigate, Link, Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  
  const navigate = useNavigate()
  const { login, isAuthenticated, user } = useAuth()

  // Если пользователь уже авторизован, перенаправить на его домашнюю страницу
  if (isAuthenticated && user) {
    return (
      <Navigate
        to={user.role === 'EXECUTOR' ? '/executor-home' : '/customer-profile'}
        replace
      />
    )
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const user = await login(email, password)
      
      // Redirect based on role
      if (user.role === 'EXECUTOR') {
        navigate('/executor-home')
      } else if (user.role === 'CUSTOMER') {
        navigate('/customer-profile')
      } else {
        navigate('/dashboard')
      }
    } catch (err) {
      setError(err.response?.data?.detail || 'Неверные учетные данные')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-lg shadow-xl p-8">
          <h1 className="text-3xl font-bold text-center text-gray-900 mb-2">
            Пенсионеру Помощь
          </h1>
          <p className="text-center text-gray-600 mb-8">Вход в систему</p>

          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded text-red-600 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="your@email.com"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Пароль
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="••••••••"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-medium py-2 rounded-lg transition"
            >
              {loading ? 'Загрузка...' : 'Войти'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-gray-600 mb-2">Нет учетной записи?</p>
            <Link to="/register" className="text-blue-600 hover:text-blue-700 font-medium">
              Зарегистрируйтесь
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}