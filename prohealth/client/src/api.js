// Small fetch wrapper: JSON in/out, CSRF token on every change, friendly errors.
let csrf = null;
export class ApiError extends Error { constructor(status, message, fields) { super(message); this.status = status; this.fields = fields || {}; } }

async function token(force = false) {
  if (!csrf || force) csrf = (await (await fetch('/api/csrf', { credentials: 'same-origin' })).json()).token;
  return csrf;
}
export function resetToken() { csrf = null; }

async function request(method, url, body, retry = true) {
  const opts = { method, credentials: 'same-origin', headers: {} };
  if (method !== 'GET') opts.headers['X-CSRF-Token'] = await token();
  if (body instanceof FormData) opts.body = body;
  else if (body !== undefined) { opts.headers['Content-Type'] = 'application/json'; opts.body = JSON.stringify(body); }
  let res;
  try { res = await fetch(url, opts); } catch { throw new ApiError(0, 'Could not reach the server. Check your connection and try again.'); }
  const data = res.headers.get('content-type')?.includes('json') ? await res.json() : await res.text();
  if (!res.ok) {
    if (res.status === 403 && retry && /session expired/i.test(data?.error ?? '')) { await token(true); return request(method, url, body, false); }
    throw new ApiError(res.status, data?.error || 'Something went wrong. Please try again.', data?.fields);
  }
  return data;
}
export const api = {
  get: (u) => request('GET', u), post: (u, b) => request('POST', u, b ?? {}), put: (u, b) => request('PUT', u, b ?? {}), del: (u) => request('DELETE', u),
};
export const qs = (o) => { const p = new URLSearchParams(); Object.entries(o).forEach(([k, v]) => { if (v !== '' && v != null && v !== 0) p.set(k, v); }); const s = p.toString(); return s ? `?${s}` : ''; };
