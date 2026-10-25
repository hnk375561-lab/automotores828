/* Pausa automática solo cuando el hero no está visible o el sistema pide movimiento reducido. */
(function () {
  'use strict';
  var chain = document.querySelector('[data-hero-chain]');
  if (!chain) return;

  var interactionArea = chain.closest('.hero') || chain;

  /* la segunda tanda de fotos era lazy: al llegar el reinicio aparecían de golpe. Se cargan y decodifican de antemano. */
  /* Solo la primera foto compite por el ancho de banda inicial (LCP): el resto baja con prioridad baja, sigue cargando de antemano. */
  [].forEach.call(chain.querySelectorAll('img'), function (img, n) {
    if (img.loading === 'lazy') img.loading = 'eager';
    if (n > 0 && 'fetchPriority' in img) img.fetchPriority = 'low';
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
  sync();
})();
