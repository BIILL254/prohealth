import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api.js';
import { useApp } from '../ctx.jsx';
import { ErrorBox, Spinner, money, useLoad } from '../ui.jsx';

export default function Cart() {
  const { refresh, flash } = useApp(); const { data, error, loading, reload } = useLoad(() => api.get('/api/cart'), []);
  const [qty, setQty] = useState({});
  useEffect(() => { if (data) setQty(Object.fromEntries(data.items.map((i) => [i.medicine_id, i.quantity]))); }, [data]);
  const act = async (fn, ok) => { try { await fn(); if (ok) flash(ok.type, ok.text); } catch (e) { flash('danger', e.message); } await refresh(); reload(); };
  if (loading && !data) return <Spinner />;
  if (error) return <ErrorBox error={error} />;
  if (!data.items.length) return <><h1 className="h3 mb-3">Your cart</h1><div className="card card-body text-center py-5"><i className="fa-solid fa-cart-shopping fs-1 text-muted mb-3" /><h2 className="h5">Your cart is empty</h2><p className="text-muted">Add some medicines to get started.</p><div><Link className="btn btn-primary" to="/medicines">Browse medicines</Link></div></div></>;
  return (
    <>
      <h1 className="h3 mb-3">Your cart</h1>
      <div className="row g-4">
        <div className="col-lg-8">
          <div className="card"><div className="table-responsive"><table className="table align-middle mb-0">
            <thead><tr><th>Medicine</th><th>Price</th><th style={{ width: '7rem' }}>Quantity</th><th className="text-end">Subtotal</th><th /></tr></thead>
            <tbody>{data.items.map((i) => (
              <tr key={i.medicine_id}>
                <td><Link className="fw-semibold text-decoration-none" to={`/medicines/${i.medicine_id}`}>{i.name}</Link>
                  {i.requires_prescription ? <><br /><span className="badge badge-soft bg-warning-subtle text-warning-emphasis">Rx only</span></> : null}
                  {i.quantity > i.stock ? <><br /><small className="text-danger">Only {i.stock} in stock</small></> : null}</td>
                <td>{money(i.unit_price)}</td>
                <td><input className="form-control form-control-sm qty-input" type="number" min="0" max="99" value={qty[i.medicine_id] ?? i.quantity} onChange={(e) => setQty({ ...qty, [i.medicine_id]: e.target.value })} aria-label="Quantity" /></td>
                <td className="text-end fw-semibold">{money(i.unit_price * i.quantity)}</td>
                <td className="text-end"><button className="btn btn-sm btn-link text-danger" aria-label="Remove" onClick={() => act(() => api.del(`/api/cart/${i.medicine_id}`), { type: 'info', text: 'Item removed.' })}><i className="fa-solid fa-xmark" /></button></td>
              </tr>))}</tbody></table></div>
            <div className="card-footer bg-white text-end"><button className="btn btn-outline-primary btn-sm" onClick={() => act(() => api.put('/api/cart', { qty }), { type: 'success', text: 'Cart updated.' })}>Update quantities</button></div></div>
          {data.needsRx && <div className="alert alert-warning mt-3 mb-0"><i className="fa-solid fa-file-prescription me-2" /><strong>Prescription required.</strong> Your cart has a prescription-only medicine. You will upload the prescription at checkout and a pharmacist will check it before you pay.</div>}
        </div>
        <div className="col-lg-4"><div className="card card-body summary-card">
          <h2 className="h5 mb-3">Order summary</h2>
          <div className="d-flex justify-content-between mb-2"><span className="text-muted">Subtotal</span><span>{money(data.subtotal)}</span></div>
          <div className="d-flex justify-content-between mb-3"><span className="text-muted">Delivery</span><span className="text-muted small">Chosen at checkout</span></div>
          <Link className="btn btn-primary btn-lg w-100" to="/checkout">Proceed to checkout</Link>
          <Link className="btn btn-link w-100 mt-1" to="/medicines">Continue shopping</Link>
        </div></div>
      </div>
    </>);
}
