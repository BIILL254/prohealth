import { useState } from 'react';
import { api } from '../api.js';
import { useApp } from '../ctx.jsx';
import { useHeader } from '../layouts.jsx';
import { ErrorBox, Spinner, confirmThen, useLoad } from '../ui.jsx';

export default function Security() {
  useHeader('Account security', 'Protect your staff account with a second step'); const { flash } = useApp();
  const { data, error, loading, reload } = useLoad(() => api.get('/api/admin/security'), []); const [code, setCode] = useState(''); const [pw, setPw] = useState('');
  const run = (fn, ok, type = 'success') => async (e) => { e?.preventDefault(); try { await fn(); flash(type, ok); setCode(''); setPw(''); reload(); } catch (x) { flash('danger', x.message); } };
  if (loading && !data) return <Spinner />; if (error) return <ErrorBox error={error} />;
  return (
    <div className="card card-body" style={{ maxWidth: '40rem' }}>
      {data.enabled ? (<>
        <h2 className="h5"><i className="fa-solid fa-shield-halved text-success me-2" />Two-factor sign-in is on</h2><p className="text-muted">You need a code from your authenticator app each time you log in.</p>
        <form className="row g-2" onSubmit={(e) => { e.preventDefault(); confirmThen('Turn off two-factor sign-in?', run(() => api.post('/api/admin/security/disable', { password: pw }), 'Two-factor sign-in is off.', 'info'))(); }}>
          <div className="col"><input className="form-control" type="password" placeholder="Confirm with your password" aria-label="Password" required value={pw} onChange={(e) => setPw(e.target.value)} /></div><div className="col-auto"><button className="btn btn-outline-danger">Turn off</button></div></form></>
      ) : (<>
        <h2 className="h5">Turn on two-factor sign-in</h2>
        <ol className="small"><li>Install an authenticator app (Google Authenticator, Microsoft Authenticator or Authy).</li><li>Scan this QR code, or type the key by hand.</li><li>Enter the 6-digit code the app shows.</li></ol>
        <div className="text-center my-3"><img id="qr" className="p-2 bg-white border rounded" src={data.qr} alt="QR code" width="220" height="220" /><div className="small text-muted mt-2">Key: <code>{data.secret.match(/.{1,4}/g).join(' ')}</code></div></div>
        <form className="row g-2" onSubmit={run(() => api.post('/api/admin/security/enable', { code }), 'Two-factor sign-in is now on.')}>
          <div className="col"><input className="form-control otp-input" inputMode="numeric" maxLength={6} placeholder="000000" aria-label="6-digit code" required value={code} onChange={(e) => setCode(e.target.value)} /></div><div className="col-auto"><button className="btn btn-primary">Verify and turn on</button></div></form></>)}
    </div>);
}
