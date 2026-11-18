// POST /api/feedback: store one piece of feedback about the Explorer in the private D1 database bound as FEEDBACK.
// No IP addresses are stored. Email is optional and kept only when the sender ticks the consent box.
const TYPES = new Set(['error', 'suggestion', 'data', 'other']);
const json = (o, status = 200) => new Response(JSON.stringify(o), {status, headers: {'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store'}});
const clean = (v, max) => String(v == null ? '' : v).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '').trim().slice(0, max);

export async function onRequestPost({request, env}) {
  if (!env.FEEDBACK) return json({ok: false, error: 'Feedback is not switched on yet.'}, 503);
  const origin = request.headers.get('origin') || '';
  if (origin && !/^https:\/\/([a-z0-9-]+\.)?(mrkdltn\.com|mrkdltn-site\.pages\.dev)$/.test(origin)) return json({ok: false, error: 'Not allowed.'}, 403);
  let b; try { b = await request.json(); } catch (e) { return json({ok: false, error: 'Could not read the message.'}, 400); }
  if (b.website) return json({ok: true}); // honeypot: bots fill the hidden field
  const type = TYPES.has(b.type) ? b.type : 'other';
  const message = clean(b.message, 4000);
  if (message.length < 5) return json({ok: false, error: 'Please write a little more.'}, 400);
  const consent = b.consent === true;
  const email = consent ? clean(b.email, 200) : '';
  if (email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return json({ok: false, error: 'That email address does not look right.'}, 400);
  const page = clean(b.page, 300), urn = clean(b.urn, 10).replace(/\D/g, '');
  await env.FEEDBACK.prepare('CREATE TABLE IF NOT EXISTS feedback (id INTEGER PRIMARY KEY AUTOINCREMENT, created TEXT NOT NULL, type TEXT NOT NULL, message TEXT NOT NULL, email TEXT, page TEXT, urn TEXT, status TEXT NOT NULL DEFAULT \'new\', note TEXT)').run();
  await env.FEEDBACK.prepare('INSERT INTO feedback (created, type, message, email, page, urn) VALUES (?, ?, ?, ?, ?, ?)')
    .bind(new Date().toISOString(), type, message, email || null, page || null, urn || null).run();
  return json({ok: true});
}

export async function onRequest() { return json({ok: false, error: 'Use POST.'}, 405); }
