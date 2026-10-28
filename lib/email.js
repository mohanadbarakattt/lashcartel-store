export function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);
}

export async function sendEmail({ to, subject, html, text, replyTo }) {
  if (process.env.EMAIL_DRY_RUN !== 'false' || !process.env.RESEND_API_KEY || !process.env.EMAIL_FROM) {
    return { dryRun: true };
  }
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: process.env.EMAIL_FROM, to: [to], subject, html, text, reply_to: replyTo }),
  });
  if (!response.ok) throw new Error(`Email provider returned ${response.status}`);
  return { dryRun: false, ...(await response.json()) };
}
