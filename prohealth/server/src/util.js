export class HttpError extends Error { constructor(status, message, fields) { super(message); this.status = status; this.fields = fields; } }
export const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

/** 0712 345 678 / +254712345678 / 254712345678 -> 254712345678, or null. */
export function normalisePhone(p) {
  const d = String(p ?? '').replace(/[\s\-()+]/g, '');
  let m;
  if ((m = d.match(/^0([17]\d{8})$/))) return '254' + m[1];
  if ((m = d.match(/^(?:254)([17]\d{8})$/))) return '254' + m[1];
  if ((m = d.match(/^([17]\d{8})$/))) return '254' + m[1];
  return null;
}
export function passwordProblem(pw) {
  if (typeof pw !== 'string' || pw.length < 8) return 'Password must be at least 8 characters.';
  if (!/[A-Za-z]/.test(pw) || !/\d/.test(pw)) return 'Password must contain a letter and a number.';
  return null;
}
export const int = (v, d = 0) => { const n = Number.parseInt(v, 10); return Number.isFinite(n) ? n : d; };
export const str = (v) => (typeof v === 'string' ? v.trim() : '');
export const isEmail = (e) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e) && e.length <= 120;
export function paginate(total, perPage, page) {
  const pages = Math.max(1, Math.ceil(total / perPage));
  const p = Math.min(Math.max(1, page), pages);
  return { offset: (p - 1) * perPage, pages, page: p, total, perPage };
}
export function stockStatus(stock, reorder) { stock = Number(stock); return stock <= 0 ? 'out' : stock <= Number(reorder) ? 'low' : 'in_stock'; }
export const validDate = (s) => /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(s));
export function csv(header, rows) {
  const esc = (v) => { v = v == null ? '' : String(v); return /[",\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; };
  return '﻿' + [header, ...rows].map((r) => r.map(esc).join(',')).join('\r\n') + '\r\n';
}
