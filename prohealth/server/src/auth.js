import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import { all, one, val, exec, insert } from './db.js';
import { config } from './config.js';
import { audit } from './audit.js';
import { HttpError } from './util.js';
import * as totp from './totp.js';

const DUMMY_HASH = bcrypt.hashSync('not-a-real-password', 10);
export const STAFF = ['admin', 'pharmacist'];
export const userByEmail = (e) => one('SELECT u.*, r.role_name FROM users u JOIN roles r ON r.role_id=u.role_id WHERE u.email=?', [String(e).toLowerCase()]);
export const userById = (id) => one('SELECT u.*, r.role_name FROM users u JOIN roles r ON r.role_id=u.role_id WHERE u.user_id=?', [id]);
export const hash = (pw) => bcrypt.hash(pw, 10);

/* ---------- CSRF: token kept in the session, sent back by the page in a header ---------- */
export function csrfToken(req) { return (req.session.csrf ??= crypto.randomBytes(24).toString('hex')); }
export function csrfGuard(req, res, next) {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method) || req.path === '/mpesa/callback') return next();
  const sent = req.get('x-csrf-token') || '';
  const real = req.session.csrf || '';
  if (!real || sent.length !== real.length || !crypto.timingSafeEqual(Buffer.from(sent), Buffer.from(real))) {
    return next(new HttpError(403, 'Your session expired. Please refresh the page and try again.'));
  }
  next();
}

/* ---------- guards ---------- */
export function requireLogin(req, res, next) { if (!req.session.user) return next(new HttpError(401, 'Please log in to continue.')); next(); }
export const requireRole = (...roles) => (req, res, next) => {
  const u = req.session.user;
  if (!u) return next(new HttpError(401, 'Please log in with a staff account.'));
  if (!roles.includes(u.role)) return next(new HttpError(403, 'Your role does not allow you to do this.'));
  next();
};
export const requireStaff = requireRole(...STAFF);
export const requireAdmin = requireRole('admin');

/* ---------- login (with throttling and optional 2FA) ---------- */
export async function loginBlocked(req, email) {
  const n = await val(`SELECT COUNT(*) FROM audit_logs WHERE action='login_failed' AND created_at > (NOW() - INTERVAL ? MINUTE) AND (details LIKE ? OR ip_address = ?)`,
    [config.lockoutMinutes, `${String(email).toLowerCase()}%`, req.ip]);
  return n >= config.maxLoginAttempts;
}
export function startSession(req, user) {
  return new Promise((resolve, reject) => req.session.regenerate((err) => {
    if (err) return reject(err);
    req.session.user = { id: user.user_id, name: user.full_name, email: user.email, role: user.role_name };
    resolve();
  }));
}
/** Returns {user} | {need2fa:true} | throws HttpError. */
export async function passwordLogin(req, email, password, staffOnly) {
  email = String(email ?? '').trim().toLowerCase();
  if (await loginBlocked(req, email)) throw new HttpError(429, `Too many failed attempts. Please wait ${config.lockoutMinutes} minutes and try again.`);
  const u = await userByEmail(email);
  const ok = await bcrypt.compare(String(password ?? ''), u?.password_hash ?? DUMMY_HASH); // always compare: same timing for unknown emails
  if (!u || !ok) { await audit(req, 'login_failed', 'users', u?.user_id, email, u?.user_id ?? null); throw new HttpError(401, 'Incorrect email or password.'); }
  if (u.status !== 'active') throw new HttpError(403, 'This account is suspended. Please contact the pharmacy.');
  if (staffOnly && !STAFF.includes(u.role_name)) { await audit(req, 'login_failed', 'users', u.user_id, `${email} (non-staff on staff login)`, u.user_id); throw new HttpError(401, 'Incorrect email or password.'); }
  if (u.two_factor_enabled && u.two_factor_secret) {
    req.session.pending2fa = { userId: u.user_id, expires: Date.now() + 5 * 60_000, staffOnly: !!staffOnly };
    return { need2fa: true };
  }
  await startSession(req, u);
  await audit(req, 'login', 'users', u.user_id, null, u.user_id);
  return { user: req.session.user };
}
export async function twoFactorLogin(req, code) {
  const p = req.session.pending2fa;
  if (!p || p.expires < Date.now()) { delete req.session.pending2fa; throw new HttpError(400, 'Your sign-in took too long. Please start again.'); }
  const u = await userById(p.userId);
  if (await loginBlocked(req, u.email)) throw new HttpError(429, 'Too many failed attempts. Please wait a few minutes and try again.');
  if (!totp.verify(u.two_factor_secret, code)) { await audit(req, 'login_failed', 'users', u.user_id, `${u.email} (2FA code)`, u.user_id); throw new HttpError(401, 'That code is not correct. Please try again.'); }
  await startSession(req, u);
  await audit(req, 'login', 'users', u.user_id, null, u.user_id);
  return { user: req.session.user };
}

/* ---------- password reset tokens (only the hash is stored) ---------- */
export async function createResetToken(userId) {
  const token = crypto.randomBytes(32).toString('hex');
  await exec('UPDATE password_resets SET used=1 WHERE user_id=? AND used=0', [userId]);
  await exec('INSERT INTO password_resets (user_id, token_hash, expires_at) VALUES (?,?,(NOW() + INTERVAL 1 HOUR))', [userId, crypto.createHash('sha256').update(token).digest('hex')]);
  return token;
}
export const findReset = (token) => /^[a-f0-9]{64}$/.test(token ?? '')
  ? one('SELECT * FROM password_resets WHERE token_hash=? AND used=0 AND expires_at > NOW()', [crypto.createHash('sha256').update(token).digest('hex')]) : null;
export const setPassword = async (userId, pw) => exec('UPDATE users SET password_hash=? WHERE user_id=?', [await hash(pw), userId]);
