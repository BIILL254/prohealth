import { Router } from 'express';
import { all, one, val, exec, insert } from '../db.js';
import { wrap, HttpError, str, int, isEmail, normalisePhone, passwordProblem, paginate } from '../util.js';
import { csrfToken, passwordLogin, twoFactorLogin, startSession, userByEmail, userById, hash, createResetToken, findReset, setPassword } from '../auth.js';
import { audit } from '../audit.js';
import { config } from '../config.js';
import { searchMedicines, medicineGet, withStatus, cartCount } from '../shop.js';
import { rateLimit } from 'express-rate-limit';

const r = Router();
const limiter = rateLimit({ windowMs: 60_000, limit: 60, standardHeaders: true, legacyHeaders: false, message: { error: 'Too many requests. Please slow down.' } });

r.get('/csrf', (req, res) => res.json({ token: csrfToken(req) }));
r.get('/me', wrap(async (req, res) => {
  const u = req.session.user ?? null;
  res.json({ user: u, cartCount: u ? await cartCount(u.id) : 0, pharmacy: config.pharmacy, deliveryFee: config.deliveryFee, pending2fa: !!req.session.pending2fa });
}));

/* ---- auth ---- */
r.post('/auth/login', limiter, wrap(async (req, res) => {
  const out = await passwordLogin(req, req.body.email, req.body.password, !!req.body.staff);
  res.json(out.need2fa ? { need2fa: true } : { user: out.user });
}));
r.post('/auth/2fa', limiter, wrap(async (req, res) => res.json(await twoFactorLogin(req, req.body.code))));
r.post('/auth/logout', wrap(async (req, res) => {
  const id = req.session.user?.id;
  if (id) await audit(req, 'logout', 'users', id, null, id);
  req.session.destroy(() => res.json({ ok: true }));
}));
r.post('/auth/register', limiter, wrap(async (req, res) => {
  const name = str(req.body.full_name), email = str(req.body.email).toLowerCase(), phone = normalisePhone(req.body.phone), pw = req.body.password;
  const f = {};
  if (name.length < 2) f.full_name = 'Please enter your full name.';
  if (!isEmail(email)) f.email = 'Please enter a valid email address.'; else if (await userByEmail(email)) f.email = 'An account with this email already exists. Try logging in.';
  if (!phone) f.phone = 'Enter a valid Kenyan number, e.g. 0712 345 678.';
  const pp = passwordProblem(pw); if (pp) f.password = pp;
  if (pw !== req.body.password2) f.password2 = 'The two passwords do not match.';
  if (Object.keys(f).length) throw new HttpError(422, 'Please fix the highlighted fields.', f);
  const roleId = await val("SELECT role_id FROM roles WHERE role_name='customer'");
  const id = await insert('INSERT INTO users (role_id,full_name,email,phone,password_hash) VALUES (?,?,?,?,?)', [roleId, name, email, phone, await hash(pw)]);
  await audit(req, 'register', 'users', id, null, id);
  res.status(201).json({ ok: true });
}));
r.post('/auth/forgot', limiter, wrap(async (req, res) => {
  const u = await userByEmail(str(req.body.email));
  let devLink = null;
  if (u && u.status === 'active') {
    const token = await createResetToken(u.user_id);
    const origin = req.get('origin') || `${req.protocol}://${req.get('host')}`;
    const link = `${origin}/reset-password?token=${token}`;
    await audit(req, 'password_reset_requested', 'users', u.user_id, null, u.user_id);
    console.log(`Password reset link for ${u.email}: ${link}`); // no mail server yet: logged, and shown on screen outside production
    if (!config.production) devLink = link;
  }
  res.json({ ok: true, devLink }); // same answer whether or not the email exists
}));
r.get('/auth/reset/:token', wrap(async (req, res) => res.json({ valid: !!(await findReset(req.params.token)) })));
r.post('/auth/reset', limiter, wrap(async (req, res) => {
  const reset = await findReset(req.body.token);
  if (!reset) throw new HttpError(400, 'This reset link is invalid or has expired.');
  const pw = req.body.password; const pp = passwordProblem(pw);
  if (pp) throw new HttpError(422, pp);
  if (pw !== req.body.password2) throw new HttpError(422, 'The two passwords do not match.');
  await setPassword(reset.user_id, pw);
  await exec('UPDATE password_resets SET used=1 WHERE reset_id=?', [reset.reset_id]);
  await audit(req, 'password_reset', 'users', reset.user_id, null, reset.user_id);
  res.json({ ok: true });
}));

/* ---- catalogue ---- */
r.get('/categories', wrap(async (req, res) => res.json(await all('SELECT c.*, (SELECT COUNT(*) FROM medicines m WHERE m.category_id=c.category_id AND m.is_active=1) AS n FROM categories c ORDER BY c.name'))));
r.get('/medicines', wrap(async (req, res) => {
  const f = { q: str(req.query.q), category: int(req.query.category), type: ['otc', 'rx'].includes(req.query.type) ? req.query.type : '', max_price: Number(req.query.max_price) || 0, sort: str(req.query.sort) };
  const perPage = 12;
  const { total } = await searchMedicines(f, 1, 0);
  const pg = paginate(total, perPage, int(req.query.page, 1));
  const { rows } = await searchMedicines(f, perPage, pg.offset);
  res.json({ rows, ...pg });
}));
r.get('/medicines/new', wrap(async (req, res) => {
  const { rows } = await searchMedicines({ sort: '' }, 40, 0);
  res.json(rows.filter((m) => m.stock > 0).sort((a, b) => b.medicine_id - a.medicine_id).slice(0, 8));
}));
r.get('/medicines/:id', wrap(async (req, res) => {
  const m = await medicineGet(int(req.params.id));
  if (!m || !m.is_active) throw new HttpError(404, 'Medicine not found.');
  res.json(withStatus(m));
}));
export default r;
