import { useEffect, useState } from 'react'
import './InventoryPage.css'

const STATUSES   = ['All status', 'In stock', 'Low stock', 'Expiring']

const EMPTY_BATCH = { medicineId: '', supplierId: '', batchNumber: '', quantity: '', costPrice: '', expiryDate: '' }

async function request(path, options) {
  const response = await fetch(path, options)
  if (!response.ok) {
    const result = await response.json().catch(() => ({}))
    throw new Error(result.error || 'The request failed.')
  }
  return response.status === 204 ? null : response.json()
}

function withInventoryStatus(rows) {
  return rows.map(row => {
    const daysUntilExpiry = Math.ceil((new Date(row.expiryDate).getTime() - Date.now()) / 86400000)
    const status = row.qty < row.reorderLevel
      ? 'Low stock'
      : daysUntilExpiry <= 30 ? 'Expiring' : 'In stock'
    return {
      ...row,
      qty: Number(row.qty),
      price: Number(row.price),
      costPrice: Number(row.costPrice),
      status,
      statusClass: status === 'Low stock' ? 'badge-red' : status === 'Expiring' ? 'badge-orange' : 'badge-green',
    }
  })
}

export default function InventoryPage() {
  const [search, setSearch]     = useState('')
  const [category, setCategory] = useState('All categories')
  const [statusF, setStatusF]   = useState('All status')
  const [items, setItems]       = useState([])
  const [loading, setLoading]   = useState(true)
  const [saving, setSaving]     = useState(false)
  const [loadError, setLoadError] = useState('')
  const [options, setOptions] = useState({ medicines: [], suppliers: [] })
  const [form, setForm]         = useState(EMPTY_BATCH)
  const [editing, setEditing]   = useState(null) // row index

  useEffect(() => {
    Promise.all([request('/api/inventory'), request('/api/inventory/options')])
      .then(([rows, inventoryOptions]) => {
        setItems(withInventoryStatus(rows))
        setOptions(inventoryOptions)
      })
      .catch(error => setLoadError(error.message))
      .finally(() => setLoading(false))
  }, [])

  const categories = ['All categories', ...new Set(items.map(item => item.category))]

  const filtered = items.filter(i => {
    const matchSearch   = i.name.toLowerCase().includes(search.toLowerCase()) ||
                          i.batch.toLowerCase().includes(search.toLowerCase())
    const matchCategory = category === 'All categories' || i.category === category
    const matchStatus   = statusF  === 'All status'     || i.status   === statusF
    return matchSearch && matchCategory && matchStatus
  })

  async function handleDelete(item) {
    if (!window.confirm(`Delete batch ${item.batch}?`)) return
    try {
      await request(`/api/inventory/${item.batchId}`, { method: 'DELETE' })
      setItems(prev => prev.filter(row => row.batchId !== item.batchId))
      setLoadError('')
    } catch (error) {
      setLoadError(error.message)
    }
  }

  function handleEdit(item) {
    setEditing(item.batchId)
    setForm({
      medicineId: String(item.medicineId), supplierId: String(item.supplierId),
      batchNumber: item.batch, quantity: item.qty, costPrice: item.costPrice,
      expiryDate: item.expiryDate,
    })
  }

  async function handleSave() {
    setSaving(true)
    try {
      const payload = {
        medicineId: Number(form.medicineId), supplierId: Number(form.supplierId),
        batchNumber: form.batchNumber, quantity: Number(form.quantity),
        costPrice: Number(form.costPrice), expiryDate: form.expiryDate,
      }
      await request(editing === null ? '/api/inventory' : `/api/inventory/${editing}`, {
        method: editing === null ? 'POST' : 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const rows = await request('/api/inventory')
      setItems(withInventoryStatus(rows))
      setLoadError('')
      setEditing(null)
      setForm(EMPTY_BATCH)
    } catch (error) {
      setLoadError(error.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="inv-layout">
      {/* Main panel */}
      <div className="inv-main">
        <div className="page-header">
          <h1>Inventory</h1>
          <p>Add, edit, delete and search stock</p>
        </div>

        {/* Filters */}
        <div className="inv-filters">
          <input
            className="form-input inv-search"
            placeholder="Search by name, batch or supplier"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          <select className="form-select" value={category} onChange={e => setCategory(e.target.value)}>
            {categories.map(c => <option key={c}>{c}</option>)}
          </select>
          <select className="form-select" value={statusF} onChange={e => setStatusF(e.target.value)}>
            {STATUSES.map(s => <option key={s}>{s}</option>)}
          </select>
          <button className="btn btn-primary" onClick={() => { setEditing(null); setForm(EMPTY_BATCH) }}>
            + Add medicine
          </button>
        </div>

        {/* Table */}
        <div className="card">
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Medicine</th>
                  <th>Category</th>
                  <th>Batch</th>
                  <th>Qty</th>
                  <th>Expiry</th>
                  <th>Price</th>
                  <th>Status</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {loading && <tr><td colSpan="8">Loading inventory…</td></tr>}
                {!loading && loadError && <tr><td colSpan="8">{loadError}</td></tr>}
                {!loading && !loadError && filtered.length === 0 && <tr><td colSpan="8">No inventory batches found.</td></tr>}
                {filtered.map((item, idx) => (
                  <tr key={item.batchId}>
                    <td style={{ fontWeight: 600 }}>{item.name}</td>
                    <td>{item.category}</td>
                    <td>{item.batch}</td>
                    <td>{item.qty}</td>
                    <td>{item.expiry}</td>
                    <td>{item.price}</td>
                    <td><span className={`badge ${item.statusClass}`}>{item.status}</span></td>
                    <td>
                      <button className="tbl-action tbl-edit" onClick={() => handleEdit(item)}>Edit</button>
                      <button className="tbl-action tbl-del"  onClick={() => handleDelete(item)}>Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Sidebar form */}
      <div className="inv-sidebar card">
        <h2 className="form-section-title">
          {editing !== null ? 'Edit stock batch' : 'Add stock batch'}
        </h2>

        <div className="form-group">
          <label className="form-label">Medicine</label>
          <select className="form-select" value={form.medicineId}
            onChange={e => setForm(f => ({ ...f, medicineId: e.target.value }))}>
            <option value="">Select medicine</option>
            {options.medicines.map(medicine => <option key={medicine.id} value={medicine.id}>{medicine.name}</option>)}
          </select>
        </div>
        <div className="form-group">
          <label className="form-label">Supplier</label>
          <select className="form-select" value={form.supplierId}
            onChange={e => setForm(f => ({ ...f, supplierId: e.target.value }))}>
            <option value="">Select supplier</option>
            {options.suppliers.map(supplier => <option key={supplier.id} value={supplier.id}>{supplier.name}</option>)}
          </select>
        </div>
        <div className="form-group">
          <label className="form-label">Batch number</label>
          <input className="form-input" placeholder="e.g. P-1181" value={form.batchNumber}
            onChange={e => setForm(f => ({ ...f, batchNumber: e.target.value }))} />
        </div>
        <div className="form-group">
          <label className="form-label">Quantity</label>
          <input className="form-input" type="number" min="0" placeholder="0" value={form.quantity}
            onChange={e => setForm(f => ({ ...f, quantity: e.target.value }))} />
        </div>
        <div className="form-group">
          <label className="form-label">Cost price (KES)</label>
          <input className="form-input" type="number" min="0" step="0.01" placeholder="0.00" value={form.costPrice}
            onChange={e => setForm(f => ({ ...f, costPrice: e.target.value }))} />
        </div>
        <div className="form-group">
          <label className="form-label">Expiry date</label>
          <input className="form-input" type="date" value={form.expiryDate}
            onChange={e => setForm(f => ({ ...f, expiryDate: e.target.value }))} />
        </div>

        <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', marginTop: 8 }}
          onClick={handleSave} disabled={saving || !options.medicines.length || !options.suppliers.length}>
          {saving ? 'Saving…' : 'Save batch'}
        </button>
        <button className="btn btn-outline" style={{ width: '100%', justifyContent: 'center', marginTop: 8 }}
          onClick={() => { setForm(EMPTY_BATCH); setEditing(null) }}>
          Cancel
        </button>
      </div>
    </div>
  )
}

