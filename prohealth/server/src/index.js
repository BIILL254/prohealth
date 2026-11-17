import express from 'express';
import session from 'express-session';
import helmet from 'helmet';
import crypto from 'node:crypto';
import path from 'node:path';
import fs from 'node:fs';
import mysql from 'mysql2/promise';
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
    // 1. Ensure the target database exists on MySQL server
    try {
      const tempConn = await mysql.createConnection({
        host: config.db.host,
        port: config.db.port,
        user: config.db.user,
        password: config.db.password,
      });
      await tempConn.query(`CREATE DATABASE IF NOT EXISTS \`${config.db.database}\``);
      await tempConn.end();
    } catch (dbErr) {
      console.log('[DATABASE] Notice on ensure DB:', dbErr.message);
    }

    // 2. Test pool connectivity
    await pool.query('SELECT 1');
    const [tables] = await pool.query("SHOW TABLES LIKE 'roles'");
    if (tables.length === 0) {
      console.log('[DATABASE] First-time setup: Initializing schema and tables...');
      const schemaCandidates = [
        path.resolve(config.root, '../database/schema.sql'),
        path.resolve(config.root, 'database/schema.sql'),
      ];
      const schemaFile = schemaCandidates.find(f => fs.existsSync(f));

      const seedCandidates = [
        path.resolve(config.root, '../database/seed.sql'),
        path.resolve(config.root, 'database/seed.sql'),
      ];
      const seedFile = seedCandidates.find(f => fs.existsSync(f));

      if (schemaFile) {
        const raw = fs.readFileSync(schemaFile, 'utf8');
        const clean = raw
          .replace(/--[^\r\n]*/g, '')
          .replace(/CREATE DATABASE IF NOT EXISTS [^\n;]+;/gi, '')
          .replace(/USE [^\n;]+;/gi, '');
        const stmts = clean.split(';').map(s => s.trim()).filter(Boolean);
        for (const stmt of stmts) {
          await pool.query(stmt);
        }
        console.log(`[DATABASE] Schema imported (${stmts.length} statements executed).`);
      }

      if (seedFile) {
        const raw = fs.readFileSync(seedFile, 'utf8');
        const clean = raw
          .replace(/--[^\r\n]*/g, '')
          .replace(/USE [^\n;]+;/gi, '');
        const stmts = clean.split(';').map(s => s.trim()).filter(Boolean);
        for (const stmt of stmts) {
          await pool.query(stmt);
        }
        console.log(`[DATABASE] Seed data loaded (${stmts.length} statements executed).`);
      }
    } else {
      console.log('[DATABASE] Database tables already present.');
    }
  } catch (e) {
    console.error(`\n[DATABASE ERROR] ${e.message}\n`);
  }
}
await autoMigrate();
app.listen(config.port, '0.0.0.0', () => console.log(`ProHealth running on port ${config.port}`));
