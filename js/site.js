/* Automotores 828 · navegación de sitio y comportamiento mobile-first. */
(function () {
  'use strict';
  var saveData = !!(navigator.connection && navigator.connection.saveData);
  document.documentElement.classList.toggle('save-data', saveData);
  function imageState(img, state) {
    var frame = img.closest('.car-ph');
    if (frame) frame.setAttribute('data-image-state', state);
  }
  document.addEventListener('load', function (event) {
    var img = event.target;
    if (!img || !img.matches || !img.matches('.car-ph img')) return;
    imageState(img, img.naturalWidth > 0 ? 'loaded' : 'error');
  }, true);
  document.addEventListener('error', function (event) {
    var img = event.target;
    if (img && img.matches && img.matches('.car-ph img')) imageState(img, 'error');
  }, true);
  document.querySelectorAll('.car-ph img').forEach(function (img) {
    if (img.complete) imageState(img, img.naturalWidth > 0 ? 'loaded' : 'error');
  });
  /* Banda de inicio real (no ::before, reservado por algunas secciones para sus fondos). */
  Array.prototype.forEach.call(document.querySelectorAll('main>section[id]'), function (section) {
    if (section.querySelector(':scope > .section-damero')) return;
    var banda = document.createElement('span');
    banda.className = 'section-damero';
    banda.setAttribute('aria-hidden', 'true');
    section.insertBefore(banda, section.firstChild);
  });
  /* Entrada editorial: scroll reveal de una sola pasada. El contenido es visible por defecto y solo se oculta
     (html.rv-ready) cuando el observador ya está listo; ante cualquier fallo se recupera la presentación visible. */
  (function () {
    var reducido = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!('IntersectionObserver' in window) || saveData || reducido) return;
    var raiz = document.documentElement;
    var nodos = Array.prototype.slice.call(document.querySelectorAll('section h2, .car, .card, .quick-card, .ct-c, .visit-card, .reveal'));
    if (!nodos.length) return;
    var vivo = false, pendientes = 0, io = null;
    var recuperar = function () {
      raiz.classList.remove('rv-ready');
      nodos.forEach(function (n) { n.classList.add('in'); n.style.transitionDelay = ''; });
      if (io) io.disconnect();
    };
    try {
      io = new IntersectionObserver(function (entries) {
        vivo = true;
        var lote = entries.filter(function (e) { return e.isIntersecting; }).sort(function (a, b) {
          return (a.boundingClientRect.top - b.boundingClientRect.top) || (a.boundingClientRect.left - b.boundingClientRect.left);
        });
        lote.forEach(function (e, k) {
          io.unobserve(e.target);
          var d = (Math.min(k, 4) * 70) + 'ms';
          /* .car transiciona opacity, transform, border-color, box-shadow (damero-secciones.css): el desfase solo va a los dos primeros. */
          e.target.style.transitionDelay = e.target.matches('.car') ? d + ', ' + d + ', 0s, 0s' : d;
          e.target.classList.add('in');
        });
        /* El desfase solo sirve a la entrada: se quita después para no demorar el hover. */
        if (lote.length) setTimeout(function () { lote.forEach(function (e) { e.target.style.transitionDelay = ''; }); }, 1400);
      }, { threshold: 0.12, rootMargin: '0px 0px -5% 0px' });
      var alto = window.innerHeight || document.documentElement.clientHeight;
      nodos.forEach(function (n) {
        n.classList.add('reveal');
        if (n.matches('.car')) n.classList.add('rv-card'); else if (n.matches('section h2')) n.classList.add('rv-title');
        var r = n.getBoundingClientRect();
        if (r.bottom > 0 && r.top < alto * 0.95) { n.classList.add('in'); } else { pendientes++; io.observe(n); }
      });
      raiz.classList.add('rv-ready');
      if (!pendientes) vivo = true;
      setTimeout(function () { if (!vivo) recuperar(); }, 2500);
    } catch (e) { recuperar(); }
  })();
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
    var search = qa.querySelector('#qa-search'), status = qa.querySelector('[data-qa-search-status]');
    function filter() {
      var term = search ? search.value.trim().toLocaleLowerCase() : '', total = 0;
      pan.forEach(function (panel) {
        var count = 0;
        [].slice.call(panel.querySelectorAll('details')).forEach(function (row) {
          var visible = !term || row.textContent.toLocaleLowerCase().indexOf(term) !== -1;
          row.hidden = !visible; if (visible) count++;
        });
        panel.dataset.noMatches = term && !count ? 'true' : 'false'; total += count;
      });
      if (status) status.textContent = term ? (total ? total + ' resultados.' : 'No se encontraron coincidencias.') : '';
      if (term) {
        var idx = pan.findIndex(function (panel) { return panel.querySelector('details:not([hidden])'); });
        if (idx >= 0) ir(idx, false);
      }
    }
    if (search) search.addEventListener('input', filter);
    bar.hidden = false; qa.classList.add('js'); ir(0, false);
    function openQuestionHash() {
      var target = null;
      try { target = location.hash && document.getElementById(decodeURIComponent(location.hash.slice(1))); } catch (e) {}
      if (!target || !qa.contains(target) || !target.matches('details')) return;
      var parentPanel = target.closest('[role="tabpanel"]'), tabIndex = pan.indexOf(parentPanel);
      if (tabIndex >= 0) ir(tabIndex, false);
      target.open = true;
      requestAnimationFrame(function () { target.scrollIntoView({ block: 'center' }); });
    }
    openQuestionHash();
    window.addEventListener('hashchange', openQuestionHash);
    window.addEventListener('load', openQuestionHash, { once: true });
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

/* Saltos por enlace interno. Las secciones con content-visibility:auto (financiación … contacto) miden 800 px estimados hasta que se
   renderizan; un salto calculado con esa estimación aterriza lejos del destino cuando, al llegar, crecen o se encogen. Se renderizan una
   sola vez (dos cuadros) para que el navegador recuerde su altura real (contain-intrinsic-size:auto); después vuelven a omitirse fuera de
   pantalla. Se prepara al apoyar el puntero o enfocar el enlace, antes del clic, así que no hay espera. No intercepta rueda ni gestos;
   la navegación sigue siendo la nativa (ancla, scroll-behavior y scroll-padding-top). */
(function () {
  'use strict';
  var SECCIONES = '#financiacion,#tu-usado,#busqueda,#preguntas,#visita,#contacto,.nz-mapa';
  var estado = 0, lista = [], cola = [];
  function destinoDe(href) {
    if (!href || href.charAt(0) !== '#' || href.length < 2) return null;
    try { return document.getElementById(decodeURIComponent(href.slice(1))); } catch (e) { return null; }
  }
  function anclaDeSeccion(event) {
    var a = event.target && event.target.closest ? event.target.closest('a[href^="#"]') : null;
    return a && afectaAlturas(destinoDe(a.getAttribute('href'))) ? a : null;
  }
  /* Afecta al destino cualquier sección omitida que quede por encima de él: financiación o lo que la sigue en el documento. */
  function afectaAlturas(d) {
    var primera = document.getElementById('financiacion');
    return !!(d && primera && (d === primera || primera.contains(d) || (primera.compareDocumentPosition(d) & Node.DOCUMENT_POSITION_FOLLOWING)));
  }
  function terminar() {
    if (estado === 2) return;
    estado = 2;
    lista.forEach(function (s) { s.style.contentVisibility = ''; });
    var pendientes = cola; cola = [];
    pendientes.forEach(function (fn) { fn(); });
  }
  function preparar() {
    if (estado) return;
    estado = 1;
    try {
      lista = Array.prototype.slice.call(document.querySelectorAll(SECCIONES));
      lista.forEach(function (s) { s.style.contentVisibility = 'visible'; });
      requestAnimationFrame(function () { requestAnimationFrame(terminar); });
      setTimeout(terminar, 400); /* pestaña en segundo plano: no dejar secciones forzadas */
    } catch (e) { terminar(); }
  }
  ['pointerdown', 'focusin'].forEach(function (tipo) {
    document.addEventListener(tipo, function (event) { if (anclaDeSeccion(event)) preparar(); }, true);
  });
  document.addEventListener('click', function (event) {
    if (estado === 2) return;
    var a = anclaDeSeccion(event);
    if (!a || event.button || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || (a.target && a.target !== '_self')) return;
    /* El clic llegó antes de terminar la preparación (clic programático o muy rápido): se difiere la navegación nativa unos cuadros. */
    var href = a.getAttribute('href'), destino = destinoDe(href);
    event.preventDefault();
    preparar();
    cola.push(function () {
      if (window.location.hash === href) destino.scrollIntoView(); else window.location.hash = href;
    });
  }, true);
  /* Carga con #sección en la URL. */
  if (afectaAlturas(destinoDe(window.location.hash))) preparar();
})();
