import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api.js';
import { useApp } from '../ctx.jsx';
import { ErrorBox, Spinner, money, useLoad } from '../ui.jsx';

export default function Checkout() {
  const nav = useNavigate(); const { me, refresh, flash } = useApp();
  const cart = useLoad(() => api.get('/api/cart'), []); const prof = useLoad(() => api.get('/api/profile'), []);
  const [ful, setFul] = useState('pickup'); const [addr, setAddr] = useState(null); const [nw, setNw] = useState({ label: '', street: '', town: '' }); const [file, setFile] = useState(null);
  const [err, setErr] = useState(null); const [busy, setBusy] = useState(false);
  if (cart.loading || prof.loading) return <Spinner />;
  if (cart.error) return <ErrorBox error={cart.error} />;
  const { items, subtotal, needsRx } = cart.data; const addresses = prof.data?.addresses ?? [];
  if (!items.length) { nav('/cart', { replace: true }); return null; }
  const fee = me?.deliveryFee ?? 150; const total = subtotal + (ful === 'delivery' ? fee : 0);
  const chosen = addr ?? (addresses.find((a) => a.is_default)?.address_id ?? addresses[0]?.address_id ?? -1);
  const submit = async (e) => {
    e.preventDefault(); setErr(null); setBusy(true);
    try {
      const fd = new FormData(); fd.set('fulfilment', ful);
      if (ful === 'delivery') { fd.set('address_id', chosen); fd.set('label', nw.label); fd.set('street', nw.street); fd.set('town', nw.town); }
      if (needsRx && file) fd.set('prescription', file);
      const out = await api.post('/api/checkout', fd);
      await refresh();
      flash('success', out.needsRx ? 'Order placed. A pharmacist will check your prescription, then you can pay.' : 'Order placed. Please pay to confirm it.');
      nav(out.needsRx ? `/orders/${out.orderId}` : `/orders/${out.orderId}/pay`);
    } catch (x) { setErr(x.message); } finally { setBusy(false); }
  };
  return (
    <>
      <h1 className="h3 mb-3">Checkout</h1>
      {err && <div className="alert alert-danger" role="alert">{err}</div>}
      <form className="row g-4" onSubmit={submit} noValidate>
        <div className="col-lg-8">
          <div className="card card-body mb-3">
            <h2 className="h5 mb-3">1. How do you want to receive it?</h2>
            <div className="form-check mb-2"><input className="form-check-input" type="radio" id="fpickup" checked={ful === 'pickup'} onChange={() => setFul('pickup')} /><label className="form-check-label" htmlFor="fpickup"><strong>Pick up in store</strong> <span className="text-muted">(free)</span></label></div>
            <div className="form-check"><input className="form-check-input" type="radio" id="fdelivery" checked={ful === 'delivery'} onChange={() => setFul('delivery')} /><label className="form-check-label" htmlFor="fdelivery"><strong>Home delivery</strong> <span className="text-muted">({money(fee)})</span></label></div>
            {ful === 'delivery' && <div className="mt-3">
              {addresses.map((a) => <div className="form-check mb-1" key={a.address_id}><input className="form-check-input" type="radio" id={`a${a.address_id}`} checked={chosen === a.address_id} onChange={() => setAddr(a.address_id)} /><label className="form-check-label" htmlFor={`a${a.address_id}`}>{a.label}: {a.street}, {a.town}</label></div>)}
              {addresses.length > 0 && <div className="form-check mb-2"><input className="form-check-input" type="radio" id="anew" checked={chosen === -1} onChange={() => setAddr(-1)} /><label className="form-check-label" htmlFor="anew">Use a new address</label></div>}
              {(chosen === -1 || !addresses.length) && <div className="row g-2">
                <div className="col-md-3"><input className="form-control" placeholder="Label (Home)" aria-label="Label" value={nw.label} onChange={(e) => setNw({ ...nw, label: e.target.value })} /></div>
                <div className="col-md-5"><input className="form-control" placeholder="Street / building" aria-label="Street" value={nw.street} onChange={(e) => setNw({ ...nw, street: e.target.value })} /></div>
                <div className="col-md-4"><input className="form-control" placeholder="Town" aria-label="Town" value={nw.town} onChange={(e) => setNw({ ...nw, town: e.target.value })} /></div></div>}
            </div>}
          </div>
          {needsRx && <div className="card card-body">
            <h2 className="h5 mb-1">2. Upload your prescription</h2>
            <p className="text-muted small">Needed for: {items.filter((i) => i.requires_prescription).map((i) => i.name).join(', ')}. PDF, JPG or PNG, up to 5 MB.</p>
            <input className="form-control" type="file" accept=".pdf,.jpg,.jpeg,.png" aria-label="Prescription file" onChange={(e) => setFile(e.target.files[0] ?? null)} />
          </div>}
        </div>
        <div className="col-lg-4"><div className="card card-body summary-card">
          <h2 className="h5 mb-3">Order summary</h2>
          {items.map((i) => <div className="d-flex justify-content-between small mb-1" key={i.medicine_id}><span>{i.quantity} × {i.name}</span><span>{money(i.unit_price * i.quantity)}</span></div>)}
          <hr />
          <div className="d-flex justify-content-between mb-1"><span className="text-muted">Subtotal</span><span>{money(subtotal)}</span></div>
          {ful === 'delivery' && <div className="d-flex justify-content-between mb-1"><span className="text-muted">Delivery</span><span>{money(fee)}</span></div>}
          <div className="d-flex justify-content-between fw-bold fs-5 mt-2"><span>Total</span><span>{money(total)}</span></div>
          <button className="btn btn-primary btn-lg w-100 mt-3" disabled={busy}>{needsRx ? 'Place order and send prescription' : 'Place order'}</button>
        </div></div>
      </form>
    </>);
}
