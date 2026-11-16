// Time-based one-time passwords (RFC 6238), as used by Google Authenticator and similar apps.
import crypto from 'node:crypto';
import QRCode from 'qrcode';

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
function b32encode(buf) { let bits = '', out = ''; for (const b of buf) bits += b.toString(2).padStart(8, '0'); for (let i = 0; i < bits.length; i += 5) out += ALPHABET[parseInt(bits.slice(i, i + 5).padEnd(5, '0'), 2)]; return out; }
function b32decode(s) { let bits = ''; for (const c of s.replace(/=+$/, '').toUpperCase()) { const i = ALPHABET.indexOf(c); if (i < 0) return Buffer.alloc(0); bits += i.toString(2).padStart(5, '0'); } const out = []; for (let i = 0; i + 8 <= bits.length; i += 8) out.push(parseInt(bits.slice(i, i + 8), 2)); return Buffer.from(out); }

export const newSecret = () => b32encode(crypto.randomBytes(20));
export function currentCode(secret, time = Date.now()) {
  const counter = Buffer.alloc(8); counter.writeBigUInt64BE(BigInt(Math.floor(time / 30000)));
  const h = crypto.createHmac('sha1', b32decode(secret)).update(counter).digest();
  const o = h[h.length - 1] & 0xf;
  return String(((h.readUInt32BE(o) & 0x7fffffff) % 1_000_000)).padStart(6, '0');
}
export function verify(secret, code) {
  code = String(code ?? '').replace(/\D/g, '');
  if (!secret || code.length !== 6) return false;
  return [-1, 0, 1].some((step) => { const a = Buffer.from(currentCode(secret, Date.now() + step * 30000)); const b = Buffer.from(code); return crypto.timingSafeEqual(a, b); }); // ±30 s for clock drift
}
export const qrDataUrl = (secret, email) => QRCode.toDataURL(`otpauth://totp/ProHealth:${encodeURIComponent(email)}?secret=${secret}&issuer=ProHealth&digits=6&period=30`, { margin: 1, width: 220 });
