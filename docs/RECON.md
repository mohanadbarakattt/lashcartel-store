# Lash Cartel site recon, 24 October 2026

- Source: `site/` in the local workspace, matching the files at the root of `mohanadbarakattt/lashcartel-store` main when work began.
- Stack: static HTML, inline CSS and JavaScript, Node ESM Vercel functions. No framework or existing database.
- Pages: home, DIY kit, Pretty Ambition, mascara, contact, privacy, terms, success, cancel. `vercel.json` enables clean URLs. `package.json` requires Node 18 or newer.
- Cart: browser `localStorage` key `lc_cart`. Home owns shop cards, search, cart drawer, bulk discount and Stripe Payment Element.
- Products and prices appeared separately in home data, product pages, product JSON-LD and `api/create-payment-intent.js`. The new `lib/catalog.js` is server price authority, with a tested browser copy at `assets/catalog.js`.
- Payment: `api/create-payment-intent.js` computes Stripe amounts; `api/order.js` retrieves an intent for the success page. No webhook, order records, transactional email or admin existed.
- Deployment: the local checkout has no Vercel link. The review project is `lashcartel-client-preview` in the user's Vercel team. It currently has no environment variables configured. The client's live domain is separate and unchanged.
- Existing public FAQ says lashes can be reused and last up to 7 days. The approved chatbot FAQ says to use fresh clusters after removal and gives different wear ranges. Owner review is needed before changing the public FAQ.

## Review safety

All changes are on GitHub branch `codex/website-upgrades`; main and the live domain remain unchanged. Preview checkout only accepts Stripe test keys. The database and email features require the setup in `docs/SETUP.md` before they can run.
