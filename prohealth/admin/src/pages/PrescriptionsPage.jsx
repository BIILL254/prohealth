import { useState } from 'react'
import './PrescriptionsPage.css'

const QUEUE = [
  { initial: 'B', name: 'Bill Kundu',    order: '#1042', time: '11:44', medicines: [{ name: 'Amoxicillin 250mg × 1', type: 'Rx' }, { name: 'Paracetamol 500mg × 2', type: 'OTC' }, { name: 'Vitamin C 1000mg × 1', type: 'OTC' }], phone: '0712 345 678', uploaded: '14 Oct 2026, 11:44' },
  { initial: 'A', name: 'Amina Otieno',  order: '#1043', time: '11:58', medicines: [{ name: 'Insulin pen × 1', type: 'Rx' }], phone: '0722 456 789', uploaded: '14 Oct 2026, 11:58' },
  { initial: 'P', name: 'Peter Mwangi',  order: '#1044', time: '12:10', medicines: [{ name: 'Metformin 500mg × 2', type: 'Rx' }], phone: '0733 567 890', uploaded: '14 Oct 2026, 12:10' },
  { initial: 'G', name: 'Grace Wanjiru', order: '#1045', time: '12:31', medicines: [{ name: 'Cetirizine 10mg × 1', type: 'OTC' }, { name: 'Ibuprofen 400mg × 1', type: 'OTC' }], phone: '0744 678 901', uploaded: '14 Oct 2026, 12:31' },
  { initial: 'J', name: 'John Kamau',    order: '#1046', time: '12:40', medicines: [{ name: 'Amoxicillin 250mg × 2', type: 'Rx' }], phone: '0755 789 012', uploaded: '14 Oct 2026, 12:40' },
]

export default function PrescriptionsPage() {
  const [selected, setSelected]     = useState(0)
  const [notes, setNotes]           = useState('')
  const [statuses, setStatuses]     = useState(QUEUE.map(() => 'Pending review'))

  function resolve(status) {
    setStatuses(prev => prev.map((s, i) => i === selected ? status : s))
    setNotes('')
  }

  const item    = QUEUE[selected]
  const curStatus = statuses[selected]

  return (
    <div>
      <div className="page-header">
        <h1>Prescription review</h1>
        <p>{QUEUE.filter((_, i) => statuses[i] === 'Pending review').length} waiting for a pharmacist</p>
      </div>

      <div className="rx-layout">
        {/* Queue */}
        <div className="card rx-queue">
          <h2 className="rx-queue-title">Queue</h2>
          <ul className="queue-list">
            {QUEUE.map((q, i) => (
              <li
                key={i}
                className={'queue-item' + (selected === i ? ' queue-item--active' : '')}
                onClick={() => setSelected(i)}
              >
                <div className={'queue-avatar' + (selected === i ? ' queue-avatar--active' : '')}>
                  {q.initial}
                </div>
                <div className="queue-info">
                  <p className="queue-name">{q.name}</p>
                  <p className="queue-order">Order {q.order}</p>
                </div>
                <span className="queue-time">{q.time}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Detail */}
        <div className="card rx-detail">
          <div className="rx-detail-header">
            <h2>Order {item.order} · {item.name}</h2>
            <span className={`badge ${curStatus === 'Approved' ? 'badge-green' : curStatus === 'Rejected' ? 'badge-red' : 'badge-orange'}`}>
              {curStatus}
            </span>
          </div>

          <div className="rx-body">
            {/* Image placeholder */}
            <div className="rx-image">
              <span>Uploaded prescription</span>
            </div>

            {/* Info */}
            <div className="rx-info">
              <p className="rx-info-label">Medicines on this order</p>
              <ul className="rx-meds">
                {item.medicines.map((m, i) => (
                  <li key={i} className="rx-med-item">
                    <span>{m.name}</span>
                    <span className={`badge ${m.type === 'Rx' ? 'badge-orange' : 'badge-gray'}`}>{m.type}</span>
                  </li>
                ))}
              </ul>
              <div className="rx-meta">
                <div>
                  <p className="rx-meta-label">Customer</p>
                  <p className="rx-meta-value">{item.name} · {item.phone}</p>
                </div>
                <div style={{ marginTop: 16 }}>
                  <p className="rx-meta-label">Uploaded</p>
                  <p className="rx-meta-value">{item.uploaded}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="rx-notes-section">
            <p className="form-label">Reviewer notes</p>
            <textarea
              className="form-textarea rx-textarea"
              placeholder="Add a note for the customer (required if rejecting)..."
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={4}
              disabled={curStatus !== 'Pending review'}
            />
          </div>

          {curStatus === 'Pending review' && (
            <div className="rx-actions">
              <button className="btn btn-primary rx-approve" onClick={() => resolve('Approved')}>
                Approve prescription
              </button>
              <button className="btn btn-danger rx-reject" onClick={() => resolve('Rejected')}>
                Reject
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

