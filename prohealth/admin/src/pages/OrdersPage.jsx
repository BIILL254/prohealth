import { useState } from 'react'

const ORDERS = [
  { id: '#1042', customer: 'Bill Kundu',    date: '14 Oct 2026, 11:44', total: 'KES 1,640', payment: 'M-Pesa ✓', type: 'Delivery', status: 'Processing', statusClass: 'badge-orange' },
  { id: '#1041', customer: 'Amina Otieno',  date: '14 Oct 2026, 11:20', total: 'KES 960',   payment: 'M-Pesa ✓', type: 'Pickup',   status: 'Ready',      statusClass: 'badge-blue'   },
  { id: '#1040', customer: 'Peter Mwangi',  date: '14 Oct 2026, 10:05', total: 'KES 2,310', payment: 'M-Pesa ✓', type: 'Delivery', status: 'Completed',  statusClass: 'badge-green'  },
  { id: '#1039', customer: 'Grace Wanjiru', date: '13 Oct 2026, 18:32', total: 'KES 540',   payment: 'Pending',   type: 'Pickup',   status: 'Pending',    statusClass: 'badge-gray'   },
  { id: '#1038', customer: 'John Kamau',    date: '13 Oct 2026, 15:14', total: 'KES 1,120', payment: 'M-Pesa ✓', type: 'Delivery', status: 'Completed',  statusClass: 'badge-green'  },
  { id: '#1037', customer: 'Bill Kundu',    date: '13 Oct 2026, 12:00', total: 'KES 380',   payment: 'M-Pesa ✓', type: 'Pickup',   status: 'Cancelled',  statusClass: 'badge-red'    },
]

const STATUSES = ['All', 'Pending', 'Processing', 'Ready', 'Completed', 'Cancelled']

export default function OrdersPage() {
  const [statusF, setStatusF] = useState('All')
  const [search, setSearch]   = useState('')

  const filtered = ORDERS.filter(o => {
    const matchS = statusF === 'All' || o.status === statusF
    const matchQ = o.customer.toLowerCase().includes(search.toLowerCase()) || o.id.includes(search)
    return matchS && matchQ
  })

  return (
    <div>
      <div className="page-header">
        <h1>Orders</h1>
        <p>View and manage all customer orders</p>
      </div>

      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
        <input className="form-input" style={{ flex: 1, maxWidth: 320 }}
          placeholder="Search by order # or customer"
          value={search} onChange={e => setSearch(e.target.value)} />
        <select className="form-select" style={{ width: 180 }}
          value={statusF} onChange={e => setStatusF(e.target.value)}>
          {STATUSES.map(s => <option key={s}>{s}</option>)}
        </select>
      </div>

      <div className="card">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Order</th>
                <th>Customer</th>
                <th>Date</th>
                <th>Total</th>
                <th>Payment</th>
                <th>Type</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(o => (
                <tr key={o.id}>
                  <td style={{ fontWeight: 600 }}>{o.id}</td>
                  <td>{o.customer}</td>
                  <td style={{ color: 'var(--muted)', fontSize: 13 }}>{o.date}</td>
                  <td>{o.total}</td>
                  <td>{o.payment}</td>
                  <td>{o.type}</td>
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

