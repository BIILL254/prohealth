import { useEffect, useState } from 'react';
import { Link, NavLink, Navigate, Outlet, useLocation, useNavigate, useOutletContext, useSearchParams } from 'react-router-dom';
import { useApp } from './ctx.jsx';
import { api } from './api.js';
import { Dropdown, Flashes, Spinner, useLoad } from './ui.jsx';

/* ================= customer site frame ================= */
export function FrontLayout() {
  const { me, user, logout, isStaff } = useApp();
  const nav = useNavigate(); const loc = useLocation(); const [sp] = useSearchParams();
  const [open, setOpen] = useState(false); const [q, setQ] = useState(sp.get('q') ?? '');
  useEffect(() => { setOpen(false); window.scrollTo(0, 0); }, [loc.pathname]);
  const ph = me?.pharmacy ?? {};
  const links = [['/', 'Home', true], ['/medicines', 'Medicines'], ['/orders', 'My Orders'], ['/help', 'Help']];
  return (
    <>
      <nav className="navbar navbar-expand-lg bg-white border-bottom sticky-top front-nav"><div className="container">
        <Link className="navbar-brand brand" to="/"><span className="brand-mark"><i className="fa-solid fa-plus" /></span>ProHealth</Link>
        <button className="navbar-toggler" type="button" aria-label="Toggle menu" onClick={() => setOpen(!open)}><span className="navbar-toggler-icon" /></button>
        <div className={`navbar-collapse collapse${open ? ' show' : ''}`}>
          <ul className="navbar-nav me-auto mb-2 mb-lg-0 ms-lg-4">
            {links.map(([to, label, end]) => <li className="nav-item" key={to}><NavLink className="nav-link" to={to} end={end}>{label}</NavLink></li>)}
          </ul>
          <form className="d-flex me-lg-3 mb-2 mb-lg-0" role="search" onSubmit={(e) => { e.preventDefault(); nav(`/medicines${q ? `?q=${encodeURIComponent(q)}` : ''}`); }}>
            <div className="input-group input-group-sm search-pill">
              <input className="form-control" type="search" placeholder="Search medicines" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search medicines" />
              <button className="btn btn-outline-secondary" type="submit" aria-label="Search"><i className="fa-solid fa-magnifying-glass" /></button>
            </div>
          </form>
          <Link className="btn btn-light position-relative me-lg-3 mb-2 mb-lg-0" to="/cart" aria-label="Cart"><i className="fa-solid fa-cart-shopping" />
            {me?.cartCount > 0 && <span className="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-warning text-dark">{me.cartCount}</span>}</Link>
          {user ? (
            <Dropdown label={<><span className="avatar">{user.name[0].toUpperCase()}</span>{user.name.split(' ')[0]}</>}>
              {isStaff && <li><Link className="dropdown-item" to="/admin"><i className="fa-solid fa-gauge me-2" />Admin panel</Link></li>}
              <li><Link className="dropdown-item" to="/orders"><i className="fa-solid fa-bag-shopping me-2" />My orders</Link></li>
              <li><Link className="dropdown-item" to="/profile"><i className="fa-solid fa-user me-2" />My profile</Link></li>
              <li><hr className="dropdown-divider" /></li>
              <li><button className="dropdown-item" onClick={async () => { await logout(); nav('/login'); }}><i className="fa-solid fa-right-from-bracket me-2" />Log out</button></li>
            </Dropdown>
          ) : (<><Link className="btn btn-outline-primary me-2" to="/login">Log in</Link><Link className="btn btn-primary" to="/register">Register</Link></>)}
        </div>
      </div></nav>
      <main className="container py-4 page-main"><Flashes /><Outlet /></main>
      <footer className="front-footer mt-5 py-4"><div className="container d-flex flex-column flex-md-row justify-content-between gap-2 small">
        <div><strong>{ph.name}</strong><br />{ph.address}<br />{ph.phone} &middot; {ph.email}</div>
        <div className="text-md-end"><Link to="/help">Help and FAQ</Link> &middot; <Link to="/medicines">Medicines</Link><br />&copy; {new Date().getFullYear()} ProHealth. Prescription medicines are sold only with a valid prescription.</div>
      </div></footer>
    </>);
}

/** Pages that need a logged-in customer (or staff) */
export function RequireLogin() {
  const { user, loading } = useApp(); const loc = useLocation(); const { flash } = useApp();
  useEffect(() => { if (!loading && !user) flash('info', 'Please log in to continue.'); }, [loading, user]); // eslint-disable-line
  if (loading) return <Spinner />;
  return user ? <Outlet /> : <Navigate to="/login" replace state={{ from: loc.pathname + loc.search }} />;
}

/* ================= admin frame ================= */
const MENU = [['Dashboard', '/admin', 'fa-gauge', true], ['Orders', '/admin/orders', 'fa-bag-shopping'], ['Prescriptions', '/admin/prescriptions', 'fa-file-prescription'], ['Inventory', '/admin/inventory', 'fa-boxes-stacked'],
  ['Medicines', '/admin/medicines', 'fa-pills'], ['Categories', '/admin/categories', 'fa-tags'], ['Suppliers', '/admin/suppliers', 'fa-truck'], ['Users', '/admin/users', 'fa-users', false, true],
  ['Reports', '/admin/reports', 'fa-chart-column'], ['Audit log', '/admin/audit', 'fa-clipboard-list', false, true]];

export function AdminLayout() {
  const { user, isStaff, isAdmin, loading, logout } = useApp(); const nav = useNavigate(); const loc = useLocation();
  const [header, setHeader] = useState({ title: '', subtitle: '' }); const [side, setSide] = useState(false);
  const badge = useLoad(() => (isStaff ? api.get('/api/admin/badge') : Promise.resolve(null)), [isStaff, loc.pathname]);
  useEffect(() => { setSide(false); }, [loc.pathname]);
  useEffect(() => { document.title = `${header.title || 'Admin'} | ProHealth`; }, [header.title]);
  if (loading) return <Spinner />;
  if (!isStaff) return <Navigate to="/admin/login" replace />;
  const pending = badge.data?.pendingRx ?? 0;
  return (
    <div className="admin-shell">
      <aside className={`admin-sidebar${side ? ' open' : ''}`}>
        <Link className="brand brand-light" to="/admin"><span className="brand-mark"><i className="fa-solid fa-plus" /></span>ProHealth</Link>
        <div className="sidebar-label">ADMIN PANEL</div>
        <nav className="nav flex-column">
          {MENU.filter((m) => !m[4] || isAdmin).map(([label, to, icon, end]) => (
            <NavLink key={to} to={to} end={end} className="nav-link"><i className={`fa-solid ${icon}`} /><span>{label}</span>
              {to.endsWith('prescriptions') && pending > 0 && <span className="badge rounded-pill bg-warning text-dark ms-auto">{pending}</span>}</NavLink>))}
        </nav>
        <div className="sidebar-user"><span className="avatar">{user.name[0].toUpperCase()}</span><div className="lh-sm"><div className="fw-semibold">{user.name}</div><small>{user.role[0].toUpperCase() + user.role.slice(1)}</small></div></div>
      </aside>
      <div className="admin-content">
        <header className="admin-topbar">
          <button className="btn btn-light d-lg-none me-2" type="button" aria-label="Menu" onClick={() => setSide(!side)}><i className="fa-solid fa-bars" /></button>
          <div><h1 className="h5 mb-0">{header.title}</h1>{header.subtitle && <small className="text-muted">{header.subtitle}</small>}</div>
          <div className="ms-auto">
            <Dropdown label={<><i className="fa-solid fa-circle-user" />{user.name}</>}>
              <li><Link className="dropdown-item" to="/admin/security"><i className="fa-solid fa-shield-halved me-2" />Security (2FA)</Link></li>
              <li><Link className="dropdown-item" to="/"><i className="fa-solid fa-store me-2" />View shop</Link></li>
              <li><hr className="dropdown-divider" /></li>
              <li><button className="dropdown-item" onClick={async () => { await logout(); nav('/admin/login'); }}><i className="fa-solid fa-right-from-bracket me-2" />Log out</button></li>
            </Dropdown>
          </div>
        </header>
        <main className="admin-main"><Flashes /><Outlet context={{ setHeader }} /></main>
      </div>
    </div>);
}
export function useHeader(title, subtitle = '') { const { setHeader } = useOutletContext(); useEffect(() => { setHeader({ title, subtitle }); }, [title, subtitle]); } // eslint-disable-line
/** Staff-only pages that regular pharmacists must not open */
export function AdminOnly() {
  const { isAdmin } = useApp(); const ctx = useOutletContext();
  useEffect(() => { if (!isAdmin) ctx.setHeader({ title: 'Access denied', subtitle: '' }); }, [isAdmin]);
  return isAdmin ? <Outlet context={ctx} /> : <div className="card card-body text-center py-5"><h4>Access denied</h4><p className="text-muted mb-3">Your role does not allow you to open this page.</p><div><Link className="btn btn-primary" to="/admin">Back to dashboard</Link></div></div>;
}
