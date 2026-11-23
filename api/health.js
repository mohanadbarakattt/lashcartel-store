// Setup check: can the site reach the database, and which tables exist? Shows no secrets or data.
import { db } from '../lib/db.js';
import { setupStatements } from '../lib/setup-db.js';

const TABLES = ['enquiries', 'stock_status', 'orders', 'email_log', 'admin_login_attempts', 'carts', 'members', 'points_ledger', 'giveaway_tickets', 'giveaway_draw'];

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  const env = name => Boolean(process.env[name]);
  const out = {
    settings: { DATABASE_URL: env('DATABASE_URL'), ADMIN_PASSWORD: env('ADMIN_PASSWORD'), ADMIN_SESSION_SECRET: env('ADMIN_SESSION_SECRET'),
      STRIPE_SECRET_KEY: env('STRIPE_SECRET_KEY'), STRIPE_WEBHOOK_SECRET: env('STRIPE_WEBHOOK_SECRET'), RESEND_API_KEY: env('RESEND_API_KEY') },
  };
  try { out.setupFileStatements = setupStatements().length; } catch { out.setupFileStatements = 0; }
  if (out.settings.DATABASE_URL) {
    try {
      const sql = db();
      const rows = await sql`SELECT t AS name, to_regclass('public.' || t) IS NOT NULL AS ok FROM unnest(${TABLES}::text[]) AS t`;
      out.database = 'connected';
      out.missingTables = rows.filter(r => !r.ok).map(r => r.name);
    } catch (error) {
      out.database = 'cannot connect';
      out.reason = /password|auth/i.test(error.message) ? 'wrong username or password in DATABASE_URL'
        : /ENOTFOUND|getaddrinfo|fetch failed/i.test(error.message) ? 'database host not found (DATABASE_URL looks wrong)'
        : 'other connection error';
    }
  }
  return res.status(200).json(out);
}
