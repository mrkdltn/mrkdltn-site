// Pages Function: /attendance/school/<urn>/ serves the one school page with that school's title and share tags.
// A static page per school would put the site over Cloudflare's file limit. No bindings: it reads the site's own files.
const SHARDS = 64;
const PHASE = {P: 'primary', S: 'secondary', X: 'special'};

export async function onRequestGet({params, env, request}) {
  const urn = String(params.urn || '');
  const page = await env.ASSETS.fetch(new URL('/attendance/school/', request.url));
  if (!/^\d{5,7}$/.test(urn)) return page;
  let s = null;
  try {
    const r = await env.ASSETS.fetch(new URL(`/attendance/data/sch/${Number(urn) % SHARDS}.json`, request.url));
    if (r.ok) s = (await r.json())[urn] || null;
  } catch (e) { /* fall through to the plain page */ }
  if (!s) return new Response(page.body, {status: 404, headers: page.headers});
  const title = `${s.n}: attendance · Attendance Explorer`;
  const desc = `Absence at ${s.n}${s.town ? ', ' + s.town : ''}, a ${PHASE[s.ph] || ''} school, read against England and its local authority. From the DfE's published statistics.`;
  const url = `https://mrkdltn.com/attendance/school/${urn}/`;
  const set = (v) => ({element(e) { e.setAttribute('content', v); }});
  return new HTMLRewriter()
    .on('title', {element(e) { e.setInnerContent(title + ' · Mark Dalton'); }})
    .on('meta[name="description"]', set(desc))
    .on('meta[property="og:title"]', set(`${s.n}: attendance`))
    .on('meta[property="og:description"]', set(desc))
    .on('meta[property="og:url"]', set(url))
    .on('link[rel="canonical"]', {element(e) { e.setAttribute('href', url); }})
    .transform(page);
}
