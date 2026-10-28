import { useState } from 'react'
import './InventoryPage.css'

const MEDICINES = [
  { name: 'Paracetamol 500mg', category: 'Pain relief',  batch: 'P-1180', qty: 240, expiry: '03/2028', price: 120,   status: 'In stock',  statusClass: 'badge-green'  },
  { name: 'Amoxicillin 250mg', category: 'Antibiotics',  batch: 'B-2291', qty: 34,  expiry: '11/2026', price: 450,   status: 'Expiring',  statusClass: 'badge-orange' },
  { name: 'Insulin pen',       category: 'Chronic care', batch: 'I-0044', qty: 3,   expiry: '05/2027', price: 1200,  status: 'Low stock', statusClass: 'badge-red'    },
  { name: 'Vitamin C 1000mg',  category: 'Vitamins',     batch: 'V-3320', qty: 8,   expiry: '09/2027', price: 800,   status: 'Low stock', statusClass: 'badge-red'    },
  { name: 'Ibuprofen 400mg',   category: 'Pain relief',  batch: 'I-7781', qty: 180, expiry: '01/2028', price: 220,   status: 'In stock',  statusClass: 'badge-green'  },
  { name: 'Metformin 500mg',   category: 'Chronic care', batch: 'M-5512', qty: 96,  expiry: '08/2027', price: 380,   status: 'In stock',  statusClass: 'badge-green'  },
  { name: 'Cetirizine 10mg',   category: 'Allergy',      batch: 'C-0912', qty: 52,  expiry: '12/2026', price: 260,   status: 'Expiring',  statusClass: 'badge-orange' },
  { name: 'Adhesive plasters', category: 'First aid',    batch: 'A-4410', qty: 310, expiry: '06/2029', price: 150,   status: 'In stock',  statusClass: 'badge-green'  },
]

const CATEGORIES = ['All categories', 'Pain relief', 'Antibiotics', 'Chronic care', 'Vitamins', 'Allergy', 'First aid']
const STATUSES   = ['All status', 'In stock', 'Low stock', 'Expiring']

const EMPTY_BATCH = { medicine: '', supplier: '', batchNumber: '', quantity: '', costPrice: '', expiryDate: '' }

export default function InventoryPage() {
  const [search, setSearch]     = useState('')
  const [category, setCategory] = useState('All categories')
  const [statusF, setStatusF]   = useState('All status')
  const [items, setItems]       = useState(MEDICINES)
  const [form, setForm]         = useState(EMPTY_BATCH)
  const [editing, setEditing]   = useState(null) // row index

  const filtered = items.filter(i => {
    const matchSearch   = i.name.toLowerCase().includes(search.toLowerCase()) ||
                          i.batch.toLowerCase().includes(search.toLowerCase())
    const matchCategory = category === 'All categories' || i.category === category
    const matchStatus   = statusF  === 'All status'     || i.status   === statusF
    return matchSearch && matchCategory && matchStatus
  })

  function handleDelete(idx) {
    setItems(prev => prev.filter((_, i) => i !== idx))
  }

  function handleEdit(idx) {
    const item = items[idx]
    setEditing(idx)
    setForm({
      medicine: item.name, supplier: '', batchNumber: item.batch,
      quantity: item.qty, costPrice: item.price, expiryDate: item.expiry
    })
  }

  function handleSave() {
    if (editing !== null) {
      setItems(prev => prev.map((it, i) =>
        i === editing
          ? { ...it, name: form.medicine, batch: form.batchNumber, qty: +form.quantity, price: +form.costPrice, expiry: form.expiryDate }
          : it
      ))
      setEditing(null)
    } else {
      // Add new
      const qty = +form.quantity
      const newStatus = qty === 0 ? 'Low stock' : qty < 10 ? 'Low stock' : 'In stock'
      setItems(prev => [...prev, {
        name: form.medicine, category: 'General', batch: form.batchNumber,
        qty, expiry: form.expiryDate, price: +form.costPrice,
        status: newStatus, statusClass: newStatus === 'In stock' ? 'badge-green' : 'badge-red'
      }])
    }
    setForm(EMPTY_BATCH)
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
            {CATEGORIES.map(c => <option key={c}>{c}</option>)}
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
                {filtered.map((item, idx) => (
                  <tr key={idx}>
                    <td style={{ fontWeight: 600 }}>{item.name}</td>
                    <td>{item.category}</td>
                    <td>{item.batch}</td>
                    <td>{item.qty}</td>
                    <td>{item.expiry}</td>
                    <td>{item.price}</td>
                    <td><span className={`badge ${item.statusClass}`}>{item.status}</span></td>
                    <td>
                      <button className="tbl-action tbl-edit" onClick={() => handleEdit(idx)}>Edit</button>
                      <button className="tbl-action tbl-del"  onClick={() => handleDelete(idx)}>Delete</button>
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
          <input className="form-input" placeholder="Medicine name" value={form.medicine}
            onChange={e => setForm(f => ({ ...f, medicine: e.target.value }))} />
        </div>
        <div className="form-group">
          <label className="form-label">Supplier</label>
          <input className="form-input" placeholder="Supplier name" value={form.supplier}
            onChange={e => setForm(f => ({ ...f, supplier: e.target.value }))} />
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
          <input className="form-input" type="number" min="0" placeholder="0.00" value={form.costPrice}
            onChange={e => setForm(f => ({ ...f, costPrice: e.target.value }))} />
        </div>
        <div className="form-group">
          <label className="form-label">Expiry date</label>
          <input className="form-input" placeholder="dd / mm / yyyy" value={form.expiryDate}
            onChange={e => setForm(f => ({ ...f, expiryDate: e.target.value }))} />
        </div>

        <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', marginTop: 8 }}
          onClick={handleSave}>
          Save batch
        </button>
        <button className="btn btn-outline" style={{ width: '100%', justifyContent: 'center', marginTop: 8 }}
          onClick={() => { setForm(EMPTY_BATCH); setEditing(null) }}>
          Cancel
        </button>
      </div>
    </div>
  )
}

