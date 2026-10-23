/* Automotores 828 · navegación de sitio y comportamiento mobile-first. */
(function () {
  'use strict';
  var saveData = !!(navigator.connection && navigator.connection.saveData);
  document.documentElement.classList.toggle('save-data', saveData);
  /* Banda de inicio real (no ::before, reservado por algunas secciones para sus fondos). */
  Array.prototype.forEach.call(document.querySelectorAll('main>section[id]'), function (section) {
    if (section.querySelector(':scope > .section-damero')) return;
    var banda = document.createElement('span');
    banda.className = 'section-damero';
    banda.setAttribute('aria-hidden', 'true');
    section.insertBefore(banda, section.firstChild);
  });
  /* Entrada editorial: reveal progresivo sin bloquear el contenido. */
  if ('IntersectionObserver' in window && !saveData && !(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches)) {
    var revealObserver = new IntersectionObserver(function (entries) { entries.forEach(function (entry) { if (entry.isIntersecting) { entry.target.classList.add('in'); revealObserver.unobserve(entry.target); } }); }, { threshold: 0.15 });
    document.querySelectorAll('section h2, .car, .card, .quick-card, .ct-c, .visit-card, .reveal').forEach(function (node, index) {
      node.classList.add('reveal');
      node.style.transitionDelay = (Math.min(index % 6, 5) * 60) + 'ms';
      revealObserver.observe(node);
    });
  }
  /* Guía: acordeones. Arranca plegada; botón para expandir o plegar todo. */
  (function () {
    var gds = Array.prototype.slice.call(document.querySelectorAll('details.gd')), all = document.querySelector('[data-guia-all]');
    if (!gds.length) return;
    gds.forEach(function (d) { d.removeAttribute('open'); });
    if (!all) return;
    var sync = function () { all.textContent = gds.some(function (d) { return d.open; }) ? 'Plegar todo' : 'Expandir todo'; };
    all.hidden = false; sync();
    all.addEventListener('click', function () { var abrir = !gds.some(function (d) { return d.open; }); gds.forEach(function (d) { d.open = abrir; }); sync(); });
    gds.forEach(function (d) { d.addEventListener('toggle', sync); });
  })();
  /* Preguntas: pestañas «Preguntas frecuentes» / «Glosario» para que la sección ocupe una sola lista. Sin JavaScript se ven las dos. */
  (function () {
    var qa = document.querySelector('[data-qa]'); if (!qa) return;
    var tabs = [].slice.call(qa.querySelectorAll('[role="tab"]')), bar = qa.querySelector('.qa-tabs');
    if (tabs.length < 2 || !bar) return;
    var pan = tabs.map(function (t) { return document.getElementById(t.getAttribute('aria-controls')); });
    function ir(k, foco) {
      tabs.forEach(function (t, j) { var on = j === k; t.setAttribute('aria-selected', on ? 'true' : 'false'); t.tabIndex = on ? 0 : -1; if (pan[j]) pan[j].hidden = !on; });
      if (foco) tabs[k].focus();
    }
    bar.hidden = false; qa.classList.add('js'); ir(0, false);
    tabs.forEach(function (t, k) {
      t.addEventListener('click', function () { ir(k, false); });
      t.addEventListener('keydown', function (e) {
        var d = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
        if (d) { e.preventDefault(); ir((k + d + tabs.length) % tabs.length, true); }
      });
    });
  })();
  var toggle = document.querySelector('[data-menu-toggle]');
  var nav = document.querySelector('.site-nav');
  if (!toggle || !nav) return;
  var syncA11y = function (open) {
    var mobile = window.innerWidth <= 980;
    var expanded = mobile && open;
    nav.setAttribute('aria-hidden', mobile && !expanded ? 'true' : 'false');
    if ('inert' in nav) nav.inert = mobile && !expanded;
    toggle.setAttribute('aria-expanded', expanded ? 'true' : 'false');
  };
  var close = function () {
    document.documentElement.classList.remove('menu-open');
    syncA11y(false);
  };
  var open = function () {
    document.documentElement.classList.add('menu-open');
    syncA11y(true);
  };
  toggle.addEventListener('click', function () {
    toggle.getAttribute('aria-expanded') === 'true' ? close() : open();
  });
  syncA11y(false);
  nav.addEventListener('click', function (event) {
    if (event.target.closest('a')) close();
  });
  document.querySelectorAll('.nav-more').forEach(function (more) { more.addEventListener('toggle', function () { if (more.open) document.querySelectorAll('.nav-more').forEach(function (other) { if (other !== more) other.removeAttribute('open'); }); }); });
  document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape') { close(); toggle.focus(); }
  });
  document.addEventListener('click', function (event) {
    if (document.documentElement.classList.contains('menu-open') && !event.target.closest('header')) close();
  });
  window.addEventListener('resize', function () {
    if (window.innerWidth > 980) close();
    else syncA11y(toggle.getAttribute('aria-expanded') === 'true');
  }, { passive: true });
})();

/* Menú fijo: transparente sobre el hero y sólido al scrollear */
(function () {
  var h = document.querySelector('header.site-header--home'); if (!h) return;
  var t = 0;
  function f() { t = 0; h.classList.toggle('is-scrolled', (window.scrollY || document.documentElement.scrollTop) > 24); }
  window.addEventListener('scroll', function () { if (!t) t = requestAnimationFrame(f); }, { passive: true });
  f();
})();
