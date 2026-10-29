import { useEffect, useState } from 'react'
import './UsersPage.css'

const ROLES = ['All roles', 'Admin', 'Pharmacist', 'Customer']

async function request(path, options) {
  const response = await fetch(path, options)
  if (!response.ok) {
    const result = await response.json().catch(() => ({}))
    throw new Error(result.error || 'The request failed.')
  }
  return response.json()
}

function toViewUser(user) {
  const role = user.role[0].toUpperCase() + user.role.slice(1)
  const active = user.status === 'active'
  return {
    ...user,
    role,
    twofa: Number(user.twoFactorEnabled) ? 'On' : 'Off',
    status: active ? 'Active' : 'Suspended',
    statusClass: active ? 'badge-green' : 'badge-red',
    roleClass: role === 'Admin' ? 'badge-purple' : role === 'Pharmacist' ? 'badge-teal' : 'badge-gray',
  }
}

export default function UsersPage() {
  const [users, setUsers]   = useState([])
  const [search, setSearch] = useState('')
  const [roleF, setRoleF]   = useState('All roles')
  const [showModal, setShowModal] = useState(false)
  const [newUser, setNewUser] = useState({ name: '', email: '', phone: '', role: 'Customer', password: '' })
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    request('/api/users')
      .then(rows => setUsers(rows.map(toViewUser)))
      .catch(err => setError(err.message))
  }, [])

  const filtered = users.filter(u => {
    const matchSearch = u.name.toLowerCase().includes(search.toLowerCase()) ||
                        u.email.toLowerCase().includes(search.toLowerCase())
    const matchRole   = roleF === 'All roles' || u.role === roleF
    return matchSearch && matchRole
  })

  async function handleRegister() {
    setSaving(true)
    try {
      const created = await request('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newUser),
      })
      setUsers(prev => [...prev, toViewUser(created)])
      setNewUser({ name: '', email: '', phone: '', role: 'Customer', password: '' })
      setShowModal(false)
      setError('')
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  async function toggleStatus(user) {
    const status = user.status === 'Active' ? 'suspended' : 'active'
    try {
      await request(`/api/users/${user.userId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      setUsers(prev => prev.map(item => item.userId === user.userId
        ? toViewUser({ ...item, status })
        : item))
      setError('')
    } catch (err) {
      setError(err.message)
    }
  }

  function initials(name) {
    return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
  }

  return (
    <div>
      <div className="page-header">
        <h1>Users</h1>
        <p>Register users, reset passwords, change roles</p>
      </div>
      {error && <div className="card" role="alert" style={{ marginBottom: 16 }}>{error}</div>}

      <div className="users-filters">
        <input className="form-input users-search" placeholder="Search by name or email"
          value={search} onChange={e => setSearch(e.target.value)} />
        <select className="form-select" value={roleF} onChange={e => setRoleF(e.target.value)}>
          {ROLES.map(r => <option key={r}>{r}</option>)}
        </select>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>+ Register user</button>
      </div>

      <div className="card">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Phone</th>
                <th>Role</th>
                <th>2FA</th>
                <th>Status</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {filtered.map(u => (
                <tr key={u.userId}>
                  <td>
                    <div className="user-row">
                      <div className="user-avatar-sm">{initials(u.name)}</div>
                      <span style={{ fontWeight: 500 }}>{u.name}</span>
                    </div>
                  </td>
                  <td>{u.email}</td>
                  <td>{u.phone}</td>
                  <td><span className={`badge ${u.roleClass}`}>{u.role}</span></td>
                  <td style={{ color: u.twofa === 'On' ? 'var(--teal)' : 'var(--muted)', fontWeight: 500 }}>{u.twofa}</td>
                  <td><span className={`badge ${u.statusClass}`}>{u.status}</span></td>
                  <td>
                    <button className="tbl-action tbl-edit">Reset password</button>
                    <button className="tbl-action tbl-edit" onClick={() => toggleStatus(u)}>
                      {u.status === 'Active' ? 'Suspend' : 'Reactivate'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Register modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-card card" onClick={e => e.stopPropagation()}>
            <h2 className="modal-title">Register new user</h2>
            <div className="form-group">
              <label className="form-label">Full name</label>
              <input className="form-input" value={newUser.name}
                onChange={e => setNewUser(u => ({ ...u, name: e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="form-label">Email address</label>
              <input className="form-input" type="email" value={newUser.email}
                onChange={e => setNewUser(u => ({ ...u, email: e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="form-label">Phone</label>
              <input className="form-input" value={newUser.phone}
                onChange={e => setNewUser(u => ({ ...u, phone: e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="form-label">Role</label>
              <select className="form-select" value={newUser.role}
                onChange={e => setNewUser(u => ({ ...u, role: e.target.value }))}>
                <option>Customer</option>
                <option>Pharmacist</option>
                <option>Admin</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Temporary password</label>
              <input className="form-input" type="password" value={newUser.password}
                onChange={e => setNewUser(u => ({ ...u, password: e.target.value }))} />
            </div>
            <div className="modal-actions">
              <button className="btn btn-primary" onClick={handleRegister} disabled={saving}>{saving ? 'Registering…' : 'Register'}</button>
              <button className="btn btn-outline" onClick={() => setShowModal(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

