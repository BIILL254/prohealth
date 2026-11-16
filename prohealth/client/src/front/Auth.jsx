import { useState } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../api.js';
import { useApp } from '../ctx.jsx';
import { FieldError, Spinner, useLoad } from '../ui.jsx';

const Shell = ({ title, sub, wide, children }) => (
  <div className="row justify-content-center"><div className={wide ? 'col-md-8 col-lg-6' : 'col-md-7 col-lg-5'}><div className="card card-body p-4"><h1 className="h4 mb-1">{title}</h1>{sub && <p className="text-muted">{sub}</p>}{children}</div></div></div>);

/** Shared by the customer and staff login pages. */
export function LoginForm({ staff, onDone }) {
  const { refresh } = useApp(); const [f, setF] = useState({ email: '', password: '' }); const [step2, setStep2] = useState(false); const [code, setCode] = useState('');
  const [err, setErr] = useState(null); const [busy, setBusy] = useState(false);
  const submit = async (e) => {
    e.preventDefault(); setErr(null); setBusy(true);
    try {
      const out = step2 ? await api.post('/api/auth/2fa', { code }) : await api.post('/api/auth/login', { ...f, staff });
      if (out.need2fa) setStep2(true); else { await refresh(); onDone(out.user); }
    } catch (x) { setErr(x.message); } finally { setBusy(false); }
  };
  return (
    <form onSubmit={submit} noValidate>
      {err && <div className="alert alert-danger" role="alert">{err}</div>}
      {step2 ? (<>
        <p>Enter the 6-digit code from your authenticator app.</p>
        <input className="form-control form-control-lg otp-input mb-3" inputMode="numeric" autoComplete="one-time-code" maxLength={6} autoFocus required aria-label="6-digit code" value={code} onChange={(e) => setCode(e.target.value)} />
        <button className="btn btn-primary w-100" disabled={busy}>Verify and log in</button></>
      ) : (<>
        <label className="form-label" htmlFor="email">Email</label>
        <input className="form-control mb-3" type="email" id="email" autoComplete="email" required autoFocus value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} />
        <label className="form-label" htmlFor="password">Password</label>
        <input className="form-control mb-2" type="password" id="password" autoComplete="current-password" required value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} />
        {!staff && <div className="text-end mb-3"><Link className="small" to="/forgot-password">Forgot password?</Link></div>}
        <button className={`btn btn-primary w-100${staff ? ' mt-3' : ''}`} disabled={busy}>Log in</button></>)}
    </form>);
}

export function Login() {
  const nav = useNavigate(); const loc = useLocation(); const { flash } = useApp();
  return (
    <Shell title="Log in" sub="Welcome back to ProHealth.">
      <LoginForm staff={false} onDone={(u) => { flash('success', `Welcome back, ${u.name.split(' ')[0]}.`); nav(['admin', 'pharmacist'].includes(u.role) && !loc.state?.from ? '/admin' : loc.state?.from ?? '/', { replace: true }); }} />
      <p className="text-center text-muted mt-3 mb-0">New here? <Link to="/register">Create an account</Link></p>
    </Shell>);
}

export function Register() {
  const nav = useNavigate(); const { flash } = useApp(); const [f, setF] = useState({ full_name: '', email: '', phone: '', password: '', password2: '' }); const [err, setErr] = useState(null); const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const submit = async (e) => { e.preventDefault(); setErr(null); setBusy(true); try { await api.post('/api/auth/register', f); flash('success', 'Your account is ready. Please log in.'); nav('/login'); } catch (x) { setErr(x); } finally { setBusy(false); } };
  const inp = (k, label, type = 'text', extra = {}) => (<div className={extra.col}><label className="form-label" htmlFor={k}>{label}</label>
    <input className={`form-control${err?.fields?.[k] ? ' is-invalid' : ''}`} type={type} id={k} value={f[k]} onChange={set(k)} required {...extra.props} /><FieldError fields={err?.fields} name={k} />{extra.hint && <div className="form-text">{extra.hint}</div>}</div>);
  return (
    <Shell title="Create your account" sub="It takes less than a minute." wide>
      <form onSubmit={submit} noValidate>
        {err && !Object.keys(err.fields).length && <div className="alert alert-danger">{err.message}</div>}
        <div className="mb-3">{inp('full_name', 'Full name')}</div>
        <div className="row g-3 mb-3">{inp('email', 'Email', 'email', { col: 'col-md-6' })}{inp('phone', 'M-Pesa phone number', 'text', { col: 'col-md-6', props: { placeholder: '0712 345 678' } })}</div>
        <div className="row g-3 mb-3">{inp('password', 'Password', 'password', { col: 'col-md-6', hint: 'At least 8 characters with a letter and a number.', props: { autoComplete: 'new-password' } })}{inp('password2', 'Confirm password', 'password', { col: 'col-md-6', props: { autoComplete: 'new-password' } })}</div>
        <button className="btn btn-primary w-100" disabled={busy}>Create account</button>
      </form>
      <p className="text-center text-muted mt-3 mb-0">Already registered? <Link to="/login">Log in</Link></p>
    </Shell>);
}

export function Forgot() {
  const [email, setEmail] = useState(''); const [done, setDone] = useState(null); const [err, setErr] = useState(null);
  const submit = async (e) => { e.preventDefault(); setErr(null); try { setDone(await api.post('/api/auth/forgot', { email })); } catch (x) { setErr(x.message); } };
  return (
    <Shell title="Forgot your password?" sub="Enter your email and we will send you a reset link.">
      {err && <div className="alert alert-danger">{err}</div>}
      {done && <div className="alert alert-success">If that email has an account, a reset link has been sent. It works for one hour.</div>}
      <form onSubmit={submit} noValidate><label className="form-label" htmlFor="email">Email</label>
        <input className="form-control mb-3" type="email" id="email" required autoFocus value={email} onChange={(e) => setEmail(e.target.value)} /><button className="btn btn-primary w-100">Send reset link</button></form>
      {done?.devLink && <div className="alert alert-info mt-3 mb-0 small"><strong>Development mode:</strong> no email server is connected, so here is the link:<br /><a href={done.devLink}>{done.devLink}</a></div>}
      <p className="text-center mt-3 mb-0"><Link to="/login">Back to log in</Link></p>
    </Shell>);
}

export function Reset() {
  const [sp] = useSearchParams(); const token = sp.get('token') ?? ''; const nav = useNavigate(); const { flash } = useApp();
  const check = useLoad(() => api.get(`/api/auth/reset/${encodeURIComponent(token)}`), [token]); const [f, setF] = useState({ password: '', password2: '' }); const [err, setErr] = useState(null);
  if (check.loading) return <Spinner />;
  if (!check.data?.valid) return <Shell title="Link expired"><p className="text-muted">This reset link is invalid or has expired.</p><Link className="btn btn-primary" to="/forgot-password">Request a new link</Link></Shell>;
  const submit = async (e) => { e.preventDefault(); setErr(null); try { await api.post('/api/auth/reset', { token, ...f }); flash('success', 'Password changed. You can log in now.'); nav('/login'); } catch (x) { setErr(x.message); } };
  return (
    <Shell title="Choose a new password">
      {err && <div className="alert alert-danger">{err}</div>}
      <form onSubmit={submit} noValidate>
        <label className="form-label" htmlFor="password">New password</label><input className="form-control mb-1" type="password" id="password" autoComplete="new-password" required value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} />
        <div className="form-text mb-3">At least 8 characters with a letter and a number.</div>
        <label className="form-label" htmlFor="password2">Confirm password</label><input className="form-control mb-3" type="password" id="password2" autoComplete="new-password" required value={f.password2} onChange={(e) => setF({ ...f, password2: e.target.value })} />
        <button className="btn btn-primary w-100">Change password</button>
      </form>
    </Shell>);
}
