import { Router } from 'express';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import multer from 'multer';
import { all, one, val, exec, insert } from '../db.js';
import { wrap, HttpError, str, int, normalisePhone, passwordProblem } from '../util.js';
import { requireLogin, userById, setPassword } from '../auth.js';
import { audit } from '../audit.js';
import { config } from '../config.js';
import * as shop from '../shop.js';
import * as mpesa from '../mpesa.js';
import bcrypt from 'bcryptjs';

const r = Router();
r.use(requireLogin);
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024, files: 1 } });
const uid = (req) => req.session.user.id;

/* ---- cart ---- */
async function cartPayload(req) { const items = await shop.cartItems(uid(req)); return { items, ...shop.cartSummary(items), deliveryFee: config.deliveryFee }; }
r.get('/cart', wrap(async (req, res) => res.json(await cartPayload(req))));
r.post('/cart', wrap(async (req, res) => { await shop.cartAdd(uid(req), int(req.body.medicine_id), int(req.body.qty, 1)); res.json({ ok: true, count: await shop.cartCount(uid(req)) }); }));
r.put('/cart', wrap(async (req, res) => {
  for (const [id, qty] of Object.entries(req.body.qty ?? {})) await shop.cartSet(uid(req), int(id), int(qty));
  res.json(await cartPayload(req));
}));
r.delete('/cart/:medicineId', wrap(async (req, res) => { await shop.cartSet(uid(req), int(req.params.medicineId), 0); res.json(await cartPayload(req)); }));

/* ---- checkout (multipart: prescription file) ---- */
function detectType(buf) {
  if (buf.subarray(0, 4).toString() === '%PDF') return 'pdf';
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'jpg';
  if (buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'png';
  return null;
}
r.post('/checkout', (req, res, next) => upload.single('prescription')(req, res, (e) => e ? next(new HttpError(400, e.code === 'LIMIT_FILE_SIZE' ? 'The file is too large. The limit is 5 MB.' : 'The file could not be uploaded.')) : next()),
  wrap(async (req, res) => {
    const userId = uid(req);
    const items = await shop.cartItems(userId);
    if (!items.length) throw new HttpError(400, 'Your cart is empty.');
    const { needsRx } = shop.cartSummary(items);
    const fulfilment = str(req.body.fulfilment) || 'pickup';
    let addressId = null;
    if (fulfilment === 'delivery') {
      addressId = int(req.body.address_id);
      if (addressId <= 0) {   // new address typed in the form
        const street = str(req.body.street), town = str(req.body.town);
        if (!street || !town) throw new HttpError(400, 'Please enter the street and town for delivery.');
        const first = !(await val('SELECT COUNT(*) FROM addresses WHERE user_id=?', [userId]));
        addressId = await insert('INSERT INTO addresses (user_id,label,street,town,is_default) VALUES (?,?,?,?,?)', [userId, str(req.body.label) || 'Home', street.slice(0, 150), town.slice(0, 60), first ? 1 : 0]);
      }
    }
    let prescriptionId = null;
    if (needsRx) {
      if (!req.file) throw new HttpError(400, 'Please choose your prescription file.');
      const ext = detectType(req.file.buffer);   // real type from the file contents, not the name
      if (!ext) throw new HttpError(400, 'Only PDF, JPG or PNG files are allowed.');
      fs.mkdirSync(path.join(config.storage, 'prescriptions'), { recursive: true });
      const name = `${crypto.randomBytes(16).toString('hex')}.${ext}`;
      fs.writeFileSync(path.join(config.storage, 'prescriptions', name), req.file.buffer);
      prescriptionId = await insert('INSERT INTO prescriptions (customer_id,file_path) VALUES (?,?)', [userId, name]);
      await audit(req, 'prescription_uploaded', 'prescriptions', prescriptionId, null, userId);
    }
    const orderId = await shop.createOrder(req, userId, fulfilment, addressId, prescriptionId);
    res.status(201).json({ orderId, needsRx });
  }));

/* ---- orders ---- */
r.get('/orders', wrap(async (req, res) => res.json(await all('SELECT o.*, (SELECT COUNT(*) FROM order_items WHERE order_id=o.order_id) AS n FROM orders o WHERE customer_id=? ORDER BY o.created_at DESC', [uid(req)]))));
const mine = async (req) => { const o = await shop.orderGet(int(req.params.id), uid(req)); if (!o) throw new HttpError(404, 'Order not found.'); return o; };
r.get('/orders/:id', wrap(async (req, res) => {
  const o = await mine(req);
  const [canPay, why] = shop.orderCanPay(o);
  res.json({ order: o, items: await shop.orderItems(o.order_id), timeline: shop.orderTimeline(o), canPay, whyNot: why, mpesaMode: mpesa.mode() });
}));
r.post('/orders/:id/cancel', wrap(async (req, res) => {
  const o = await mine(req);
  if (o.status === 'pending') { await exec("UPDATE orders SET status='cancelled' WHERE order_id=? AND status='pending'", [o.order_id]); await audit(req, 'order_cancelled', 'orders', o.order_id, 'By customer', uid(req)); }
  res.json({ ok: true });
}));
r.post('/orders/:id/pay', wrap(async (req, res) => {
  const o = await mine(req);
  const phone = normalisePhone(req.body.phone);
  if (!phone) throw new HttpError(422, 'Please enter a valid Safaricom number, for example 0712 345 678.');
  await shop.paymentStart(req, o, phone);
  res.json({ ok: true });
}));
r.get('/orders/:id/payment', wrap(async (req, res) => {
  const o = await mine(req);
  res.json({ status: o.pay_status ?? 'none', phone: o.pay_phone, amount: o.total_amount, orderId: o.order_id, simulate: mpesa.mode() === 'simulate' && String(o.checkout_request_id ?? '').startsWith('SIM-'), pharmacy: config.pharmacy.name });
}));
/* Test mode only: stands in for the customer's phone */
r.post('/orders/:id/mpesa-simulate', wrap(async (req, res) => {
  const o = await mine(req);
  if (mpesa.mode() !== 'simulate' || o.pay_status !== 'pending') throw new HttpError(400, 'Nothing to confirm.');
  const ok = req.body.result === 'success';
  const outcome = await shop.paymentFinalize(req, o.order_id, ok, ok ? 'SIM' + crypto.randomBytes(4).toString('hex').toUpperCase() : null);
  res.json({ outcome });
}));

/* ---- prescription file: only the owner or staff ---- */
r.get('/prescriptions/:id/file', wrap(async (req, res) => {
  const p = await one('SELECT * FROM prescriptions WHERE prescription_id=?', [int(req.params.id)]);
  const u = req.session.user;
  if (!p || (p.customer_id !== u.id && !['admin', 'pharmacist'].includes(u.role))) throw new HttpError(404, 'Not found');
  const file = path.join(config.storage, 'prescriptions', path.basename(p.file_path));
  if (!fs.existsSync(file)) throw new HttpError(404, 'File missing');
  const type = { pdf: 'application/pdf', jpg: 'image/jpeg', png: 'image/png' }[path.extname(file).slice(1)] ?? 'application/octet-stream';
  res.set({ 'Content-Type': type, 'X-Content-Type-Options': 'nosniff', 'Content-Disposition': `inline; filename="prescription-${p.prescription_id}"` });
  fs.createReadStream(file).pipe(res);
}));

/* ---- profile ---- */
r.get('/profile', wrap(async (req, res) => {
  const u = await userById(uid(req));
  res.json({ full_name: u.full_name, email: u.email, phone: u.phone, addresses: await all('SELECT * FROM addresses WHERE user_id=? ORDER BY is_default DESC, address_id', [uid(req)]) });
}));
r.put('/profile', wrap(async (req, res) => {
  const name = str(req.body.full_name), phone = normalisePhone(req.body.phone);
  if (name.length < 2) throw new HttpError(422, 'Please enter your name.');
  if (!phone) throw new HttpError(422, 'Enter a valid Kenyan phone number.');
  await exec('UPDATE users SET full_name=?, phone=? WHERE user_id=?', [name, phone, uid(req)]);
  req.session.user.name = name;
  await audit(req, 'profile_updated', 'users', uid(req));
  res.json({ ok: true });
}));
r.put('/profile/password', wrap(async (req, res) => {
  const u = await userById(uid(req));
  if (!(await bcrypt.compare(String(req.body.current ?? ''), u.password_hash))) throw new HttpError(422, 'Your current password is not correct.');
  const pp = passwordProblem(req.body.password); if (pp) throw new HttpError(422, pp);
  if (req.body.password !== req.body.password2) throw new HttpError(422, 'The new passwords do not match.');
  await setPassword(uid(req), req.body.password);
  await audit(req, 'password_changed', 'users', uid(req));
  res.json({ ok: true });
}));
r.post('/profile/addresses', wrap(async (req, res) => {
  const street = str(req.body.street), town = str(req.body.town);
  if (!street || !town) throw new HttpError(422, 'Street and town are required.');
  const first = !(await val('SELECT COUNT(*) FROM addresses WHERE user_id=?', [uid(req)]));
  await insert('INSERT INTO addresses (user_id,label,street,town,is_default) VALUES (?,?,?,?,?)', [uid(req), str(req.body.label) || 'Home', street.slice(0, 150), town.slice(0, 60), first ? 1 : 0]);
  res.status(201).json({ ok: true });
}));
r.delete('/profile/addresses/:id', wrap(async (req, res) => {
  try { await exec('DELETE FROM addresses WHERE address_id=? AND user_id=?', [int(req.params.id), uid(req)]); }
  catch (e) { if (e.code === 'ER_ROW_IS_REFERENCED_2') throw new HttpError(409, 'That address is used by an order, so it cannot be deleted.'); throw e; }
  res.json({ ok: true });
}));
export default r;
