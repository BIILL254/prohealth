import express from 'express';
import session from 'express-session';
import helmet from 'helmet';
import crypto from 'node:crypto';
import path from 'node:path';
import fs from 'node:fs';
import { config } from './config.js';
import { pool } from './db.js';
import { csrfGuard } from './auth.js';
import publicRoutes from './routes/public.js';
import customerRoutes from './routes/customer.js';
import adminRoutes from './routes/admin.js';
import callbackRoutes from './routes/callback.js';

const app = express();
app.set('trust proxy', 1);
app.disable('x-powered-by');
let sessionSecret = config.sessionSecret;
if (config.production && (!process.env.SESSION_SECRET || process.env.SESSION_SECRET.length < 32)) {
  sessionSecret = crypto.randomBytes(32).toString('hex');
  console.warn('[SECURITY] Warning: SESSION_SECRET is not set (min 32 chars). An ephemeral secret was generated for this instance.');
}
app.use(helmet({ contentSecurityPolicy: { directives: { defaultSrc: ["'self'"], imgSrc: ["'self'", 'data:'], styleSrc: ["'self'", "'unsafe-inline'"], scriptSrc: ["'self'"], fontSrc: ["'self'", 'data:'], frameAncestors: ["'self'"] } } }));
app.use(express.json({ limit: '100kb' }));
app.use(session({
  name: 'prohealth_session', secret: sessionSecret, resave: false, saveUninitialized: true, rolling: true,   // rolling: the 30-minute idle timer restarts on every request
  cookie: { httpOnly: true, sameSite: 'lax', secure: config.production && 'auto', maxAge: config.sessionMinutes * 60_000 },
}));
app.use('/api', (req, res, next) => { res.set('Cache-Control', 'no-store'); next(); });
app.get('/healthz', async (_req, res) => {
  try { await pool.query('SELECT 1'); res.status(200).json({ ok: true }); }
  catch { res.status(503).json({ ok: false }); }
});
app.use('/api', csrfGuard);
app.use('/api', callbackRoutes);
app.use('/api', publicRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api', customerRoutes);
app.use('/api', (req, res) => res.status(404).json({ error: 'Not found.' }));

// Production: serve the built React app
const dist = path.resolve(config.root, '../client/dist');
if (fs.existsSync(dist)) {
  app.use(express.static(dist));
  app.get(/^(?!\/api).*/, (req, res) => res.sendFile(path.join(dist, 'index.html')));
}

app.use((err, req, res, next) => {
  if (err.status) return res.status(err.status).json({ error: err.message, fields: err.fields });
  if (err.type === 'entity.parse.failed') return res.status(400).json({ error: 'Bad request.' });
  console.error(err);
  res.status(500).json({ error: 'Something went wrong on our side. Please try again.' });
});

async function autoMigrate() {
  try {
    await pool.query('SELECT 1');
    const [tables] = await pool.query("SHOW TABLES LIKE 'roles'");
    if (tables.length === 0) {
      console.log('[DATABASE] First-time setup: Initializing schema and tables...');
      const schemaFile = path.resolve(config.root, '../database/schema.sql');
      const seedFile = path.resolve(config.root, '../database/seed.sql');
      if (fs.existsSync(schemaFile)) {
        let sql = fs.readFileSync(schemaFile, 'utf8')
          .replace(/CREATE DATABASE IF NOT EXISTS [^\n;]+;/gi, '')
          .replace(/USE [^\n;]+;/gi, '');
        await pool.query(sql);
        console.log('[DATABASE] Schema imported successfully.');
      }
      if (fs.existsSync(seedFile)) {
        let seedSql = fs.readFileSync(seedFile, 'utf8')
          .replace(/USE [^\n;]+;/gi, '');
        await pool.query(seedSql);
        console.log('[DATABASE] Demo seed data loaded successfully.');
      }
    }
  } catch (e) {
    console.error(`\nCould not connect to MySQL: ${e.message}\nCheck the DB_* values in server/.env and that MySQL is running.\n`);
  }
}
await autoMigrate();
app.listen(config.port, '0.0.0.0', () => console.log(`ProHealth running on port ${config.port}`));
