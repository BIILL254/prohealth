import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { api } from '../api.js';
import { useApp } from '../ctx.jsx';
import { Badge, ErrorBox, Spinner, confirmThen, fmtDate, money, useLoad } from '../ui.jsx';

export function Orders() {
  const { data, error, loading } = useLoad(() => api.get('/api/orders'), []);
  if (loading) return <Spinner />;
  return (
    <>
      <h1 className="h3 mb-3">My orders</h1><ErrorBox error={error} />
      {data && !data.length ? <div className="card card-body text-center py-5"><i className="fa-solid fa-receipt fs-1 text-muted mb-3" /><h2 className="h5">No orders yet</h2><div><Link className="btn btn-primary" to="/medicines">Start shopping</Link></div></div> : data && (
        <div className="card"><div className="table-responsive"><table className="table align-middle mb-0">
          <thead><tr><th>Order</th><th>Date</th><th>Items</th><th>Total</th><th>Status</th><th /></tr></thead>
          <tbody>{data.map((o) => <tr key={o.order_id}><td className="fw-semibold">#{o.order_id}</td><td>{fmtDate(o.created_at)}</td><td>{o.n}</td><td>{money(o.total_amount)}</td><td><Badge status={o.status} /></td><td className="text-end"><Link className="btn btn-sm btn-outline-primary" to={`/orders/${o.order_id}`}>View</Link></td></tr>)}</tbody>
        </table></div></div>)}
    </>);
}

export function OrderDetail() {
  const { id } = useParams(); const [sp] = useSearchParams(); const { me, flash, refresh } = useApp(); const nav = useNavigate();
  const { data, error, loading, reload } = useLoad(() => api.get(`/api/orders/${id}`), [id]); const ph = me?.pharmacy ?? {};
  if (loading) return <Spinner />;
  if (error) return <div className="card card-body">Order not found.</div>;
  const { order: o, items, timeline, canPay } = data;
  const cancel = async () => { try { await api.post(`/api/orders/${id}/cancel`); flash('info', 'Order cancelled.'); await refresh(); reload(); } catch (e) { flash('danger', e.message); } };
  return (
    <>
      <div className="receipt-head"><strong>{ph.name}</strong><br />{ph.address} &middot; {ph.phone}</div>
      <div className="d-flex flex-wrap justify-content-between align-items-center mb-3">
        <h1 className="h3 mb-0">Order #{o.order_id} <Badge status={o.status} /></h1>
        <div className="d-print-none"><button className="btn btn-outline-secondary btn-sm" onClick={() => window.print()}><i className="fa-solid fa-print me-1" />Print receipt</button></div>
      </div>
      {sp.get('paid') && <div className="alert alert-success"><i className="fa-solid fa-circle-check me-2" />Payment received. Thank you!</div>}
      {o.presc_status === 'pending' && <div className="alert alert-info">Your prescription is waiting for a pharmacist. You can pay once it is approved.</div>}
      {o.presc_status === 'rejected' && <div className="alert alert-danger">Your prescription was rejected{o.presc_notes ? `: ${o.presc_notes}` : ''}. Please place a new order with a valid prescription.</div>}
      <div className="row g-4">
        <div className="col-lg-8">
          <div className="card mb-3"><div className="table-responsive"><table className="table mb-0">
            <thead><tr><th>Medicine</th><th>Price</th><th>Qty</th><th className="text-end">Subtotal</th></tr></thead>
            <tbody>{items.map((i) => <tr key={i.order_item_id}><td>{i.name}</td><td>{money(i.unit_price)}</td><td>{i.quantity}</td><td className="text-end">{money(i.unit_price * i.quantity)}</td></tr>)}
              <tr><td colSpan={3} className="text-end text-muted">Delivery</td><td className="text-end">{money(o.delivery_fee)}</td></tr>
              <tr className="fw-bold"><td colSpan={3} className="text-end">Total</td><td className="text-end">{money(o.total_amount)}</td></tr></tbody></table></div></div>
          <div className="card card-body small">
            <div><strong>Placed:</strong> {fmtDate(o.created_at)}</div>
            <div><strong>Fulfilment:</strong> {o.fulfilment_type === 'delivery' ? `Delivery to ${o.addr_street}, ${o.addr_town}` : 'Pickup in store'}</div>
            {o.mpesa_receipt && <div><strong>M-Pesa receipt:</strong> {o.mpesa_receipt} ({fmtDate(o.paid_at)})</div>}
          </div>
          <div className="mt-3 d-print-none d-flex gap-2">
            {canPay && <Link className="btn btn-primary" to={`/orders/${id}/pay`}><i className="fa-solid fa-mobile-screen me-1" />Pay with M-Pesa</Link>}
            {o.status === 'pending' && <button className="btn btn-outline-danger" onClick={confirmThen('Cancel this order?', cancel)}>Cancel order</button>}
          </div>
        </div>
        <div className="col-lg-4 d-print-none"><div className="card card-body"><h2 className="h6 mb-3">Progress</h2>
          <ul className="timeline">{timeline.map((s) => <li key={s.label} className={`${s.done ? 'done' : ''} ${s.current ? 'current' : ''} ${s.label === 'Order cancelled' ? 'cancelled' : ''}`}><span className="dot" />{s.label}</li>)}</ul></div></div>
      </div>
    </>);
}
