/* Recorrido horizontal fijado dentro de «Unidad destacada»: el scroll vertical mueve el carril de fotos dentro del escenario sticky.
   Scroll nativo (listeners pasivos, un solo rAF pendiente); sin secuestrar rueda ni táctil. El revelado de «Conocé esta unidad» (js/historia.js)
   sigue usando .hist-stage como escenario. Medidas cacheadas: sin lecturas de layout por frame. */
(function () {
  'use strict';
  var RITMO = 0.85;
  var sec = document.querySelector('#unidad-destacada[data-hist-rec]');
  if (!sec) return;
  var stage = sec.querySelector('.hist-stage');
  var region = sec.querySelector('.hist-rec');
  var track = sec.querySelector('.rec__track');
  if (!stage || !region || !track) return;
  var cards = [].slice.call(track.querySelectorAll('.rec__card'));
  var imgs = cards.map(function (c) { return c.querySelector('.rec__photo img'); });
  var hudN = sec.querySelector('[data-rec-n]');
  var hudBar = sec.querySelector('[data-rec-bar]');
  var mq = window.matchMedia('(prefers-reduced-motion: reduce)');
  var travel = 0, fw = 1, sh = 1, centros = [], pending = 0, pinned = false, ro = null, io = null, ultimoN = -1, visible = true;

  function clamp01(v) { return v < 0 ? 0 : v > 1 ? 1 : v; }
  function gamaBaja() {
    var n = navigator;
    return (n.hardwareConcurrency && n.hardwareConcurrency <= 2) || (n.deviceMemory && n.deviceMemory <= 2);
  }
  function soportaSticky() { return !(window.CSS && CSS.supports) || CSS.supports('position', 'sticky'); }
  function medir() {
    sh = stage.clientHeight || window.innerHeight;
    fw = region.clientWidth || 1;
    travel = Math.max(0, track.scrollWidth - fw);
    centros = cards.map(function (c) { return c.offsetLeft + c.offsetWidth / 2; });
    /* alto de la pista: escenario + recorrido (scrollWidth real, nunca un múltiplo fijo del viewport) */
    var vh = window.innerHeight;
    var h = Math.min(Math.max(sh + travel * RITMO, 3.5 * vh), 8 * vh);
    sec.style.height = Math.round(h) + 'px';
  }
  function limpiar() {
    sec.style.height = '';
    track.style.transform = '';
    cards.forEach(function (c, i) {
      c.style.removeProperty('--s'); c.style.removeProperty('--b');
      if (imgs[i]) imgs[i].style.transform = '';
    });
    if (hudBar) hudBar.style.transform = '';
    ultimoN = -1;
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
      if (imgs[i]) imgs[i].style.transform = 'translate3d(' + (-d * 6).toFixed(2) + '%,0,0) scale(1.12)';
      if (a < dmin) { dmin = a; mejor = i; }
    }
    if (hudBar) hudBar.style.transform = 'scaleX(' + p.toFixed(4) + ')';
    if (hudN && mejor !== ultimoN) { ultimoN = mejor; hudN.textContent = (mejor + 1 < 10 ? '0' : '') + (mejor + 1); }
  }
  function pedir() { if (!pending) pending = requestAnimationFrame(pintar); }
  function remedir() { if (!pinned) return; medir(); pedir(); }
  function cargarTodas() { cards.forEach(function (c) { var im = c.querySelector('img'); if (im && im.loading === 'lazy') im.loading = 'eager'; }); }

  function activar() {
    if (pinned) return;
    pinned = true;
    sec.setAttribute('data-rec', 'pin');
    region.removeAttribute('tabindex');
    region.scrollLeft = 0;
    window.addEventListener('scroll', pedir, { passive: true });
    window.addEventListener('resize', remedir, { passive: true });
    if (window.ResizeObserver) { ro = new ResizeObserver(remedir); ro.observe(region); ro.observe(track); }
    if ('IntersectionObserver' in window) {
      io = new IntersectionObserver(function (es) {
        visible = es.some(function (e) { return e.isIntersecting; });
        if (visible) { cargarTodas(); pedir(); }
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
    if (pending) { cancelAnimationFrame(pending); pending = 0; }
    limpiar();
  }
  function aplicar() { if (mq.matches || gamaBaja() || !soportaSticky()) desactivar(); else activar(); }

  /* El foco por teclado en una tarjeta lleva el scroll de la página a su posición, sin desplazar el carril. */
  track.addEventListener('focusin', function (e) {
    if (!pinned) return;
    region.scrollLeft = 0;
    var card = e.target.closest && e.target.closest('.rec__card');
    if (!card || travel <= 0) return;
    var span = sec.offsetHeight - sh;
    var objetivo = clamp01((card.offsetLeft + card.offsetWidth / 2 - fw / 2) / travel);
    var top = sec.getBoundingClientRect().top + window.pageYOffset;
    window.scrollTo(0, top + objetivo * span);
  });

  if (mq.addEventListener) mq.addEventListener('change', aplicar); else if (mq.addListener) mq.addListener(aplicar);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(remedir);
  window.addEventListener('load', remedir);
  window.addEventListener('pagehide', function () {
    desactivar();
    if (mq.removeEventListener) mq.removeEventListener('change', aplicar);
  });
  aplicar();
})();
