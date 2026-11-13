# Backend-rendered mailer

The mailer now uses the existing direct AWS admin rewrites. The Vercel HTML
adapter and browser-side page scraping have been retired. Deploy this frontend
from main to remove that workaround; existing AWS pages remain available.

The matching backend update on codex/mobile-username-accounts provides server-side
Sent emails / Replies received / Other emails filters, 50-row pagination, and
one shared ordering for display and count/range selection. Backend deployment
is required to enable those improvements. No schema migration was added.

This change does not resend uncertain emails or change SMTP credentials.
