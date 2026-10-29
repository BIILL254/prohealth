import { useEffect, useState } from 'react'

const EMPTY = { name: '', phone: '', email: '', address: '' }

async function request(path, options) {
  const response = await fetch(path, options)
  if (!response.ok) {
    const result = await response.json().catch(() => ({}))
    throw new Error(result.error || 'The request failed.')
  }
  return response.status === 204 ? null : response.json()
}

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState([])
  const [form, setForm]           = useState(EMPTY)
  const [editing, setEditing]     = useState(null)
  const [search, setSearch]       = useState('')
  const [error, setError]         = useState('')
  const [saving, setSaving]       = useState(false)

  useEffect(() => {
    request('/api/suppliers')
      .then(setSuppliers)
      .catch(err => setError(err.message))
  }, [])

  const filtered = suppliers.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.email.toLowerCase().includes(search.toLowerCase())
  )

  async function handleSave() {
    setSaving(true)
    try {
      const saved = await request(editing === null ? '/api/suppliers' : `/api/suppliers/${editing}`, {
        method: editing === null ? 'POST' : 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      setSuppliers(prev => editing === null
        ? [...prev, saved]
        : prev.map(supplier => supplier.supplierId === editing ? saved : supplier))
      setEditing(null)
      setForm(EMPTY)
      setError('')
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(supplier) {
    if (!window.confirm(`Delete supplier ${supplier.name}?`)) return
    try {
      await request(`/api/suppliers/${supplier.supplierId}`, { method: 'DELETE' })
      setSuppliers(prev => prev.filter(item => item.supplierId !== supplier.supplierId))
      setError('')
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <div>
      <div className="page-header">
        <h1>Suppliers</h1>
        <p>Manage medicine suppliers</p>
      </div>
      {error && <div className="card" role="alert" style={{ marginBottom: 16 }}>{error}</div>}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: 24, alignItems: 'start' }}>
        <div>
          <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
            <input className="form-input" style={{ flex: 1 }}
              placeholder="Search suppliers..."
              value={search} onChange={e => setSearch(e.target.value)} />
            <button className="btn btn-primary" onClick={() => { setEditing(null); setForm(EMPTY) }}>
              + Add supplier
            </button>
          </div>
          <div className="card">
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Phone</th>
                    <th>Email</th>
                    <th>Address</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(s => (
                    <tr key={s.supplierId}>
                      <td style={{ fontWeight: 600 }}>{s.name}</td>
                      <td>{s.phone}</td>
                      <td>{s.email}</td>
                      <td>{s.address}</td>
                      <td>
                        <button className="tbl-action tbl-edit" onClick={() => { setEditing(s.supplierId); setForm({ name: s.name, phone: s.phone, email: s.email || '', address: s.address || '' }) }}>Edit</button>
                        <button className="tbl-action tbl-del" onClick={() => handleDelete(s)}>Delete</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Form */}
        <div className="card">
          <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>
            {editing !== null ? 'Edit supplier' : 'Add supplier'}
          </h2>
          {[['name', 'Supplier name', 'e.g. PharmaCo Ltd'], ['phone', 'Phone', '07xx xxx xxx'],
            ['email', 'Email', 'supplier@example.com'], ['address', 'Address', 'Street, City']].map(([key, label, ph]) => (
            <div className="form-group" key={key}>
              <label className="form-label">{label}</label>
              <input className="form-input" placeholder={ph} value={form[key]}
                onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} />
            </div>
          ))}
          <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', marginTop: 8 }} onClick={handleSave} disabled={saving}>
            {saving ? 'Saving…' : 'Save supplier'}
          </button>
          <button className="btn btn-outline" style={{ width: '100%', justifyContent: 'center', marginTop: 8 }}
            onClick={() => { setForm(EMPTY); setEditing(null) }}>Cancel</button>
        </div>
      </div>
    </div>
  )
}

