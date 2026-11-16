import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useApp } from './ctx.jsx';

export const money = (n) => { n = Number(n ?? 0); return 'KES ' + (Number.isInteger(n) ? n.toLocaleString('en-KE') : n.toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })); };
export const fmtDate = (v, time = true) => {
  if (!v) return '';
  const d = new Date(String(v).replace(' ', 'T'));
  if (Number.isNaN(d.getTime())) return String(v);
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) + (time && String(v).length > 10 ? ', ' + d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : '');
};

const BADGES = {
  pending: ['warning', 'Pending'], paid: ['info', 'Paid'], processing: ['primary', 'Processing'], ready: ['primary', 'Ready'], completed: ['success', 'Completed'], cancelled: ['danger', 'Cancelled'],
  approved: ['success', 'Approved'], rejected: ['danger', 'Rejected'], success: ['success', 'Paid'], failed: ['danger', 'Failed'], active: ['success', 'Active'], suspended: ['danger', 'Suspended'],
  in_stock: ['success', 'In stock'], low: ['warning', 'Low stock'], out: ['danger', 'Out of stock'], expiring: ['warning', 'Expiring soon'], expired: ['danger', 'Expired'],
  delivery: ['secondary', 'Delivery'], pickup: ['secondary', 'Pickup'], admin: ['dark', 'Admin'], pharmacist: ['primary', 'Pharmacist'], customer: ['secondary', 'Customer'],
};
export function Badge({ status }) { const [c, l] = BADGES[status] ?? ['secondary', status]; return <span className={`badge badge-soft bg-${c}-subtle text-${c}-emphasis`}>{l}</span>; }

export function Flashes() {
  const { flashes, dismiss } = useApp();
  return flashes.map((f) => (
    <div key={f.id} className={`alert alert-${f.type} alert-dismissible fade show`} role="alert">{f.message}
      <button type="button" className="btn-close" aria-label="Close" onClick={() => dismiss(f.id)} /></div>));
}
export const Spinner = () => <div className="text-center py-5"><div className="spinner-border text-primary" role="status"><span className="visually-hidden">Loading</span></div></div>;
export const ErrorBox = ({ error }) => error ? <div className="alert alert-danger" role="alert">{error.message ?? String(error)}</div> : null;

/** Load data when the dependencies change. */
export function useLoad(loader, deps) {
  const [state, setState] = useState({ data: null, error: null, loading: true });
  const reload = () => setState((s) => ({ ...s, loading: true }));
  const [tick, setTick] = useState(0);
  useEffect(() => {
    let live = true;
    setState((s) => ({ ...s, loading: true, error: null }));
    loader().then((data) => live && setState({ data, error: null, loading: false })).catch((error) => live && setState({ data: null, error, loading: false }));
    return () => { live = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, tick]);
  return { ...state, reload: () => setTick((t) => t + 1), _r: reload };
}

export function Pagination({ pages, page }) {
  const [sp, setSp] = useSearchParams();
  if (pages <= 1) return null;
  const go = (p) => { const n = new URLSearchParams(sp); n.set('page', p); setSp(n); };
  return (
    <nav aria-label="Pages"><ul className="pagination justify-content-center mb-0">
      {Array.from({ length: pages }, (_, i) => i + 1).map((p) => <li key={p} className={`page-item${p === page ? ' active' : ''}`}><button className="page-link" onClick={() => go(p)}>{p}</button></li>)}
    </ul></nav>);
}

export function FieldError({ fields, name }) { return fields?.[name] ? <div className="invalid-feedback d-block">{fields[name]}</div> : null; }
export function Dropdown({ label, children, align = 'end' }) {
  const [open, setOpen] = useState(false); const ref = useRef(null);
  useEffect(() => { const h = (e) => { if (!ref.current?.contains(e.target)) setOpen(false); }; document.addEventListener('mousedown', h); return () => document.removeEventListener('mousedown', h); }, []);
  return (
    <div className="dropdown" ref={ref} onClick={() => setOpen(false)}>
      <button type="button" className="btn btn-light dropdown-toggle d-flex align-items-center gap-2" aria-expanded={open} onClick={(e) => { e.stopPropagation(); setOpen(!open); }}>{label}</button>
      <ul className={`dropdown-menu dropdown-menu-${align}${open ? ' show' : ''}`}>{children}</ul>
    </div>);
}
export const confirmThen = (msg, fn) => () => { if (window.confirm(msg)) fn(); };
export { Link };
