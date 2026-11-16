import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api, qs } from '../api.js';
import { useApp } from '../ctx.jsx';
import { useHeader } from '../layouts.jsx';
import { Badge, ErrorBox, Spinner, fmtDate, useLoad } from '../ui.jsx';

const BLANK = { medicine_id: '', supplier_id: '', batch_number: '', quantity: '', cost_price: '', received_date: new Date().toISOString().slice(0, 10), expiry_date: '' };
export default function Inventory() {
  useHeader('Inventory', 'Stock is kept in batches so the oldest expiry is sold first');
  const [sp, setSp] = useSearchParams(); const filter = sp.get('filter') ?? ''; const q = sp.get('q') ?? ''; const [text, setText] = useState(q); const { flash } = useApp();
  const { data, error, loading, reload } = useLoad(() => api.get('/api/admin/inventory' + qs({ filter, q })), [filter, q]);
  const [f, setF] = useState(BLANK); const [err, setErr] = useState(null); const [qty, setQty] = useState({});
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const add = async (e) => { e.preventDefault(); setErr(null); try { await api.post('/api/admin/inventory', f); flash('success', 'Stock added.'); setF(BLANK); reload(); } catch (x) { setErr(x.message); } };
  const adjust = async (id, v) => { try { await api.put(`/api/admin/inventory/${id}`, { quantity: Number(v) }); flash('success', 'Quantity updated.'); reload(); } catch (x) { flash('danger', x.message); } };
  const go = (k, v) => { const n = new URLSearchParams(sp); v ? n.set(k, v) : n.delete(k); setSp(n); };
  return (
    <div className="row g-4"><div className="col-xl-8">
      <div className="d-flex flex-wrap gap-2 mb-3 align-items-center">
        <div className="btn-group">{[['', 'All batches'], ['low', 'Low stock'], ['expiring', 'Expiring (60 days)'], ['expired', 'Expired']].map(([k, l]) => <button key={k} className={`btn btn-outline-primary${filter === k ? ' active' : ''}`} onClick={() => go('filter', k)}>{l}</button>)}</div>
        <form className="d-flex gap-2 ms-auto" onSubmit={(e) => { e.preventDefault(); go('q', text); }}><input className="form-control" value={text} onChange={(e) => setText(e.target.value)} placeholder="Medicine or batch" aria-label="Search" /><button className="btn btn-primary">Search</button></form>
      </div>
      <ErrorBox error={error} />{loading && !data && <Spinner />}
      {data && filter === 'low' ? (
        <div className="card"><table className="table mb-0"><thead><tr><th>Medicine</th><th>In stock</th><th>Reorder level</th></tr></thead><tbody>{data.low.map((l) => <tr key={l.name}><td>{l.name}</td><td>{l.stock}</td><td>{l.reorder_level}</td></tr>)}
          {!data.low.length && <tr><td colSpan={3} className="text-muted text-center py-4">Everything is above its reorder level.</td></tr>}</tbody></table></div>
      ) : data && (
        <div className="card"><div className="table-responsive"><table className="table align-middle mb-0"><thead><tr><th>Medicine</th><th>Batch</th><th>Supplier</th><th>Expiry</th><th>Qty</th></tr></thead><tbody>
          {data.batches.map((b) => { const st = b.days_left < 0 ? 'expired' : b.days_left <= 60 ? 'expiring' : ''; return (
            <tr key={b.batch_id}><td className="fw-semibold">{b.medicine}</td><td>{b.batch_number}</td><td className="small">{b.supplier}</td><td>{fmtDate(b.expiry_date, false)} {st && <Badge status={st} />}</td>
              <td><form className="d-flex gap-1" onSubmit={(e) => { e.preventDefault(); adjust(b.batch_id, qty[b.batch_id] ?? b.quantity); }}><input className="form-control form-control-sm qty-input" type="number" min="0" value={qty[b.batch_id] ?? b.quantity} onChange={(e) => setQty({ ...qty, [b.batch_id]: e.target.value })} aria-label="Quantity" /><button className="btn btn-sm btn-outline-primary">Set</button></form></td></tr>); })}
          {!data.batches.length && <tr><td colSpan={5} className="text-center text-muted py-4">No batches match.</td></tr>}</tbody></table></div></div>)}
    </div>
    <div className="col-xl-4"><form className="card card-body" onSubmit={add} noValidate><h2 className="h6 mb-3">Receive new stock</h2>
      {err && <div className="alert alert-danger">{err}</div>}
      <label className="form-label" htmlFor="medicine_id">Medicine</label><select className="form-select mb-2" id="medicine_id" value={f.medicine_id} onChange={set('medicine_id')}><option value="">Choose...</option>{data?.medicines.map((m) => <option key={m.medicine_id} value={m.medicine_id}>{m.name}</option>)}</select>
      <label className="form-label" htmlFor="supplier_id">Supplier</label><select className="form-select mb-2" id="supplier_id" value={f.supplier_id} onChange={set('supplier_id')}><option value="">Choose...</option>{data?.suppliers.map((s) => <option key={s.supplier_id} value={s.supplier_id}>{s.name}</option>)}</select>
      <label className="form-label" htmlFor="batch_number">Batch number</label><input className="form-control mb-2" id="batch_number" value={f.batch_number} onChange={set('batch_number')} />
      <div className="row g-2 mb-2"><div className="col"><label className="form-label" htmlFor="quantity">Quantity</label><input className="form-control" type="number" min="1" id="quantity" value={f.quantity} onChange={set('quantity')} /></div>
        <div className="col"><label className="form-label" htmlFor="cost_price">Cost each</label><input className="form-control" type="number" step="0.01" min="0" id="cost_price" value={f.cost_price} onChange={set('cost_price')} /></div></div>
      <div className="row g-2 mb-3"><div className="col"><label className="form-label" htmlFor="received_date">Received</label><input className="form-control" type="date" id="received_date" value={f.received_date} onChange={set('received_date')} /></div>
        <div className="col"><label className="form-label" htmlFor="expiry_date">Expiry</label><input className="form-control" type="date" id="expiry_date" value={f.expiry_date} onChange={set('expiry_date')} /></div></div>
      <button className="btn btn-primary">Add stock</button></form></div></div>);
}
