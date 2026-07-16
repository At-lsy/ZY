import { categories as fallbackCategories, foods as fallbackFoods } from '@/data/foods.js'

function getApiBaseUrl() {
  if (typeof window !== 'undefined') {
    const host = window.location.hostname
    if (host === 'localhost' || host === '127.0.0.1') {
      return 'http://localhost:3000/api'
    }
    return `http://${host}:3000/api`
  }
  return 'http://localhost:3000/api'
}

const API_BASE_URL = getApiBaseUrl()

function request({ url, method = 'GET', data }) {
  return new Promise((resolve, reject) => {
    uni.request({
      url: `${API_BASE_URL}${url}`,
      method,
      data,
      header: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${uni.getStorageSync('token') || ''}`,
      },
      success: (res) => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(res.data)
          return
        }
        reject(new Error(res.data?.message || '接口请求失败'))
      },
      fail: reject,
    })
  })
}

export function login(data) {
  return request({ url: '/login', method: 'POST', data })
}

export async function getCategories() {
  try {
    return await request({ url: '/categories' })
  } catch (error) {
    return fallbackCategories
  }
}

export async function getFoods() {
  try {
    return await request({ url: '/foods' })
  } catch (error) {
    return fallbackFoods
  }
}

export function createFood(data) {
  return request({ url: '/foods', method: 'POST', data })
}

export function updateFood(id, data) {
  return request({ url: `/foods/${id}`, method: 'PUT', data })
}

export function uploadFoodImage(filePath) {
  return new Promise((resolve, reject) => {
    uni.uploadFile({
      url: `${API_BASE_URL}/upload`,
      filePath,
      name: 'file',
      header: {
        Authorization: `Bearer ${uni.getStorageSync('token') || ''}`,
      },
      success: (res) => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(JSON.parse(res.data))
          return
        }
        reject(new Error(res.data || '上传失败'))
      },
      fail: reject,
    })
  })
}

export function submitOrder(data) {
  return request({ url: '/orders', method: 'POST', data })
}

export function getOrders() {
  return request({ url: '/orders' })
}

export function getUserOrders() {
  return request({ url: '/orders/me' })
}

export function updateOrderStatus(id, data) {
  return request({ url: `/orders/${id}/status`, method: 'PUT', data })
}
