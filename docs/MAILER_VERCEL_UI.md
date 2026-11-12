# Mailer workspace — Vercel-only release

Deploy the frontend branch `codex/mobile-username-accounts` to the existing
MySelfPay Vercel project. No AWS pull, migrations, credentials, or restart is
required for this presentation change.

The two exact `/admin/mailer` rewrites now use `api/admin-mailer-ui.js` on Vercel.
That adapter forwards the existing admin session, CSRF token, request body, and
origin to the fixed AWS mailer URL. It preserves login redirects and cookies,
does not cache private HTML, and adds two local presentation assets only after
Django returns the authorized mailer form. Other admin routes continue using
their existing AWS rewrites. There is no new database or direct mailbox access.

## Interface

- All centers: sent deliveries first, followed by remaining centers.
- Sent emails: latest center email with SMTP-accepted `Sent` state.
- Replies received: latest center email with imported replies; Open email opens
  the existing authenticated conversation page. This tab clears a contradictory
  Never emailed / No reply audience filter.
- Other emails: latest non-sent state, including not sent, failed, uncertain,
  queued, and cancelled. An uncertain delivery is never labeled sent.
- Existing email search and audience filters remain available.
- Additional directory pages load three at a time with a visible progress and
  retry state. Tab counts are the loaded matching centers until loading finishes.
- Checkboxes preserve selections across client-side pages. Count/range selection
  continues using the backend's original import-order row numbers, which stay
  visible; it does not silently select the newly sorted display positions.
- Select all matching centers retains its existing server-side scope across all
  pages of the email/audience filters, rather than only the current display tab.

## Existing backend limits

The deployed Django page exposes the latest message per current directory center,
not an API for the complete historical inbox. Older campaign threads remain
accessible through Recent campaigns and their existing message pages. Replies
appear after the existing IMAP worker imports them. Check for replies still
requests that worker; this frontend release cannot repair a stopped AWS worker
or incorrect IMAP credentials. No sending or sync happens automatically here.

## Manual Vercel deployment

1. Open the existing MySelfPay frontend project in Vercel.
2. Create a deployment from `codex/mobile-username-accounts` at the commit that
   adds this workspace. Keep the existing production environment variables.
3. Check the preview at `/admin/mailer/`: log in, switch Sent emails / Replies
   received, open an existing thread, search, and verify the selection count.
4. Promote that deployment to Production to update `myselfpay.onesmarter.com`.

Previewing recipients does not send a campaign. Existing explicit confirmation
is still required before any campaign is queued.
