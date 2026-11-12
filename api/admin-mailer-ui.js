// Vercel presentation adapter. Django remains the authority for admin access,
// CSRF, recipient selection, sending, and mailbox synchronization.
export const config = { api: { bodyParser: false } };
const BACKEND = 'https://myselfpaybackend.onesmarter.com';
const MAX_BODY = 2 * 1024 * 1024;

export function enhanceMailer(html) {
  if (!html.includes('mailer-directory') || !html.includes('mailer-compose')) return html;
  return html.replace(/<script\b[^>]*src=["'][^"']*\/selfpay-admin\/mailer\.js[^"']*["'][^>]*>\s*<\/script>/gi, '')
    .replace('</head>', '<link rel="stylesheet" href="/mailer-workspace.css"><script src="/mailer-workspace.js" defer></script></head>');
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'private, no-store');
  res.setHeader('Vary', 'Cookie');
  if (!['GET', 'HEAD', 'POST'].includes(req.method)) {
    res.setHeader('Allow', 'GET, HEAD, POST');
    return res.status(405).end();
  }
  try {
    const incoming = new URL(req.url, 'https://myselfpay.onesmarter.com');
    const original = incoming.searchParams.has('__mailer_original');
    incoming.searchParams.delete('__mailer_original');
    // The rewrite's internal route is not an upstream query parameter.
    incoming.searchParams.delete('__route');
    const target = new URL('/admin/mailer/', BACKEND);
    target.search = incoming.search;
    const headers = { accept: 'text/html' };
    for (const key of ['cookie', 'content-type', 'origin', 'referer', 'x-csrftoken']) {
      if (req.headers[key]) headers[key] = req.headers[key];
    }
    let body;
    if (req.method === 'POST') {
      const chunks = []; let size = 0;
      for await (const chunk of req) {
        size += Buffer.byteLength(chunk);
        if (size > MAX_BODY) return res.status(413).end('Form is too large.');
        chunks.push(Buffer.from(chunk));
      }
      body = Buffer.concat(chunks);
    }
    const upstream = await fetch(target, { method: req.method, headers, body,
      redirect: 'manual', signal: AbortSignal.timeout(25000) });
    for (const key of ['content-type', 'content-security-policy', 'x-frame-options',
      'x-content-type-options', 'referrer-policy', 'retry-after']) {
      if (upstream.headers.has(key)) res.setHeader(key, upstream.headers.get(key));
    }
    const cookies = upstream.headers.getSetCookie();
    if (cookies.length) res.setHeader('Set-Cookie', cookies);
    const location = upstream.headers.get('location');
    if (location) {
      const destination = new URL(location, BACKEND);
      res.setHeader('Location', destination.origin === BACKEND
        ? destination.pathname + destination.search + destination.hash : location);
    }
    res.status(upstream.status);
    if (req.method === 'HEAD') return res.end();
    const html = await upstream.text();
    return res.end(upstream.ok && !original && upstream.headers.get('content-type')?.includes('text/html')
      ? enhanceMailer(html) : html);
  } catch {
    return res.status(502).end('The mailer could not be loaded. Please refresh or try again shortly.');
  }
}
