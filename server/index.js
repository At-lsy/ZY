const http = require('http')
const fs = require('fs')
const path = require('path')
const sharp = require('sharp')
const { categories, foods: seedFoods } = require('./foods')

const PORT = Number(process.env.PORT || 3000)
const HOST = `http://localhost:${PORT}`
const UPLOAD_DIR = path.join(__dirname, 'uploads')

let foods = seedFoods.map((item) => ({ ...item }))
let orders = []

const users = [
  { username: 'lsy', password: 'password', role: 'admin' },
  { username: 'zy', password: 'password', role: 'user' },
]

if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true })
}

function applyCors(req, res) {
  const origin = req.headers.origin || '*'
  res.setHeader('Access-Control-Allow-Origin', origin)
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  res.setHeader('Access-Control-Allow-Credentials', 'true')
}

function sendJson(res, statusCode, data, req) {
  applyCors(req, res)
  res.writeHead(statusCode, { 'Content-Type': 'application/json; charset=utf-8' })
  res.end(JSON.stringify(data))
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = ''
    req.on('data', (chunk) => {
      body += chunk
    })
    req.on('end', () => {
      if (!body) {
        resolve({})
        return
      }
      try {
        resolve(JSON.parse(body))
      } catch (error) {
        reject(error)
      }
    })
  })
}

function getCurrentUser(req) {
  const username = req.headers.authorization?.replace(/^Bearer\s+/i, '')
  return users.find((user) => user.username === username)
}

function requireAdmin(req, res) {
  const user = getCurrentUser(req)
  if (!user) {
    sendJson(res, 401, { message: '请先登录' }, req)
    return null
  }
  if (user.role !== 'admin') {
    sendJson(res, 403, { message: '当前账号没有管理权限' }, req)
    return null
  }
  return user
}

async function parseMultipartUpload(req) {
  return new Promise((resolve, reject) => {
    const contentType = req.headers['content-type'] || ''
    const boundary = contentType.match(/boundary=(.+)$/)?.[1]
    if (!boundary) {
      reject(new Error('缺少上传边界'))
      return
    }

    const chunks = []
    req.on('data', (chunk) => chunks.push(chunk))
    req.on('end', async () => {
      try {
        const buffer = Buffer.concat(chunks)
        const boundaryBuffer = Buffer.from(`--${boundary}`)
        const start = buffer.indexOf(Buffer.from('\r\n\r\n'))
        if (start === -1) {
          reject(new Error('上传内容为空'))
          return
        }

        const header = buffer.slice(0, start).toString('utf8')
        const originalName = header.match(/filename="([^"]*)"/)?.[1] || 'food-image'
        const ext = path.extname(originalName) || '.jpg'
        const fileStart = start + 4
        const fileEnd = buffer.lastIndexOf(boundaryBuffer) - 2
        if (fileEnd <= fileStart) {
          reject(new Error('上传文件无效'))
          return
        }

        const imageBuffer = buffer.slice(fileStart, fileEnd)
        const processedBuffer = await sharp(imageBuffer)
          .rotate()
          .resize({ width: 900, height: 900, fit: 'inside', withoutEnlargement: true })
          .jpeg({ quality: 82 })
          .toBuffer()

        const filename = `${Date.now()}-${Math.random().toString(16).slice(2)}${ext === '.png' || ext === '.webp' ? '.jpg' : ext || '.jpg'}`
        const filePath = path.join(UPLOAD_DIR, filename)
        fs.writeFileSync(filePath, processedBuffer)
        resolve({ filename, url: `${HOST}/uploads/${filename}` })
      } catch (error) {
        reject(error)
      }
    })
    req.on('error', reject)
  })
}

function normalizeFood(input, current = {}) {
  return {
    ...current,
    name: String(input.name ?? current.name ?? '').trim(),
    price: Number(input.price ?? current.price ?? 0),
    icon: String(input.icon ?? current.icon ?? '🍽️').trim() || '🍽️',
    imageUrl: String(input.imageUrl ?? current.imageUrl ?? '').trim(),
    category: String(input.category ?? current.category ?? 'main'),
    bg: String(input.bg ?? current.bg ?? 'linear-gradient(145deg, #f5f5f5, #e0e0e0)'),
  }
}

function serveUpload(req, res, url) {
  const filename = path.basename(decodeURIComponent(url.pathname.replace('/uploads/', '')))
  const filePath = path.join(UPLOAD_DIR, filename)
  if (!fs.existsSync(filePath)) {
    res.writeHead(404)
    res.end('Not found')
    return
  }
  applyCors(req, res)
  fs.createReadStream(filePath).pipe(res)
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`)

  if (req.method === 'OPTIONS') {
    applyCors(req, res)
    res.writeHead(204)
    res.end()
    return
  }

  try {
    if (req.method === 'GET' && url.pathname.startsWith('/uploads/')) {
      serveUpload(req, res, url)
      return
    }

    if (req.method === 'POST' && url.pathname === '/api/login') {
      const body = await readBody(req)
      const user = users.find(
        (item) => item.username === body.username && item.password === body.password,
      )
      if (!user) {
        sendJson(res, 401, { message: '账号或密码错误' }, req)
        return
      }
      sendJson(res, 200, { username: user.username, role: user.role, token: user.username }, req)
      return
    }

    if (req.method === 'GET' && url.pathname === '/api/categories') {
      sendJson(res, 200, categories, req)
      return
    }

    if (req.method === 'GET' && url.pathname === '/api/foods') {
      sendJson(res, 200, foods, req)
      return
    }

    if (req.method === 'POST' && url.pathname === '/api/foods') {
      if (!requireAdmin(req, res)) return
      const body = await readBody(req)
      const nextId = foods.reduce((max, item) => Math.max(max, item.id), 0) + 1
      const food = { id: nextId, ...normalizeFood(body) }
      foods.push(food)
      sendJson(res, 201, food, req)
      return
    }

    const foodMatch = url.pathname.match(/^\/api\/foods\/(\d+)$/)
    if (req.method === 'PUT' && foodMatch) {
      if (!requireAdmin(req, res)) return
      const id = Number(foodMatch[1])
      const index = foods.findIndex((item) => item.id === id)
      if (index === -1) {
        sendJson(res, 404, { message: '菜品不存在' }, req)
        return
      }
      const body = await readBody(req)
      foods[index] = { id, ...normalizeFood(body, foods[index]) }
      sendJson(res, 200, foods[index], req)
      return
    }

    if (req.method === 'POST' && url.pathname === '/api/upload') {
      if (!requireAdmin(req, res)) return
      const file = await parseMultipartUpload(req)
      sendJson(res, 201, file, req)
      return
    }

    if (req.method === 'POST' && url.pathname === '/api/orders') {
      const user = getCurrentUser(req)
      if (!user) {
        sendJson(res, 401, { message: '请先登录' }, req)
        return
      }
      const body = await readBody(req)
      if (!Array.isArray(body.items) || body.items.length === 0) {
        sendJson(res, 400, { message: '订单不能为空' }, req)
        return
      }
      const order = {
        id: Date.now(),
        username: user.username,
        items: body.items,
        totalPrice: Number(body.totalPrice || 0),
        status: 'pending',
        note: '',
        createdAt: new Date().toISOString(),
      }
      orders.unshift(order)
      sendJson(res, 201, order, req)
      return
    }

    if (req.method === 'GET' && url.pathname === '/api/orders/me') {
      const user = getCurrentUser(req)
      if (!user) {
        sendJson(res, 401, { message: '请先登录' }, req)
        return
      }
      const userOrders = orders.filter((order) => order.username === user.username)
      sendJson(res, 200, userOrders, req)
      return
    }

    if (req.method === 'GET' && url.pathname === '/api/orders') {
      if (!requireAdmin(req, res)) return
      sendJson(res, 200, orders, req)
      return
    }

    const orderStatusMatch = url.pathname.match(/^\/api\/orders\/(\d+)\/status$/)
    if (req.method === 'PUT' && orderStatusMatch) {
      if (!requireAdmin(req, res)) return
      const id = Number(orderStatusMatch[1])
      const body = await readBody(req)
      const status = body.status === 'approved' ? 'approved' : 'returned'
      let updatedOrder = null
      orders = orders.map((order) => {
        if (order.id !== id) return order
        updatedOrder = {
          ...order,
          status,
          note: String(body.note || '').trim(),
          handledAt: new Date().toISOString(),
        }
        return updatedOrder
      })
      if (!updatedOrder) {
        sendJson(res, 404, { message: '订单不存在' }, req)
        return
      }
      sendJson(res, 200, updatedOrder, req)
      return
    }

    sendJson(res, 404, { message: 'Not found' }, req)
  } catch (error) {
    sendJson(res, 400, { message: error.message || 'Bad request' }, req)
  }
})

server.listen(PORT, () => {
  console.log(`Food API server is running at http://localhost:${PORT}`)
})
