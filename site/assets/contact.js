/* Contact form: posts to /api/feedback as kind "contact" (private D1 store). Without JavaScript the form posts normally. */
(function () {
  var f = document.getElementById('contact'); if (!f || !window.fetch) return;
  var status = document.getElementById('c-status'), btn = f.querySelector('button[type=submit]');
  var el = function (n) { return f.elements.namedItem(n); };   // not f.name: that is the form's own name
  function say(t, bad) { status.textContent = t; status.className = bad ? 'bad' : ''; }
  f.addEventListener('submit', function (e) {
    e.preventDefault();
    var name = el('name').value.trim(), email = el('email').value.trim(), msg = el('message').value.trim();
    if (name.length < 2) { say('Please give your name.', true); el('name').focus(); return; }
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) { say('That email address does not look right.', true); el('email').focus(); return; }
    if (msg.length < 5) { say('Please write a little more.', true); el('message').focus(); return; }
    var body = { kind: 'contact', name: name, email: email, organisation: el('organisation').value.trim(),
      reason: el('reason').value, message: msg, website: el('website').value };
    btn.disabled = true; say('Sending…');
    fetch('/api/feedback', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) })
      .then(function (r) { return r.json().catch(function () { return {}; }).then(function (j) { return [r.ok && j.ok, j.error]; }); })
      .then(function (res) {
        if (res[0]) { f.reset(); say('Thank you. Your message has been received.'); }
        else say(res[1] || 'Sorry, that did not send. Please try again later.', true);
      })
      .catch(function () { say('Sorry, that did not send. Please check your connection and try again.', true); })
      .then(function () { btn.disabled = false; });
  });
})();
