import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell
} from 'recharts'
import './DashboardPage.css'

const salesData = [
  { day: 'Mon', sales: 32000 },
  { day: 'Tue', sales: 38000 },
  { day: 'Wed', sales: 27000 },
  { day: 'Thu', sales: 46000 },
  { day: 'Fri', sales: 43000 },
  { day: 'Sat', sales: 55000 },
  { day: 'Sun', sales: 35000 },
]

const recentOrders = [
  { id: '#1042', customer: 'Bill Kundu',   total: 'KES 1,640', payment: 'M-Pesa ✓', status: 'Processing', statusClass: 'badge-orange' },
  { id: '#1041', customer: 'Amina Otieno', total: 'KES 960',   payment: 'M-Pesa ✓', status: 'Ready',      statusClass: 'badge-blue'   },
  { id: '#1040', customer: 'Peter Mwangi', total: 'KES 2,310', payment: 'M-Pesa ✓', status: 'Completed',  statusClass: 'badge-green'  },
  { id: '#1039', customer: 'Grace Wanjiru',total: 'KES 540',   payment: 'Pending',   status: 'Pending',    statusClass: 'badge-gray'   },
]

const alerts = [
  { dot: 'dot-orange', name: 'Amoxicillin 250mg',  detail: 'Expires 02 Nov 2026 (batch B-2291)' },
  { dot: 'dot-red',    name: 'Insulin pen',         detail: '3 left, reorder level 10' },
  { dot: 'dot-orange', name: 'Cetirizine 10mg',     detail: 'Expires 20 Nov 2026 (batch C-0912)' },
  { dot: 'dot-red',    name: 'Vitamin C 1000mg',    detail: '8 left, reorder level 15' },
]

const today = new Date().toLocaleDateString('en-GB', {
  weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
})

export default function DashboardPage() {
  return (
    <div>
      <div className="page-header">
        <h1>Dashboard</h1>
        <p>{today}</p>
      </div>

      {/* KPI cards */}
      <div className="kpi-grid">
        <div className="card kpi-card">
          <p className="kpi-label">Today's sales</p>
          <p className="kpi-value">KES 48,320</p>
          <p className="kpi-change positive">+12% vs yesterday</p>
        </div>
        <div className="card kpi-card">
          <p className="kpi-label">Pending orders</p>
          <p className="kpi-value">17</p>
          <p className="kpi-change warning">5 need a prescription check</p>
        </div>
        <div className="card kpi-card">
          <p className="kpi-label">Low-stock items</p>
          <p className="kpi-value">9</p>
          <p className="kpi-change danger">Below reorder level</p>
        </div>
        <div className="card kpi-card">
          <p className="kpi-label">Expiring in 30 days</p>
          <p className="kpi-value">6</p>
          <p className="kpi-change warning">Batches to review</p>
        </div>
      </div>

      {/* Chart + Alerts */}
      <div className="dash-mid">
        <div className="card chart-card">
          <h2 className="section-title">Sales this week (KES)</h2>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={salesData} barSize={36}>
              <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 13, fill: '#6b7280' }} />
              <YAxis hide />
              <Tooltip
                formatter={v => [`KES ${v.toLocaleString()}`, 'Sales']}
                contentStyle={{ borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 13 }}
              />
              <Bar dataKey="sales" radius={[6, 6, 0, 0]}>
                {salesData.map((_, i) => (
                  <Cell key={i} fill={i === 5 ? '#0d7a6e' : '#5bbdb4'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="card alerts-card">
          <h2 className="section-title">Alerts</h2>
          <ul className="alerts-list">
            {alerts.map((a, i) => (
              <li key={i} className="alert-item">
                <span className={`dot ${a.dot}`} />
                <div>
                  <p className="alert-name">{a.name}</p>
                  <p className="alert-detail">{a.detail}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Recent orders */}
      <div className="card" style={{ marginTop: 24 }}>
        <div className="section-header">
          <h2 className="section-title">Recent orders</h2>
          <a href="#orders" className="view-all">View all &rsaquo;</a>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Order</th>
                <th>Customer</th>
                <th>Total</th>
                <th>Payment</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {recentOrders.map(o => (
                <tr key={o.id}>
                  <td style={{ fontWeight: 600 }}>{o.id}</td>
                  <td>{o.customer}</td>
                  <td>{o.total}</td>
                  <td>{o.payment}</td>
                  <td><span className={`badge ${o.statusClass}`}>{o.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

