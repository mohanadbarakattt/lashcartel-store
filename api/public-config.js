export default function handler(req, res) {
  const key = process.env.STRIPE_PUBLISHABLE_KEY || (process.env.VERCEL_ENV === 'production' ? 'pk_live_51Tjy6ORzyEd7RY87nZiDOVQweCWbaAqLWegnuyyj96Fd2GmCtalEzLBM9rruQDynJz1wsHq3qC34rz83QwrgzRE000lV00OYaN' : '');
  const preview = process.env.VERCEL_ENV !== 'production';
  res.setHeader('Cache-Control', 'no-store');
  res.status(200).json({ stripePublishableKey: !preview || key.startsWith('pk_test_') ? key : '', restockAlertsEnabled: !!process.env.DATABASE_URL && process.env.RESTOCK_ALERTS_ENABLED === 'true' });
}
