import { useState } from 'react';
import { api, qs } from '../api.js';
import { useApp } from '../ctx.jsx';
import { useHeader } from '../layouts.jsx';
import { Badge, ErrorBox, Spinner, confirmThen, fmtDate, useLoad } from '../ui.jsx';

export default function Users() {
  const { user, flash } = useApp(); const [q, setQ] = useState(''); const [role, setRole] = useState(''); const [adding, setAdding] = useState(false);
  const { data, error, loading, reload } = useLoad(() => api.get('/api/admin/users' + qs({ q, role })), [q, role]);
  useHeader('Users', data ? `${data.rows.length} accounts` : '');
  const [f, setF] = useState({ full_name: '', email: '', phone: '', role_id: '', password: '' }); const [err, setErr] = useState(null);
  const act = (fn, ok) => async () => { try { const r = await fn(); flash('success', ok(r)); reload(); } catch (x) { flash('warning', x.message); } };
  const create = async (e) => { e.preventDefault(); setErr(null); try { await api.post('/api/admin/users', { ...f, role_id: f.role_id || data.roles[0].role_id }); flash('success', 'User created.'); setAdding(false); setF({ full_name: '', email: '', phone: '', role_id: '', password: '' }); reload(); } catch (x) { setErr(x.message); } };
  if (adding) return (
    <form className="card card-body" style={{ maxWidth: '40rem' }} onSubmit={create} noValidate>
      {err && <div className="alert alert-danger">{err}</div>}
      {[['full_name', 'Full name'], ['email', 'Email'], ['phone', 'Phone'], ['password', 'Temporary password']].map(([k, l]) => <div key={k}><label className="form-label" htmlFor={k}>{l}</label><input className="form-control mb-2" id={k} autoComplete="off" value={f[k]} onChange={(e) => setF({ ...f, [k]: e.target.value })} /></div>)}
      <label className="form-label" htmlFor="role_id">Role</label><select className="form-select mb-3" id="role_id" value={f.role_id || data.roles[0].role_id} onChange={(e) => setF({ ...f, role_id: e.target.value })}>{data.roles.map((r) => <option key={r.role_id} value={r.role_id}>{r.role_name[0].toUpperCase() + r.role_name.slice(1)}</option>)}</select>
      <div className="d-flex gap-2"><button className="btn btn-primary">Create user</button><button type="button" className="btn btn-link" onClick={() => setAdding(false)}>Cancel</button></div></form>);
  return (
    <>
      <div className="row g-2 mb-3">
        <form className="col-md-4" onSubmit={(e) => { e.preventDefault(); setQ(e.currentTarget.q.value); }}><input className="form-control" name="q" placeholder="Search name or email" aria-label="Search" /></form>
        <div className="col-md-3"><select className="form-select" value={role} onChange={(e) => setRole(e.target.value)} aria-label="Role"><option value="">All roles</option>{data?.roles.map((r) => <option key={r.role_id} value={r.role_id}>{r.role_name[0].toUpperCase() + r.role_name.slice(1)}</option>)}</select></div>
        <div className="col text-end"><button className="btn btn-primary" onClick={() => setAdding(true)}><i className="fa-solid fa-user-plus me-1" />Add user</button></div>
      </div>
      <ErrorBox error={error} />{loading && !data ? <Spinner /> : data && <div className="card"><div className="table-responsive"><table className="table align-middle mb-0"><thead><tr><th>Name</th><th>Role</th><th>Status</th><th>2FA</th><th>Joined</th><th /></tr></thead><tbody>
        {data.rows.map((u) => { const self = u.user_id === user.id; return (
          <tr key={u.user_id}><td className="fw-semibold">{u.full_name}<div className="small text-muted fw-normal">{u.email}</div></td>
            <td><select className="form-select form-select-sm" value={u.role_id} disabled={self} aria-label="Role" onChange={(e) => act(() => api.put(`/api/admin/users/${u.user_id}/role`, { role_id: e.target.value }), () => 'Role changed.')()}>{data.roles.map((r) => <option key={r.role_id} value={r.role_id}>{r.role_name[0].toUpperCase() + r.role_name.slice(1)}</option>)}</select></td>
            <td><Badge status={u.status} /></td><td>{u.two_factor_enabled ? <i className="fa-solid fa-shield-halved text-success" /> : <span className="text-muted">Off</span>}</td><td className="small">{fmtDate(u.created_at, false)}</td>
            <td className="text-end text-nowrap">
              <button className="btn btn-sm btn-outline-secondary me-1" onClick={confirmThen("Reset this user's password?", act(() => api.post(`/api/admin/users/${u.user_id}/reset-password`), (r) => `New temporary password for ${r.email}: ${r.password}  (shown once; ask them to change it)`))}>Reset password</button>
              {!self && <button className={`btn btn-sm ${u.status === 'active' ? 'btn-outline-danger' : 'btn-outline-success'}`} onClick={confirmThen(`${u.status === 'active' ? 'Suspend' : 'Re-activate'} this account?`, act(() => api.put(`/api/admin/users/${u.user_id}/status`, { status: u.status === 'active' ? 'suspended' : 'active' }), () => 'User updated.'))}>{u.status === 'active' ? 'Suspend' : 'Activate'}</button>}</td></tr>); })}
      </tbody></table></div></div>}
    </>);
}
