import { afterEach, expect, it, vi } from 'vitest';
import { Readable } from 'node:stream';
import handler, { enhanceMailer } from '../api/admin-mailer-ui.js';

function response() {
  return { headers: {}, code: 200, setHeader(key,value) { this.headers[key.toLowerCase()] = value; },
    status(code) { this.code = code; return this; }, end(body) { this.body = body; return this; } };
}
function request(method='GET', url='/admin/mailer/?audience=no_reply', body='') {
  const req = Readable.from(body ? [Buffer.from(body)] : []);
  Object.assign(req, { method, url, headers: { cookie: 'sessionid=synthetic', 'content-type': 'application/x-www-form-urlencoded', origin: 'https://myselfpay.onesmarter.com' } });
  return req;
}
afterEach(() => vi.unstubAllGlobals());
it('enhances only mailer HTML, leaving the login page unchanged', () => {
  const html = '<html><head><script src="/admin-assets/selfpay-admin/mailer.js" defer></script></head><body class="mailer-directory"><form id="mailer-compose"></form></body></html>';
  expect(enhanceMailer(html)).toContain('/mailer-workspace.js');
  expect(enhanceMailer(html)).not.toContain('/selfpay-admin/mailer.js');
  expect(enhanceMailer('<h1>Admin login</h1>')).toBe('<h1>Admin login</h1>');
});
it('keeps login redirects and cookies, never caches authenticated HTML', async () => {
  const fetcher = vi.fn().mockResolvedValue(new Response('', { status: 302, headers: { location: 'https://myselfpaybackend.onesmarter.com/admin/login/?next=/admin/mailer/', 'set-cookie': 'csrftoken=synthetic; Secure; HttpOnly' } }));
  vi.stubGlobal('fetch', fetcher); const res=response(); await handler(request(), res);
  expect(res.code).toBe(302); expect(res.headers.location).toBe('/admin/login/?next=/admin/mailer/');
  expect(res.headers['cache-control']).toBe('private, no-store');
  expect(res.headers['set-cookie']).toHaveLength(1);
  expect(fetcher.mock.calls[0][1].headers.cookie).toBe('sessionid=synthetic');
  expect(fetcher.mock.calls[0][1].redirect).toBe('manual');
});
it('forwards POST body and origin unchanged; keeps CSRF rejection', async () => {
  const fetcher=vi.fn().mockResolvedValue(new Response('CSRF rejected', { status:403 }));
  vi.stubGlobal('fetch',fetcher); const res=response();
  await handler(request('POST','/admin/mailer/','action=preview&selected_contacts=1&selected_contacts=2&csrfmiddlewaretoken=synthetic'),res);
  expect(res.code).toBe(403); expect(res.body).toBe('CSRF rejected');
  expect(fetcher.mock.calls[0][1].body.toString()).toContain('selected_contacts=1&selected_contacts=2');
  expect(fetcher.mock.calls[0][1].headers.origin).toBe('https://myselfpay.onesmarter.com');
});
it('locks the upstream URL and removes presentation-only query parameters', async () => {
  const fetcher=vi.fn().mockResolvedValue(new Response('<head></head><main class="mailer-directory" id="mailer-compose"></main>', {headers:{'content-type':'text/html'}}));
  vi.stubGlobal('fetch',fetcher); const res=response(); await handler(request('GET','/api/admin-mailer-ui?audience=never&__mailer_original=1&url=https://evil.test'),res);
  expect(fetcher.mock.calls[0][0].origin).toBe('https://myselfpaybackend.onesmarter.com');
  expect(fetcher.mock.calls[0][0].pathname).toBe('/admin/mailer/');
  expect(fetcher.mock.calls[0][0].searchParams.has('__mailer_original')).toBe(false);
  expect(res.body).not.toContain('/mailer-workspace.js');
});
it('returns a useful noncached failure without leaking credentials', async () => {
  vi.stubGlobal('fetch',vi.fn().mockRejectedValue(new Error('sensitive'))); const res=response();
  await handler(request(),res); expect(res.code).toBe(502); expect(res.body).not.toContain('sensitive');
});
