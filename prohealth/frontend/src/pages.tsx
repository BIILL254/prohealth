import { useState, type FormEvent } from 'react'

const formatPrice = (price: number) => `KES ${new Intl.NumberFormat('en-KE').format(price)}`

export function HomePage({ name, onBrowse, onNavigate }: {
  name: string
  onBrowse: () => void
  onNavigate: (page: 'prescriptions' | 'orders' | 'help') => void
}) {
  return (
    <main className="page-content feature-page">
      <section className="home-hero">
        <div className="home-hero-copy">
          <span className="eyebrow"><span className="trust-dot" /> Your trusted online pharmacy</span>
          <h1>Good health starts with the right care.</h1>
          <p>Hi {name.split(' ')[0]}, find the medicines you need, manage your prescriptions, and keep track of every order.</p>
          <button className="button button-primary hero-button" type="button" onClick={onBrowse}>Browse medicines <span aria-hidden="true">→</span></button>
        </div>
        <div className="home-hero-art" aria-hidden="true">
          <div className="hero-art-circle"><span className="hero-cross">+</span></div>
          <span className="hero-pill pill-one" />
          <span className="hero-pill pill-two" />
          <span className="hero-sparkle sparkle-one">✦</span>
          <span className="hero-sparkle sparkle-two">✦</span>
          <div className="hero-art-card"><span className="art-check">✓</span><span>Care you can trust</span></div>
        </div>
      </section>

      <section className="home-section">
        <div className="section-heading">
          <div><h2>How can we help today?</h2><p>Quick access to your ProHealth services.</p></div>
        </div>
        <div className="quick-links">
          <button className="quick-link-card" type="button" onClick={onBrowse}>
            <span className="quick-link-icon icon-medicines" aria-hidden="true">＋</span>
            <span><strong>Shop medicines</strong><small>Browse our medicine catalogue</small></span><span className="quick-arrow">→</span>
          </button>
          <button className="quick-link-card" type="button" onClick={() => onNavigate('prescriptions')}>
            <span className="quick-link-icon icon-prescriptions" aria-hidden="true">↥</span>
            <span><strong>Prescriptions</strong><small>Upload and track your prescriptions</small></span><span className="quick-arrow">→</span>
          </button>
          <button className="quick-link-card" type="button" onClick={() => onNavigate('orders')}>
            <span className="quick-link-icon icon-orders" aria-hidden="true">▤</span>
            <span><strong>My orders</strong><small>See order status and history</small></span><span className="quick-arrow">→</span>
          </button>
          <button className="quick-link-card" type="button" onClick={() => onNavigate('help')}>
            <span className="quick-link-icon icon-help" aria-hidden="true">?</span>
            <span><strong>Need help?</strong><small>Get answers to common questions</small></span><span className="quick-arrow">→</span>
          </button>
        </div>
      </section>

      <section className="home-promo">
        <div><span className="promo-icon" aria-hidden="true">✓</span><div><h2>Care from a pharmacy you can trust</h2><p>Genuine medicines, checked by qualified pharmacists, delivered to your door.</p></div></div>
        <button className="text-link" type="button" onClick={() => onNavigate('help')}>Learn more <span aria-hidden="true">→</span></button>
      </section>
    </main>
  )
}

type PrescriptionFile = { name: string; date: string; status: 'Under review' | 'Approved' | 'Needs attention' }

export function PrescriptionsPage() {
  const [files, setFiles] = useState<PrescriptionFile[]>([
    { name: 'Prescription_14_Oct_2026.pdf', date: '14 Oct 2026', status: 'Approved' },
    { name: 'Prescription_02_Oct_2026.jpg', date: '02 Oct 2026', status: 'Needs attention' },
  ])
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [message, setMessage] = useState('')

  function uploadPrescription(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!selectedFile) {
      setMessage('Choose a prescription file before uploading.')
      return
    }

    setFiles((current) => [
      { name: selectedFile.name, date: new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium' }).format(new Date()), status: 'Under review' },
      ...current,
    ])
    setMessage(`${selectedFile.name} was added to this demo. Connect the service to submit it for pharmacist review.`)
    setSelectedFile(null)
    event.currentTarget.reset()
  }

  function chooseFile(file: File | undefined) {
    setMessage('')
    if (!file) return
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png']
    if (!allowedTypes.includes(file.type)) {
      setMessage('Choose a PDF, JPG, or PNG file.')
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      setMessage('The file is larger than 5 MB. Choose a smaller file.')
      return
    }
    setSelectedFile(file)
  }

  return (
    <main className="page-content detail-page">
      <div className="page-heading">
        <div><h1>Prescriptions</h1><p>Upload prescriptions and check their review status.</p></div>
        <span className="trust-note"><span className="trust-dot" /> Reviewed by a pharmacist</span>
      </div>
      <div className="prescription-layout">
        <section className="surface-card upload-card">
          <div className="content-card-heading">
            <span className="quick-link-icon icon-prescriptions" aria-hidden="true">↥</span>
            <div><h2>Upload a prescription</h2><p>Accepted formats: PDF, JPG, or PNG. Maximum file size: 5 MB.</p></div>
          </div>
          <form onSubmit={uploadPrescription}>
            <label
              className={`upload-dropzone ${selectedFile ? 'has-file' : ''}`}
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) => {
                event.preventDefault()
                chooseFile(event.dataTransfer.files[0])
              }}
            >
              <input
                type="file"
                accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
                onChange={(event) => chooseFile(event.target.files?.[0])}
              />
              <span className="upload-symbol" aria-hidden="true">{selectedFile ? '✓' : '↑'}</span>
              <strong>{selectedFile ? selectedFile.name : 'Choose a prescription to upload'}</strong>
              <span>{selectedFile ? 'Ready to submit for pharmacist review' : 'Drag a file here or browse your device'}</span>
              <span className="button button-secondary browse-button">Browse files</span>
            </label>
            <div className="upload-actions">
              <p>Keep your prescription clear and make sure all details are visible.</p>
              <button className="button button-primary" type="submit">Upload prescription</button>
            </div>
            {message && <p className="inline-message" role="status">{message}</p>}
          </form>
        </section>

        <section className="surface-card prescription-history">
          <div className="section-heading"><div><h2>Your prescriptions</h2><p>Recent uploads and pharmacist reviews.</p></div></div>
          {files.length ? (
            <div className="prescription-list">
              {files.map((file, index) => (
                <article className="prescription-row" key={`${file.name}-${index}`}>
                  <span className="file-icon" aria-hidden="true">PDF</span>
                  <span className="prescription-info"><strong>{file.name}</strong><small>Uploaded {file.date}</small></span>
                  <span className={`status-pill ${file.status === 'Approved' ? 'status-success' : file.status === 'Under review' ? 'status-pending' : 'status-warning'}`}>{file.status}</span>
                  {file.status === 'Needs attention' && <p className="review-note">Please upload a clearer image to continue.</p>}
                </article>
              ))}
            </div>
          ) : <div className="empty-panel"><p>No prescriptions uploaded yet.</p></div>}
        </section>
      </div>
      <aside className="info-banner"><span aria-hidden="true">ⓘ</span><p>Prescription medicines can only be prepared after a pharmacist has reviewed and approved a valid prescription.</p></aside>
    </main>
  )
}

type Order = {
  id: string
  date: string
  items: number
  total: number
  status: 'Processing' | 'Completed' | 'Cancelled' | 'Rejected (no Rx)'
  fulfilment: string
  payment: string
  receipt: string
  progress: number
  products: string
}

const orders: Order[] = [
  { id: '1042', date: '14 Oct 2026', items: 3, total: 1640, status: 'Processing', fulfilment: 'Delivery', payment: 'M-Pesa', receipt: 'QJE4X9K2LM', progress: 3, products: 'Paracetamol 500mg × 2 · Amoxicillin 250mg × 1 · Vitamin C × 1' },
  { id: '1038', date: '09 Oct 2026', items: 2, total: 640, status: 'Completed', fulfilment: 'Pickup', payment: 'M-Pesa', receipt: 'KMT7P4A8BC', progress: 5, products: 'Paracetamol 500mg × 2 · Cetirizine 10mg × 1' },
  { id: '1031', date: '02 Oct 2026', items: 1, total: 450, status: 'Rejected (no Rx)', fulfilment: 'Delivery', payment: 'M-Pesa', receipt: '—', progress: 0, products: 'Amoxicillin 250mg × 1' },
  { id: '1027', date: '28 Sep 2026', items: 4, total: 2180, status: 'Completed', fulfilment: 'Delivery', payment: 'M-Pesa', receipt: 'HNK2D6M5RV', progress: 5, products: 'Paracetamol 500mg × 2 · Vitamin C × 1 · Adhesive plasters × 1' },
  { id: '1019', date: '15 Sep 2026', items: 2, total: 520, status: 'Completed', fulfilment: 'Pickup', payment: 'M-Pesa', receipt: 'TXK3L8D1QA', progress: 5, products: 'Ibuprofen 400mg × 1 · Cetirizine 10mg × 1' },
  { id: '1012', date: '03 Sep 2026', items: 1, total: 220, status: 'Completed', fulfilment: 'Delivery', payment: 'M-Pesa', receipt: 'CJM4B2P7WK', progress: 5, products: 'Ibuprofen 400mg × 1' },
]

const orderSteps = ['Order placed', 'Payment confirmed', 'Prescription approved', 'Being prepared', 'Ready / out for delivery', 'Completed']
type OrderFilter = 'All' | 'Active' | 'Completed' | 'Cancelled'

export function OrdersPage() {
  const [filter, setFilter] = useState<OrderFilter>('All')
  const [selectedId, setSelectedId] = useState('1042')
  const filteredOrders = orders.filter((order) => {
    if (filter === 'Active') return order.status === 'Processing'
    if (filter === 'Completed') return order.status === 'Completed'
    if (filter === 'Cancelled') return order.status === 'Cancelled' || order.status === 'Rejected (no Rx)'
    return true
  })
  const selectedOrder =
    filteredOrders.find((order) => order.id === selectedId) ??
    filteredOrders[0] ??
    orders[0]

  function downloadReceipt() {
    const receipt = [
      `ProHealth receipt - Order #${selectedOrder.id}`,
      `Date: ${selectedOrder.date}`,
      `Items: ${selectedOrder.products}`,
      `Fulfilment: ${selectedOrder.fulfilment}`,
      `Payment: ${selectedOrder.payment} (${selectedOrder.receipt})`,
      `Total: ${formatPrice(selectedOrder.total)}`,
      '',
      'Demo receipt for frontend preview.',
    ].join('\n')
    const url = URL.createObjectURL(new Blob([receipt], { type: 'text/plain' }))
    const link = document.createElement('a')
    link.href = url
    link.download = `prohealth-order-${selectedOrder.id}-receipt.txt`
    link.click()
    URL.revokeObjectURL(url)
  }

  return (
    <main className="page-content detail-page">
      <div className="page-heading"><div><h1>My orders</h1><p>View your order history and follow current orders.</p></div></div>
      <div className="order-filters" aria-label="Filter orders">
        {(['All', 'Active', 'Completed', 'Cancelled'] as const).map((item) => (
          <button className={`filter-chip ${filter === item ? 'selected' : ''}`} type="button" key={item} onClick={() => setFilter(item)} aria-pressed={filter === item}>{item}</button>
        ))}
      </div>
      <div className="orders-layout">
        <section className="surface-card orders-table-card" aria-label="Order history">
          <div className="orders-table-wrap">
            <table className="orders-table">
              <thead><tr><th>Order</th><th>Date</th><th>Items</th><th>Total</th><th>Status</th><th><span className="visually-hidden">Details</span></th></tr></thead>
              <tbody>
                {filteredOrders.map((order) => (
                  <tr className={selectedOrder.id === order.id ? 'selected-row' : ''} key={order.id}>
                    <td data-label="Order"><strong>#{order.id}</strong></td>
                    <td data-label="Date">{order.date}</td>
                    <td data-label="Items">{order.items}</td>
                    <td data-label="Total">{formatPrice(order.total)}</td>
                    <td data-label="Status"><span className={`status-pill ${order.status === 'Completed' ? 'status-success' : order.status === 'Processing' ? 'status-pending' : 'status-danger'}`}>{order.status}</span></td>
                    <td data-label="Details"><button className="text-link view-order" type="button" onClick={() => setSelectedId(order.id)}>View <span aria-hidden="true">›</span></button></td>
                  </tr>
                ))}
                {filteredOrders.length === 0 && <tr><td className="table-empty" colSpan={6}>No {filter.toLowerCase()} orders to show.</td></tr>}
              </tbody>
            </table>
          </div>
        </section>

        <section className="surface-card order-detail">
          <div className="order-detail-heading">
            <div><h2>Order #{selectedOrder.id}</h2><p>Placed {selectedOrder.date} · {selectedOrder.fulfilment} · Paid with {selectedOrder.payment} ({selectedOrder.receipt})</p></div>
            <span className={`status-pill ${selectedOrder.status === 'Completed' ? 'status-success' : selectedOrder.status === 'Processing' ? 'status-pending' : 'status-danger'}`}>{selectedOrder.status}</span>
          </div>
          {selectedOrder.status === 'Processing' ? (
            <ol className="order-timeline">
              {orderSteps.map((step, index) => (
                <li className={index < selectedOrder.progress ? 'complete' : ''} key={step}>
                  <span className="timeline-marker" aria-hidden="true">{index < selectedOrder.progress ? '✓' : ''}</span>
                  <span>{step}</span>
                  {index === selectedOrder.progress && <small>In progress</small>}
                </li>
              ))}
            </ol>
          ) : (
            <div className="order-status-message">
              <span aria-hidden="true">{selectedOrder.status === 'Completed' ? '✓' : '!'}</span>
              <div><strong>{selectedOrder.status === 'Completed' ? 'Order completed' : selectedOrder.status}</strong><p>{selectedOrder.status === 'Completed' ? 'This order has been fulfilled.' : 'This order could not be completed. Contact support if you need help.'}</p></div>
            </div>
          )}
          <div className="order-products"><p>{selectedOrder.products}</p><strong>Total <span>{formatPrice(selectedOrder.total)}</span></strong></div>
          <button className="button button-secondary receipt-button" type="button" onClick={downloadReceipt}>Download receipt</button>
        </section>
      </div>
    </main>
  )
}

const helpQuestions = [
  { question: 'How do I upload a prescription?', answer: 'Open Prescriptions in the top menu, choose Browse files, and upload a clear PDF, JPG, or PNG image under 5 MB. A pharmacist will review it before prescription medicines are prepared.' },
  { question: 'How can I pay for my order?', answer: 'At checkout, enter the phone number registered with M-Pesa. You will receive a payment prompt on your phone to approve the transaction.' },
  { question: 'Can I choose delivery or pickup?', answer: 'Yes. Choose delivery to your saved address or pickup at checkout. The available options and any delivery fee will be shown before you place your order.' },
  { question: 'How do I track my order?', answer: 'Open My Orders and select View beside an order to see its current status and fulfilment progress.' },
  { question: 'What if a medicine is out of stock?', answer: 'Select Notify me to see the availability feedback in this demo. Actual restock notifications will be available when the notification service is connected.' },
]

export function HelpPage() {
  const [message, setMessage] = useState('')

  function submitQuestion(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setMessage('Thanks for getting in touch. Your message has been recorded in this demo.')
    event.currentTarget.reset()
  }

  return (
    <main className="page-content detail-page">
      <div className="page-heading"><div><h1>How can we help?</h1><p>Find answers to common questions or send our team a message.</p></div></div>
      <div className="help-layout">
        <section className="surface-card faq-card">
          <div className="section-heading"><div><h2>Frequently asked questions</h2><p>Helpful information for shopping with ProHealth.</p></div></div>
          <div className="faq-list">
            {helpQuestions.map((item) => <details className="faq-item" key={item.question}><summary>{item.question}<span aria-hidden="true">+</span></summary><p>{item.answer}</p></details>)}
          </div>
        </section>
        <section className="surface-card contact-card">
          <div className="section-heading"><div><h2>Contact support</h2><p>Send us a question and we’ll get back to you.</p></div></div>
          <form className="contact-form" onSubmit={submitQuestion}>
            <label>Your name<input name="name" autoComplete="name" required placeholder="Full name" /></label>
            <label>Email address<input name="email" type="email" autoComplete="email" required placeholder="you@example.com" /></label>
            <label>How can we help?<textarea name="message" rows={5} required placeholder="Tell us what you need help with..." /></label>
            <button className="button button-primary" type="submit">Send message</button>
            {message && <p className="inline-message" role="status">{message}</p>}
          </form>
          <div className="support-note"><span aria-hidden="true">ⓘ</span><p>For medicine emergencies, contact your healthcare provider or local emergency services.</p></div>
        </section>
      </div>
    </main>
  )
}

export function LoginPage({ onLogin, onBack }: { onLogin: (name: string) => void; onBack: () => void }) {
  const [registering, setRegistering] = useState(false)
  const [message, setMessage] = useState('')

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const formData = new FormData(event.currentTarget)
    const nameValue = String(formData.get('name') ?? '').trim()
    const email = String(formData.get('email') ?? '').trim()
    const name = registering ? nameValue : email.split('@')[0].replace(/[._-]+/g, ' ')
    onLogin(name.replace(/\b\w/g, (letter) => letter.toUpperCase()) || 'ProHealth Customer')
  }

  return (
    <main className="login-page">
      <section className="login-promo">
        <a className="login-brand" href="#home"><span className="brand-mark" aria-hidden="true">＋</span> ProHealth</a>
        <div className="login-promo-copy"><h1>Your pharmacy,<br />delivered.</h1><p>Order medicines online, upload prescriptions and pay securely with M-Pesa.</p><ul><li>Genuine, pharmacist-verified medicines</li><li>Pay with M-Pesa in seconds</li><li>Delivery or in-store pickup</li></ul></div>
        <p className="login-demo-note">Account access is a frontend demo and is not connected to authentication yet.</p>
      </section>
      <section className="login-form-side">
        <div className="login-card">
          <div className="login-tabs">
            <button className={!registering ? 'selected' : ''} type="button" onClick={() => { setRegistering(false); setMessage('') }}>Log in</button>
            <button className={registering ? 'selected' : ''} type="button" onClick={() => { setRegistering(true); setMessage('') }}>Register</button>
          </div>
          <form className="login-form" onSubmit={submit}>
            {registering && <label>Full name<input name="name" autoComplete="name" required placeholder="Your full name" /></label>}
            <label>Email address<input name="email" type="email" autoComplete="email" required placeholder="you@example.com" /></label>
            {registering && <label>Phone number (M-Pesa)<input name="phone" type="tel" autoComplete="tel" required placeholder="0712 345 678" pattern="[-+0-9 ()]{9,16}" /></label>}
            <label>Password<input name="password" type="password" autoComplete={registering ? 'new-password' : 'current-password'} required minLength={8} placeholder="At least 8 characters" /></label>
            {!registering && <button className="forgot-link" type="button" onClick={() => setMessage('Password reset will be available when account services are connected.')}>Forgot password?</button>}
            <button className="button button-primary login-submit" type="submit">{registering ? 'Create account' : 'Log in'}</button>
          </form>
          {message && <p className="inline-message" role="status">{message}</p>}
          <div className="login-switch"><span>or</span><p>{registering ? 'Already have an account?' : 'New here? Create a free account'}</p><button className="button button-secondary" type="button" onClick={() => { setRegistering((current) => !current); setMessage('') }}>{registering ? 'Log in' : 'Create account'}</button></div>
          <button className="login-back" type="button" onClick={onBack}>Back to medicines</button>
        </div>
      </section>
    </main>
  )
}
