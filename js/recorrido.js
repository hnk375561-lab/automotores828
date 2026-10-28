/* Recorrido horizontal fijado dentro de «Unidad destacada»: el scroll vertical mueve el carril de fotos dentro del escenario sticky.
   Scroll nativo (listeners pasivos, un solo rAF pendiente); sin secuestrar rueda ni táctil. El revelado de cada tarjeta (js/historia.js)
   usa .hist-stage como escenario. Medidas cacheadas: sin lecturas de layout por frame.
   Muestra «data-rec-inicial» tarjetas y suma «data-rec-paso» con «Cargar … más» para que el scroll no se haga larguísimo.
   Mientras hay un diálogo abierto (ficha, visor o efecto) NO se remide: un cambio de ancho por la barra de scroll movería la página. */
(function () {
  'use strict';
  /* Botones flotantes: el texto («WhatsApp» / «Coordinar visita») lo dibuja css/recorrido.css; el title nativo se retira para que no se duplique (aria-label queda). */
  [].forEach.call(document.querySelectorAll('.dr-fab a[title]'), function (a) { a.removeAttribute('title'); });
})();
(function () {
  'use strict';
  var RITMO = 0.85;
  var sec = document.querySelector('#unidad-destacada[data-hist-rec]');
  if (!sec) return;
  var stage = sec.querySelector('.hist-stage');
  var region = sec.querySelector('.hist-rec');
  var track = sec.querySelector('.rec__track');
  if (!stage || !region || !track) return;
  var todas = [].slice.call(track.querySelectorAll('.rec__card'));
  var hudN = sec.querySelector('[data-rec-n]');
  var hudTotal = sec.querySelector('[data-rec-total]');
  var hudBar = sec.querySelector('[data-rec-bar]');
  var btnMas = sec.querySelector('[data-rec-mas]');
  var cuenta = sec.querySelector('[data-rec-cuenta]');
  var mq = window.matchMedia('(prefers-reduced-motion: reduce)');
  var html = document.documentElement;
  var paso = Math.max(1, parseInt(region.getAttribute('data-rec-paso'), 10) || 3);
  var visibles = Math.min(todas.length, Math.max(2, parseInt(region.getAttribute('data-rec-inicial'), 10) || todas.length));
  var cards = todas.slice(0, visibles);
  var travel = 0, fw = 1, sh = 1, centros = [], pending = 0, pinned = false, ro = null, io = null, mo = null, ultimoN = -1, visible = true, remedirPendiente = false;

  function clamp01(v) { return v < 0 ? 0 : v > 1 ? 1 : v; }
  function n2(n) { return (n < 10 ? '0' : '') + n; }
  function gamaBaja() {
    var n = navigator;
    return (n.hardwareConcurrency && n.hardwareConcurrency <= 2) || (n.deviceMemory && n.deviceMemory <= 2);
  }
  function soportaSticky() { return !(window.CSS && CSS.supports) || CSS.supports('position', 'sticky'); }
  function bloqueado() { return html.classList.contains('hist-lock') || html.classList.contains('has-dlg'); }
  function medir() {
    sh = stage.clientHeight || window.innerHeight;
    fw = region.clientWidth || 1;
    travel = Math.max(0, track.scrollWidth - fw);
    centros = cards.map(function (c) { return c.offsetLeft + c.offsetWidth / 2; });
    /* alto de la pista: escenario + recorrido (scrollWidth real, nunca un múltiplo fijo del viewport) */
    var vh = window.innerHeight;
    var h = sh + Math.min(Math.max(travel * RITMO, 0.9 * vh), 7 * vh);
    sec.style.height = Math.round(h) + 'px';
  }
  function limpiar() {
    sec.style.height = '';
    track.style.transform = '';
    todas.forEach(function (c) { c.style.removeProperty('--s'); c.style.removeProperty('--b'); });
    if (hudBar) hudBar.style.transform = '';
    ultimoN = -1;
  }
  /* El título de la sección acompaña a la unidad que está al centro: «Marca Modelo» en blanco y el resto (año) en rojo, igual que el título original. */
  var titulo = sec.querySelector('#hist-t');
  var tituloOriginal = titulo ? titulo.innerHTML : '';
  var tituloId = null;
  function pintarTitulo(card) {
    if (!titulo || !card) return;
    var id = card.getAttribute('data-hist-unit') || '';
    if (id === tituloId) return;
    tituloId = id;
    if (card.classList.contains('rec__card--main')) { titulo.innerHTML = tituloOriginal; return; }
    var w = card.querySelector('.rec__word'), sub = card.querySelector('.rec__sub');
    var marca = '', anio = '';
    (sub ? sub.textContent.split(' · ') : []).forEach(function (t) {
      t = t.trim();
      if (/^\d{4}$/.test(t)) anio = t; else if (t && !/km$/i.test(t) && !marca) marca = t;
    });
    var palabras = [marca, w ? w.textContent : '', anio].join(' ').split(/\s+/).filter(Boolean);
    if (!palabras.length) return;
    titulo.textContent = palabras.slice(0, 2).join(' ');
    if (palabras.length > 2) {
      titulo.appendChild(document.createTextNode(' '));
      var em = document.createElement('em');
      em.textContent = palabras.slice(2).join(' ');
      titulo.appendChild(em);
    }
  }
  /* Ficha en foco: nítida e iluminada (is-act); vecinas con leve desenfoque (is-cerca); el resto más difuminado (is-lejos). */
  function marcarFoco(i) {
    for (var k = 0; k < todas.length; k++) {
      var c = todas[k], d = Math.abs(k - i), cl = c.classList;
      cl.toggle('is-act', d === 0);
      cl.toggle('is-cerca', d === 1);
      cl.toggle('is-lejos', d > 1);
    }
  }
  function marcarActual(i) {
    if (!cards[i]) return;
    marcarFoco(i);
    sec.setAttribute('data-rec-actual', cards[i].getAttribute('data-hist-unit') || '');
    pintarTitulo(cards[i]);
  }
  function pintar() {
    pending = 0;
    if (!pinned || !visible) return;
    var span = sec.offsetHeight - sh;
    var p = span > 0 ? clamp01(-sec.getBoundingClientRect().top / span) : 0;
    var x = p * travel;
    track.style.transform = 'translate3d(' + (-x) + 'px,0,0)';
    var mejor = 0, dmin = 9;
    for (var i = 0; i < cards.length; i++) {
      var d = (centros[i] - x - fw / 2) / fw;
      var a = Math.min(1, Math.abs(d));
      cards[i].style.setProperty('--s', (1 - 0.07 * a).toFixed(4));
      cards[i].style.setProperty('--b', (1 - 0.55 * a).toFixed(3));
      if (a < dmin) { dmin = a; mejor = i; }
    }
    if (hudBar) hudBar.style.transform = 'scaleX(' + p.toFixed(4) + ')';
    if (mejor !== ultimoN) { ultimoN = mejor; if (hudN) hudN.textContent = n2(mejor + 1); marcarActual(mejor); }
  }
  function pedir() { if (!pending) pending = requestAnimationFrame(pintar); }
  function remedir() {
    if (!pinned) return;
    if (bloqueado()) { remedirPendiente = true; return; }
    remedirPendiente = false;
    medir(); pedir();
  }
  function cargarFotos(lista) { lista.forEach(function (c) { var im = c.querySelector('img'); if (im && im.loading === 'lazy') im.loading = 'eager'; }); }

  /* ---- límite de tarjetas y «Cargar … más» ---- */
  function plantilla(el, vars) {
    var t = el.getAttribute('data-txt') || '';
    return t.replace(/\{(\w+)\}/g, function (m, k) { return vars[k] != null ? vars[k] : m; });
  }
  function pintarLimite() {
    todas.forEach(function (c, i) { c.hidden = i >= visibles; });
    if (hudTotal) hudTotal.textContent = n2(visibles);
    if (btnMas) {
      var resto = todas.length - visibles;
      btnMas.hidden = resto <= 0;
      if (resto > 0) btnMas.textContent = plantilla(btnMas, { n: Math.min(paso, resto) });
    }
  }
  function posicionDe(card) {
    var span = sec.offsetHeight - sh;
    var objetivo = travel > 0 ? clamp01((card.offsetLeft + card.offsetWidth / 2 - fw / 2) / travel) : 0;
    return sec.getBoundingClientRect().top + window.pageYOffset + objetivo * span;
  }
  function cargarMas() {
    if (visibles >= todas.length) return;
    var antes = visibles;
    visibles = Math.min(todas.length, visibles + paso);
    cards = todas.slice(0, visibles);
    cargarFotos(cards);
    pintarLimite();
    ultimoN = -1;
    var primera = todas[antes];
    if (pinned) { medir(); pedir(); }
    if (cuenta && btnMas) {
      var ag = btnMas.getAttribute('data-txt-agregadas') || '';
      cuenta.textContent = ag.replace(/\{(\w+)\}/g, function (m, k) { return ({ n: visibles - antes, a: visibles, b: todas.length })[k]; });
    }
    /* se lleva la vista a la primera tarjeta nueva y el foco la acompaña (el botón puede desaparecer al llegar al total) */
    if (primera) {
      if (pinned) window.scrollTo({ top: posicionDe(primera), behavior: mq.matches ? 'auto' : 'smooth' });
      else { try { region.scrollTo({ left: Math.max(0, primera.offsetLeft - 24), behavior: mq.matches ? 'auto' : 'smooth' }); } catch (e) { region.scrollLeft = Math.max(0, primera.offsetLeft - 24); } }
      try { primera.focus({ preventScroll: true }); } catch (e) {}
    }
  }

  /* sin pin: la tarjeta «actual» es la más cercana al centro de la región */
  function actualEstatico() {
    if (pinned) return;
    var c = region.scrollLeft + region.clientWidth / 2, mejor = 0, dmin = 1e9;
    cards.forEach(function (card, i) {
      var d = Math.abs(card.offsetLeft + card.offsetWidth / 2 - c);
      if (d < dmin) { dmin = d; mejor = i; }
    });
    marcarActual(mejor);
  }

  function activar() {
    if (pinned) return;
    pinned = true;
    sec.setAttribute('data-rec', 'pin');
    region.removeAttribute('tabindex');
    region.scrollLeft = 0;
    window.addEventListener('scroll', pedir, { passive: true });
    window.addEventListener('resize', remedir, { passive: true });
    if (window.ResizeObserver) { ro = new ResizeObserver(remedir); ro.observe(region); ro.observe(track); }
    if ('MutationObserver' in window) {
      /* al cerrar el diálogo (cambia la clase de <html>) se completa la medición que quedó en espera */
      mo = new MutationObserver(function () { if (remedirPendiente && !bloqueado()) remedir(); });
      mo.observe(html, { attributes: true, attributeFilter: ['class'] });
    }
    if ('IntersectionObserver' in window) {
      io = new IntersectionObserver(function (es) {
        visible = es.some(function (e) { return e.isIntersecting; });
        if (visible) { cargarFotos(cards); pedir(); }
      }, { rootMargin: '150% 0px' });
      io.observe(sec);
    }
    track.addEventListener('load', remedir, true);
    medir(); pedir();
  }
  function desactivar() {
    if (!pinned) return;
    pinned = false;
    sec.removeAttribute('data-rec');
    region.setAttribute('tabindex', '0');
    window.removeEventListener('scroll', pedir);
    window.removeEventListener('resize', remedir);
    track.removeEventListener('load', remedir, true);
    if (ro) { ro.disconnect(); ro = null; }
    if (io) { io.disconnect(); io = null; }
    if (mo) { mo.disconnect(); mo = null; }
    if (pending) { cancelAnimationFrame(pending); pending = 0; }
    limpiar();
    actualEstatico();
  }
  function aplicar() { if (mq.matches || gamaBaja() || !soportaSticky()) desactivar(); else activar(); }

  /* El foco POR TECLADO en una tarjeta lleva el scroll de la página a su posición, sin desplazar el carril (con mouse/táctil no: el clic no debe mover nada). */
  track.addEventListener('focusin', function (e) {
    if (!pinned) return;
    region.scrollLeft = 0;
    var card = e.target.closest && e.target.closest('.rec__card');
    if (!card || travel <= 0) return;
    try { if (!card.matches(':focus-visible')) return; } catch (err) {}
    window.scrollTo(0, posicionDe(card));
  });
  region.addEventListener('scroll', function () { if (!pinned) actualEstatico(); }, { passive: true });
  if (btnMas) btnMas.addEventListener('click', cargarMas);

  if (mq.addEventListener) mq.addEventListener('change', aplicar); else if (mq.addListener) mq.addListener(aplicar);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(remedir);
  window.addEventListener('load', remedir);
  window.addEventListener('pagehide', function () {
    desactivar();
    if (mq.removeEventListener) mq.removeEventListener('change', aplicar);
  });
  if (gamaBaja()) sec.setAttribute('data-rec-lite', '');
  sec.setAttribute('data-rec-lim', '');
  pintarLimite();
  marcarActual(0);
  aplicar();
  actualEstatico();
})();
