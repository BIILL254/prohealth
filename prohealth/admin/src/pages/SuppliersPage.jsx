import { useState } from 'react'

const INIT_SUPPLIERS = [
  { name: 'PharmaCo Ltd',     phone: '0700 111 000', email: 'info@pharmaco.co.ke',    address: 'Industrial Area, Nairobi' },
  { name: 'MediSupply Kenya', phone: '0711 222 333', email: 'orders@medisupply.co.ke', address: 'Tom Mboya St, Nairobi'   },
  { name: 'HealthBridge',     phone: '0722 333 444', email: 'hb@healthbridge.co.ke',   address: 'Mombasa Rd, Nairobi'     },
]

const EMPTY = { name: '', phone: '', email: '', address: '' }

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState(INIT_SUPPLIERS)
  const [form, setForm]           = useState(EMPTY)
  const [editing, setEditing]     = useState(null)
  const [search, setSearch]       = useState('')

  const filtered = suppliers.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.email.toLowerCase().includes(search.toLowerCase())
  )

  function handleSave() {
    if (!form.name) return
    if (editing !== null) {
      setSuppliers(prev => prev.map((s, i) => i === editing ? { ...form } : s))
      setEditing(null)
    } else {
      setSuppliers(prev => [...prev, { ...form }])
    }
    setForm(EMPTY)
  }

  return (
    <div>
      <div className="page-header">
        <h1>Suppliers</h1>
        <p>Manage medicine suppliers</p>
      </div>

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
                  {filtered.map((s, i) => (
                    <tr key={i}>
                      <td style={{ fontWeight: 600 }}>{s.name}</td>
                      <td>{s.phone}</td>
                      <td>{s.email}</td>
                      <td>{s.address}</td>
                      <td>
                        <button className="tbl-action tbl-edit" onClick={() => { setEditing(i); setForm({ ...s }) }}>Edit</button>
                        <button className="tbl-action tbl-del" onClick={() => setSuppliers(prev => prev.filter((_, j) => j !== i))}>Delete</button>
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
          <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', marginTop: 8 }} onClick={handleSave}>
            Save supplier
          </button>
          <button className="btn btn-outline" style={{ width: '100%', justifyContent: 'center', marginTop: 8 }}
            onClick={() => { setForm(EMPTY); setEditing(null) }}>Cancel</button>
        </div>
      </div>
    </div>
  )
}

