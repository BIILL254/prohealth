import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api.js';
import { ErrorBox, Spinner, useLoad } from '../ui.jsx';
import ProductCard, { categoryIcon } from './ProductCard.jsx';

export default function Home() {
  const nav = useNavigate(); const [q, setQ] = useState('');
  const cats = useLoad(() => api.get('/api/categories'), []); const fresh = useLoad(() => api.get('/api/medicines/new'), []);
  const steps = [['fa-magnifying-glass', 'Find your medicine', 'Search or browse by category. Prices and stock are always up to date.'], ['fa-file-medical', 'Upload a prescription', 'Needed only for prescription-only medicines. A pharmacist checks it.'],
    ['fa-mobile-screen', 'Pay with M-Pesa', 'You get a payment prompt on your phone. No card needed.'], ['fa-truck-fast', 'Delivery or pickup', 'Track your order from the moment it is placed.']];
  return (
    <>
      <section className="hero mb-4"><i className="fa-solid fa-prescription-bottle-medical hero-icon" />
        <div className="row"><div className="col-lg-7">
          <h1 className="display-6">Your pharmacy, delivered.</h1>
          <p className="lead mb-4">Order genuine medicines online, upload your prescription and pay securely with M-Pesa. Choose delivery or pick up in store.</p>
          <form className="d-flex gap-2 flex-wrap" onSubmit={(e) => { e.preventDefault(); nav(`/medicines${q ? `?q=${encodeURIComponent(q)}` : ''}`); }}>
            <input className="form-control form-control-lg w-auto flex-grow-1" style={{ maxWidth: '26rem' }} type="search" placeholder="Search for a medicine" aria-label="Search for a medicine" value={q} onChange={(e) => setQ(e.target.value)} />
            <button className="btn btn-light btn-lg text-primary fw-semibold" type="submit">Search</button>
          </form>
        </div></div>
      </section>
      <h2 className="h5 mb-3">Shop by category</h2>
      <ErrorBox error={cats.error} />
      {cats.loading ? <Spinner /> : <div className="row g-3 mb-4">{cats.data?.map((c) => (
        <div className="col-6 col-md-3 col-lg-2" key={c.category_id}><Link className="category-tile" to={`/medicines?category=${c.category_id}`}>
          <i className={`fa-solid ${categoryIcon(c.name)}`} /><span>{c.name}</span><small className="text-muted fw-normal">{c.n} items</small></Link></div>))}</div>}
      <div className="d-flex justify-content-between align-items-center mb-3"><h2 className="h5 mb-0">New in the pharmacy</h2><Link to="/medicines">See all medicines &rsaquo;</Link></div>
      {fresh.loading ? <Spinner /> : <div className="row g-3 mb-5">{fresh.data?.map((m) => <div className="col-6 col-md-4 col-lg-3" key={m.medicine_id}><ProductCard m={m} /></div>)}</div>}
      <h2 className="h5 mb-3">How it works</h2>
      <div className="row g-3">{steps.map(([icon, t, d], i) => (
        <div className="col-md-6 col-lg-3" key={t}><div className="card h-100 card-body"><span className="avatar mb-3"><i className={`fa-solid ${icon}`} /></span><h3 className="h6">{i + 1}. {t}</h3><p className="text-muted small mb-0">{d}</p></div></div>))}</div>
    </>);
}
