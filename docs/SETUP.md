# Lash Cartel website setup

This repository contains the website at its root. The owner approved the new retail prices and asked to publish the available upgrades. Existing Stripe checkout works without a database; database-backed features remain pending service setup.

## Preview services

Create a separate preview Postgres database and run the SQL files in `db/migrations` in numeric order. Set `DATABASE_URL` in the Vercel preview environment. Never place the URL in Git.

Configure Stripe **test** `STRIPE_SECRET_KEY` and `STRIPE_PUBLISHABLE_KEY` for Preview only. Create a Stripe test webhook pointing to `https://<preview-domain>/api/stripe-webhook` and add its `STRIPE_WEBHOOK_SECRET`. The handler accepts `payment_intent.succeeded`, `payment_intent.payment_failed`, and `charge.refunded`. Production checkout uses the existing live Stripe credentials.

Set `ADMIN_PASSWORD`, `ADMIN_SESSION_SECRET`, `MEMBER_SESSION_SECRET`, `LINK_SIGNING_SECRET`, `ENQUIRY_RATE_SALT`, and `CRON_SECRET` to distinct strong random values. The admin page is `/admin`. The password is a single shared admin credential. After signing in, staff can toggle stock and mark paid orders dispatched. Enter an Australia Post tracking number to send a tracking email. No email is sent when marking an order dispatched without tracking.

Set `PUBLIC_SITE_URL` to the exact preview URL so email links point to the preview. Set `ENQUIRY_TO_EMAIL` to the business inbox. Email remains in dry-run mode with `EMAIL_DRY_RUN=true`. To send real email, verify the sender domain in Resend, add the DNS records it supplies, then set `RESEND_API_KEY`, `EMAIL_FROM=Lash Cartel <hello@lashcartelcosmetics.com>`, and `EMAIL_DRY_RUN=false`. Review sender identity, unsubscribe behaviour, and marketing consent with the owner before doing so.

`BUSINESS_ABN` is optional. Leave it blank until the owner confirms the ABN and tax invoice wording. `CARTEL_CASH_ENABLED` stays `false` until rewards terms and the full review, photo, and redemption flows are approved and tested. The branch includes an account and points foundation, but the full rewards program is not ready to turn on.

## Scheduled work

The protected routes `/api/cron/cart` and `/api/cron/restock` need scheduled GET requests with `Authorization: Bearer <CRON_SECRET>`. They are inactive until a scheduler is attached. Cart reminders are due at 2, 24, and 72 hours. The cart reminder checkbox stays hidden until the full flow is configured. Set `RESTOCK_ALERTS_ENABLED=true` only after the database, email sender, and restock scheduler are working; until then the product page offers direct email contact. Restock alerts only target subscribers to the matching product. Vercel Cron runs on production deployments, not previews; the preview routes can be exercised manually with the secret. On Hobby plans, Vercel Cron cannot run every 15 minutes. Choose an appropriate scheduler or plan before launch.

## Editable content

- Retail prices: `lib/catalog.js`, with `assets/catalog.js` checked for parity by `npm test`.
- FAQ answers: `data/faq.json`.
- Quiz wording and answers: `data/quiz.json`.
- Add-ons: `data/addons.json`. An offer with `addonPriceCents: null` stays hidden. Mascara is dormant now. An add-on requires at least one regular product and does not count toward Buy 2 Get 10% Off.
- Stock: `/admin` after database setup.
- Testimonials: `data/testimonials.json` is empty and unlinked until consented customer material arrives.

## Verification

Run `npm install` and `npm test`. Product pages and the checkout must also be checked in a preview browser. The test suite covers catalogue parity and totals, quiz choices, FAQ matching, and cart scheduling. Before launch, test the Stripe webhook, real email delivery, mobile layout, and accessibility with configured preview services.
