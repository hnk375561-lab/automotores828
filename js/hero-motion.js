/* Pausa automática solo cuando el hero no está visible o el sistema pide movimiento reducido. */
(function () {
  'use strict';
  var chain = document.querySelector('[data-hero-chain]');
  if (!chain) return;

  var interactionArea = chain.closest('.hero') || chain;

  /* la segunda tanda de fotos era lazy: al llegar el reinicio aparecían de golpe. Se cargan y decodifican de antemano. */
  /* Solo la primera foto compite por el ancho de banda inicial (LCP): el resto baja con prioridad baja, sigue cargando de antemano. */
  /* Este script se carga cuando la página ya terminó de cargar (js/diferidos.js), así que la descarga de estas fotos ya no compite con la portada.
     Con ahorro de datos o conexión 2G/3G no se adelanta nada: cada foto baja recién cuando la cinta se acerca (carga diferida nativa). */
  var lenta = false;
  try { var cn = navigator.connection; lenta = !!(cn && (cn.saveData || /^(slow-2g|2g|3g)$/.test(cn.effectiveType || ''))); } catch (e) { lenta = false; }
  [].forEach.call(chain.querySelectorAll('img'), function (img, n) {
    if (n > 0 && 'fetchPriority' in img) img.fetchPriority = 'low';
    if (lenta) return;
    if (img.loading === 'lazy') img.loading = 'eager';
    if (img.decode) img.decode().catch(function () {});
  });
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)');
  var focused = false;
  var inView = true;

  function sync() {
    var reduced = !!(reduce && reduce.matches);
    var saveData = document.documentElement.classList.contains('save-data');
    chain.classList.toggle('is-paused', reduced || saveData || document.hidden || !inView || focused);
  }

  /* La cinta solo se frena cuando alguien navega con el teclado (Tab / flechas) hasta ella.
     Cerrar una ficha devuelve el foco al botón de forma programática: eso nunca debe congelarla. */
  var lastNavKey = 0;
  document.addEventListener('keydown', function (event) {
    var k = event.key;
    lastNavKey = (k === 'Tab' || k === 'ArrowLeft' || k === 'ArrowRight') ? Date.now() : 0;
  }, true);
  interactionArea.addEventListener('focusin', function (event) {
    var t = event.target, kb = false;
    try { kb = !!(t && t.matches && t.matches(':focus-visible')); } catch (e) { kb = false; }
    focused = kb && lastNavKey > 0 && Date.now() - lastNavKey < 1000; sync();
  });
  /* un clic o toque nunca congela la cinta: se limpia cualquier foco previo */
  document.addEventListener('pointerdown', function () { lastNavKey = 0; if (focused) { focused = false; sync(); } }, true);
  /* al cerrar cualquier diálogo (ficha, comparador) la cinta vuelve a andar */
  document.addEventListener('close', function () { if (focused) { focused = false; sync(); } }, true);
  interactionArea.addEventListener('focusout', function (event) {
    if (!interactionArea.contains(event.relatedTarget)) { focused = false; sync(); }
  });
  document.addEventListener('visibilitychange', sync);
  if (reduce && typeof reduce.addEventListener === 'function') reduce.addEventListener('change', sync);
  else if (reduce && typeof reduce.addListener === 'function') reduce.addListener(sync);

  if ('IntersectionObserver' in window) {
    var observer = new IntersectionObserver(function (entries) {
      inView = entries.some(function (entry) { return entry.isIntersecting; });
      sync();
    }, { threshold: 0 });
    observer.observe(chain);
    window.addEventListener('pagehide', function () { observer.disconnect(); }, { once: true });
  }

  /* Elevación de la tarjeta bajo el mouse (escritorio). Solo marca la clase .is-lift en UNA tarjeta; el efecto es CSS (css/hero-carousel.css).
     No toca is-paused ni animation-play-state: la cinta sigue su curso con el mouse encima, al abrir la ficha y al cerrarla.
     La cinta se mueve bajo un mouse quieto y :hover no se actualiza solo con animaciones, así que se consulta qué tarjeta hay bajo el puntero
     mientras el puntero esté sobre el hero (cada ~90 ms; la consulta se corta sola cuando el puntero sale o hay un diálogo encima). */
  (function () {
    var fino = window.matchMedia && window.matchMedia('(hover: hover) and (pointer: fine)');
    if (!fino || !fino.matches || typeof document.elementFromPoint !== 'function') return;
    var px = 0, py = 0, raf = 0, ultimo = 0, actual = null;
    function poner(car) {
      if (car === actual) return;
      if (actual) actual.classList.remove('is-lift');
      actual = car;
      if (car) car.classList.add('is-lift');
    }
    function consultar(t) {
      raf = 0;
      if (t - ultimo < 90) { raf = requestAnimationFrame(consultar); return; }
      ultimo = t;
      var el = document.elementFromPoint(px, py);
      if (!el || !interactionArea.contains(el)) { poner(null); return; }   /* salió del hero o hay un diálogo encima: se corta hasta el próximo movimiento */
      var car = el.closest ? el.closest('.hero-chain-car') : null;
      poner(car && chain.contains(car) ? car : null);
      raf = requestAnimationFrame(consultar);
    }
    interactionArea.addEventListener('pointermove', function (e) {
      if (e.pointerType === 'touch') return;
      px = e.clientX; py = e.clientY;
      if (!raf) raf = requestAnimationFrame(function (t) { ultimo = 0; consultar(t); });
    }, { passive: true });
    interactionArea.addEventListener('pointerleave', function () {
      if (raf) { cancelAnimationFrame(raf); raf = 0; }
      poner(null);
    });
    document.addEventListener('visibilitychange', function () { if (document.hidden) { if (raf) { cancelAnimationFrame(raf); raf = 0; } poner(null); } });
  })();
  sync();
})();
