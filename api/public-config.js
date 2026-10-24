export default function handler(req, res) {
  const key = process.env.STRIPE_PUBLISHABLE_KEY || '';
  const preview = process.env.VERCEL_ENV !== 'production';
  res.setHeader('Cache-Control', 'no-store');
  res.status(200).json({ stripePublishableKey: !preview || key.startsWith('pk_test_') ? key : '' });
}
