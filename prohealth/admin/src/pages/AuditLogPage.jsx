const LOGS = [
  { time: '14 Oct 2026, 12:50', user: 'Admin User', action: 'generate_report',    table: 'orders',        record: null,  ip: '197.156.12.4', details: 'Sales report 01–14 Oct 2026' },
  { time: '14 Oct 2026, 12:31', user: 'Mary Achieng', action: 'approve_prescription', table: 'prescriptions', record: 1041, ip: '197.156.12.5', details: 'Prescription #1041 approved' },
  { time: '14 Oct 2026, 12:10', user: 'Admin User', action: 'update_stock',       table: 'stock_batches', record: 8,    ip: '197.156.12.4', details: 'Batch B-2291 qty updated to 34' },
  { time: '14 Oct 2026, 11:58', user: 'Mary Achieng', action: 'reject_prescription', table: 'prescriptions', record: 1040, ip: '197.156.12.5', details: 'Prescription #1040 rejected – unclear image' },
  { time: '14 Oct 2026, 11:44', user: 'Admin User', action: 'add_user',           table: 'users',         record: 7,    ip: '197.156.12.4', details: 'New pharmacist account created' },
  { time: '14 Oct 2026, 10:05', user: 'Admin User', action: 'delete_medicine',    table: 'medicines',     record: 12,   ip: '197.156.12.4', details: 'Deleted discontinued product' },
]

export default function AuditLogPage() {
  return (
    <div>
      <div className="page-header">
        <h1>Audit log</h1>
        <p>All admin and pharmacist actions</p>
      </div>
      <div className="card">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Timestamp</th>
                <th>User</th>
                <th>Action</th>
                <th>Table</th>
                <th>Record</th>
                <th>IP address</th>
                <th>Details</th>
              </tr>
            </thead>
            <tbody>
              {LOGS.map((log, i) => (
                <tr key={i}>
                  <td style={{ fontSize: 13, color: 'var(--muted)', whiteSpace: 'nowrap' }}>{log.time}</td>
                  <td style={{ fontWeight: 500 }}>{log.user}</td>
                  <td><code style={{ background: '#f3f4f6', padding: '2px 6px', borderRadius: 4, fontSize: 12 }}>{log.action}</code></td>
                  <td style={{ fontSize: 13 }}>{log.table}</td>
                  <td style={{ fontSize: 13 }}>{log.record ?? '—'}</td>
                  <td style={{ fontSize: 13, color: 'var(--muted)' }}>{log.ip}</td>
                  <td style={{ fontSize: 13, maxWidth: 280 }}>{log.details}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

