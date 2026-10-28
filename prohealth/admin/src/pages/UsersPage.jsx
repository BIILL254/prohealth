import { useState } from 'react'
import './UsersPage.css'

const INIT_USERS = [
  { name: 'Admin User',    email: 'admin@prohealth.co.ke',    phone: '0700 111 222', role: 'Admin',       twofa: 'On',  status: 'Active',    statusClass: 'badge-green',  roleClass: 'badge-purple' },
  { name: 'Mary Achieng',  email: 'mary@prohealth.co.ke',     phone: '0711 222 333', role: 'Pharmacist',  twofa: 'On',  status: 'Active',    statusClass: 'badge-green',  roleClass: 'badge-teal'   },
  { name: 'Bill Kundu',    email: 'bill.kundu@strathmore.edu', phone: '0712 345 678', role: 'Customer',   twofa: 'Off', status: 'Active',    statusClass: 'badge-green',  roleClass: 'badge-gray'   },
  { name: 'Amina Otieno',  email: 'amina@example.com',        phone: '0722 456 789', role: 'Customer',   twofa: 'Off', status: 'Active',    statusClass: 'badge-green',  roleClass: 'badge-gray'   },
  { name: 'Peter Mwangi',  email: 'peter@example.com',        phone: '0733 567 890', role: 'Customer',   twofa: 'Off', status: 'Suspended', statusClass: 'badge-red',    roleClass: 'badge-gray'   },
  { name: 'Grace Wanjiru', email: 'grace@example.com',        phone: '0744 678 901', role: 'Customer',   twofa: 'Off', status: 'Active',    statusClass: 'badge-green',  roleClass: 'badge-gray'   },
]

const ROLES = ['All roles', 'Admin', 'Pharmacist', 'Customer']

export default function UsersPage() {
  const [users, setUsers]   = useState(INIT_USERS)
  const [search, setSearch] = useState('')
  const [roleF, setRoleF]   = useState('All roles')
  const [showModal, setShowModal] = useState(false)
  const [newUser, setNewUser] = useState({ name: '', email: '', phone: '', role: 'Customer', password: '' })

  const filtered = users.filter(u => {
    const matchSearch = u.name.toLowerCase().includes(search.toLowerCase()) ||
                        u.email.toLowerCase().includes(search.toLowerCase())
    const matchRole   = roleF === 'All roles' || u.role === roleF
    return matchSearch && matchRole
  })

  function handleRegister() {
    if (!newUser.name || !newUser.email) return
    const roleClass = newUser.role === 'Admin' ? 'badge-purple' : newUser.role === 'Pharmacist' ? 'badge-teal' : 'badge-gray'
    setUsers(prev => [...prev, {
      ...newUser,
      twofa: newUser.role !== 'Customer' ? 'On' : 'Off',
      status: 'Active', statusClass: 'badge-green', roleClass
    }])
    setNewUser({ name: '', email: '', phone: '', role: 'Customer', password: '' })
    setShowModal(false)
  }

  function toggleStatus(idx) {
    setUsers(prev => prev.map((u, i) =>
      i === idx
        ? { ...u, status: u.status === 'Active' ? 'Suspended' : 'Active',
            statusClass: u.status === 'Active' ? 'badge-red' : 'badge-green' }
        : u
    ))
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
              {filtered.map((u, i) => (
                <tr key={i}>
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
                    <button className="tbl-action tbl-edit" onClick={() => toggleStatus(i)}>
                      {u.status === 'Active' ? 'Edit' : 'Reactivate'}
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
              <button className="btn btn-primary" onClick={handleRegister}>Register</button>
              <button className="btn btn-outline" onClick={() => setShowModal(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

