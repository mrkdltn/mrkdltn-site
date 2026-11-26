// Pages Function: /attendance/group/?k=<kind>&id=<id> serves the one areas-and-trusts page with that place's title and
// share tags, so a link sent to a colleague names the place. No bindings: it reads the site's own files, and falls
// back to the plain page whenever the place cannot be found.
const SH = {t: 16, c: 16, w: 64, y: 1, a: 8};
const KIND = {t: 'the schools of this trust', c: 'schools in this parliamentary constituency', w: 'primary schools in this ward', y: 'schools in this ceremonial county', a: 'schools in this local authority'};

export async function onRequestGet({env, request}) {
  const page = await env.ASSETS.fetch(new URL('/attendance/group/', request.url));
  const u = new URL(request.url), k = u.searchParams.get('k') || '', id = u.searchParams.get('id') || '';
  if (k === 't') return Response.redirect(new URL('/attendance/', request.url).toString(), 302);          // trust pages are not published
  if (!SH[k] || !/^[A-Za-z0-9_-]{1,40}$/.test(id)) return page;
  let g = null;
  try {
    const shard = [...id].reduce((a, c) => a + c.charCodeAt(0), 0) % SH[k];
    const r = await env.ASSETS.fetch(new URL(`/attendance/data/grp/${k}${shard}.json`, request.url));
    if (r.ok) g = (await r.json())[id] || null;
  } catch (e) { /* fall through to the plain page */ }
  if (!g || !g.name) return page;
  const title = `${g.name}: attendance`;
  const desc = `Overall, persistent and severe absence across ${KIND[k]}, ${g.name}, against England and year by year. From the DfE's published statistics.`;
  const url = `https://mrkdltn.com/attendance/group/?k=${k}&id=${encodeURIComponent(id)}`;
  const set = (v) => ({element(e) { e.setAttribute('content', v); }});
  return new HTMLRewriter()
    .on('title', {element(e) { e.setInnerContent(title + ' · Attendance Explorer · Mark Dalton'); }})
    .on('meta[name="description"]', set(desc))
    .on('meta[property="og:title"]', set(title))
    .on('meta[property="og:description"]', set(desc))
    .on('meta[property="og:url"]', set(url))
    .on('link[rel="canonical"]', {element(e) { e.setAttribute('href', url); }})
    .transform(page);
}
