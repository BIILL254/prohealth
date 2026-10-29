import 'dotenv/config'
import { randomBytes, scrypt as scryptCallback } from 'node:crypto'
import express from 'express'
import { promisify } from 'node:util'
import pool from './db.js'

const scrypt = promisify(scryptCallback)

const app = express()
app.use(express.json())

app.get('/api/health', async (_req, res) => {
  try {
    await pool.query('SELECT 1')
    res.json({ status: 'ok', database: process.env.DB_NAME || 'prohealth_db' })
  } catch (error) {
    console.error('Database health check failed:', error.message)
    res.status(503).json({ error: 'Database connection failed' })
  }
})

// Each row is one stock batch, with its medicine, category, and supplier details.
app.get('/api/inventory', async (_req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT
        m.medicine_id AS medicineId,
        sb.batch_id AS batchId,
        m.name,
        c.name AS category,
        sb.batch_number AS batch,
        sb.quantity AS qty,
        DATE_FORMAT(sb.expiry_date, '%m/%Y') AS expiry,
        DATE_FORMAT(sb.expiry_date, '%Y-%m-%d') AS expiryDate,
        m.unit_price AS price,
        sb.cost_price AS costPrice,
        s.supplier_id AS supplierId,
        s.name AS supplier,
        m.reorder_level AS reorderLevel
      FROM stock_batches sb
      JOIN medicines m ON m.medicine_id = sb.medicine_id
      JOIN categories c ON c.category_id = m.category_id
      JOIN suppliers s ON s.supplier_id = sb.supplier_id
      WHERE m.is_active = 1
      ORDER BY m.name, sb.expiry_date
    `)
    res.json(rows)
  } catch (error) {
    console.error('Could not load inventory:', error.message)
    res.status(500).json({ error: 'Could not load inventory' })
  }
})

app.get('/api/inventory/options', async (_req, res) => {
  try {
    const [medicines] = await pool.query(
      'SELECT medicine_id AS id, name FROM medicines WHERE is_active = 1 ORDER BY name'
    )
    const [suppliers] = await pool.query(
      'SELECT supplier_id AS id, name FROM suppliers ORDER BY name'
    )
    res.json({ medicines, suppliers })
  } catch (error) {
    console.error('Could not load inventory options:', error.message)
    res.status(500).json({ error: 'Could not load medicine and supplier options' })
  }
})

app.post('/api/inventory', async (req, res) => {
  const { medicineId, supplierId, batchNumber, quantity, costPrice, expiryDate } = req.body
  if (!medicineId || !supplierId || !batchNumber || quantity === undefined || costPrice === undefined || !expiryDate) {
    return res.status(400).json({ error: 'Medicine, supplier, batch number, quantity, cost price, and expiry date are required' })
  }

  try {
    const [result] = await pool.execute(
      `INSERT INTO stock_batches
        (medicine_id, supplier_id, batch_number, quantity, cost_price, received_date, expiry_date)
       VALUES (?, ?, ?, ?, ?, CURRENT_DATE(), ?)`,
      [medicineId, supplierId, batchNumber, quantity, costPrice, expiryDate]
    )
    res.status(201).json({ batchId: result.insertId })
  } catch (error) {
    console.error('Could not create inventory batch:', error.message)
    res.status(400).json({ error: 'Could not create inventory batch; check the medicine, supplier, and field values' })
  }
})

app.put('/api/inventory/:batchId', async (req, res) => {
  const { supplierId, batchNumber, quantity, costPrice, expiryDate } = req.body
  if (!supplierId || !batchNumber || quantity === undefined || costPrice === undefined || !expiryDate) {
    return res.status(400).json({ error: 'Supplier, batch number, quantity, cost price, and expiry date are required' })
  }

  try {
    const [result] = await pool.execute(
      `UPDATE stock_batches
       SET supplier_id = ?, batch_number = ?, quantity = ?, cost_price = ?, expiry_date = ?
       WHERE batch_id = ?`,
      [supplierId, batchNumber, quantity, costPrice, expiryDate, req.params.batchId]
    )
    if (!result.affectedRows) {
      const [[existing]] = await pool.execute('SELECT batch_id FROM stock_batches WHERE batch_id = ?', [req.params.batchId])
      if (!existing) return res.status(404).json({ error: 'Inventory batch not found' })
    }
    res.json({ updated: true })
  } catch (error) {
    console.error('Could not update inventory batch:', error.message)
    res.status(400).json({ error: 'Could not update inventory batch; check the supplier and field values' })
  }
})

app.delete('/api/inventory/:batchId', async (req, res) => {
  try {
    const [result] = await pool.execute('DELETE FROM stock_batches WHERE batch_id = ?', [req.params.batchId])
    if (!result.affectedRows) return res.status(404).json({ error: 'Inventory batch not found' })
    res.status(204).end()
  } catch (error) {
    console.error('Could not delete inventory batch:', error.message)
    res.status(500).json({ error: 'Could not delete inventory batch' })
  }
})

app.get('/api/suppliers', async (_req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT supplier_id AS supplierId, name, phone, email, address FROM suppliers ORDER BY name'
    )
    res.json(rows)
  } catch (error) {
    console.error('Could not load suppliers:', error.message)
    res.status(500).json({ error: 'Could not load suppliers' })
  }
})

app.post('/api/suppliers', async (req, res) => {
  const { name, phone, email = null, address = null } = req.body
  if (!name || !phone) return res.status(400).json({ error: 'Supplier name and phone are required' })

  try {
    const [result] = await pool.execute(
      'INSERT INTO suppliers (name, phone, email, address) VALUES (?, ?, ?, ?)',
      [name, phone, email, address]
    )
    res.status(201).json({ supplierId: result.insertId, name, phone, email, address })
  } catch (error) {
    console.error('Could not create supplier:', error.message)
    res.status(400).json({ error: 'Could not create supplier; check the field values' })
  }
})

app.put('/api/suppliers/:supplierId', async (req, res) => {
  const { name, phone, email = null, address = null } = req.body
  if (!name || !phone) return res.status(400).json({ error: 'Supplier name and phone are required' })

  try {
    const [result] = await pool.execute(
      'UPDATE suppliers SET name = ?, phone = ?, email = ?, address = ? WHERE supplier_id = ?',
      [name, phone, email, address, req.params.supplierId]
    )
    if (!result.affectedRows) {
      const [[existing]] = await pool.execute('SELECT supplier_id FROM suppliers WHERE supplier_id = ?', [req.params.supplierId])
      if (!existing) return res.status(404).json({ error: 'Supplier not found' })
    }
    res.json({ supplierId: Number(req.params.supplierId), name, phone, email, address })
  } catch (error) {
    console.error('Could not update supplier:', error.message)
    res.status(400).json({ error: 'Could not update supplier; check the field values' })
  }
})

app.delete('/api/suppliers/:supplierId', async (req, res) => {
  try {
    const [result] = await pool.execute('DELETE FROM suppliers WHERE supplier_id = ?', [req.params.supplierId])
    if (!result.affectedRows) return res.status(404).json({ error: 'Supplier not found' })
    res.status(204).end()
  } catch (error) {
    if (error.code === 'ER_ROW_IS_REFERENCED_2') {
      return res.status(409).json({ error: 'This supplier is assigned to stock batches and cannot be deleted' })
    }
    console.error('Could not delete supplier:', error.message)
    res.status(500).json({ error: 'Could not delete supplier' })
  }
})

app.get('/api/users', async (_req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT u.user_id AS userId, u.full_name AS name, u.email, u.phone,
             r.role_name AS role, u.two_factor_enabled AS twoFactorEnabled, u.status
      FROM users u JOIN roles r ON r.role_id = u.role_id
      ORDER BY u.full_name
    `)
    res.json(rows)
  } catch (error) {
    console.error('Could not load users:', error.message)
    res.status(500).json({ error: 'Could not load users' })
  }
})

app.post('/api/users', async (req, res) => {
  const { name, email, phone, role, password } = req.body
  if (!name || !email || !phone || !role || !password) {
    return res.status(400).json({ error: 'Name, email, phone, role, and temporary password are required' })
  }

  try {
    const [[roleRow]] = await pool.execute('SELECT role_id FROM roles WHERE role_name = ?', [String(role).toLowerCase()])
    if (!roleRow) return res.status(400).json({ error: 'Unknown user role' })
    const salt = randomBytes(16).toString('hex')
    const derivedKey = await scrypt(password, salt, 64)
    const passwordHash = `scrypt$${salt}$${derivedKey.toString('hex')}`
    const [result] = await pool.execute(
      `INSERT INTO users (role_id, full_name, email, phone, password_hash, two_factor_enabled)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [roleRow.role_id, name, email, phone, passwordHash, String(role).toLowerCase() === 'customer' ? 0 : 1]
    )
    res.status(201).json({
      userId: result.insertId, name, email, phone, role: String(role).toLowerCase(),
      twoFactorEnabled: String(role).toLowerCase() === 'customer' ? 0 : 1, status: 'active',
    })
  } catch (error) {
    console.error('Could not register user:', error.message)
    res.status(error.code === 'ER_DUP_ENTRY' ? 409 : 400).json({
      error: error.code === 'ER_DUP_ENTRY' ? 'A user with that email already exists' : 'Could not register user; check the field values',
    })
  }
})

app.patch('/api/users/:userId/status', async (req, res) => {
  const { status } = req.body
  if (!['active', 'suspended'].includes(status)) return res.status(400).json({ error: 'Status must be active or suspended' })

  try {
    const [result] = await pool.execute('UPDATE users SET status = ? WHERE user_id = ?', [status, req.params.userId])
    if (!result.affectedRows) {
      const [[existing]] = await pool.execute('SELECT user_id FROM users WHERE user_id = ?', [req.params.userId])
      if (!existing) return res.status(404).json({ error: 'User not found' })
    }
    res.json({ userId: Number(req.params.userId), status })
  } catch (error) {
    console.error('Could not update user status:', error.message)
    res.status(500).json({ error: 'Could not update user status' })
  }
})

const port = Number(process.env.PORT || 3000)
app.listen(port, () => console.log(`ProHealth API listening on http://localhost:${port}`))
