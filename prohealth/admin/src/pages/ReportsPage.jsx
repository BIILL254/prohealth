import { useState } from 'react'
import './ReportsPage.css'

const REPORT_TYPES = ['Sales report', 'Inventory report', 'Prescription report', 'Audit report']

const SALES_DATA = [
  { date: '01 Oct 2026', orders: 21, items: 64,  delivery: 1800, total: 38420 },
  { date: '02 Oct 2026', orders: 18, items: 55,  delivery: 1350, total: 31900 },
  { date: '03 Oct 2026', orders: 26, items: 81,  delivery: 2100, total: 47230 },
  { date: '04 Oct 2026', orders: 9,  items: 27,  delivery: 600,  total: 14880 },
  { date: '05 Oct 2026', orders: 24, items: 70,  delivery: 1950, total: 42510 },
  { date: '06 Oct 2026', orders: 19, items: 58,  delivery: 1500, total: 35260 },
  { date: '07 Oct 2026', orders: 22, items: 66,  delivery: 1650, total: 40030 },
]

const TOTALS = {
  orders: 139, items: 421, delivery: 10950, total: 250230
}

export default function ReportsPage() {
  const [reportType, setReportType] = useState('Sales report')
  const [from, setFrom]             = useState('01 / 10 / 2026')
  const [to, setTo]                 = useState('14 / 10 / 2026')
  const [sortBy, setSortBy]         = useState('Date')

  return (
    <div>
      <div className="page-header">
        <h1>Reports</h1>
        <p>Filter, sort and export</p>
      </div>

      {/* Filters bar */}
      <div className="card rep-filters">
        <div className="rep-filter-row">
          <div className="rep-filter-item">
            <label className="form-label">Report</label>
            <select className="form-select" value={reportType} onChange={e => setReportType(e.target.value)}>
              {REPORT_TYPES.map(r => <option key={r}>{r}</option>)}
            </select>
          </div>
          <div className="rep-filter-item">
            <label className="form-label">From</label>
            <input className="form-input" value={from} onChange={e => setFrom(e.target.value)} />
          </div>
          <div className="rep-filter-item">
            <label className="form-label">To</label>
            <input className="form-input" value={to} onChange={e => setTo(e.target.value)} />
          </div>
          <div className="rep-filter-item">
            <label className="form-label">Sort by</label>
            <select className="form-select" value={sortBy} onChange={e => setSortBy(e.target.value)}>
              <option>Date</option>
              <option>Orders</option>
              <option>Total sales</option>
            </select>
          </div>
          <div className="rep-filter-actions">
            <button className="btn btn-primary">Generate</button>
            <button className="btn btn-outline">PDF</button>
            <button className="btn btn-outline">Excel</button>
          </div>
        </div>
      </div>

      {/* Report preview */}
      <div className="card rep-preview">
        {/* Header */}
        <div className="rep-header">
          <div className="rep-header-left">
            <div className="rep-logo">
              <span className="rep-logo-icon">+</span>
              <span className="rep-logo-text">ProHealth Pharmacy</span>
            </div>
            <h2 className="rep-title">Sales Report</h2>
            <p className="rep-period">Period: 01 Oct 2026 to 14 Oct 2026</p>
          </div>
          <div className="rep-header-right">
            <p>Printed: 14 Oct 2026, 12:50</p>
            <p>By: Admin User</p>
          </div>
        </div>
        <hr className="rep-divider" />

        {/* Table */}
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Orders</th>
                <th>Items sold</th>
                <th>Delivery fees</th>
                <th style={{ textAlign: 'right' }}>Total sales (KES)</th>
              </tr>
            </thead>
            <tbody>
              {SALES_DATA.map((row, i) => (
                <tr key={i}>
                  <td>{row.date}</td>
                  <td>{row.orders}</td>
                  <td>{row.items}</td>
                  <td>{row.delivery.toLocaleString()}</td>
                  <td style={{ textAlign: 'right' }}>{row.total.toLocaleString()}</td>
                </tr>
              ))}
              <tr className="rep-total-row">
                <td style={{ fontWeight: 700 }}>Total</td>
                <td style={{ fontWeight: 700 }}>{TOTALS.orders}</td>
                <td style={{ fontWeight: 700 }}>{TOTALS.items}</td>
                <td style={{ fontWeight: 700 }}>{TOTALS.delivery.toLocaleString()}</td>
                <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--teal)' }}>
                  {TOTALS.total.toLocaleString()}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="rep-footer">
          <span>Page 1 of 3</span>
          <span>Confidential: ProHealth internal use</span>
        </div>
      </div>
    </div>
  )
}

