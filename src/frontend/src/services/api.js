import axios from 'axios'

const API_BASE_URL = 'http://localhost:8000'

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Add token to requests
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Auth API
export const authAPI = {
  register: (email, username, password, role) =>
    apiClient.post('/auth/register', { email, username, password, role }),
  login: (email, password) =>
    apiClient.post('/auth/login', { email, password }),
}

// User API
export const userAPI = {
  getMe: () => apiClient.get('/user/me'),
  getUser: (userId) => apiClient.get(`/user/${userId}`),
  updateProfile: (description) =>
    apiClient.put('/user/', { description }),
}

// Order API
export const orderAPI = {
  createOrder: (title, description, latitude, longitude) =>
    apiClient.post('/order/', {
      title,
      description,
      location: { latitude, longitude },
    }),
  getOrder: (orderId) => apiClient.get(`/order/${orderId}`),
  getAllOrders: (skip = 0, limit = 10) =>
    apiClient.get('/order/all', { params: { skip, limit } }),
  getMyOrders: (skip = 0, limit = 10) =>
    apiClient.get('/order/my', { params: { skip, limit } }),
  getExecutorBidOrders: (skip = 0, limit = 10) =>
    apiClient.get('/order/my-bids', { params: { skip, limit } }),
  assignExecutor: (orderId, executorId) =>
    apiClient.put(`/order/${orderId}/assign/${executorId}`),
  completeWork: (orderId) =>
    apiClient.put(`/order/${orderId}/complete`),
  approveCompletion: (orderId) =>
    apiClient.put(`/order/${orderId}/approve`),
}

// Bid API
export const bidAPI = {
  getBidsByOrder: (orderId) =>
    apiClient.get(`/bid/${orderId}`),
  createBid: (orderId, comment) =>
    apiClient.post('/bid/', { order_id: orderId, comment }),
  updateBid: (bidId, comment) =>
    apiClient.put(`/bid/${bidId}`, { comment }),
}

// Image API
export const imageAPI = {
  uploadAvatar: (file) => {
    const formData = new FormData()
    formData.append('image', file)
    return apiClient.post('/image/upload_avatar', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },
  uploadOrderImages: (orderId, files) => {
    const formData = new FormData()
    files.forEach((file) => formData.append('images', file))
    return apiClient.post(`/image/upload_images_order/${orderId}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },
  getOrderImageUrl: (orderId, imageFilename) => {
    return `${API_BASE_URL}/image/order/${orderId}/${imageFilename}`
  },
  getAvatarUrl: (userId, avatarFilename) => {
    return `${API_BASE_URL}/image/avatar/${userId}/${avatarFilename}`
  },
  transformAvatarUrl: (minioUrl, userId) => {
    // Transform MinIO Avatar URL to backend proxy URL
    // MinIO URL: http://localhost:9000/avatars/user_50_avatar.jpg
    // Backend URL: http://localhost:8000/image/avatar/50/user_50_avatar.jpg
    if (!minioUrl) return ''
    try {
      const url = new URL(minioUrl)
      const pathname = url.pathname
      const filename = pathname.split('/').pop()
      return imageAPI.getAvatarUrl(userId, filename)
    } catch (e) {
      return minioUrl
    }
  },
}
