/* Feedback form: posts to /api/feedback (Pages Function, private D1 store). Attaches the page and the school being viewed. */
(function () {
  const f = document.getElementById('oe-fb'); if (!f) return;
  const consent = document.getElementById('oe-fb-consent'), email = document.getElementById('oe-fb-email'), status = document.getElementById('oe-fb-status'), btn = f.querySelector('button[type=submit]');
  consent.addEventListener('change', () => { email.disabled = !consent.checked; if (consent.checked) email.focus(); else email.value = ''; });
  const say = (t, bad) => { status.textContent = t; status.className = bad ? 'bad' : ''; };
  f.addEventListener('submit', async (e) => {
    e.preventDefault();
    const msg = f.message.value.trim(); if (msg.length < 5) { say('Please write a little more.', true); f.message.focus(); return; }
    let urn = ''; try { const s = dash.data('school'); if (s.status === 'ok' && s.data && s.data[0]) urn = s.data[0].urn; } catch (err) {}
    const body = {type: f.type.value, message: msg, consent: consent.checked, email: consent.checked ? email.value.trim() : '', page: location.pathname + location.hash, urn, website: f.website.value};
    btn.disabled = true; say('Sending…');
    try {
      const r = await fetch('/api/feedback', {method: 'POST', headers: {'content-type': 'application/json'}, body: JSON.stringify(body)});
      const j = await r.json().catch(() => ({}));
      if (r.ok && j.ok) { f.reset(); email.disabled = true; say('Thank you. Your message has been received.'); }
      else say(j.error || 'Sorry, that did not send. Please try again later.', true);
    } catch (err) { say('Sorry, that did not send. Please check your connection and try again.', true); }
    btn.disabled = false;
  });
})();
