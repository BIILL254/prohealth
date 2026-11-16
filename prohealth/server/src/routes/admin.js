import { Router } from 'express';
import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import { all, one, val, exec, insert } from '../db.js';
import { wrap, HttpError, str, int, isEmail, normalisePhone, passwordProblem, paginate, stockStatus, validDate, csv } from '../util.js';
import { requireStaff, requireAdmin, userByEmail, userById, hash, setPassword } from '../auth.js';
import { audit } from '../audit.js';
import * as shop from '../shop.js';
import * as totp from '../totp.js';

const r = Router();
r.use(requireStaff);
const me = (req) => req.session.user;
const PER = 15;

/* ---------------- dashboard ---------------- */
r.get('/dashboard', wrap(async (req, res) => {
  const kpi = {
    today: await val("SELECT COALESCE(SUM(amount),0) FROM payments WHERE status='success' AND DATE(paid_at)=CURDATE()"),
    openOrders: await val("SELECT COUNT(*) FROM orders WHERE status IN ('paid','processing','ready')"),
    rx: await val("SELECT COUNT(*) FROM prescriptions WHERE status='pending'"),
    low: await val(`SELECT COUNT(*) FROM (SELECT m.medicine_id FROM medicines m LEFT JOIN stock_batches b ON b.medicine_id=m.medicine_id AND b.expiry_date>=CURDATE() WHERE m.is_active=1 GROUP BY m.medicine_id, m.reorder_level HAVING COALESCE(SUM(b.quantity),0) <= m.reorder_level) x`),
    expiring: await val("SELECT COUNT(*) FROM stock_batches WHERE quantity>0 AND expiry_date BETWEEN CURDATE() AND CURDATE() + INTERVAL 60 DAY"),
  };
  const week = await all(`SELECT d.day, COALESCE(SUM(p.amount),0) AS total FROM (SELECT CURDATE() - INTERVAL n DAY AS day FROM (SELECT 0 n UNION SELECT 1 UNION SELECT 2 UNION SELECT 3 UNION SELECT 4 UNION SELECT 5 UNION SELECT 6) s) d
    LEFT JOIN payments p ON p.status='success' AND DATE(p.paid_at)=d.day GROUP BY d.day ORDER BY d.day`);
  const recent = await all('SELECT o.order_id, o.total_amount, o.status, u.full_name FROM orders o JOIN users u ON u.user_id=o.customer_id ORDER BY o.created_at DESC, o.order_id DESC LIMIT 6');
  res.json({ kpi, week, recent, pendingRx: kpi.rx });
}));
r.get('/badge', wrap(async (req, res) => res.json({ pendingRx: await val("SELECT COUNT(*) FROM prescriptions WHERE status='pending'") })));

/* ---------------- orders ---------------- */
r.get('/orders', wrap(async (req, res) => {
  const where = ['1=1']; const p = []; const status = str(req.query.status); const q = str(req.query.q);
  if (['pending', 'paid', 'processing', 'ready', 'completed', 'cancelled'].includes(status)) { where.push('o.status=?'); p.push(status); }
  if (q) { where.push('(u.full_name LIKE ? OR u.email LIKE ? OR o.order_id=?)'); p.push(`%${q}%`, `%${q}%`, int(q)); }
  const sql = ` FROM orders o JOIN users u ON u.user_id=o.customer_id WHERE ${where.join(' AND ')}`;
  const pg = paginate(await val(`SELECT COUNT(*)${sql}`, p), PER, int(req.query.page, 1));
  res.json({ rows: await all(`SELECT o.*, u.full_name${sql} ORDER BY o.created_at DESC, o.order_id DESC LIMIT ${PER} OFFSET ${pg.offset}`, p), ...pg });
}));
r.get('/orders/:id', wrap(async (req, res) => {
  const o = await shop.orderGet(int(req.params.id));
  if (!o) throw new HttpError(404, 'Order not found.');
  res.json({ order: o, items: await shop.orderItems(o.order_id), next: shop.nextStatuses(o.status) });
}));
r.post('/orders/:id/status', wrap(async (req, res) => { await shop.orderSetStatus(req, int(req.params.id), str(req.body.status)); res.json({ ok: true }); }));

/* ---------------- prescriptions ---------------- */
r.get('/prescriptions', wrap(async (req, res) => {
  const s = ['pending', 'approved', 'rejected', 'all'].includes(req.query.status) ? req.query.status : 'pending';
  res.json(await all(`SELECT p.*, u.full_name, o.order_id, r.full_name AS reviewer FROM prescriptions p JOIN users u ON u.user_id=p.customer_id
    LEFT JOIN orders o ON o.prescription_id=p.prescription_id LEFT JOIN users r ON r.user_id=p.reviewed_by WHERE (?='all' OR p.status=?) ORDER BY p.uploaded_at DESC LIMIT 100`, [s, s]));
}));
r.post('/prescriptions/:id/review', wrap(async (req, res) => { await shop.prescriptionReview(req, int(req.params.id), req.body.decision === 'approve', str(req.body.notes)); res.json({ ok: true }); }));

/* ---------------- inventory ---------------- */
r.get('/inventory', wrap(async (req, res) => {
  const filter = str(req.query.filter), q = str(req.query.q);
  const lists = { medicines: await all('SELECT medicine_id, name FROM medicines ORDER BY name'), suppliers: await all('SELECT supplier_id, name FROM suppliers ORDER BY name') };
  if (filter === 'low') {
    const low = await all(`SELECT m.name, m.reorder_level, COALESCE(SUM(b.quantity),0) AS stock FROM medicines m LEFT JOIN stock_batches b ON b.medicine_id=m.medicine_id AND b.expiry_date>=CURDATE()
      WHERE m.is_active=1 GROUP BY m.medicine_id, m.name, m.reorder_level HAVING stock <= m.reorder_level ORDER BY stock`);
    return res.json({ low, batches: [], ...lists });
  }
  let sql = `SELECT b.*, m.name AS medicine, s.name AS supplier, DATEDIFF(b.expiry_date, CURDATE()) AS days_left FROM stock_batches b JOIN medicines m ON m.medicine_id=b.medicine_id JOIN suppliers s ON s.supplier_id=b.supplier_id WHERE 1=1`;
  const p = [];
  if (q) { sql += ' AND (m.name LIKE ? OR b.batch_number LIKE ?)'; p.push(`%${q}%`, `%${q}%`); }
  if (filter === 'expiring') sql += ' AND b.quantity>0 AND b.expiry_date BETWEEN CURDATE() AND CURDATE() + INTERVAL 60 DAY';
  if (filter === 'expired') sql += ' AND b.quantity>0 AND b.expiry_date < CURDATE()';
  res.json({ batches: await all(`${sql} ORDER BY b.expiry_date LIMIT 200`, p), low: [], ...lists });
}));
r.post('/inventory', wrap(async (req, res) => {
  const b = req.body; const f = [];
  const mid = int(b.medicine_id), sid = int(b.supplier_id), qty = int(b.quantity), cost = Number(b.cost_price), bn = str(b.batch_number), exp = str(b.expiry_date), recv = str(b.received_date) || new Date().toISOString().slice(0, 10);
  if (!(await val('SELECT COUNT(*) FROM medicines WHERE medicine_id=?', [mid]))) f.push('Choose a medicine.');
  if (!(await val('SELECT COUNT(*) FROM suppliers WHERE supplier_id=?', [sid]))) f.push('Choose a supplier.');
  if (!bn) f.push('Batch number is required.');
  if (!(qty >= 1)) f.push('Quantity must be a whole number above 0.');
  if (!(cost >= 0) || b.cost_price === '' || b.cost_price == null) f.push('Enter a cost price of 0 or more.');
  if (!validDate(exp)) f.push('Enter a valid expiry date.'); else if (exp <= new Date().toISOString().slice(0, 10)) f.push('This batch is already expired, so it cannot be added.');
  if (f.length) throw new HttpError(422, f.join(' '));
  try {
    const id = await insert('INSERT INTO stock_batches (medicine_id,supplier_id,batch_number,quantity,cost_price,received_date,expiry_date) VALUES (?,?,?,?,?,?,?)', [mid, sid, bn, qty, cost, recv, exp]);
    await audit(req, 'stock_received', 'stock_batches', id, `Qty ${qty}, batch ${bn}`);
  } catch (e) { if (e.code === 'ER_DUP_ENTRY') throw new HttpError(409, 'That batch number already exists for this medicine.'); throw e; }
  res.status(201).json({ ok: true });
}));
r.put('/inventory/:id', wrap(async (req, res) => {
  const qty = Number(req.body.quantity);
  if (!Number.isInteger(qty) || qty < 0) throw new HttpError(422, 'Quantity must be a whole number.');
  await exec('UPDATE stock_batches SET quantity=? WHERE batch_id=?', [qty, int(req.params.id)]);
  await audit(req, 'stock_adjusted', 'stock_batches', int(req.params.id), `Set to ${qty}`);
  res.json({ ok: true });
}));

/* ---------------- medicines ---------------- */
r.get('/medicines', wrap(async (req, res) => {
  const q = str(req.query.q), cat = int(req.query.category); const where = ['1=1']; const p = [];
  if (q) { where.push('(m.name LIKE ? OR m.generic_name LIKE ?)'); p.push(`%${q}%`, `%${q}%`); }
  if (cat) { where.push('m.category_id=?'); p.push(cat); }
  const order = { price: 'm.unit_price DESC', stock: 'stock' }[req.query.sort] ?? 'm.name';
  const base = `SELECT m.*, c.name AS category_name, (SELECT COALESCE(SUM(quantity),0) FROM stock_batches b WHERE b.medicine_id=m.medicine_id AND b.expiry_date>=CURDATE()) AS stock FROM medicines m JOIN categories c ON c.category_id=m.category_id WHERE ${where.join(' AND ')}`;
  const pg = paginate(await val(`SELECT COUNT(*) FROM (${base}) t`, p), PER, int(req.query.page, 1));
  const rows = (await all(`${base} ORDER BY ${order} LIMIT ${PER} OFFSET ${pg.offset}`, p)).map((m) => ({ ...m, stock_status: stockStatus(m.stock, m.reorder_level) }));
  res.json({ rows, ...pg });
}));
r.get('/medicines/:id', wrap(async (req, res) => { const m = await one('SELECT * FROM medicines WHERE medicine_id=?', [int(req.params.id)]); if (!m) throw new HttpError(404, 'Not found.'); res.json(m); }));
async function saveMedicine(req, res, id) {
  const b = req.body; const f = {};
  const d = { category_id: int(b.category_id), name: str(b.name), generic: str(b.generic_name) || null, desc: str(b.description) || null, price: Number(b.unit_price), rx: b.requires_prescription ? 1 : 0, reorder: Number(b.reorder_level ?? 10), active: b.is_active ? 1 : 0 };
  if (!d.name) f.name = 'Name is required.';
  if (!(await val('SELECT COUNT(*) FROM categories WHERE category_id=?', [d.category_id]))) f.category_id = 'Choose a category.';
  if (!(d.price >= 0) || b.unit_price === '' || b.unit_price == null) f.unit_price = 'Enter a price of 0 or more.';
  if (!Number.isInteger(d.reorder) || d.reorder < 0) f.reorder_level = 'Reorder level must be a whole number.';
  if (Object.keys(f).length) throw new HttpError(422, 'Please fix the highlighted fields.', f);
  if (id) { await exec('UPDATE medicines SET category_id=?,name=?,generic_name=?,description=?,unit_price=?,requires_prescription=?,reorder_level=?,is_active=? WHERE medicine_id=?', [d.category_id, d.name, d.generic, d.desc, d.price, d.rx, d.reorder, d.active, id]); await audit(req, 'medicine_updated', 'medicines', id, d.name); }
  else { id = await insert('INSERT INTO medicines (category_id,name,generic_name,description,unit_price,requires_prescription,reorder_level,is_active) VALUES (?,?,?,?,?,?,?,?)', [d.category_id, d.name, d.generic, d.desc, d.price, d.rx, d.reorder, d.active]); await audit(req, 'medicine_created', 'medicines', id, d.name); }
  res.json({ ok: true, id });
}
r.post('/medicines', wrap((req, res) => saveMedicine(req, res, 0)));
r.put('/medicines/:id', wrap((req, res) => saveMedicine(req, res, int(req.params.id))));
r.delete('/medicines/:id', wrap(async (req, res) => {
  const id = int(req.params.id);
  const used = await val('SELECT (SELECT COUNT(*) FROM order_items WHERE medicine_id=?) + (SELECT COUNT(*) FROM stock_batches WHERE medicine_id=?) + (SELECT COUNT(*) FROM cart_items WHERE medicine_id=?)', [id, id, id]);
  if (used > 0) throw new HttpError(409, 'This medicine has orders, stock or cart entries, so it cannot be deleted. Deactivate it instead.');
  await exec('DELETE FROM medicines WHERE medicine_id=?', [id]); await audit(req, 'medicine_deleted', 'medicines', id);
  res.json({ ok: true });
}));

/* ---------------- categories ---------------- */
r.get('/categories', wrap(async (req, res) => res.json(await all('SELECT c.*, (SELECT COUNT(*) FROM medicines m WHERE m.category_id=c.category_id) AS n FROM categories c ORDER BY c.name'))));
const dupMsg = (e, m) => { if (e.code === 'ER_DUP_ENTRY') throw new HttpError(409, m); throw e; };
r.post('/categories', wrap(async (req, res) => {
  const name = str(req.body.name); if (!name) throw new HttpError(422, 'Category name is required.');
  try { const id = await insert('INSERT INTO categories (name,description) VALUES (?,?)', [name, str(req.body.description) || null]); await audit(req, 'category_created', 'categories', id, name); } catch (e) { dupMsg(e, 'A category with that name already exists.'); }
  res.status(201).json({ ok: true });
}));
r.put('/categories/:id', wrap(async (req, res) => {
  const name = str(req.body.name); if (!name) throw new HttpError(422, 'Category name is required.');
  try { await exec('UPDATE categories SET name=?, description=? WHERE category_id=?', [name, str(req.body.description) || null, int(req.params.id)]); await audit(req, 'category_updated', 'categories', int(req.params.id), name); } catch (e) { dupMsg(e, 'A category with that name already exists.'); }
  res.json({ ok: true });
}));
r.delete('/categories/:id', wrap(async (req, res) => {
  const id = int(req.params.id);
  if (await val('SELECT COUNT(*) FROM medicines WHERE category_id=?', [id])) throw new HttpError(409, 'This category still has medicines, so it cannot be deleted.');
  await exec('DELETE FROM categories WHERE category_id=?', [id]); await audit(req, 'category_deleted', 'categories', id); res.json({ ok: true });
}));

/* ---------------- suppliers ---------------- */
r.get('/suppliers', wrap(async (req, res) => res.json(await all('SELECT * FROM suppliers WHERE name LIKE ? ORDER BY name', [`%${str(req.query.q)}%`]))));
function supplierData(b) {
  const name = str(b.name), phone = normalisePhone(b.phone), email = str(b.email) || null;
  if (!name) throw new HttpError(422, 'Supplier name is required.');
  if (!phone) throw new HttpError(422, 'Enter a valid phone number.');
  if (email && !isEmail(email)) throw new HttpError(422, 'Enter a valid email address.');
  return [name, phone, email, str(b.address) || null];
}
r.post('/suppliers', wrap(async (req, res) => { const d = supplierData(req.body); const id = await insert('INSERT INTO suppliers (name,phone,email,address) VALUES (?,?,?,?)', d); await audit(req, 'supplier_created', 'suppliers', id, d[0]); res.status(201).json({ ok: true }); }));
r.put('/suppliers/:id', wrap(async (req, res) => { const d = supplierData(req.body); await exec('UPDATE suppliers SET name=?,phone=?,email=?,address=? WHERE supplier_id=?', [...d, int(req.params.id)]); await audit(req, 'supplier_updated', 'suppliers', int(req.params.id), d[0]); res.json({ ok: true }); }));
r.delete('/suppliers/:id', wrap(async (req, res) => {
  const id = int(req.params.id);
  if (await val('SELECT COUNT(*) FROM stock_batches WHERE supplier_id=?', [id])) throw new HttpError(409, 'This supplier has stock batches, so it cannot be deleted.');
  await exec('DELETE FROM suppliers WHERE supplier_id=?', [id]); await audit(req, 'supplier_deleted', 'suppliers', id); res.json({ ok: true });
}));

/* ---------------- users (admin only) ---------------- */
r.get('/users', requireAdmin, wrap(async (req, res) => {
  const q = `%${str(req.query.q)}%`; const role = int(req.query.role); const where = ['(u.full_name LIKE ? OR u.email LIKE ?)']; const p = [q, q];
  if (role) { where.push('u.role_id=?'); p.push(role); }
  res.json({ rows: await all(`SELECT u.user_id,u.full_name,u.email,u.phone,u.status,u.two_factor_enabled,u.created_at,u.role_id,r.role_name FROM users u JOIN roles r ON r.role_id=u.role_id WHERE ${where.join(' AND ')} ORDER BY u.created_at DESC LIMIT 200`, p), roles: await all('SELECT * FROM roles ORDER BY role_id') });
}));
r.post('/users', requireAdmin, wrap(async (req, res) => {
  const b = req.body; const name = str(b.full_name), email = str(b.email).toLowerCase(), phone = normalisePhone(b.phone), role = int(b.role_id); const f = [];
  if (name.length < 2) f.push('Enter the full name.');
  if (!isEmail(email)) f.push('Enter a valid email.'); else if (await userByEmail(email)) f.push('That email is already registered.');
  if (!phone) f.push('Enter a valid phone number.');
  if (!(await val('SELECT COUNT(*) FROM roles WHERE role_id=?', [role]))) f.push('Choose a role.');
  const pp = passwordProblem(b.password); if (pp) f.push(pp);
  if (f.length) throw new HttpError(422, f.join(' '));
  const id = await insert('INSERT INTO users (role_id,full_name,email,phone,password_hash) VALUES (?,?,?,?,?)', [role, name, email, phone, await hash(b.password)]);
  await audit(req, 'user_created', 'users', id, email); res.status(201).json({ ok: true });
}));
r.put('/users/:id/role', requireAdmin, wrap(async (req, res) => {
  const id = int(req.params.id), role = int(req.body.role_id);
  if (id === me(req).id) throw new HttpError(400, 'You cannot change your own role or suspend yourself.');
  if (!(await val('SELECT COUNT(*) FROM roles WHERE role_id=?', [role]))) throw new HttpError(422, 'Choose a role.');
  await exec('UPDATE users SET role_id=? WHERE user_id=?', [role, id]); await audit(req, 'user_role_changed', 'users', id, `role ${role}`); res.json({ ok: true });
}));
r.put('/users/:id/status', requireAdmin, wrap(async (req, res) => {
  const id = int(req.params.id);
  if (id === me(req).id) throw new HttpError(400, 'You cannot change your own role or suspend yourself.');
  const s = req.body.status === 'suspended' ? 'suspended' : 'active';
  await exec('UPDATE users SET status=? WHERE user_id=?', [s, id]); await audit(req, s === 'suspended' ? 'user_suspend' : 'user_activate', 'users', id); res.json({ ok: true });
}));
r.post('/users/:id/reset-password', requireAdmin, wrap(async (req, res) => {
  const id = int(req.params.id); const u = await userById(id); if (!u) throw new HttpError(404, 'User not found.');
  const pw = 'Ph' + crypto.randomBytes(4).toString('hex') + '9';
  await setPassword(id, pw); await audit(req, 'password_reset_by_admin', 'users', id);
  res.json({ email: u.email, password: pw }); // shown once to the admin
}));

/* ---------------- reports ---------------- */
const REPORTS = {
  sales: { title: 'Daily sales', cols: { date: 'Date', orders: 'Paid orders', total: 'Sales (KES)' }, defSort: 'date', dated: true,
    sql: (s, d) => `SELECT DATE(paid_at) AS date, COUNT(*) AS orders, SUM(amount) AS total FROM payments WHERE status='success' AND DATE(paid_at) BETWEEN ? AND ? GROUP BY DATE(paid_at) ORDER BY ${s} ${d}`,
    summary: (rows) => `Total sales: KES ${rows.reduce((a, r) => a + Number(r.total), 0).toLocaleString('en-KE')} from ${rows.reduce((a, r) => a + r.orders, 0)} paid orders` },
  top: { title: 'Top selling medicines', cols: { medicine: 'Medicine', category: 'Category', units: 'Units sold', revenue: 'Revenue (KES)' }, defSort: 'units', dated: true,
    sql: (s, d) => `SELECT m.name AS medicine, c.name AS category, SUM(oi.quantity) AS units, SUM(oi.quantity*oi.unit_price) AS revenue FROM order_items oi JOIN orders o ON o.order_id=oi.order_id JOIN medicines m ON m.medicine_id=oi.medicine_id JOIN categories c ON c.category_id=m.category_id WHERE o.status IN ('paid','processing','ready','completed') AND DATE(o.created_at) BETWEEN ? AND ? GROUP BY m.medicine_id,m.name,c.name ORDER BY ${s} ${d} LIMIT 50`,
    summary: (rows) => `Units sold: ${rows.reduce((a, r) => a + Number(r.units), 0)}` },
  orders: { title: 'Orders', cols: { id: 'Order', created: 'Date', customer: 'Customer', type: 'Type', status: 'Status', total: 'Total (KES)' }, defSort: 'created', dated: true,
    sql: (s, d) => `SELECT o.order_id AS id, o.created_at AS created, u.full_name AS customer, o.fulfilment_type AS type, o.status, o.total_amount AS total FROM orders o JOIN users u ON u.user_id=o.customer_id WHERE DATE(o.created_at) BETWEEN ? AND ? ORDER BY ${s} ${d}`,
    summary: (rows) => `${rows.length} orders, value KES ${rows.reduce((a, r) => a + Number(r.total), 0).toLocaleString('en-KE')}` },
  inventory: { title: 'Stock levels', cols: { medicine: 'Medicine', category: 'Category', stock: 'In stock', reorder: 'Reorder level', value: 'Stock value (KES)' }, defSort: 'medicine', defDir: 'asc',
    sql: (s, d) => `SELECT m.name AS medicine, c.name AS category, COALESCE(SUM(b.quantity),0) AS stock, m.reorder_level AS reorder, COALESCE(SUM(b.quantity*b.cost_price),0) AS value FROM medicines m JOIN categories c ON c.category_id=m.category_id LEFT JOIN stock_batches b ON b.medicine_id=m.medicine_id AND b.expiry_date>=CURDATE() WHERE m.is_active=1 GROUP BY m.medicine_id,m.name,c.name,m.reorder_level ORDER BY ${s} ${d}`,
    summary: (rows) => `Stock value at cost: KES ${rows.reduce((a, r) => a + Number(r.value), 0).toLocaleString('en-KE')}` },
  expiry: { title: 'Expiry report', cols: { medicine: 'Medicine', batch: 'Batch', supplier: 'Supplier', expiry: 'Expiry date', qty: 'Quantity', days: 'Days left' }, defSort: 'expiry', defDir: 'asc',
    sql: (s, d) => `SELECT m.name AS medicine, b.batch_number AS batch, s.name AS supplier, b.expiry_date AS expiry, b.quantity AS qty, DATEDIFF(b.expiry_date,CURDATE()) AS days FROM stock_batches b JOIN medicines m ON m.medicine_id=b.medicine_id JOIN suppliers s ON s.supplier_id=b.supplier_id WHERE b.quantity>0 AND b.expiry_date <= CURDATE() + INTERVAL 90 DAY ORDER BY ${s} ${d}`,
    summary: (rows) => `Batches expired or expiring within 90 days: ${rows.length} (${rows.reduce((a, r) => a + Number(r.qty), 0)} units)` },
};
r.get('/reports', wrap(async (req, res) => {
  const type = REPORTS[req.query.type] ? req.query.type : 'sales'; const R = REPORTS[type];
  const today = new Date().toISOString().slice(0, 10);
  let from = str(req.query.from), to = str(req.query.to);
  if (!validDate(from)) from = new Date(Date.now() - 30 * 864e5).toISOString().slice(0, 10);
  if (!validDate(to)) to = today;
  const sort = R.cols[req.query.sort] !== undefined ? req.query.sort : R.defSort;      // sort column must be one of the known columns
  const dir = (req.query.dir ?? R.defDir ?? 'desc') === 'asc' ? 'ASC' : 'DESC';
  const rows = await all(R.sql(sort, dir), R.dated ? [from, to] : []);
  await audit(req, 'report_viewed', 'reports', null, `${type}${req.query.export ? ' (CSV)' : ''}`);
  if (req.query.export === 'csv') {
    res.set({ 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': `attachment; filename="prohealth-${type}-${today.replaceAll('-', '')}.csv"` });
    return res.send(csv(Object.values(R.cols), rows.map((x) => Object.keys(R.cols).map((k) => x[k]))));
  }
  res.json({ type, title: R.title, cols: R.cols, rows, sort, dir: dir.toLowerCase(), from: R.dated ? from : null, to: R.dated ? to : null, summary: R.summary(rows), types: Object.fromEntries(Object.entries(REPORTS).map(([k, v]) => [k, v.title])), generatedBy: me(req).name });
}));

/* ---------------- audit log (admin only) ---------------- */
r.get('/audit', requireAdmin, wrap(async (req, res) => {
  const where = ['1=1']; const p = []; const q = str(req.query.q), action = str(req.query.action), from = str(req.query.from), to = str(req.query.to);
  if (q) { where.push('(u.full_name LIKE ? OR l.details LIKE ? OR l.ip_address LIKE ?)'); p.push(`%${q}%`, `%${q}%`, `%${q}%`); }
  if (action) { where.push('l.action=?'); p.push(action); }
  if (validDate(from)) { where.push('l.created_at >= ?'); p.push(`${from} 00:00:00`); }
  if (validDate(to)) { where.push('l.created_at <= ?'); p.push(`${to} 23:59:59`); }
  const sql = ` FROM audit_logs l LEFT JOIN users u ON u.user_id=l.user_id WHERE ${where.join(' AND ')}`;
  if (req.query.export === 'csv') {
    const rows = await all(`SELECT l.created_at, u.full_name, l.action, l.table_name, l.record_id, l.details, l.ip_address${sql} ORDER BY l.log_id DESC LIMIT 5000`, p);
    res.set({ 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': `attachment; filename="audit-log.csv"` });
    return res.send(csv(['When', 'User', 'Action', 'Table', 'Record', 'Details', 'IP'], rows.map(Object.values)));
  }
  const pg = paginate(await val(`SELECT COUNT(*)${sql}`, p), 25, int(req.query.page, 1));
  res.json({ rows: await all(`SELECT l.*, u.full_name${sql} ORDER BY l.log_id DESC LIMIT 25 OFFSET ${pg.offset}`, p), actions: (await all('SELECT DISTINCT action FROM audit_logs ORDER BY action')).map((a) => a.action), ...pg });
}));

/* ---------------- account security (2FA) ---------------- */
r.get('/security', wrap(async (req, res) => {
  const u = await userById(me(req).id);
  if (u.two_factor_enabled) return res.json({ enabled: true });
  const secret = (req.session.new2fa ??= totp.newSecret());
  res.json({ enabled: false, secret, qr: await totp.qrDataUrl(secret, u.email) });
}));
r.post('/security/enable', wrap(async (req, res) => {
  const secret = req.session.new2fa;
  if (!secret || !totp.verify(secret, req.body.code)) throw new HttpError(400, 'That code is not correct. Scan the QR code again and try the new code.');
  await exec('UPDATE users SET two_factor_secret=?, two_factor_enabled=1 WHERE user_id=?', [secret, me(req).id]);
  delete req.session.new2fa; await audit(req, '2fa_enabled', 'users', me(req).id); res.json({ ok: true });
}));
r.post('/security/disable', wrap(async (req, res) => {
  const u = await userById(me(req).id);
  if (!(await bcrypt.compare(String(req.body.password ?? ''), u.password_hash))) throw new HttpError(400, 'Your password is not correct.');
  await exec('UPDATE users SET two_factor_secret=NULL, two_factor_enabled=0 WHERE user_id=?', [u.user_id]); await audit(req, '2fa_disabled', 'users', u.user_id); res.json({ ok: true });
}));
export default r;
