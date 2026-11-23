// POST /api/feedback: store one message in the private D1 database bound as FEEDBACK.
//   kind "feedback" (the default): feedback about the Explorer. Email is optional and kept only when the sender ticks the consent box.
//   kind "contact": the contact form on /contact/. Name, email and message are required; email is kept only to reply.
// No IP addresses are stored. Accepts JSON (the scripted forms) or an ordinary form post (the contact form with JavaScript off).
const TYPES = new Set(['error', 'suggestion', 'data', 'other']);
const REASONS = new Set(['speaking', 'press', 'research', 'other']);
const json = (o, status = 200) => new Response(JSON.stringify(o), {status, headers: {'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store'}});
const clean = (v, max) => String(v == null ? '' : v).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '').trim().slice(0, max);
const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

// With JavaScript off the contact form posts normally, so answer with a plain page rather than JSON.
const page = (title, text, status = 200) => new Response(
  `<!doctype html><html lang="en-GB"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>${title} · Mark Dalton</title><link rel="stylesheet" href="/assets/site.css"></head>` +
  `<body class="stone"><main id="main" class="wrap"><div class="prose prose-sheet"><h1>${title}</h1><p>${text}</p><p><a href="/contact/">Back to the contact page</a> · <a href="/">Home</a></p></div></main></body></html>`,
  {status, headers: {'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store'}});

const TABLE = 'CREATE TABLE IF NOT EXISTS feedback (id INTEGER PRIMARY KEY AUTOINCREMENT, created TEXT NOT NULL, type TEXT NOT NULL, message TEXT NOT NULL, email TEXT, page TEXT, urn TEXT, status TEXT NOT NULL DEFAULT \'new\', note TEXT)';
// Columns the contact form needs, added to the same table the first time they are used (existing rows read as kind 'feedback').
const CONTACT_COLUMNS = {kind: "TEXT NOT NULL DEFAULT 'feedback'", name: 'TEXT', organisation: 'TEXT'};

async function ensureContactColumns(db) {
  const {results} = await db.prepare('PRAGMA table_info(feedback)').all();
  const have = new Set((results || []).map((c) => c.name));
  for (const [col, type] of Object.entries(CONTACT_COLUMNS)) {
    if (!have.has(col)) await db.prepare(`ALTER TABLE feedback ADD COLUMN ${col} ${type}`).run();
  }
}

export async function onRequestPost({request, env}) {
  const form = /application\/x-www-form-urlencoded|multipart\/form-data/.test(request.headers.get('content-type') || '');
  const fail = (error, status) => (form ? page('That did not send', error, status) : json({ok: false, error}, status));
  if (!env.FEEDBACK) return fail('Messages are not switched on yet.', 503);
  const origin = request.headers.get('origin') || '';
  if (origin && !/^https:\/\/([a-z0-9-]+\.)?(mrkdltn\.com|mrkdltn-site\.pages\.dev)$/.test(origin)) return fail('Not allowed.', 403);
  let b;
  try { b = form ? Object.fromEntries(await request.formData()) : await request.json(); } catch (e) { return fail('Could not read the message.', 400); }
  const done = () => (form ? page('Thank you', 'Your message has been received. I read every one, and reply where I can.') : json({ok: true}));
  if (b.website) return done(); // honeypot: bots fill the hidden field
  const message = clean(b.message, 4000);
  if (message.length < 5) return fail('Please write a little more.', 400);
  const created = new Date().toISOString(), db = env.FEEDBACK;
  await db.prepare(TABLE).run();

  if (b.kind === 'contact') {
    const name = clean(b.name, 120), email = clean(b.email, 200), organisation = clean(b.organisation, 200);
    const reason = REASONS.has(b.reason) ? b.reason : 'other';
    if (name.length < 2) return fail('Please give your name.', 400);
    if (!EMAIL.test(email)) return fail('That email address does not look right.', 400);
    await ensureContactColumns(db);
    await db.prepare('INSERT INTO feedback (created, kind, type, message, email, name, organisation, page) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
      .bind(created, 'contact', reason, message, email, name, organisation || null, '/contact/').run();
    return done();
  }

  const type = TYPES.has(b.type) ? b.type : 'other';
  const consent = b.consent === true;
  const email = consent ? clean(b.email, 200) : '';
  if (email && !EMAIL.test(email)) return fail('That email address does not look right.', 400);
  const pg = clean(b.page, 300), urn = clean(b.urn, 10).replace(/\D/g, '');
  await db.prepare('INSERT INTO feedback (created, type, message, email, page, urn) VALUES (?, ?, ?, ?, ?, ?)')
    .bind(created, type, message, email || null, pg || null, urn || null).run();
  return done();
}

export async function onRequest() { return json({ok: false, error: 'Use POST.'}, 405); }
