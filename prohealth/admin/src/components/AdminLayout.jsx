import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import './AdminLayout.css'

const NAV_ITEMS = [
  { to: '/dashboard',     label: 'Dashboard' },
  { to: '/orders',        label: 'Orders' },
  { to: '/prescriptions', label: 'Prescriptions' },
  { to: '/inventory',     label: 'Inventory' },
  { to: '/suppliers',     label: 'Suppliers' },
  { to: '/users',         label: 'Users' },
  { to: '/reports',       label: 'Reports' },
  { to: '/audit-log',     label: 'Audit log' },
]

export default function AdminLayout({ onLogout }) {
  const [search, setSearch] = useState('')

  return (
    <div className="layout">
      {/* ── Sidebar ── */}
      <aside className="sidebar">
        <div className="sidebar-logo">
          <span className="logo-icon">+</span>
          <span className="logo-text">ProHealth</span>
        </div>
        <p className="sidebar-section-label">ADMIN PANEL</p>
        <nav className="sidebar-nav">
          {NAV_ITEMS.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => 'sidebar-link' + (isActive ? ' active' : '')}
            >
              <span className="nav-dot" />
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-user">
          <div className="user-avatar">AD</div>
          <div className="user-info">
            <span className="user-name">Admin User</span>
            <button className="logout-btn" onClick={onLogout}>Log out</button>
          </div>
        </div>
      </aside>

      {/* ── Main ── */}
      <div className="main">
        <header className="topbar">
          <div />
          <input
            className="topbar-search"
            placeholder="Search anything"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </header>
        <main className="content">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

