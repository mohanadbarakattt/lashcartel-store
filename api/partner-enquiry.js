import { createHash } from 'node:crypto';
import { db } from '../lib/db.js';
import { sendEmail, escapeHtml } from '../lib/email.js';

const subjects = {
  stockist: business => `[Lash Cartel] Stockist enquiry: ${business}`,
  host: business => `[Lash Cartel] Vending machine HOST enquiry: ${business}`,
  rental: business => `[Lash Cartel] Vending machine RENTAL enquiry: ${business}`,
};

const read = (body, field, max) => typeof body[field] === 'string' ? body[field].trim().slice(0, max + 1) : '';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed.' });
  const body = req.body || {};
  if (body.website) return res.status(200).json({ ok: true });
  const kind = read(body, 'kind', 20);
  const fields = {
    name: read(body, 'name', 120), business: read(body, 'business', 160),
    email: read(body, 'email', 250).toLowerCase(), phone: read(body, 'phone', 80),
    location: read(body, 'location', 300), message: read(body, 'message', 3000),
    rentalPeriod: read(body, 'rentalPeriod', 120), intendedPlacement: read(body, 'intendedPlacement', 300),
  };
  if (!subjects[kind] || Object.values(fields).some(v => v.length > 3000) ||
      !fields.name || !fields.business || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fields.email) ||
      !fields.phone || !fields.location || !fields.message ||
      (kind === 'rental' && (!fields.rentalPeriod || !fields.intendedPlacement))) {
    return res.status(400).json({ error: 'Please complete all required fields.' });
  }
  if (Object.entries(fields).some(([key, value]) => value.length > ({ name:120, business:160, email:250, phone:80, location:300, message:3000, rentalPeriod:120, intendedPlacement:300 })[key])) {
    return res.status(400).json({ error: 'One or more fields are too long.' });
  }
  if (!process.env.DATABASE_URL || !process.env.ENQUIRY_TO_EMAIL) {
    return res.status(503).json({ error: 'Enquiries are temporarily unavailable. Please email Lashcartel.co@outlook.com.' });
  }
  try {
    const sql = db();
    const ip = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim();
    const ipHash = createHash('sha256').update(ip + ':' + (process.env.ENQUIRY_RATE_SALT || 'lash-cartel')).digest('hex');
    const recent = await sql`SELECT count(*)::int AS count FROM enquiries WHERE ip_hash = ${ipHash} AND created_at > now() - interval '1 hour'`;
    if (recent[0].count >= 5) return res.status(429).json({ error: 'Please try again later.' });
    const saved = await sql`INSERT INTO enquiries (kind,name,business,email,phone,location,rental_period,intended_placement,message,ip_hash)
      VALUES (${kind},${fields.name},${fields.business},${fields.email},${fields.phone},${fields.location},${fields.rentalPeriod || null},${fields.intendedPlacement || null},${fields.message},${ipHash}) RETURNING id`;
    const subject = subjects[kind](fields.business);
    const lines = [kind, fields.name, fields.business, fields.email, fields.phone, fields.location, fields.rentalPeriod, fields.intendedPlacement, fields.message].filter(Boolean);
    const text = lines.join('\n\n');
    const html = `<h1>${escapeHtml(subject)}</h1>${lines.map(line => `<p>${escapeHtml(line)}</p>`).join('')}`;
    try {
      const sent = await sendEmail({ to: process.env.ENQUIRY_TO_EMAIL, subject, html, text, replyTo: fields.email });
      await sql`UPDATE enquiries SET email_status = ${sent.dryRun ? 'dry-run' : 'sent'} WHERE id = ${saved[0].id}`;
    } catch (error) {
      await sql`UPDATE enquiries SET email_status = 'failed' WHERE id = ${saved[0].id}`;
      console.error('Partner enquiry email failed:', error.message);
    }
    return res.status(200).json({ ok: true });
  } catch (error) {
    console.error('Partner enquiry failed:', error.message);
    return res.status(500).json({ error: 'Could not save your enquiry. Please try again.' });
  }
}
