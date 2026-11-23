// Creates every table from db/setup-all.sql (all migrations, safe to re-run).
// Used when the owner signs in to /admin with the correct password and the tables don't exist yet.
import { readFileSync } from 'node:fs';

export function setupStatements() {
  const text = readFileSync(new URL('../db/setup-all.sql', import.meta.url), 'utf8');
  return text.replace(/--.*$/gm, '').split(';').map(s => s.trim()).filter(Boolean);
}

export function isMissingTable(error) {
  return error?.code === '42P01' || /relation .* does not exist/i.test(error?.message || '');
}

export async function setupDatabase(sql) {
  for (const statement of setupStatements()) await sql.query(statement);
}
