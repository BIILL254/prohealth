import { exec } from './db.js';
export async function audit(req, action, table, recordId, details, userId) {
  try {
    await exec('INSERT INTO audit_logs (user_id, action, table_name, record_id, details, ip_address) VALUES (?,?,?,?,?,?)',
      [userId ?? req?.session?.user?.id ?? null, action, table ?? null, recordId ?? null, details ?? null, req?.ip ?? null]);
  } catch (e) { console.error('audit failed', e.message); }
}
