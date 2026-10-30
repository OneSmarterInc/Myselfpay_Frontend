# MySelfPay frontend — React

React 19 + Vite frontend for [MySelfPay's Django/PostgreSQL backend](https://github.com/OneSmarterInc/MyselfPay_Backend). Migrated from SelfPay main commit `bf839ef9af6efde48b2666cc26e7e793a7d9bd06`. React components own rendering and state; the original imperative `app.js` is not embedded or loaded.

Includes guest and account access, imaging search, location suggestions, directory browsing, qualified prices, facility details, three-option comparison, deterministic guided search, account-owned saved searches and location preferences, correction reports, email-verified appointment requests, patient tracking and the existing clinic capability flow. Informational pages preserve source content.

## Run locally

Use Node 24 LTS. Start the backend on `127.0.0.1:8000` using its README, migrate a fresh local database and run `seed_demo`.

```sh
npm ci
cp .env.example .env
npm run dev
```

Open **http://localhost:5173**. Use that exact hostname because backend `FRONTEND_ORIGIN` must match. Vite proxies `/api` to Django, so leave `VITE_API_BASE_URL` empty for local development. No browser-side secrets are needed.

## Build and deploy

```sh
npm run build
```

Publish the `dist/` directory to a static host such as S3 + CloudFront, Amplify or another static hosting service. For separate API hosting set **before building**:

```text
VITE_API_BASE_URL=https://api.your-domain.com/api
```

Set backend `FRONTEND_ORIGIN=https://app.your-domain.com` and `DJANGO_ALLOWED_HOSTS=api.your-domain.com,127.0.0.1`. Prefer app/API subdomains under the same parent domain so secure session cookies work without third-party-cookie dependence. A same-origin HTTPS reverse proxy for `/api` also works with an empty API base. Never place database, SMTP, AWS or encryption credentials in frontend environment variables. Cookies are HttpOnly and all mutations send the session CSRF token; CORS is restricted on Django.

The application uses hash routes, so its React routes require no server-side fallback. The retained informational pages are directory `index.html` files; configure the static host to serve `/about/`, `/contact/`, `/privacy-terms/`, and `/for-imaging-centers/` accordingly. CloudFront + a private S3 REST origin needs a viewer-request URI rewrite from trailing-slash paths to `index.html`. Example configuration is included in `deploy/cloudfront-function.js`.

## Test

```sh
npm test
npm run build
npm audit --audit-level=high
```

For integration tests, start the seeded local Django server, then:

```sh
npm run test:e2e
```

Playwright uses installed Chrome by default. For Playwright's downloaded Chromium set `PLAYWRIGHT_CHANNEL=chromium` and install it with `npx playwright install chromium`. Tests exercise guest search against the real backend, comparison, sign-out and public pages. Backend SMTP and encrypted booking behavior are independently exercised in its Django integration suite with synthetic contacts.

## Existing feature limits

Published prices require confirmation; no clinical advice, insurance calculations, payments or external AI are connected. Guest chat text is not stored and its preview quotas remain enforced server-side. Accounts can explicitly save search history. Account signup does not verify email; booking has its own one-use email verification.

**Appointment requests are testing-only: clinic notifications and clinic OTP delivery remain disabled in the source services.** The UI states this before submission and on receipts. Patient SMTP verification requires backend configuration. A recorded request is not a confirmed or delivered appointment. Automated password recovery is not implemented.

No existing live patient/account data, production credentials or live database backups are included. The bundled directory is research demo data, not a copy of the current live catalog. Informational-page text is retained from the source and should be reviewed by the owner for the new deployment domains and any future delivery-policy changes.
