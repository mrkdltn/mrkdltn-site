/* Attendance Explorer: the section menu that travels down the page, as in the Ofsted Explorer.
   It lists the sections on screen (those marked data-nav and not hidden), keeps the current one underlined,
   and rebuilds itself when a view shows or hides a section. */
(function () {
  const host = document.getElementById('ax-secnav'); if (!host) return;
  let sig = '', io = null, links = [];
  const secs = () => [...document.querySelectorAll('main.ax section[data-nav]')].filter((s) => !s.hidden && s.offsetParent !== null);
  const build = () => {
    const list = secs(); list.forEach((s, i) => { if (!s.id) s.id = 'sec-' + s.dataset.nav.toLowerCase().replace(/[^a-z0-9]+/g, '-'); });
    const now = list.map((s) => s.id).join('|'); if (now === sig) return; sig = now;
    host.innerHTML = ''; links = list.map((s) => { const a = document.createElement('a'); a.href = '#' + s.id; a.textContent = s.dataset.nav;
      a.addEventListener('click', (e) => { e.preventDefault(); s.scrollIntoView({behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start'}); }); host.appendChild(a); return a; });
    if (links[0]) links[0].classList.add('on');
    if (io) io.disconnect();
    if ('IntersectionObserver' in window) { io = new IntersectionObserver((es) => { es.forEach((e) => { if (!e.isIntersecting) return;
      links.forEach((a) => { const on = a.getAttribute('href') === '#' + e.target.id; a.classList.toggle('on', on); if (on && host.scrollWidth > host.clientWidth) host.scrollTo({left: a.offsetLeft - 40, behavior: 'auto'}); }); }); }, {rootMargin: '-20% 0px -70% 0px'});
      list.forEach((s) => io.observe(s)); }
  };
  let t = null; const later = () => { clearTimeout(t); t = setTimeout(build, 200); };
  new MutationObserver(later).observe(document.querySelector('main.ax'), {subtree: true, attributes: true, attributeFilter: ['hidden']});
  addEventListener('load', later); later();
})();
