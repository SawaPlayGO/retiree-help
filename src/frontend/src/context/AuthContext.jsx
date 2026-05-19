import { createContext, useContext, useState, useEffect } from 'react'
import { authAPI, userAPI } from '../services/api'

const AuthContext = createContext()

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [token, setToken] = useState(localStorage.getItem('access_token'))

  // Load user on mount
  useEffect(() => {
    const initAuth = async () => {
      const savedToken = localStorage.getItem('access_token')
      if (savedToken) {
        try {
          const response = await userAPI.getMe()
          setUser(response.data)
          setToken(savedToken)
        } catch (error) {
          console.error('Failed to load user:', error)
          localStorage.removeItem('access_token')
        }
      }
      setLoading(false)
    }

    initAuth()
  }, [])

  const register = async (email, username, password, role) => {
    const response = await authAPI.register(email, username, password, role)
    localStorage.setItem('access_token', response.data.access_token)
    setToken(response.data.access_token)
    // Fetch user data after registration
    const userResponse = await userAPI.getMe()
    setUser(userResponse.data)
    return userResponse.data
  }

  const login = async (email, password) => {
    const response = await authAPI.login(email, password)
    localStorage.setItem('access_token', response.data.access_token)
    setToken(response.data.access_token)
    // Fetch user data after login
    const userResponse = await userAPI.getMe()
    setUser(userResponse.data)
    return userResponse.data
  }

  const logout = () => {
    localStorage.removeItem('access_token')
    setToken(null)
    setUser(null)
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        isAuthenticated: !!user,
        register,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}
