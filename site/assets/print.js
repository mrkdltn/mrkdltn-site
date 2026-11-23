/* Print buttons on articles (kept out of the HTML so the page needs no inline script). */
(function () {
  document.querySelectorAll('[data-print]').forEach(function (b) {
    b.addEventListener('click', function () { window.print(); });
  });
})();
