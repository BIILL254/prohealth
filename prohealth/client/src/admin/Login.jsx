import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useApp } from '../ctx.jsx';
import { Flashes } from '../ui.jsx';
import { LoginForm } from '../front/Auth.jsx';

export default function AdminLogin() {
  const { isStaff, loading } = useApp(); const nav = useNavigate();
  if (!loading && isStaff) return <Navigate to="/admin" replace />;
  return (
    <div className="login-dark"><main className="login-card">
      <div className="text-center mb-4"><span className="brand-mark mb-2"><i className="fa-solid fa-plus" /></span><h1 className="h4 text-white mb-0">ProHealth Admin</h1><small className="text-white-50">Staff sign-in</small></div>
      <div className="card card-body p-4"><Flashes /><LoginForm staff onDone={() => nav('/admin', { replace: true })} /></div>
      <p className="text-center mt-3"><Link className="text-white-50 small" to="/">&larr; Back to the shop</Link></p>
    </main></div>);
}
