// Catalogue, cart and order logic (same rules as the PHP version, now in Node)
import { all, one, val, exec, insert, transaction } from './db.js';
import { audit } from './audit.js';
import { config } from './config.js';
import { HttpError, stockStatus } from './util.js';
import * as mpesa from './mpesa.js';

export const MEDICINE_SELECT = `SELECT m.*, c.name AS category_name,
  COALESCE((SELECT SUM(b.quantity) FROM stock_batches b WHERE b.medicine_id=m.medicine_id AND b.expiry_date > CURDATE()),0) AS stock
  FROM medicines m JOIN categories c ON c.category_id=m.category_id`;
export const withStatus = (m) => ({ ...m, stock_status: stockStatus(m.stock, m.reorder_level) });
export const medicineGet = (id) => one(`${MEDICINE_SELECT} WHERE m.medicine_id=?`, [id]);

export async function searchMedicines(f, limit, offset) {
  const where = ['m.is_active=1']; const p = [];
  if (f.q) { where.push('(m.name LIKE ? OR m.generic_name LIKE ? OR m.description LIKE ?)'); p.push(`%${f.q}%`, `%${f.q}%`, `%${f.q}%`); }
  if (f.category) { where.push('m.category_id=?'); p.push(f.category); }
  if (f.type === 'otc') where.push('m.requires_prescription=0'); else if (f.type === 'rx') where.push('m.requires_prescription=1');
  if (f.max_price > 0) { where.push('m.unit_price<=?'); p.push(f.max_price); }
  const order = { price_asc: 'm.unit_price ASC, m.name', price_desc: 'm.unit_price DESC, m.name' }[f.sort] ?? 'm.name';
  const w = where.join(' AND ');
  const total = await val(`SELECT COUNT(*) FROM medicines m WHERE ${w}`, p);
  const rows = await all(`${MEDICINE_SELECT} WHERE ${w} ORDER BY ${order} LIMIT ${Number(limit)} OFFSET ${Number(offset)}`, p);
  return { rows: rows.map(withStatus), total };
}

/* ---------------- cart ---------------- */
export const cartItems = (userId) => all(`SELECT ci.cart_item_id, ci.quantity, m.medicine_id, m.name, m.unit_price, m.requires_prescription, m.is_active, c.name AS category_name,
  COALESCE((SELECT SUM(b.quantity) FROM stock_batches b WHERE b.medicine_id=m.medicine_id AND b.expiry_date > CURDATE()),0) AS stock
  FROM cart_items ci JOIN medicines m ON m.medicine_id=ci.medicine_id JOIN categories c ON c.category_id=m.category_id WHERE ci.user_id=? ORDER BY ci.added_at`, [userId]);
export const cartCount = async (userId) => Number(await val('SELECT COALESCE(SUM(quantity),0) FROM cart_items WHERE user_id=?', [userId]));
export function cartSummary(items) {
  return { subtotal: items.reduce((s, i) => s + i.unit_price * i.quantity, 0), needsRx: items.some((i) => i.requires_prescription) };
}
export async function cartAdd(userId, medicineId, qty) {
  const m = await medicineGet(medicineId);
  if (!m || !m.is_active) throw new HttpError(400, 'That medicine is not available.');
  if (!Number.isInteger(qty) || qty < 1 || qty > 99) throw new HttpError(400, 'Please choose a quantity between 1 and 99.');
  const have = Number(await val('SELECT quantity FROM cart_items WHERE user_id=? AND medicine_id=?', [userId, medicineId]) ?? 0);
  if (have + qty > m.stock) throw new HttpError(400, `Only ${m.stock} of ${m.name} in stock.`);
  await exec('INSERT INTO cart_items (user_id, medicine_id, quantity) VALUES (?,?,?) ON DUPLICATE KEY UPDATE quantity=VALUES(quantity)', [userId, medicineId, have + qty]);
}
export async function cartSet(userId, medicineId, qty) {
  if (qty <= 0) return exec('DELETE FROM cart_items WHERE user_id=? AND medicine_id=?', [userId, medicineId]);
  const m = await medicineGet(medicineId);
  if (!m) throw new HttpError(400, 'That medicine is not available.');
  qty = Math.min(qty, 99);
  if (qty > m.stock) throw new HttpError(400, `Only ${m.stock} of ${m.name} in stock.`);
  await exec('UPDATE cart_items SET quantity=? WHERE user_id=? AND medicine_id=?', [qty, userId, medicineId]);
}

/* ---------------- orders ---------------- */
export const ORDER_FLOW = { pending: 0, paid: 1, processing: 2, ready: 3, completed: 4 };
export function orderGet(id, userId = null) {
  const sql = `SELECT o.*, u.full_name AS customer_name, u.email AS customer_email, u.phone AS customer_phone,
    a.label AS addr_label, a.street AS addr_street, a.town AS addr_town,
    p.status AS presc_status, p.reviewer_notes AS presc_notes,
    py.status AS pay_status, py.mpesa_receipt, py.paid_at, py.phone AS pay_phone, py.checkout_request_id
    FROM orders o JOIN users u ON u.user_id=o.customer_id LEFT JOIN addresses a ON a.address_id=o.address_id
    LEFT JOIN prescriptions p ON p.prescription_id=o.prescription_id LEFT JOIN payments py ON py.order_id=o.order_id WHERE o.order_id=?` + (userId ? ' AND o.customer_id=?' : '');
  return one(sql, userId ? [id, userId] : [id]);
}
export const orderItems = (id) => all('SELECT oi.*, m.name, m.requires_prescription FROM order_items oi JOIN medicines m ON m.medicine_id=oi.medicine_id WHERE oi.order_id=? ORDER BY oi.order_item_id', [id]);

export function orderCanPay(o) {
  if (o.status !== 'pending') return [false, 'This order is not waiting for payment.'];
  if (o.prescription_id && o.presc_status !== 'approved')
    return [false, o.presc_status === 'rejected' ? 'Your prescription was rejected.' : 'Your prescription is still waiting for the pharmacist to check it.'];
  if (o.pay_status === 'success') return [false, 'This order is already paid.'];
  return [true, ''];
}
export function orderTimeline(o) {
  if (o.status === 'cancelled') return [{ label: 'Order placed', done: true }, { label: 'Order cancelled', done: true, current: true }];
  const rank = ORDER_FLOW[o.status] ?? 0; const rx = !!o.prescription_id;
  const steps = [{ label: 'Order placed', done: true }];
  if (rx) steps.push({ label: 'Prescription approved', done: o.presc_status === 'approved', current: o.presc_status === 'pending' });
  steps.push({ label: 'Payment confirmed', done: rank >= 1, current: rank === 0 && (!rx || o.presc_status === 'approved') });
  steps.push({ label: 'Being prepared', done: rank >= 2, current: rank === 1 || rank === 2 });
  steps.push({ label: o.fulfilment_type === 'delivery' ? 'Out for delivery' : 'Ready for pickup', done: rank >= 3, current: rank === 3 });
  steps.push({ label: 'Completed', done: rank >= 4 });
  return steps;
}

export async function createOrder(req, userId, fulfilment, addressId, prescriptionId) {
  if (!['delivery', 'pickup'].includes(fulfilment)) throw new HttpError(400, 'Please choose delivery or pickup.');
  const id = await transaction(async () => {
    const items = await cartItems(userId);
    if (!items.length) throw new HttpError(400, 'Your cart is empty.');
    for (const i of items) if (!i.is_active || i.quantity > i.stock) throw new HttpError(400, `Not enough stock for ${i.name}. Please update your cart.`);
    const { subtotal, needsRx } = cartSummary(items);
    if (needsRx && !prescriptionId) throw new HttpError(400, 'Please upload a prescription for the prescription-only medicines in your cart.');
    if (fulfilment === 'delivery') {
      if (!addressId || !(await val('SELECT COUNT(*) FROM addresses WHERE address_id=? AND user_id=?', [addressId, userId]))) throw new HttpError(400, 'Please choose a delivery address.');
    } else addressId = null;
    const fee = fulfilment === 'delivery' ? config.deliveryFee : 0;
    const total = subtotal + fee;
    const orderId = await insert('INSERT INTO orders (customer_id,address_id,prescription_id,fulfilment_type,status,delivery_fee,total_amount) VALUES (?,?,?,?,?,?,?)',
      [userId, addressId, needsRx ? prescriptionId : null, fulfilment, 'pending', fee, total]);
    for (const i of items) await exec('INSERT INTO order_items (order_id,medicine_id,quantity,unit_price) VALUES (?,?,?,?)', [orderId, i.medicine_id, i.quantity, i.unit_price]); // price snapshot
    await exec('DELETE FROM cart_items WHERE user_id=?', [userId]);
    await audit(req, 'order_created', 'orders', orderId, `Total ${total}`, userId);
    return orderId;
  });
  return id;
}

export async function paymentStart(req, order, phone) {
  const [can, why] = orderCanPay(order);
  if (!can) throw new HttpError(400, why);
  const r = await mpesa.stkPush(phone, order.total_amount, `ORDER${order.order_id}`, `ProHealth order ${order.order_id}`);
  if (!r.ok) throw new HttpError(502, r.message);
  await exec(`INSERT INTO payments (order_id,method,phone,checkout_request_id,amount,status) VALUES (?, 'mpesa', ?, ?, ?, 'pending')
    ON DUPLICATE KEY UPDATE phone=VALUES(phone), checkout_request_id=VALUES(checkout_request_id), amount=VALUES(amount), status='pending', mpesa_receipt=NULL, paid_at=NULL`,
    [order.order_id, phone, r.checkoutRequestId, order.total_amount]);
  await audit(req, 'payment_requested', 'orders', order.order_id, `M-Pesa ${phone}`, order.customer_id);
}

/** Take stock from the batches that expire first (FEFO). Must run inside a transaction. */
async function stockDeduct(medicineId, qty) {
  const batches = await all('SELECT batch_id, quantity FROM stock_batches WHERE medicine_id=? AND quantity>0 AND expiry_date>CURDATE() ORDER BY expiry_date ASC, batch_id ASC FOR UPDATE', [medicineId]);
  for (const b of batches) {
    if (qty <= 0) break;
    const take = Math.min(qty, b.quantity);
    await exec('UPDATE stock_batches SET quantity = quantity - ? WHERE batch_id=?', [take, b.batch_id]);
    qty -= take;
  }
}
/** Record the M-Pesa result. Returns 'paid' | 'failed' | 'already' | 'stock_short'. */
export function paymentFinalize(req, orderId, success, receipt = null) {
  return transaction(async () => {
    const pay = await one('SELECT * FROM payments WHERE order_id=? FOR UPDATE', [orderId]);
    if (!pay || pay.status === 'success') return 'already'; // duplicate callbacks are ignored
    if (!success) { await exec("UPDATE payments SET status='failed' WHERE order_id=?", [orderId]); await audit(req, 'payment_failed', 'orders', orderId, null, null); return 'failed'; }
    const order = await one('SELECT * FROM orders WHERE order_id=? FOR UPDATE', [orderId]);
    const items = await all('SELECT medicine_id, quantity FROM order_items WHERE order_id=?', [orderId]);
    for (const it of items) {   // check every line first so we never deduct part of an order
      const rows = await all('SELECT quantity FROM stock_batches WHERE medicine_id=? AND expiry_date>CURDATE() FOR UPDATE', [it.medicine_id]);
      if (rows.reduce((s, r) => s + r.quantity, 0) < it.quantity) {
        await exec("UPDATE payments SET status='success', mpesa_receipt=?, paid_at=NOW() WHERE order_id=?", [receipt, orderId]);
        await exec("UPDATE orders SET status='cancelled' WHERE order_id=?", [orderId]);
        await audit(req, 'payment_received_stock_short', 'orders', orderId, `REFUND NEEDED. Receipt ${receipt}`, order.customer_id);
        return 'stock_short';
      }
    }
    for (const it of items) await stockDeduct(it.medicine_id, it.quantity);
    await exec("UPDATE payments SET status='success', mpesa_receipt=?, paid_at=NOW() WHERE order_id=?", [receipt, orderId]);
    await exec("UPDATE orders SET status='paid' WHERE order_id=?", [orderId]);
    await audit(req, 'payment_success', 'orders', orderId, `Receipt ${receipt}`, order.customer_id);
    return 'paid';
  });
}
export const nextStatuses = (s) => ({ paid: ['processing', 'cancelled'], processing: ['ready', 'cancelled'], ready: ['completed', 'cancelled'], pending: ['cancelled'] }[s] ?? []);
export async function orderSetStatus(req, orderId, next) {
  const o = await one('SELECT status FROM orders WHERE order_id=?', [orderId]);
  if (!o) throw new HttpError(404, 'Order not found.');
  if (!nextStatuses(o.status).includes(next)) throw new HttpError(400, 'That status change is not allowed.');
  await exec('UPDATE orders SET status=? WHERE order_id=?', [next, orderId]);
  await audit(req, `order_status_${next}`, 'orders', orderId, `From ${o.status}`);
}
export async function prescriptionReview(req, id, approve, notes) {
  if (!approve && !notes) throw new HttpError(400, 'Please write a note for the customer explaining why the prescription was rejected.');
  const p = await one('SELECT status FROM prescriptions WHERE prescription_id=?', [id]);
  if (!p || p.status !== 'pending') throw new HttpError(400, 'This prescription has already been reviewed.');
  await transaction(async () => {
    await exec('UPDATE prescriptions SET status=?, reviewed_by=?, reviewer_notes=?, reviewed_at=NOW() WHERE prescription_id=?', [approve ? 'approved' : 'rejected', req.session.user.id, notes || null, id]);
    if (!approve) await exec("UPDATE orders SET status='cancelled' WHERE prescription_id=? AND status='pending'", [id]);
    await audit(req, approve ? 'prescription_approved' : 'prescription_rejected', 'prescriptions', id, notes || null);
  });
}
