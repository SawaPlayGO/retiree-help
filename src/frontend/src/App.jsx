import { Routes, Route, Navigate } from 'react-router-dom'
import ProtectedRoute from './components/ProtectedRoute'
import Login from './pages/Login'
import Register from './pages/Register'
import CustomerProfile from './pages/CustomerProfile'
import ExecutorProfile from './pages/ExecutorProfile'
import HomeExecutor from './pages/HomeExecutor'
import OrderDetail from './pages/OrderDetail'
import './App.css'

export default function App() {
  return (
    <Routes>
      {/* Public routes */}
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      {/* Protected routes */}
      <Route
        path="/customer-profile"
        element={
          <ProtectedRoute requiredRole="CUSTOMER">
            <CustomerProfile />
          </ProtectedRoute>
        }
      />
      <Route
        path="/executor-profile"
        element={
          <ProtectedRoute requiredRole="EXECUTOR">
            <ExecutorProfile />
          </ProtectedRoute>
        }
      />
      <Route
        path="/executor-profile/:userId"
        element={
          <ProtectedRoute>
            <ExecutorProfile />
          </ProtectedRoute>
        }
      />
      <Route
        path="/executor-home"
        element={
          <ProtectedRoute requiredRole="EXECUTOR">
            <HomeExecutor />
          </ProtectedRoute>
        }
      />
      <Route
        path="/order/:orderId"
        element={
          <ProtectedRoute>
            <OrderDetail />
          </ProtectedRoute>
        }
      />

      {/* Redirect root to login */}
      <Route path="/" element={<Navigate to="/login" replace />} />
    </Routes>
  )
}
