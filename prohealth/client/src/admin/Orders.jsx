import { useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { api, qs } from '../api.js';
import { useApp } from '../ctx.jsx';
import { useHeader } from '../layouts.jsx';
import { Badge, ErrorBox, Pagination, Spinner, confirmThen, fmtDate, money, useLoad } from '../ui.jsx';

export function AdminOrders() {
  const [sp, setSp] = useSearchParams(); const status = sp.get('status') ?? ''; const q = sp.get('q') ?? ''; const [text, setText] = useState(q);
  const { data, error, loading } = useLoad(() => api.get('/api/admin/orders' + qs({ status, q, page: sp.get('page') ?? '' })), [sp.toString()]);
  useHeader('Orders', data ? `${data.total} orders` : '');
  const set = (k, v) => { const n = new URLSearchParams(sp); v ? n.set(k, v) : n.delete(k); n.delete('page'); setSp(n); };
  return (
    <>
      <form className="row g-2 mb-3" onSubmit={(e) => { e.preventDefault(); set('q', text); }}>
        <div className="col-md-4"><input className="form-control" value={text} onChange={(e) => setText(e.target.value)} placeholder="Search order number, name or email" aria-label="Search" /></div>
        <div className="col-md-3"><select className="form-select" value={status} onChange={(e) => set('status', e.target.value)} aria-label="Status"><option value="">All statuses</option>{['pending', 'paid', 'processing', 'ready', 'completed', 'cancelled'].map((s) => <option key={s} value={s}>{s[0].toUpperCase() + s.slice(1)}</option>)}</select></div>
        <div className="col-auto"><button className="btn btn-primary">Search</button> <button type="button" className="btn btn-link" onClick={() => { setText(''); setSp({}); }}>Clear</button></div>
      </form>
      <ErrorBox error={error} />
      {loading && !data ? <Spinner /> : data && (<><div className="card"><div className="table-responsive"><table className="table align-middle mb-0">
        <thead><tr><th>Order</th><th>Customer</th><th>Date</th><th>Type</th><th>Total</th><th>Status</th><th /></tr></thead>
        <tbody>{data.rows.map((o) => <tr key={o.order_id}><td className="fw-semibold">#{o.order_id}</td><td>{o.full_name}</td><td>{fmtDate(o.created_at)}</td><td><Badge status={o.fulfilment_type} /></td><td>{money(o.total_amount)}</td><td><Badge status={o.status} /></td><td className="text-end"><Link className="btn btn-sm btn-outline-primary" to={`/admin/orders/${o.order_id}`}>Open</Link></td></tr>)}
          {!data.rows.length && <tr><td colSpan={7} className="text-center text-muted py-4">No orders match.</td></tr>}</tbody></table></div></div><div className="mt-3"><Pagination pages={data.pages} page={data.page} /></div></>)}
    </>);
}

export function AdminOrderDetail() {
  const { id } = useParams(); const { flash } = useApp(); const { data, error, loading, reload } = useLoad(() => api.get(`/api/admin/orders/${id}`), [id]);
  useHeader(`Order #${id}`, data ? `Placed ${fmtDate(data.order.created_at)}` : '');
  if (loading && !data) return <Spinner />; if (error) return <ErrorBox error={error} />;
  const { order: o, items, next } = data;
  const move = (s) => async () => { try { await api.post(`/api/admin/orders/${id}/status`, { status: s }); flash('success', 'Order status updated.'); reload(); } catch (e) { flash('danger', e.message); } };
  return (
    <div className="row g-4"><div className="col-lg-8">
      <div className="card mb-3"><div className="table-responsive"><table className="table mb-0"><thead><tr><th>Medicine</th><th>Price</th><th>Qty</th><th className="text-end">Subtotal</th></tr></thead><tbody>
        {items.map((i) => <tr key={i.order_item_id}><td>{i.name} {i.requires_prescription ? <span className="badge bg-warning-subtle text-warning-emphasis">Rx</span> : null}</td><td>{money(i.unit_price)}</td><td>{i.quantity}</td><td className="text-end">{money(i.unit_price * i.quantity)}</td></tr>)}
        <tr><td colSpan={3} className="text-end text-muted">Delivery</td><td className="text-end">{money(o.delivery_fee)}</td></tr><tr className="fw-bold"><td colSpan={3} className="text-end">Total</td><td className="text-end">{money(o.total_amount)}</td></tr></tbody></table></div></div>
      <div className="card card-body"><h2 className="h6">Update status</h2>
        {!next.length ? <p className="text-muted mb-0">No further changes are possible for a {o.status} order.</p> : (<><div className="d-flex flex-wrap gap-2">
          {next.map((s) => s === 'cancelled' ? <button key={s} className="btn btn-outline-danger" onClick={confirmThen('Cancel this order?', move(s))}>Mark as {s}</button> : <button key={s} className="btn btn-primary" onClick={move(s)}>Mark as {s}</button>)}</div>
          {o.status === 'pending' && <p className="small text-muted mt-2 mb-0">The order moves to Paid automatically when the customer's M-Pesa payment succeeds.</p>}</>)}</div>
    </div><div className="col-lg-4">
      <div className="card card-body mb-3 small"><h2 className="h6">Customer</h2><div>{o.customer_name}</div><div>{o.customer_email}</div><div>{o.customer_phone}</div><hr className="my-2" />
        <div><Badge status={o.status} /> <Badge status={o.fulfilment_type} /></div>{o.fulfilment_type === 'delivery' && <div className="mt-2"><strong>Deliver to:</strong><br />{o.addr_street}, {o.addr_town}</div>}</div>
      <div className="card card-body small"><h2 className="h6">Payment</h2>
        {o.pay_status ? <><div><Badge status={o.pay_status} /> {o.pay_phone}</div>{o.mpesa_receipt && <><div>Receipt: {o.mpesa_receipt}</div><div>{fmtDate(o.paid_at)}</div></>}</> : <span className="text-muted">No payment yet.</span>}
        {o.prescription_id && <><hr className="my-2" /><h2 className="h6">Prescription</h2><div><Badge status={o.presc_status} /> <Link to="/admin/prescriptions?status=all">Open</Link></div></>}</div>
    </div></div>);
}
