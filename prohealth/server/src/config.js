import 'dotenv/config';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const env = process.env;
const isRailway = !!(env.RAILWAY_ENVIRONMENT || env.RAILWAY_SERVICE_ID || env.RAILWAY_PROJECT_ID);

const rawUrl = env.MYSQL_URL || env.DATABASE_URL;
const railwayDatabase = env.MYSQLDATABASE || env.MYSQL_DATABASE;
const defaultDatabase = isRailway ? 'railway' : 'prohealth';
const dbSsl = env.DB_SSL === 'true' ? { minVersion: 'TLSv1.2' } : undefined;

let dbConfig = {
  // Prefer Railway's service variables; keep DB_* as local/legacy fallbacks.
  host: env.MYSQLHOST || env.DB_HOST || (isRailway ? 'mysql.railway.internal' : '127.0.0.1'),
  port: Number(env.MYSQLPORT || env.DB_PORT || 3306),
  database: railwayDatabase || env.DB_NAME || defaultDatabase,
  user: env.MYSQLUSER || env.DB_USER || 'root',
  password: env.MYSQLPASSWORD ?? env.DB_PASS ?? '',
  ssl: dbSsl,
};

if (rawUrl) {
  let u;
  try {
    u = new URL(rawUrl);
  } catch {
    throw new Error('MYSQL_URL or DATABASE_URL must be a valid MySQL connection URL.');
  }

  if (u.protocol !== 'mysql:') {
    throw new Error('MYSQL_URL or DATABASE_URL must use the mysql:// scheme.');
  }

  const urlDatabase = decodeURIComponent(u.pathname.replace(/^\/+/, ''));
  dbConfig = {
    host: u.hostname,
    port: Number(u.port || env.MYSQLPORT || env.DB_PORT || 3306),
    // A database path in the URL must not be silently overridden by DB_NAME.
    database: urlDatabase || railwayDatabase || env.DB_NAME || defaultDatabase,
    user: decodeURIComponent(u.username || env.MYSQLUSER || env.DB_USER || 'root'),
    password: decodeURIComponent(u.password || env.MYSQLPASSWORD || env.DB_PASS || ''),
    ssl: dbSsl,
  };
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
