import { Link } from 'react-router-dom';
import { useApp } from '../ctx.jsx';
import { api } from '../api.js';
import { money } from '../ui.jsx';
import { useNavigate } from 'react-router-dom';

export const categoryIcon = (c = '') => { c = c.toLowerCase(); return c.includes('pain') ? 'fa-pills' : c.includes('antibio') ? 'fa-capsules' : c.includes('vitamin') ? 'fa-leaf' : c.includes('first') ? 'fa-kit-medical' : c.includes('baby') ? 'fa-baby' : c.includes('chronic') ? 'fa-heart-pulse' : c.includes('allerg') ? 'fa-wind' : c.includes('cold') ? 'fa-head-side-cough' : c.includes('skin') ? 'fa-hand-holding-droplet' : c.includes('digest') ? 'fa-burger' : 'fa-prescription-bottle-medical'; };
const DOT = { in_stock: ['#16A34A', 'In stock'], low: ['#F59E0B', 'Low stock'], out: ['#DC2626', 'Out of stock'] };

/** Add to cart from anywhere: sends the visitor to log in first when needed. */
export function useAddToCart() {
  const { user, refresh, flash } = useApp(); const nav = useNavigate();
  return async (id, qty = 1) => {
    if (!user) { flash('info', 'Please log in to add medicines to your cart.'); nav('/login', { state: { from: '/medicines' } }); return; }
    try { await api.post('/api/cart', { medicine_id: id, qty }); flash('success', 'Added to your cart.'); await refresh(); } catch (e) { flash('danger', e.message); }
  };
}

export default function ProductCard({ m }) {
  const add = useAddToCart(); const [color, label] = DOT[m.stock_status];
  return (
    <div className="product-card">
      <Link className="product-thumb text-decoration-none" to={`/medicines/${m.medicine_id}`}>
        <i className={`fa-solid ${categoryIcon(m.category_name)}`} />
        {m.requires_prescription ? <span className="rx-tag badge bg-warning-subtle text-warning-emphasis">Rx only</span> : null}
      </Link>
      <div className="product-body">
        <Link className="product-name" to={`/medicines/${m.medicine_id}`}>{m.name}</Link>
        <small className="text-muted">{m.category_name}</small>
        <small><span className="stock-dot" style={{ background: color }} />{label}</small>
        <div className="d-flex justify-content-between align-items-center mt-auto pt-3">
          <span className="product-price">{money(m.unit_price)}</span>
          {m.stock_status === 'out' ? <button className="btn btn-outline-secondary btn-sm" disabled>Unavailable</button>
            : <button className="btn btn-primary btn-sm" onClick={() => add(m.medicine_id)}><i className="fa-solid fa-cart-plus me-1" />Add</button>}
        </div>
      </div>
    </div>);
}
