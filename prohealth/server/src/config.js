import 'dotenv/config';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const env = process.env;
const isRailway = !!(env.RAILWAY_ENVIRONMENT || env.RAILWAY_SERVICE_ID || env.RAILWAY_PROJECT_ID);

let dbConfig = {
  host: env.DB_HOST || env.MYSQLHOST || (isRailway ? 'mysql.railway.internal' : '127.0.0.1'),
  port: Number(env.DB_PORT || env.MYSQLPORT || 3306),
  database: env.DB_NAME || env.MYSQLDATABASE || env.MYSQL_DATABASE || (isRailway ? 'railway' : 'prohealth'),
  user: env.DB_USER || env.MYSQLUSER || 'root',
  password: env.DB_PASS ?? env.MYSQLPASSWORD ?? '',
};

const rawUrl = env.MYSQL_URL || env.DATABASE_URL;
if (rawUrl) {
  try {
    const u = new URL(rawUrl);
    dbConfig.host = u.hostname;
    dbConfig.port = Number(u.port || 3306);
    dbConfig.database = env.DB_NAME || u.pathname.replace(/^\//, '') || (isRailway ? 'railway' : 'prohealth');
    dbConfig.user = decodeURIComponent(u.username || 'root');
    dbConfig.password = decodeURIComponent(u.password || '');
  } catch {}
}

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
  db: dbConfig,
  pharmacy: { name: env.PHARMACY_NAME || 'ProHealth Pharmacy', address: env.PHARMACY_ADDRESS || 'Madaraka Estate, Nairobi, Kenya', phone: env.PHARMACY_PHONE || '+254 700 000 000', email: env.PHARMACY_EMAIL || 'info@prohealth.co.ke' },
  mpesa: { mode: env.MPESA_MODE || 'simulate', key: env.MPESA_CONSUMER_KEY || '', secret: env.MPESA_CONSUMER_SECRET || '', shortcode: env.MPESA_SHORTCODE || '174379', passkey: env.MPESA_PASSKEY || '', transactionType: env.MPESA_TRANSACTION_TYPE || 'CustomerPayBillOnline', callbackUrl: env.MPESA_CALLBACK_URL || '' },
};
