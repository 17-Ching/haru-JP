// src/utils/api.js — Axios 實例 + JWT 攔截器
import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api/v1',
  timeout: 10000,
  headers: { 'Content-Type': 'application/json' }
})

// Request 攔截：自動附加 Authorization header
api.interceptors.request.use(config => {
  const token = localStorage.getItem('jp_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// Response 攔截：401 自動清除 session 並跳轉登入
api.interceptors.response.use(
  res => res,
  err => {
    if (err.response?.status === 401) {
      localStorage.removeItem('jp_token')
      localStorage.removeItem('jp_user')
      window.location.href = '/login'
    }
    return Promise.reject(err)
  }
)

export default api
