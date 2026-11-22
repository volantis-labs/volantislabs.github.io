// Serves the static site. Handles the iOS and Apple Watch waitlist at /api/waitlist.
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_BODY = 4096;

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === '/api/waitlist') return waitlist(request, env);
    return env.ASSETS.fetch(request);
  },
};

async function waitlist(request, env) {
  if (request.method !== 'POST') return json({ error: 'Use POST.' }, 405, { Allow: 'POST' });
  if (!env.TURNSTILE_SECRET) return json({ error: 'The waitlist is not available. Try again later.' }, 500);

  let body;
  try {
    const text = await request.text();
    if (text.length > MAX_BODY) return json({ error: 'The request is too large.' }, 413);
    body = JSON.parse(text);
  } catch {
    return json({ error: 'The request is not valid.' }, 400);
  }

  const email = String(body?.email ?? '').trim().toLowerCase();
  if (email.length > 254 || !EMAIL.test(email)) return json({ error: 'Enter a valid email address.' }, 400);
  if (body.consent !== true) return json({ error: 'Agree to get an email when the app is ready.' }, 400);
  if (!(await isHuman(String(body.token ?? ''), request, env))) {
    return json({ error: 'The verification check failed. Try again.' }, 403);
  }

  try {
    // A known email gets the same reply, so the API does not show who is on the list.
    await env.DB.prepare('INSERT INTO waitlist (email) VALUES (?) ON CONFLICT (email) DO NOTHING').bind(email).run();
  } catch (err) {
    console.error('waitlist insert failed', err);
    return json({ error: 'Something went wrong. Try again later.' }, 500);
  }
  return json({ ok: true });
}

async function isHuman(token, request, env) {
  if (!token) return false;
  const form = new FormData();
  form.append('secret', env.TURNSTILE_SECRET);
  form.append('response', token);
  const ip = request.headers.get('CF-Connecting-IP');
  if (ip) form.append('remoteip', ip);
  try {
    const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', { method: 'POST', body: form });
    const out = await res.json();
    return out.success === true;
  } catch {
    return false;
  }
}

function json(data, status = 200, headers = {}) {
  return Response.json(data, { status, headers: { 'Cache-Control': 'no-store', ...headers } });
}
