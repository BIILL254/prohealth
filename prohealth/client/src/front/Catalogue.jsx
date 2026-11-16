import { useEffect, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { api, qs } from '../api.js';
import { ErrorBox, Pagination, Spinner, useLoad, money, Badge } from '../ui.jsx';
import ProductCard, { categoryIcon, useAddToCart } from './ProductCard.jsx';

export function Medicines() {
  const [sp, setSp] = useSearchParams();
  const p = { q: sp.get('q') ?? '', category: sp.get('category') ?? '', type: sp.get('type') ?? '', max_price: sp.get('max_price') ?? '', sort: sp.get('sort') ?? 'name', page: sp.get('page') ?? '' };
  const [form, setForm] = useState(p);
  useEffect(() => { setForm({ q: sp.get('q') ?? '', category: sp.get('category') ?? '', type: sp.get('type') ?? '', max_price: sp.get('max_price') ?? '', sort: sp.get('sort') ?? 'name' }); }, [sp]);
  const cats = useLoad(() => api.get('/api/categories'), []);
  const list = useLoad(() => api.get('/api/medicines' + qs(p)), [sp.toString()]);
  const apply = (e) => { e.preventDefault(); const n = new URLSearchParams(); Object.entries(form).forEach(([k, v]) => v && n.set(k, v)); setSp(n); };
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  const d = list.data;
  return (
    <>
      <div className="mb-3"><h1 className="h3 mb-0">Medicines</h1><span className="text-muted small">{d ? `${d.total} product${d.total === 1 ? '' : 's'} found` : ' '}</span></div>
      <div className="row g-4">
        <div className="col-lg-3"><form className="card card-body" onSubmit={apply}>
          <h2 className="h6 mb-3">Filters</h2>
          <label className="form-label" htmlFor="q">Search</label><input className="form-control mb-3" id="q" value={form.q} onChange={set('q')} placeholder="Name or generic name" />
          <label className="form-label" htmlFor="category">Category</label>
          <select className="form-select mb-3" id="category" value={form.category} onChange={set('category')}><option value="">All categories</option>{cats.data?.map((c) => <option key={c.category_id} value={c.category_id}>{c.name}</option>)}</select>
          <label className="form-label">Type</label>
          <div className="mb-3">{[['', 'All'], ['otc', 'Over the counter'], ['rx', 'Prescription only']].map(([v, l]) => (
            <div className="form-check" key={v}><input className="form-check-input" type="radio" name="type" id={`t${v}`} checked={form.type === v} onChange={() => setForm({ ...form, type: v })} /><label className="form-check-label" htmlFor={`t${v}`}>{l}</label></div>))}</div>
          <label className="form-label" htmlFor="max_price">Maximum price (KES)</label><input className="form-control mb-3" type="number" min="0" step="10" id="max_price" value={form.max_price} onChange={set('max_price')} placeholder="e.g. 500" />
          <label className="form-label" htmlFor="sort">Sort by</label>
          <select className="form-select mb-3" id="sort" value={form.sort} onChange={set('sort')}><option value="name">Name (A to Z)</option><option value="price_asc">Price: low to high</option><option value="price_desc">Price: high to low</option></select>
          <button className="btn btn-primary w-100" type="submit">Apply filters</button>
          <button className="btn btn-link w-100 mt-1" type="button" onClick={() => setSp({})}>Clear filters</button>
        </form></div>
        <div className="col-lg-9">
          <ErrorBox error={list.error} />
          {list.loading && !d ? <Spinner /> : d && !d.rows.length ? (
            <div className="card card-body text-center py-5"><i className="fa-solid fa-box-open fs-1 text-muted mb-3" /><h2 className="h5">No medicines found</h2><p className="text-muted mb-0">Try a different word or clear the filters.</p></div>
          ) : d && (<><div className="row g-3">{d.rows.map((m) => <div className="col-6 col-md-4" key={m.medicine_id}><ProductCard m={m} /></div>)}</div><div className="mt-4"><Pagination pages={d.pages} page={d.page} /></div></>)}
        </div>
      </div>
    </>);
}

export function MedicineDetail() {
  const { id } = useParams(); const add = useAddToCart(); const [qty, setQty] = useState(1);
  const { data: m, error, loading } = useLoad(() => api.get(`/api/medicines/${id}`), [id]);
  if (loading) return <Spinner />;
  if (error) return <div className="card card-body text-center py-5"><h1 className="h4">Medicine not found</h1><p className="text-muted">It may have been removed.</p><div><Link className="btn btn-primary" to="/medicines">Browse medicines</Link></div></div>;
  return (
    <>
      <nav aria-label="breadcrumb"><ol className="breadcrumb"><li className="breadcrumb-item"><Link to="/medicines">Medicines</Link></li>
        <li className="breadcrumb-item"><Link to={`/medicines?category=${m.category_id}`}>{m.category_name}</Link></li><li className="breadcrumb-item active">{m.name}</li></ol></nav>
      <div className="card"><div className="row g-0">
        <div className="col-md-5"><div className="product-thumb h-100" style={{ minHeight: '18rem', fontSize: '6rem' }}><i className={`fa-solid ${categoryIcon(m.category_name)}`} /></div></div>
        <div className="col-md-7"><div className="card-body p-4">
          <h1 className="h3">{m.name}</h1>
          {m.generic_name && <p className="text-muted">Generic name: {m.generic_name}</p>}
          <p style={{ whiteSpace: 'pre-line' }}>{m.description || 'No description yet.'}</p>
          <p className="mb-2"><Badge status={m.stock_status} /> {m.requires_prescription ? <span className="badge badge-soft bg-warning-subtle text-warning-emphasis">Prescription required</span> : null}</p>
          <div className="product-price fs-3 mb-3">{money(m.unit_price)}</div>
          {m.requires_prescription ? <div className="alert alert-warning small">This medicine is sold only with a valid prescription. You will upload it at checkout and a pharmacist will check it before payment.</div> : null}
          {m.stock_status === 'out' ? <button className="btn btn-outline-secondary" disabled>Currently unavailable</button> : (
            <div className="d-flex gap-2 align-items-center">
              <input className="form-control qty-input" type="number" min="1" max={Math.min(99, m.stock)} value={qty} onChange={(e) => setQty(Number(e.target.value))} aria-label="Quantity" />
              <button className="btn btn-primary" onClick={() => add(m.medicine_id, qty)}><i className="fa-solid fa-cart-plus me-2" />Add to cart</button>
              <small className="text-muted ms-2">{m.stock} available</small>
            </div>)}
        </div></div>
      </div></div>
    </>);
}
