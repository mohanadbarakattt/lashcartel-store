// SMS through Twilio's REST API. Skipped (not an error) until TWILIO_* variables are set.
export async function sendSms(to, body) {
  const { TWILIO_ACCOUNT_SID: sid, TWILIO_AUTH_TOKEN: token, TWILIO_FROM: from } = process.env;
  if (!sid || !token || !from) return { skipped: true };
  const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(sid)}/Messages.json`, {
    method: 'POST',
    headers: { Authorization: 'Basic ' + Buffer.from(`${sid}:${token}`).toString('base64'), 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ To: to, From: from, Body: body }),
  });
  if (!response.ok) throw new Error(`SMS provider returned ${response.status}`);
  return { skipped: false };
}

// Australian mobiles (04...) to +61 format; other countries must be typed with +. Returns null otherwise,
// so landlines (e.g. Sydney 02 numbers) are never texted.
export function toE164(phone) {
  const p = String(phone || '').replace(/[\s()-]/g, '');
  if (/^\+\d{9,15}$/.test(p)) return p;
  if (/^04\d{8}$/.test(p)) return '+61' + p.slice(1);
  return null;
}
