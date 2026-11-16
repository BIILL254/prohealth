import mysql from 'mysql2/promise';
import { AsyncLocalStorage } from 'node:async_hooks';
import { config } from './config.js';

export const pool = mysql.createPool({ ...config.db, waitForConnections: true, connectionLimit: 10, timezone: '+03:00', dateStrings: true, decimalNumbers: true });
const txStore = new AsyncLocalStorage(); // inside a transaction every query uses the same connection
const conn = () => txStore.getStore() ?? pool;

export async function all(sql, params = []) { const [rows] = await conn().query(sql, params); return rows; }
export async function one(sql, params = []) { return (await all(sql, params))[0] ?? null; }
export async function val(sql, params = []) { const r = await one(sql, params); return r ? Object.values(r)[0] : null; }
export async function exec(sql, params = []) { const [r] = await conn().query(sql, params); return r; }
export async function insert(sql, params = []) { return (await exec(sql, params)).insertId; }

export async function transaction(fn) {
  const c = await pool.getConnection();
  try {
    await c.query("SET time_zone = '+03:00'");
    await c.beginTransaction();
    const result = await txStore.run(c, fn);
    await c.commit();
    return result;
  } catch (e) { await c.rollback(); throw e; } finally { c.release(); }
}
