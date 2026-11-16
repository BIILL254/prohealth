import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api, qs } from '../api.js';
import { useApp } from '../ctx.jsx';
import { useHeader } from '../layouts.jsx';
import { Badge, ErrorBox, FieldError, Pagination, Spinner, confirmThen, money, useLoad } from '../ui.jsx';

function MedicineForm({ id, onDone }) {
  useHeader(id ? 'Edit medicine' : 'Add medicine'); const { flash } = useApp();
  const cats = useLoad(() => api.get('/api/admin/categories'), []);
  const [f, setF] = useState({ name: '', category_id: '', generic_name: '', unit_price: '', reorder_level: 10, description: '', requires_prescription: false, is_active: true }); const [err, setErr] = useState(null);
  useEffect(() => { if (id) api.get(`/api/admin/medicines/${id}`).then((m) => setF({ ...m, requires_prescription: !!m.requires_prescription, is_active: !!m.is_active, generic_name: m.generic_name ?? '', description: m.description ?? '' })); }, [id]);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value });
  const submit = async (e) => { e.preventDefault(); setErr(null); try { id ? await api.put(`/api/admin/medicines/${id}`, f) : await api.post('/api/admin/medicines', f); flash('success', 'Medicine saved.'); onDone(); } catch (x) { setErr(x); } };
  const cls = (k) => `form-control${err?.fields?.[k] ? ' is-invalid' : ''}`;
  return (
    <form className="card card-body" style={{ maxWidth: '48rem' }} onSubmit={submit} noValidate>
      {err && !Object.keys(err.fields).length && <div className="alert alert-danger">{err.message}</div>}
      <div className="row g-3">
        <div className="col-md-8"><label className="form-label" htmlFor="name">Name</label><input className={cls('name')} id="name" value={f.name} onChange={set('name')} /><FieldError fields={err?.fields} name="name" /></div>
        <div className="col-md-4"><label className="form-label" htmlFor="category_id">Category</label><select className={cls('category_id').replace('form-control', 'form-select')} id="category_id" value={f.category_id} onChange={set('category_id')}><option value="">Choose...</option>{cats.data?.map((c) => <option key={c.category_id} value={c.category_id}>{c.name}</option>)}</select><FieldError fields={err?.fields} name="category_id" /></div>
        <div className="col-md-6"><label className="form-label" htmlFor="generic_name">Generic name</label><input className="form-control" id="generic_name" value={f.generic_name} onChange={set('generic_name')} /></div>
        <div className="col-md-3"><label className="form-label" htmlFor="unit_price">Price (KES)</label><input className={cls('unit_price')} type="number" step="0.01" min="0" id="unit_price" value={f.unit_price} onChange={set('unit_price')} /><FieldError fields={err?.fields} name="unit_price" /></div>
        <div className="col-md-3"><label className="form-label" htmlFor="reorder_level">Reorder level</label><input className={cls('reorder_level')} type="number" min="0" id="reorder_level" value={f.reorder_level} onChange={set('reorder_level')} /><FieldError fields={err?.fields} name="reorder_level" /></div>
        <div className="col-12"><label className="form-label" htmlFor="description">Description</label><textarea className="form-control" id="description" rows={3} value={f.description} onChange={set('description')} /></div>
        <div className="col-12 d-flex gap-4">
          <div className="form-check"><input className="form-check-input" type="checkbox" id="rx" checked={f.requires_prescription} onChange={set('requires_prescription')} /><label className="form-check-label" htmlFor="rx">Prescription only</label></div>
          <div className="form-check"><input className="form-check-input" type="checkbox" id="act" checked={f.is_active} onChange={set('is_active')} /><label className="form-check-label" htmlFor="act">Visible in the shop</label></div></div>
      </div>
      <div className="mt-4 d-flex gap-2"><button className="btn btn-primary">Save medicine</button><button type="button" className="btn btn-link" onClick={onDone}>Cancel</button></div>
    </form>);
}

export default function AdminMedicines() {
  const [sp, setSp] = useSearchParams(); const { flash } = useApp(); const mode = sp.get('mode'); const id = sp.get('id');
  const q = sp.get('q') ?? ''; const cat = sp.get('category') ?? ''; const sort = sp.get('sort') ?? 'name'; const [text, setText] = useState(q);
  const list = useLoad(() => (mode ? Promise.resolve(null) : api.get('/api/admin/medicines' + qs({ q, category: cat, sort, page: sp.get('page') ?? '' }))), [sp.toString()]);
  const cats = useLoad(() => api.get('/api/admin/categories'), []);
  useHeader(mode ? (id ? 'Edit medicine' : 'Add medicine') : 'Medicines', list.data ? `${list.data.total} medicines` : '');
  if (mode) return <MedicineForm id={id} onDone={() => setSp({})} />;
  const set = (k, v) => { const n = new URLSearchParams(sp); v ? n.set(k, v) : n.delete(k); n.delete('page'); setSp(n); };
  const del = (m) => confirmThen(`Delete ${m.name}?`, async () => { try { await api.del(`/api/admin/medicines/${m.medicine_id}`); flash('success', 'Medicine deleted.'); list.reload(); } catch (e) { flash('warning', e.message); } });
  const d = list.data;
  return (
    <>
      <div className="row g-2 mb-3">
        <form className="col-md-4" onSubmit={(e) => { e.preventDefault(); set('q', text); }}><input className="form-control" value={text} onChange={(e) => setText(e.target.value)} placeholder="Search by name" aria-label="Search" /></form>
        <div className="col-md-3"><select className="form-select" value={cat} onChange={(e) => set('category', e.target.value)} aria-label="Category"><option value="">All categories</option>{cats.data?.map((c) => <option key={c.category_id} value={c.category_id}>{c.name}</option>)}</select></div>
        <div className="col-md-3"><select className="form-select" value={sort} onChange={(e) => set('sort', e.target.value)} aria-label="Sort"><option value="name">Name</option><option value="price">Price (high first)</option><option value="stock">Stock (low first)</option></select></div>
        <div className="col text-end"><Link className="btn btn-primary" to="?mode=form"><i className="fa-solid fa-plus me-1" />Add medicine</Link></div>
      </div>
      <ErrorBox error={list.error} />{list.loading && !d ? <Spinner /> : d && (<><div className="card"><div className="table-responsive"><table className="table align-middle mb-0">
        <thead><tr><th>Medicine</th><th>Category</th><th>Price</th><th>Stock</th><th>Flags</th><th /></tr></thead><tbody>
          {d.rows.map((m) => <tr key={m.medicine_id}><td className="fw-semibold">{m.name}<div className="small text-muted fw-normal">{m.generic_name}</div></td><td>{m.category_name}</td><td>{money(m.unit_price)}</td><td>{m.stock} <Badge status={m.stock_status} /></td>
            <td>{m.requires_prescription ? <span className="badge bg-warning-subtle text-warning-emphasis">Rx</span> : null} {!m.is_active && <Badge status="suspended" />}</td>
            <td className="text-end text-nowrap"><Link className="btn btn-sm btn-outline-primary me-1" to={`?mode=form&id=${m.medicine_id}`}>Edit</Link><button className="btn btn-sm btn-outline-danger" aria-label="Delete" onClick={del(m)}><i className="fa-solid fa-trash" /></button></td></tr>)}
          {!d.rows.length && <tr><td colSpan={6} className="text-center text-muted py-4">No medicines match.</td></tr>}</tbody></table></div></div><div className="mt-3"><Pagination pages={d.pages} page={d.page} /></div></>)}
    </>);
}
