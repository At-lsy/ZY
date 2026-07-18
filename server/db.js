const fs = require('fs')
const path = require('path')
const mysql = require('mysql2/promise')

const DB_HOST = process.env.DB_HOST || '127.0.0.1'
const DB_PORT = Number(process.env.DB_PORT || 3306)
const DB_USER = process.env.DB_USER || 'root'
const DB_PASSWORD = process.env.DB_PASSWORD || 'root'
const DB_NAME = process.env.DB_NAME || 'food_order_db'

const pool = mysql.createPool({
  host: DB_HOST,
  port: DB_PORT,
  user: DB_USER,
  password: DB_PASSWORD,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  charset: 'utf8mb4',
})

let initialized = false

async function query(sql, params = []) {
  const connection = await pool.getConnection()
  try {
    const [rows] = await connection.query(sql, params)
    return rows
  } finally {
    connection.release()
  }
}

async function initializeDatabase() {
  if (initialized) {
    return
  }

  const connection = await pool.getConnection()
  try {
    await connection.query(`CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\``)
    await connection.query(`USE \`${DB_NAME}\``)
    await connection.query(`
      CREATE TABLE IF NOT EXISTS chat_messages (
        id INT AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(50) NOT NULL DEFAULT 'guest',
        content TEXT NOT NULL,
        is_self TINYINT(1) NOT NULL DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `)
    await connection.query(`
      CREATE TABLE IF NOT EXISTS food_images (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        mime_type VARCHAR(80) NOT NULL DEFAULT 'image/jpeg',
        image_data LONGBLOB NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `)
    await connection.query(`
      CREATE TABLE IF NOT EXISTS categories (
        id VARCHAR(64) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        icon VARCHAR(10) DEFAULT '🍽️',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `)

    await connection.query(`
      CREATE TABLE IF NOT EXISTS foods (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        price DECIMAL(10,2) NOT NULL DEFAULT 0,
        icon VARCHAR(10) DEFAULT '🍽️',
        image_url VARCHAR(1024) DEFAULT '',
        category VARCHAR(64) DEFAULT 'main',
        bg VARCHAR(255) DEFAULT '',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `)

    await connection.query(`
      CREATE TABLE IF NOT EXISTS orders (
        id BIGINT PRIMARY KEY,
        username VARCHAR(50) NOT NULL,
        items JSON NOT NULL,
        total_price DECIMAL(10,2) NOT NULL DEFAULT 0,
        status VARCHAR(32) NOT NULL DEFAULT 'pending',
        note TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        handled_at TIMESTAMP NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `)

    // seed categories and foods if empty
    const [catCountRows] = await connection.query('SELECT COUNT(*) AS count FROM categories')
    if (Number(catCountRows[0].count) === 0) {
      const { categories: seedCategories, foods: seedFoods } = require('./foods')
      const catInserts = seedCategories.map((c) => [c.id, c.name, c.icon])
      if (catInserts.length) {
        await connection.query('INSERT INTO categories (id,name,icon) VALUES ? ', [catInserts])
      }
      const foodInserts = seedFoods.map((f) => [f.name, f.price, f.icon, f.imageUrl || '', f.category || 'main', f.bg || ''])
      if (foodInserts.length) {
        await connection.query('INSERT INTO foods (name,price,icon,image_url,category,bg) VALUES ? ', [foodInserts])
      }
    }

    const [countRows] = await connection.query('SELECT COUNT(*) AS count FROM chat_messages')
    if (Number(countRows[0].count) === 0) {
      await connection.query(
        'INSERT INTO chat_messages (username, content, is_self) VALUES (?, ?, ?), (?, ?, ?)',
        ['bot', '你好！欢迎来到点餐系统，我可以帮你查看菜单、点餐和订单状态。', 0, 'user', '我想点餐', 1],
      )
    }

    const [imageCountRows] = await connection.query('SELECT COUNT(*) AS count FROM food_images')
    if (Number(imageCountRows[0].count) === 0) {
      await seedFoodImagesFromUploads(connection)
    }

    initialized = true
  } finally {
    connection.release()
  }
}

// Categories
async function getCategoriesFromDb() {
  await query(`USE \`${DB_NAME}\``)
  const rows = await query('SELECT id, name, icon FROM categories ORDER BY name ASC')
  return rows
}

async function insertCategory(name, icon) {
  await query(`USE \`${DB_NAME}\``)
  const id = `cat-${Date.now()}`
  await query('INSERT INTO categories (id,name,icon) VALUES (?, ?, ?)', [id, name, icon])
  return { id, name, icon }
}

async function deleteCategoryById(id) {
  await query(`USE \`${DB_NAME}\``)
  await query('DELETE FROM categories WHERE id = ?', [id])
  return true
}

// Foods
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
  const filePath = path.join(__dirname, 'uploads', filename)
  if (fs.existsSync(filePath)) {
    try {
      fs.unlinkSync(filePath)
    } catch (error) {
      console.warn('删除上传图片失败：', filePath, error.message)
    }
  }
}

async function deleteFoodImageByName(name) {
  await query(`USE \`${DB_NAME}\``)
  await query('DELETE FROM food_images WHERE name = ?', [name])
}

async function getFoodsFromDb() {
  await query(`USE \`${DB_NAME}\``)
  const rows = await query('SELECT id, name, price, icon, image_url AS imageUrl, category, bg FROM foods ORDER BY id ASC')
  return rows.map((r) => ({ ...r }))
}

async function insertFoodToDb(food) {
  await query(`USE \`${DB_NAME}\``)
  const result = await query('INSERT INTO foods (name,price,icon,image_url,category,bg) VALUES (?, ?, ?, ?, ?, ?)', [food.name, food.price, food.icon, food.imageUrl || '', food.category, food.bg])
  const insertId = result.insertId || (await query('SELECT LAST_INSERT_ID() AS id'))[0].id
  return { id: insertId, ...food }
}

async function updateFoodInDb(id, food, oldImageUrl) {
  await query(`USE \`${DB_NAME}\``)
  await query('UPDATE foods SET name=?,price=?,icon=?,image_url=?,category=?,bg=? WHERE id=?', [food.name, food.price, food.icon, food.imageUrl || '', food.category, food.bg, id])
  if (oldImageUrl && oldImageUrl !== food.imageUrl) {
    deleteUploadFile(oldImageUrl)
    const oldFilename = extractUploadFilename(oldImageUrl)
    if (oldFilename) {
      await deleteFoodImageByName(oldFilename)
    }
  }
  return { id, ...food }
}

async function deleteFoodById(id) {
  await query(`USE \`${DB_NAME}\``)
  const rows = await query('SELECT image_url FROM foods WHERE id = ?', [id])
  if (rows.length > 0) {
    const imageUrl = rows[0].image_url
    if (imageUrl) {
      deleteUploadFile(imageUrl)
      const filename = extractUploadFilename(imageUrl)
      if (filename) {
        await deleteFoodImageByName(filename)
      }
    }
  }
  await query('DELETE FROM foods WHERE id = ?', [id])
  return true
}

// Orders
async function insertOrderToDb(order) {
  await query(`USE \`${DB_NAME}\``)
  await query('INSERT INTO orders (id,username,items,total_price,status,note) VALUES (?, ?, ?, ?, ?, ?)', [order.id, order.username, JSON.stringify(order.items), order.totalPrice, order.status, order.note || ''])
  return order
}

async function getOrdersFromDb() {
  await query(`USE \`${DB_NAME}\``)
  const rows = await query('SELECT id, username, items, total_price AS totalPrice, status, note, created_at AS createdAt, handled_at AS handledAt FROM orders ORDER BY created_at DESC')
  return rows.map((r) => {
    let items = r.items
    if (typeof r.items === 'string') {
      try {
        items = JSON.parse(r.items)
      } catch (err) {
        console.warn('Could not parse order.items JSON, falling back to empty array for order', r.id, err.message)
        items = []
      }
    }
    return { id: r.id, username: r.username, items, totalPrice: Number(r.totalPrice), status: r.status, note: r.note, createdAt: new Date(r.createdAt).toISOString(), handledAt: r.handledAt }
  })
}

async function updateOrderStatusInDb(id, status, note) {
  await query(`USE \`${DB_NAME}\``)
  await query('UPDATE orders SET status=?, note=?, handled_at=NOW() WHERE id=?', [status, note || '', id])
  const rows = await query('SELECT id, username, items, total_price AS totalPrice, status, note, created_at AS createdAt, handled_at AS handledAt FROM orders WHERE id=?', [id])
  const r = rows[0]
  let items = r.items
  if (typeof r.items === 'string') {
    try {
      items = JSON.parse(r.items)
    } catch (err) {
      console.warn('Could not parse order.items JSON for updated order', r.id, err.message)
      items = []
    }
  }
  return { id: r.id, username: r.username, items, totalPrice: Number(r.totalPrice), status: r.status, note: r.note, createdAt: new Date(r.createdAt).toISOString(), handledAt: r.handledAt }
}

async function seedFoodImagesFromUploads(connection) {
  const uploadDir = path.join(__dirname, 'uploads')
  if (!fs.existsSync(uploadDir)) {
    return
  }

  const files = fs.readdirSync(uploadDir)
    .filter((file) => /\.(jpg|jpeg|png|gif|webp)$/i.test(file))
    .slice(0, 6)

  for (const file of files) {
    const fullPath = path.join(uploadDir, file)
    const ext = path.extname(file).toLowerCase()
    const mimeType = ext === '.png' ? 'image/png' : ext === '.gif' ? 'image/gif' : ext === '.webp' ? 'image/webp' : 'image/jpeg'
    const buffer = fs.readFileSync(fullPath)
    await connection.query(
      'INSERT INTO food_images (name, mime_type, image_data) VALUES (?, ?, ?)',
      [file, mimeType, buffer],
    )
  }
}

async function insertChatMessage(username, content, isSelf) {
  const result = await query(
    'INSERT INTO chat_messages (username, content, is_self) VALUES (?, ?, ?)',
    [username, content, isSelf ? 1 : 0],
  )
  return { id: result.insertId, username, content, isSelf: Boolean(isSelf), createdAt: new Date().toISOString() }
}

async function getChatMessages(limit = 50) {
  const rows = await query(
    'SELECT id, username, content, is_self AS isSelf, created_at AS createdAt FROM chat_messages ORDER BY id ASC LIMIT ?',
    [limit],
  )
  return rows.map((row) => ({
    id: row.id,
    username: row.username,
    content: row.content,
    isSelf: Boolean(row.isSelf),
    time: new Date(row.createdAt).getTime(),
  }))
}

async function saveFoodImage(name, buffer, mimeType = 'image/jpeg') {
  const result = await query(
    'INSERT INTO food_images (name, mime_type, image_data) VALUES (?, ?, ?)',
    [name, mimeType, buffer],
  )
  return result.insertId
}

module.exports = {
  initializeDatabase,
  query,
  insertChatMessage,
  getChatMessages,
  saveFoodImage,
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
}
