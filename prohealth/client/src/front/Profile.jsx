import { useEffect, useState } from 'react';
import { api } from '../api.js';
import { useApp } from '../ctx.jsx';
import { ErrorBox, Spinner, confirmThen, useLoad } from '../ui.jsx';

export default function Profile() {
  const { flash, refresh } = useApp(); const { data, loading, reload } = useLoad(() => api.get('/api/profile'), []);
  const [d, setD] = useState({ full_name: '', phone: '' }); const [pw, setPw] = useState({ current: '', password: '', password2: '' }); const [ad, setAd] = useState({ label: '', street: '', town: '' }); const [err, setErr] = useState(null);
  useEffect(() => { if (data) setD({ full_name: data.full_name, phone: data.phone }); }, [data]);
  const run = (fn, ok, after) => async (e) => { e?.preventDefault(); setErr(null); try { await fn(); flash('success', ok); after?.(); await refresh(); reload(); } catch (x) { setErr(x.message); window.scrollTo(0, 0); } };
  if (loading && !data) return <Spinner />;
  return (
    <>
      <h1 className="h3 mb-3">My profile</h1>{err && <ErrorBox error={{ message: err }} />}
      <div className="row g-4">
        <div className="col-lg-6"><form className="card card-body" noValidate onSubmit={run(() => api.put('/api/profile', d), 'Details saved.')}><h2 className="h5 mb-3">My details</h2>
          <label className="form-label" htmlFor="full_name">Full name</label><input className="form-control mb-3" id="full_name" value={d.full_name} onChange={(e) => setD({ ...d, full_name: e.target.value })} required />
          <label className="form-label">Email</label><input className="form-control mb-3" value={data?.email ?? ''} disabled />
          <label className="form-label" htmlFor="phone">Phone</label><input className="form-control mb-3" id="phone" value={d.phone} onChange={(e) => setD({ ...d, phone: e.target.value })} required />
          <div><button className="btn btn-primary">Save details</button></div></form></div>
        <div className="col-lg-6"><form className="card card-body" noValidate onSubmit={run(() => api.put('/api/profile/password', pw), 'Password changed.', () => setPw({ current: '', password: '', password2: '' }))}><h2 className="h5 mb-3">Change password</h2>
          {[['current', 'Current password', 'current-password'], ['password', 'New password', 'new-password'], ['password2', 'Confirm new password', 'new-password']].map(([k, l, ac]) => (
            <div key={k}><label className="form-label" htmlFor={k}>{l}</label><input className="form-control mb-3" type="password" id={k} autoComplete={ac} value={pw[k]} onChange={(e) => setPw({ ...pw, [k]: e.target.value })} required /></div>))}
          <div><button className="btn btn-primary">Change password</button></div></form></div>
        <div className="col-12"><div className="card card-body"><h2 className="h5 mb-3">Delivery addresses</h2>
          {data?.addresses.map((a) => <div className="d-flex justify-content-between align-items-center border-bottom py-2" key={a.address_id}><span><strong>{a.label}</strong>: {a.street}, {a.town}</span>
            <button className="btn btn-sm btn-link text-danger" onClick={confirmThen('Remove this address?', run(() => api.del(`/api/profile/addresses/${a.address_id}`), 'Address removed.'))}>Remove</button></div>)}
          {data && !data.addresses.length && <p className="text-muted">No saved addresses yet.</p>}
          <form className="row g-2 mt-2" noValidate onSubmit={run(() => api.post('/api/profile/addresses', ad), 'Address added.', () => setAd({ label: '', street: '', town: '' }))}>
            <div className="col-md-3"><input className="form-control" placeholder="Label (Home)" aria-label="Label" value={ad.label} onChange={(e) => setAd({ ...ad, label: e.target.value })} /></div>
            <div className="col-md-4"><input className="form-control" placeholder="Street / building" aria-label="Street" value={ad.street} onChange={(e) => setAd({ ...ad, street: e.target.value })} /></div>
            <div className="col-md-3"><input className="form-control" placeholder="Town" aria-label="Town" value={ad.town} onChange={(e) => setAd({ ...ad, town: e.target.value })} /></div>
            <div className="col-md-2"><button className="btn btn-outline-primary w-100">Add</button></div></form></div></div>
      </div>
    </>);
}
