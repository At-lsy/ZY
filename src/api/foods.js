import { categories as fallbackCategories, foods as fallbackFoods } from '@/data/foods.js'

// Keep requests on the same origin as the page. This works behind HTTPS,
// reverse proxies and deployments whose public port is not the API port.
export const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || './api').replace(/\/$/, '')

function resolveImageUrl(url) {
  if (!url) return ''
  if (/^https?:\/\//i.test(url)) {
    return url
  }
  if (typeof document !== 'undefined') {
    return new URL(url.replace(/^\//, ''), document.baseURI).href
  }
  return url
}

function request({ url, method = 'GET', data }) {
  return new Promise((resolve, reject) => {
    uni.request({
      url: `${API_BASE_URL}${url}`,
      method,
      data,
      timeout: 10000,
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
      fail: (error) => reject(new Error(error.errMsg || '网络请求失败，请检查服务器连接')),
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

export function deleteFood(id) {
  return request({ url: `/foods/${id}`, method: 'DELETE' })
}

export function createCategory(data) {
  return request({ url: '/categories', method: 'POST', data })
}

export function uploadFoodImage(filePath, oldImageUrl = '') {
  const url = `${API_BASE_URL}/upload${oldImageUrl ? `?oldImageUrl=${encodeURIComponent(oldImageUrl)}` : ''}`
  return new Promise((resolve, reject) => {
    uni.uploadFile({
      url,
      filePath,
      name: 'file',
      header: {
        Authorization: `Bearer ${uni.getStorageSync('token') || ''}`,
      },
      success: (res) => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          const payload = JSON.parse(res.data)
          resolve({
            ...payload,
            url: resolveImageUrl(payload.url),
          })
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
