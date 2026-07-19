const http = require('http')
const fs = require('fs')
const path = require('path')
const sharp = require('sharp')
const { categories: seedCategories, foods: seedFoods } = require('./foods')
const {
  initializeDatabase,
  insertChatMessage,
  getChatMessages,
  saveFoodImage,
  deleteFoodImageByName,
  getCategoriesFromDb,
  insertCategory,
  deleteCategoryById,
  getFoodsFromDb,
  insertFoodToDb,
  updateFoodInDb,
  deleteFoodById,
  insertOrderToDb,
  getOrdersFromDb,
  updateOrderStatusInDb,
} = require('./db')

const PORT = Number(process.env.PORT || 3000)
const PUBLIC_HOST = process.env.PUBLIC_HOST || ''
const UPLOAD_DIR = path.join(__dirname, 'uploads')
const WEB_DIR = path.resolve(__dirname, '../dist/build/h5')

function getUploadHost() {
  if (PUBLIC_HOST) {
    return PUBLIC_HOST.replace(/\/$/, '')
  }
  return '.'
}

let categories = seedCategories.map((item) => ({ ...item }))
let foods = seedFoods.map((item) => ({ ...item }))
let orders = []

const users = [
  { username: 'lsy', password: 'password', role: 'admin' },
  { username: 'zy', password: 'password', role: 'admin' },
]

if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true })
}

function applyCors(req, res) {
  const origin = req.headers.origin || '*'
  res.setHeader('Access-Control-Allow-Origin', origin)
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS')
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
        await saveFoodImage(filename, processedBuffer, 'image/jpeg')
        resolve({ filename, url: `${getUploadHost()}/uploads/${filename}` })
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

function extractUploadFilename(imageUrl) {
  if (!imageUrl) return ''
  try {
    const url = new URL(imageUrl)
    return path.basename(decodeURIComponent(url.pathname))
  } catch (err) {
    return path.basename(decodeURIComponent(imageUrl.split('?')[0] || ''))
  }
}

function deleteUploadFile(imageUrl) {
  const filename = extractUploadFilename(imageUrl)
  if (!filename) return
  const filePath = path.join(UPLOAD_DIR, filename)
  if (fs.existsSync(filePath)) {
    try {
      fs.unlinkSync(filePath)
    } catch (error) {
      console.warn('删除上传图片失败：', filePath, error.message)
    }
  }
}

function getContentType(filePath) {
  const ext = path.extname(filePath).toLowerCase()
  const map = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.webp': 'image/webp',
    '.gif': 'image/gif',
    '.html': 'text/html; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
  }
  return map[ext] || 'application/octet-stream'
}

function serveWebFile(req, res, pathname) {
  if (!fs.existsSync(WEB_DIR)) return false
  const relativePath = pathname === '/' ? 'index.html' : decodeURIComponent(pathname).replace(/^\/+/, '')
  let filePath = path.resolve(WEB_DIR, relativePath)
  if (!filePath.startsWith(`${WEB_DIR}${path.sep}`) && filePath !== WEB_DIR) return false
  if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
    filePath = path.join(WEB_DIR, 'index.html')
  }
  res.setHeader('Content-Type', getContentType(filePath))
  fs.createReadStream(filePath).pipe(res)
  return true
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
  res.setHeader('Content-Type', getContentType(filePath))
  res.setHeader('Cache-Control', 'public, max-age=31536000')
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
      try {
        const dbCats = await getCategoriesFromDb()
        categories = dbCats
      } catch (e) {
        // fallback to memory categories
      }
      sendJson(res, 200, categories, req)
      return
    }

    if (req.method === 'POST' && url.pathname === '/api/categories') {
      if (!requireAdmin(req, res)) return
      const body = await readBody(req)
      const name = String(body.name || '').trim()
      const icon = String(body.icon || '🍽️').trim() || '🍽️'
      if (!name) {
        sendJson(res, 400, { message: '分类名称不能为空' }, req)
        return
      }
      try {
        const category = await insertCategory(name, icon)
        categories.push(category)
        sendJson(res, 201, category, req)
      } catch (error) {
        sendJson(res, 500, { message: error.message || '保存分类失败' }, req)
      }
      return
    }

    if (req.method === 'GET' && url.pathname === '/api/foods') {
      try {
        const dbFoods = await getFoodsFromDb()
        foods = dbFoods
      } catch (e) {
        // fallback to memory
      }
      sendJson(res, 200, foods, req)
      return
    }

    if (req.method === 'POST' && url.pathname === '/api/foods') {
      if (!requireAdmin(req, res)) return
      const body = await readBody(req)
      const food = normalizeFood(body)
      try {
        const inserted = await insertFoodToDb(food)
        foods.push(inserted)
        sendJson(res, 201, inserted, req)
      } catch (error) {
        sendJson(res, 500, { message: error.message || '保存菜品失败' }, req)
      }
      return
    }

    const foodMatch = url.pathname.match(/^\/api\/foods\/(\d+)$/)
    if (req.method === 'DELETE' && foodMatch) {
      if (!requireAdmin(req, res)) return
      const id = Number(foodMatch[1])
      try {
        await deleteFoodById(id)
        foods = foods.filter((item) => item.id !== id)
        sendJson(res, 200, { success: true }, req)
      } catch (error) {
        console.error('DELETE /api/foods error:', id, error)
        sendJson(res, 500, { message: error.message || '删除失败' }, req)
      }
      return
    }

    if (req.method === 'PUT' && foodMatch) {
      if (!requireAdmin(req, res)) return
      const id = Number(foodMatch[1])
      try {
        const index = foods.findIndex((item) => item.id === id)
        if (index === -1) {
          sendJson(res, 404, { message: '菜品不存在' }, req)
          return
        }
        const body = await readBody(req)
        const updated = await updateFoodInDb(id, normalizeFood(body, foods[index]), foods[index].imageUrl)
        foods[index] = updated
        sendJson(res, 200, foods[index], req)
      } catch (error) {
        sendJson(res, 500, { message: error.message || '更新失败' }, req)
      }
      return
    }

    if (req.method === 'POST' && url.pathname === '/api/upload') {
      if (!requireAdmin(req, res)) return
      const oldImageUrl = url.searchParams.get('oldImageUrl') || ''
      if (oldImageUrl) {
        deleteUploadFile(oldImageUrl)
        const oldFilename = extractUploadFilename(oldImageUrl)
        if (oldFilename) {
          await deleteFoodImageByName(oldFilename)
        }
      }
      const file = await parseMultipartUpload(req, req)
      sendJson(res, 201, file, req)
      return
    }

    if (req.method === 'GET' && url.pathname === '/api/chat/messages') {
      const user = getCurrentUser(req)
      const currentUser = user?.username || 'user'
      const partner = currentUser === 'lsy' ? 'zy' : 'lsy'
      const messages = await getChatMessages()
      const filteredMessages = messages.filter((item) => item.username === currentUser || item.username === partner)
      sendJson(res, 200, filteredMessages, req)
      return
    }

    if (req.method === 'POST' && url.pathname === '/api/chat/messages') {
      const body = await readBody(req)
      const content = String(body.content || '').trim()
      if (!content) {
        sendJson(res, 400, { message: '消息不能为空' }, req)
        return
      }
      const user = getCurrentUser(req)
      const sender = user?.username || String(body.username || 'user').trim() || 'user'
      const isSelf = Boolean(user?.username) || Boolean(body.isSelf)
      const savedMessage = await insertChatMessage(sender, content, isSelf)
      sendJson(res, 201, savedMessage, req)
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
      try {
        await insertOrderToDb(order)
        orders.unshift(order)
        sendJson(res, 201, order, req)
      } catch (error) {
        sendJson(res, 500, { message: error.message || '保存订单失败' }, req)
      }
      return
    }

    if (req.method === 'GET' && url.pathname === '/api/orders/me') {
      const user = getCurrentUser(req)
      if (!user) {
        sendJson(res, 401, { message: '请先登录' }, req)
        return
      }
      try {
        const dbOrders = await getOrdersFromDb()
        orders = dbOrders
      } catch (e) {
        // fallback to memory
      }
      const userOrders = orders.filter((order) => order.username === user.username)
      sendJson(res, 200, userOrders, req)
      return
    }

    if (req.method === 'GET' && url.pathname === '/api/orders') {
      if (!requireAdmin(req, res)) return
      const user = getCurrentUser(req)
      try {
        const dbOrders = await getOrdersFromDb()
        orders = dbOrders
      } catch (e) {
        // fallback to memory
      }
      const visibleOrders = orders.filter((order) => order.username !== user.username)
      sendJson(res, 200, visibleOrders, req)
      return
    }

    const orderStatusMatch = url.pathname.match(/^\/api\/orders\/(\d+)\/status$/)
    if (req.method === 'PUT' && orderStatusMatch) {
      if (!requireAdmin(req, res)) return
      const id = Number(orderStatusMatch[1])
      try {
        const body = await readBody(req)
        const parsedBody = typeof body === 'string' ? JSON.parse(body) : body
        const status = parsedBody.status === 'approved' ? 'approved' : 'returned'
        const updated = await updateOrderStatusInDb(id, status, String(parsedBody.note || '').trim())
        orders = orders.map((o) => (o.id === id ? updated : o))
        sendJson(res, 200, updated, req)
      } catch (error) {
        console.error('PUT /api/orders/:id/status error:', error)
        sendJson(res, 500, { message: error.message || '更新订单失败' }, req)
      }
      return
    }

    if (req.method === 'GET' && serveWebFile(req, res, url.pathname)) return
    sendJson(res, 404, { message: 'Not found' }, req)
  } catch (error) {
    console.error('Server error:', error)
    sendJson(res, 500, { message: error.message || '服务器内部错误' }, req)
  }
})

async function startServer() {
  try {
    await initializeDatabase()
    server.listen(PORT, () => {
      console.log(`Food API server is running at http://localhost:${PORT}`)
      console.log(`Public upload host: ${PUBLIC_HOST || `http://localhost:${PORT}`}`)
    })
  } catch (error) {
    console.error('Failed to start server:', error)
    process.exit(1)
  }
}

startServer()
