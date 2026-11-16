import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api } from '../api.js';
import { useApp } from '../ctx.jsx';
import { ErrorBox, Spinner, money, useLoad } from '../ui.jsx';

export function PayOrder() {
  const { id } = useParams(); const nav = useNavigate(); const { user } = useApp();
  const { data, error, loading } = useLoad(() => api.get(`/api/orders/${id}`), [id]); const prof = useLoad(() => api.get('/api/profile'), []);
  const [phone, setPhone] = useState(null); const [err, setErr] = useState(null); const [busy, setBusy] = useState(false);
  if (loading || prof.loading) return <Spinner />;
  if (error) return <ErrorBox error={error} />;
  const { order, canPay, whyNot, mpesaMode } = data;
  const submit = async (e) => { e.preventDefault(); setErr(null); setBusy(true); try { await api.post(`/api/orders/${id}/pay`, { phone: phone ?? prof.data?.phone ?? '' }); nav(`/orders/${id}/waiting`); } catch (x) { setErr(x.message); } finally { setBusy(false); } };
  return (
    <div className="row justify-content-center"><div className="col-lg-6"><div className="card card-body p-4">
      <h1 className="h4">Pay with M-Pesa</h1>
      <p className="text-muted">Order #{order.order_id} &middot; <strong className="text-body">{money(order.total_amount)}</strong></p>
      {!canPay ? <><div className="alert alert-warning mb-3">{whyNot}</div><Link className="btn btn-primary" to={`/orders/${id}`}>View order</Link></> : (<>
        {err && <div className="alert alert-danger" role="alert">{err}</div>}
        {order.pay_status === 'failed' && <div className="alert alert-warning">Your last payment attempt did not go through. You can try again.</div>}
        <form onSubmit={submit} noValidate>
          <label className="form-label" htmlFor="phone">M-Pesa phone number</label>
          <input className="form-control form-control-lg mb-2" id="phone" placeholder="0712 345 678" required value={phone ?? prof.data?.phone ?? ''} onChange={(e) => setPhone(e.target.value)} />
          <div className="form-text mb-3">You will get a prompt on this phone. Enter your M-Pesa PIN to pay.</div>
          <button className="btn btn-primary btn-lg w-100" disabled={busy}><i className="fa-solid fa-mobile-screen me-2" />Send payment prompt</button>
        </form>
        {mpesaMode === 'simulate' && <p className="small text-muted mt-3 mb-0"><i className="fa-solid fa-flask me-1" />Test mode: no real money moves. The phone prompt is simulated on the next screen.</p>}</>)}
    </div></div></div>);
}

export function PaymentWait() {
  const { id } = useParams(); const nav = useNavigate(); const { refresh, flash } = useApp(); const [pay, setPay] = useState(null); const [failed, setFailed] = useState(false); const tries = useRef(0);
  useEffect(() => {
    let live = true, timer;
    const check = async () => {
      try {
        const p = await api.get(`/api/orders/${id}/payment`); if (!live) return; setPay(p);
        if (p.status === 'success') { await refresh(); nav(`/orders/${id}?paid=1`, { replace: true }); return; }
        if (p.status === 'failed') { setFailed(true); return; }
        if (p.status === 'none') { nav(`/orders/${id}`, { replace: true }); return; }
      } catch { /* try again */ }
      if (++tries.current < 60 && live) timer = setTimeout(check, 3000);
    };
    check(); return () => { live = false; clearTimeout(timer); };
  }, [id]); // eslint-disable-line
  const sim = async (result) => {
    try { const r = await api.post(`/api/orders/${id}/mpesa-simulate`, { result });
      if (r.outcome === 'stock_short') { flash('warning', 'Your payment was received but an item ran out of stock, so the order was cancelled. The pharmacy will refund you.'); nav(`/orders/${id}`); return; }
      const p = await api.get(`/api/orders/${id}/payment`); setPay(p);
      if (p.status === 'success') { await refresh(); nav(`/orders/${id}?paid=1`, { replace: true }); } else if (p.status === 'failed') setFailed(true);
    } catch (e) { flash('danger', e.message); }
  };
  if (!pay) return <Spinner />;
  return (
    <div className="row justify-content-center"><div className="col-lg-6"><div className="card card-body p-4 text-center">
      {failed ? (<><i className="fa-solid fa-circle-xmark text-danger fs-1 mb-2" /><h1 className="h4">Payment not completed</h1><p className="text-muted">The payment was cancelled or failed. You have not been charged.</p><div><Link className="btn btn-primary" to={`/orders/${id}/pay`}>Try again</Link></div></>) : (<>
        <div><div className="spinner-border text-primary mb-3" role="status"><span className="visually-hidden">Waiting</span></div><h1 className="h4">Check your phone</h1>
          <p className="text-muted">We sent a prompt to <strong>{pay.phone}</strong> for <strong>{money(pay.amount)}</strong>. Enter your M-Pesa PIN to finish.</p></div>
        {pay.simulate && <div className="phone-mock mx-auto mt-3"><div className="small text-uppercase opacity-75">M-Pesa (simulation)</div><p className="my-3">Pay {money(pay.amount)} to {pay.pharmacy}?</p>
          <div className="d-flex gap-2 justify-content-center"><button className="btn btn-success" onClick={() => sim('success')}>Enter PIN &amp; pay</button><button className="btn btn-outline-light" onClick={() => sim('cancel')}>Cancel</button></div></div>}</>)}
      <Link className="small mt-3" to={`/orders/${id}`}>Go to my order</Link>
    </div></div></div>);
}
