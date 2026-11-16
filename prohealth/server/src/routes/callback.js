import { Router } from 'express';
import { one } from '../db.js';
import { wrap } from '../util.js';
import { normalisePhone } from '../util.js';
import * as mpesa from '../mpesa.js';
import { paymentFinalize } from '../shop.js';

// Safaricom calls this after the customer enters (or cancels) the PIN.
const r = Router();
r.post('/mpesa/callback', wrap(async (req, res) => {
  const cb = mpesa.parseCallback(req.body);
  if (cb) {
    const payment = await one('SELECT order_id, amount, phone FROM payments WHERE checkout_request_id=?', [cb.checkoutRequestId]);
    if (!payment) {
      console.error('Daraja callback for unknown checkout request', cb.checkoutRequestId);
    } else if (cb.success) {
      const callbackPhone = normalisePhone(cb.phone);
      if (!cb.receipt || !Number.isFinite(cb.amount) || Number(payment.amount) !== cb.amount || callbackPhone !== normalisePhone(payment.phone)) {
        console.error('Daraja callback did not match the stored payment', cb.checkoutRequestId);
      } else {
        await paymentFinalize(req, payment.order_id, true, cb.receipt);
      }
    } else {
      await paymentFinalize(req, payment.order_id, false);
    }
  }
  res.json({ ResultCode: 0, ResultDesc: 'Accepted' });
}));
export default r;
