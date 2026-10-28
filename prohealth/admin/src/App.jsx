import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useState } from 'react'
import AdminLayout from './components/AdminLayout'
import LoginPage from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'
import OrdersPage from './pages/OrdersPage'
import PrescriptionsPage from './pages/PrescriptionsPage'
import InventoryPage from './pages/InventoryPage'
import SuppliersPage from './pages/SuppliersPage'
import UsersPage from './pages/UsersPage'
import ReportsPage from './pages/ReportsPage'
import AuditLogPage from './pages/AuditLogPage'

export default function App() {
  const [loggedIn, setLoggedIn] = useState(false)

  if (!loggedIn) {
    return <LoginPage onLogin={() => setLoggedIn(true)} />
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<AdminLayout onLogout={() => setLoggedIn(false)} />}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard"     element={<DashboardPage />} />
          <Route path="orders"        element={<OrdersPage />} />
          <Route path="prescriptions" element={<PrescriptionsPage />} />
          <Route path="inventory"     element={<InventoryPage />} />
          <Route path="suppliers"     element={<SuppliersPage />} />
          <Route path="users"         element={<UsersPage />} />
          <Route path="reports"       element={<ReportsPage />} />
          <Route path="audit-log"     element={<AuditLogPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

