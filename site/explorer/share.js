/* Per-view sharing (benchmarks item 7, 23 November 2026).
   A shared link carries the view (the page's address and its settings after '#') and a stamp, v=DATE.RESULTS[.INSPECTION]:
   the day it was shared, a fingerprint of the results file it was read from, and on a school page the date of that
   school's inspection. Opened later, the page compares the stamp with today's data and says plainly when the results
   have been rebuilt, or the school has a newer report card, since the link was made. A link with no stamp, or one whose
   data are unchanged, shows nothing.
   OEshare.button(el, {url, title, insp}) turns a button into "Share this view"; OEshare.check({insp, host}) shows the notice. */
(() => {
  const got = new URLSearchParams(location.hash.slice(1)).get('v') || '';  // read before the page rewrites its address
  if (got) { const h = new URLSearchParams(location.hash.slice(1)); h.delete('v'); const t = h.toString(); history.replaceState(null, '', location.pathname + location.search + (t ? '#' + t : '')); }  // the stamp is read once; a copied address is not stale
  const build = fetch('/explorer/data/build.json', {cache: 'no-cache'}).then((r) => (r.ok ? r.json() : null)).catch(() => null);
  const fp = (b) => ((b && b.sources && b.sources['ks4_model_v3.csv']) || '').slice(0, 8);
  const d8 = (s) => String(s || '').replace(/\D/g, '').slice(0, 8);
  const long = (s) => { const d = d8(s); return d.length === 8 ? new Date(d.slice(0, 4) + '-' + d.slice(4, 6) + '-' + d.slice(6) + 'T12:00:00Z').toLocaleDateString('en-GB', {day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC'}) : ''; };
  const today = () => new Date().toLocaleDateString('en-CA', {timeZone: 'Europe/London'});

  const css = document.createElement('style');
  css.textContent = '.oe-stale{font:400 15px/1.5 var(--sans,system-ui);background:#fff;color:#0B1A2E;border-left:3px solid #C9A24B;padding:12px 44px 12px 16px;margin:0 0 18px;position:relative}' +
    '.oe-stale a{color:#7A5C14}.oe-stale button{position:absolute;top:6px;right:6px;border:0;background:none;font:inherit;font-size:20px;line-height:1;color:#55627A;cursor:pointer;min-width:32px;min-height:32px}' +
    '.oe-stale button:focus-visible{outline:2px solid #C9A24B}';
  document.head.append(css);

  // stamp a link: the address without any old stamp, plus today's
  const stamp = async (url, insp) => { const b = await build; const u = new URL(url, location.origin); const h = new URLSearchParams(u.hash.slice(1)); h.delete('v');
    const f = fp(b); if (f) h.set('v', d8(today()) + '.' + f + (insp === undefined ? '' : '.' + (d8(insp) || '0')));
    const s = h.toString(); return u.origin + u.pathname + (s ? '#' + s : ''); };

  const button = (el, o) => { if (!el) return; const label = el.textContent;
    el.addEventListener('click', async () => { const url = await stamp(o.url(), o.insp ? o.insp() : undefined);
      const phone = window.matchMedia && matchMedia('(pointer: coarse)').matches;
      if (phone && navigator.share) { try { await navigator.share({title: o.title ? o.title() : document.title, url}); return; } catch (e) { if (e && e.name === 'AbortError') return; } }
      try { await navigator.clipboard.writeText(url); el.textContent = 'Link copied'; } catch (e) { window.prompt('Copy this link', url); }
      setTimeout(() => { el.textContent = label; }, 1800); }); };

  // the notice; o.insp() gives this school's inspection date now ('' if none), o.host where to put it
  const check = async (o) => { if (!got) return; const p = got.split('.'); if (p.length < 2 || d8(p[0]).length !== 8) return; const b = await build; if (!b) return;
    const when = long(p[0]), msgs = [];
    if (p[1] && fp(b) && p[1] !== fp(b)) msgs.push('The results data have been rebuilt since this link was shared on ' + when + ', so some figures may differ from the ones it was shared for. These are the latest.');
    if (p.length > 2 && o.insp) { const now = d8(o.insp()); if (now && now !== p[2]) msgs.push('This school has a newer report card (inspected ' + long(now) + ') than when this link was shared on ' + when + '. The grades shown are from it.'); }
    if (!msgs.length) return; const host = typeof o.host === 'string' ? document.querySelector(o.host) : o.host; if (!host) return;
    const box = document.createElement('div'); box.className = 'oe-stale noprint'; box.setAttribute('role', 'status');
    const t = document.createElement('p'); t.style.margin = '0'; t.textContent = msgs.join(' ') + ' ';
    const a = document.createElement('a'); a.href = '/explorer/updates/'; a.textContent = 'What has changed'; t.append(a, '.');
    const x = document.createElement('button'); x.type = 'button'; x.setAttribute('aria-label', 'Close this notice'); x.textContent = '×'; x.addEventListener('click', () => box.remove());
    box.append(t, x); host.prepend(box); };

  window.OEshare = {button, check, stamp};
})();
