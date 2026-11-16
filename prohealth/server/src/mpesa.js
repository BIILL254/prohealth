import crypto from 'node:crypto';
import { config } from './config.js';
import { normalisePhone } from './util.js';

const MODES = new Set(['simulate', 'sandbox', 'live']);
const TRANSACTION_TYPES = new Set(['CustomerPayBillOnline', 'CustomerBuyGoodsOnline']);
const base = () => config.mpesa.mode === 'live' ? 'https://api.safaricom.co.ke' : 'https://sandbox.safaricom.co.ke';
export const mode = () => config.mpesa.mode;

function timestampNairobi() {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Africa/Nairobi', year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23',
  }).formatToParts(new Date());
  const p = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  return `${p.year}${p.month}${p.day}${p.hour}${p.minute}${p.second}`;
}

async function token() {
  const { key, secret } = config.mpesa;
  const auth = Buffer.from(`${key}:${secret}`).toString('base64');
  const r = await fetch(`${base()}/oauth/v1/generate?grant_type=client_credentials`, {
    headers: { Authorization: `Basic ${auth}` }, signal: AbortSignal.timeout(20000),
  });
  const body = await r.json().catch(() => ({}));
  if (!r.ok || !body.access_token) {
    console.error('Daraja OAuth failed', { status: r.status, error: body.error, message: body.errorMessage });
    return null;
  }
  return body.access_token;
}

/** Ask M-Pesa to show the payment prompt. Returns {ok, checkoutRequestId, message}. */
export async function stkPush(phone, amount, reference, description) {
  const msisdn = normalisePhone(phone);
  if (!msisdn) return { ok: false, message: 'Please enter a valid Safaricom number, for example 0712 345 678.' };
  if (!Number.isSafeInteger(Number(amount)) || Number(amount) < 1) {
    return { ok: false, message: 'M-Pesa requires a whole amount in KES. Adjust the medicine price or delivery fee and try again.' };
  }
  if (config.mpesa.mode === 'simulate') return { ok: true, checkoutRequestId: 'SIM-' + crypto.randomBytes(8).toString('hex').toUpperCase() };

  const m = config.mpesa;
  if (!MODES.has(m.mode) || !m.key || !m.secret || !m.shortcode || !m.passkey || !m.callbackUrl) {
    return { ok: false, message: 'Daraja is not fully configured. Check the M-Pesa settings in server/.env.' };
  }
  if (!TRANSACTION_TYPES.has(m.transactionType)) {
    return { ok: false, message: 'Choose CustomerPayBillOnline or CustomerBuyGoodsOnline for MPESA_TRANSACTION_TYPE.' };
  }
  try {
    const callback = new URL(m.callbackUrl);
    if (callback.protocol !== 'https:') return { ok: false, message: 'Daraja needs a public HTTPS callback URL ending in /api/mpesa/callback.' };

    const accessToken = await token();
    if (!accessToken) return { ok: false, message: 'Daraja authentication failed. Check the sandbox/live consumer key and secret.' };

    const timestamp = timestampNairobi();
    const password = Buffer.from(`${m.shortcode}${m.passkey}${timestamp}`).toString('base64');
    const r = await fetch(`${base()}/mpesa/stkpush/v1/processrequest`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(25000),
      body: JSON.stringify({
        BusinessShortCode: m.shortcode,
        Password: password,
        Timestamp: timestamp,
        TransactionType: m.transactionType,
        Amount: Number(amount),
        PartyA: msisdn,
        PartyB: m.shortcode,
        PhoneNumber: msisdn,
        CallBackURL: callback.toString(),
        AccountReference: String(reference).slice(0, 12),
        TransactionDesc: String(description).slice(0, 13),
      }),
    });
    const body = await r.json().catch(() => ({}));
    if (r.ok && String(body.ResponseCode) === '0' && body.CheckoutRequestID) {
      return { ok: true, checkoutRequestId: String(body.CheckoutRequestID) };
    }
    console.error('Daraja STK push rejected', {
      status: r.status, code: body.errorCode ?? body.ResponseCode,
      message: body.errorMessage ?? body.ResponseDescription,
    });
  } catch (e) {
    console.error('Daraja STK request failed', e.name === 'TimeoutError' ? 'request timed out' : e.message);
  }
  return { ok: false, message: 'Daraja could not start the payment. Check the number, shortcode, passkey and callback URL, then try again.' };
}

export function parseCallback(body) {
  const cb = body?.Body?.stkCallback;
  if (!cb?.CheckoutRequestID || !Number.isInteger(Number(cb.ResultCode))) return null;
  const items = cb.CallbackMetadata?.Item ?? [];
  const get = (name) => items.find((item) => item.Name === name)?.Value ?? null;
  const receipt = get('MpesaReceiptNumber');
  const amount = get('Amount');
  const phone = get('PhoneNumber');
  return {
    checkoutRequestId: String(cb.CheckoutRequestID),
    success: Number(cb.ResultCode) === 0,
    receipt: receipt == null ? null : String(receipt),
    amount: amount == null ? null : Number(amount),
    phone: phone == null ? null : String(phone),
  };
}
