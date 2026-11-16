import { useState } from 'react';
import { useApp } from '../ctx.jsx';

const FAQ = [['How do I order?', 'Find your medicine, press Add, open your cart and choose Checkout. Pick delivery or pickup, place the order, then pay with M-Pesa.'],
  ['Which medicines need a prescription?', 'Items marked "Rx only". Upload a clear photo or PDF of the prescription (up to 5 MB) at checkout. A pharmacist checks it, usually within a few hours, and you can pay once it is approved.'],
  ['How does M-Pesa payment work?', 'Enter your Safaricom number and press Send payment prompt. A prompt appears on your phone; enter your M-Pesa PIN. The page updates by itself when the payment is confirmed.'],
  ['My payment failed. What now?', 'Open the order from My orders and press Pay with M-Pesa again. If money left your account but the order shows unpaid, contact us with your M-Pesa message.'],
  ['Can I cancel an order?', 'Yes, while it is still waiting for payment. Open the order and press Cancel order.'],
  ['I forgot my password.', 'Use "Forgot password?" on the login page. A reset link works for one hour.'],
  ['Is my information safe?', 'Passwords are stored as one-way hashes, prescriptions are visible only to you and our pharmacists, and your session ends after 30 minutes of inactivity.']];
export default function Help() {
  const [open, setOpen] = useState(0); const ph = useApp().me?.pharmacy ?? {};
  return (
    <>
      <h1 className="h3 mb-3">Help and FAQ</h1>
      <div className="accordion mb-4">{FAQ.map(([q, a], n) => (
        <div className="accordion-item" key={q}><h2 className="accordion-header"><button className={`accordion-button${open === n ? '' : ' collapsed'}`} type="button" onClick={() => setOpen(open === n ? -1 : n)}>{q}</button></h2>
          <div className={`accordion-collapse collapse${open === n ? ' show' : ''}`}><div className="accordion-body">{a}</div></div></div>))}</div>
      <div className="card card-body"><h2 className="h5">Contact the pharmacy</h2><p className="mb-0"><i className="fa-solid fa-phone me-2" />{ph.phone} &middot; <i className="fa-solid fa-envelope me-2" />{ph.email}<br /><i className="fa-solid fa-location-dot me-2" />{ph.address}</p></div>
    </>);
}
