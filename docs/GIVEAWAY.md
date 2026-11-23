# November Giveaway: how it works and launch setup

## What customers get
- `/raffle`: 120 numbers on 4 shelves of 30, Lucky Dip, live countdown, prizes, FAQ.
- $5 for 1 ticket, $10 for 3 (the server sets the price; the page can't change it).
- Picked numbers are held for 10 minutes while the buyer pays with Stripe (same Stripe account as the store).
- After payment: ticket numbers by email (Resend) and SMS (Twilio, Australian mobiles or `+` numbers).
- Every DIY Cluster Lash Kit bought while tickets are on sale adds 1 free random ticket (emailed + texted).
- Refunds void the tickets. Store checkout is never blocked by a giveaway error.

## What the owner does
- `/admin` → **November Giveaway**: sold, free-with-kit, mid-checkout and available counts, revenue, and every ticket with name, phone and email.
- At draw time press **Start live draw**. The server picks 3 different sold tickets with secure randomness, once only, after tickets close.
  Everyone on `/raffle` watches the same reveal (3rd, 2nd, 1st). The winners then show in admin with tap-to-call numbers.

## Settings
`data/giveaway.json`: dates (Sydney time), 120 tickets, 10-minute hold, prizes.
**Opening time is TBC**: currently Thursday 26 Nov 12:00 am. Change `opensAt` when the owner confirms.

## Launch checklist (Vercel project for lashcartelcosmetics.com)
The live site's Stripe webhook currently answers 503, which means `DATABASE_URL` and/or `STRIPE_WEBHOOK_SECRET` are not set.
The giveaway cannot sell tickets until these are done:

1. **Database**: create a Postgres database (Neon works with the existing code), run every file in `db/migrations` in order (001 → 007), set `DATABASE_URL`.
2. **Stripe webhook**: Stripe Dashboard → Developers → Webhooks → add `https://www.lashcartelcosmetics.com/api/stripe-webhook`
   with events `payment_intent.succeeded`, `payment_intent.payment_failed`, `payment_intent.canceled`, `charge.refunded`. Set `STRIPE_WEBHOOK_SECRET` to its signing secret.
3. **Email**: `RESEND_API_KEY`, `EMAIL_FROM` (verified sender), `EMAIL_DRY_RUN=false`, `LINK_SIGNING_SECRET` (any long random string).
4. **SMS** (optional; skipped until set): `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM` (an Australian-capable sender number). A few cents per SMS.
5. **Admin**: `ADMIN_PASSWORD`, `ADMIN_SESSION_SECRET` (long random string).
6. Redeploy, then buy one ticket with a real card and refund it from Stripe to confirm the full loop (ticket shows as sold, email/SMS arrive, refund voids it).

Note: Stripe lists raffles/lotteries as a restricted business. Confirming with Stripe support before launch protects the store's payment account.

## Tests
`npm test` includes `scripts/check-giveaway.mjs` (pricing, timing, validation, kit tickets, winner picks, phone format).
The SQL was also run against real Postgres (PGlite) for holds, clashes, expired holds, payment retries, cancel, kit tickets, refunds and the draw.
