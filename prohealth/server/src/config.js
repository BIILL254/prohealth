import 'dotenv/config';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const env = process.env;
export const config = {
  root,
  storage: env.STORAGE_DIR ? path.resolve(env.STORAGE_DIR) : path.join(root, 'storage'),
  port: Number(env.PORT || 3000),
  production: env.NODE_ENV === 'production',
  sessionSecret: env.SESSION_SECRET || 'dev-only-secret-change-me',
  sessionMinutes: 30,
  deliveryFee: Number(env.DELIVERY_FEE || 150),
  maxLoginAttempts: 5,
  lockoutMinutes: 15,
  db: { host: env.DB_HOST || '127.0.0.1', port: Number(env.DB_PORT || 3306), database: env.DB_NAME || 'prohealth', user: env.DB_USER || 'root', password: env.DB_PASS ?? '' },
  pharmacy: { name: env.PHARMACY_NAME || 'ProHealth Pharmacy', address: env.PHARMACY_ADDRESS || 'Madaraka Estate, Nairobi, Kenya', phone: env.PHARMACY_PHONE || '+254 700 000 000', email: env.PHARMACY_EMAIL || 'info@prohealth.co.ke' },
  mpesa: { mode: env.MPESA_MODE || 'simulate', key: env.MPESA_CONSUMER_KEY || '', secret: env.MPESA_CONSUMER_SECRET || '', shortcode: env.MPESA_SHORTCODE || '174379', passkey: env.MPESA_PASSKEY || '', transactionType: env.MPESA_TRANSACTION_TYPE || 'CustomerPayBillOnline', callbackUrl: env.MPESA_CALLBACK_URL || '' },
};
