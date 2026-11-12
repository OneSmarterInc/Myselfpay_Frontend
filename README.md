> Patient registration asks only first name and mobile number, then SMS OTP. Login asks only the registered mobile number, then SMS OTP. No username, password, email or ZIP is collected in these forms. Deploy the matching backend /api/auth/mobile endpoints first; no new migration is needed. Booking and center Secure Mail delivery remain unchanged.

# MySelfPay frontend — React

The original SelfPay UI is restored from commit `bf839ef9af6efde48b2666cc26e7e793a7d9bd06`: original layout, wording, CSS, logo, self-hosted Public Sans font, icons, information pages, filter controls, dialogs and booking screens. `src/original-ui.js` retains the source presentation templates; React converts them to elements and owns component state and events. The original imperative `app.js` is not loaded.

Home and search screenshots match the original source reference pixel-for-pixel at 1440px desktop and 390px mobile widths. The visual regression tests compare both layout geometry and screenshot bytes in the same browser. These source-reference fixtures are served only by the development/test server and are not published in the production site. Live directory content can differ with your AWS data.

React 19 + Vite frontend for [MySelfPay's Django REST Framework/PostgreSQL backend](https://github.com/OneSmarterInc/MyselfPay_Backend). Migrated from SelfPay main commit `bf839ef9af6efde48b2666cc26e7e793a7d9bd06`. React components own rendering and state; the original imperative `app.js` is not embedded or loaded.

The frontend uses DRF's JSON APIs through `src/api.js`: explicit JSON content negotiation, credentialed cookies, per-session CSRF headers, structured field-validation errors, HTTP status codes and rate-limit retry headers. `APIError` exposes `status`, `fieldErrors`, `details` and `retryAfter` for UI behavior. Django REST Framework runs on the Python backend; React remains the frontend framework.

Includes the original guest/account navigation, imaging search, location picker, paginated directory dialog, qualified prices, facility details and maps, three-option comparison dialog, guided search, two-step email-verified appointment requests, patient tracking and clinic capability screens. The backend's account-owned persistence APIs remain available; the visible navigation follows the original source instead of adding new controls.

## Run locally

Use Node 24 LTS. Start the backend on `127.0.0.1:8000` using its README, migrate a fresh local database and run `seed_demo`.

```sh
npm ci
cp .env.example .env
npm run dev
```

Open **http://localhost:5173**. Use that exact hostname because backend `FRONTEND_ORIGIN` must match. Vite proxies `/api` to Django, so leave `VITE_API_BASE_URL` empty for local development. No browser-side secrets are needed.

## Build and deploy

### This Vercel frontend with the AWS backend

Set the Vercel production environment variable **`VITE_API_BASE_URL=/api`** and redeploy. The included `vercel.json` forwards `/api/*` to `https://myselfpaybackend.onesmarter.com/api/*` without changing the browser URL. The API session cookie is then first-party on the frontend origin, so the backend's `SameSite=Lax; Secure; HttpOnly` cookie works without cross-site-cookie access. API responses remain private and uncached.

Keep AWS `FRONTEND_ORIGIN=https://myselfpay-frontend.vercel.app` and include `myselfpaybackend.onesmarter.com` in its allowed hosts. No database migration or weaker cookie policy is needed for this fix. If the AWS API hostname changes, update the rewrite destination. For other static hosting setups, use the separate-host configuration below.

The React app confirms cookie persistence through `/api/me` before showing signed-in screens, clears account state when a protected request returns 401, and allows local sign-out if the server session has already expired.

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

Playwright uses installed Chrome by default. For Playwright's downloaded Chromium set `PLAYWRIGHT_CHANNEL=chromium` and install it with `npx playwright install chromium`. Tests exercise the original signup/login forms, guest search against the real DRF backend, comparison and directory dialogs, expired-session sign-out, the two-step appointment dialog, public pages, and desktop/mobile visual parity. Backend SMTP and encrypted booking behavior are independently exercised in its DRF integration suite with synthetic contacts. GitHub Actions can run on pushes or manually from its Actions page.

## Existing feature limits

Published prices require confirmation; no clinical advice, insurance calculations, payments or external AI are connected. Guest chat text is not stored and its preview quotas remain enforced server-side. Accounts can explicitly save search history. Account signup does not verify email; booking has its own one-use email verification.

Clinic notification and clinic OTP email are supported by the backend after SMTP configuration and outbox migration. The UI follows the API delivery mode: disabled-mode warnings remain for suppressed mail, while enabled requests show their real queued/sent/failed status. The Geetesh Pawar Test Imaging Center is explicitly fictional and provides no medical care. SMTP credentials remain server-only. A booking request is not a confirmed appointment. Automated password recovery is not implemented.

No existing live patient/account data, production credentials or live database backups are included. The bundled directory is research demo data, not a copy of the current live catalog. Informational-page text is retained from the source and should be reviewed by the owner for the new deployment domains and any future delivery-policy changes.

## Predefined chat

Ask MySelfPay retains the original chat layout and supports only the three questions in `src/chat-questions.js`. The suggestion buttons, Send field and voice-preview selector use this allowlist. Other text is rejected locally. Registered users receive the same questions; guest conversation quotas still apply. The backend must also be updated to enforce the allowlist on `/api/agent`. No external AI or speech service is called.

The browser-test workflow pins the matching backend revision for the mobile account API and uses simulated SMS only in its isolated DEBUG fixture. Update that revision when intentionally changing the API contract. Production SMS always uses the configured Twilio Verify service.
