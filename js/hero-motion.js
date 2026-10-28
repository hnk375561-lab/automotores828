/* Pausa automática solo cuando el hero no está visible o el sistema pide movimiento reducido. */
(function () {
  'use strict';
  var chain = document.querySelector('[data-hero-chain]');
  if (!chain) return;

  var interactionArea = chain.closest('.hero') || chain;

  /* la segunda tanda de fotos era lazy: al llegar el reinicio aparecían de golpe. Se cargan y decodifican de antemano. */
  [].forEach.call(chain.querySelectorAll('img'), function (img) {
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

  interactionArea.addEventListener('focusin', function (event) {
    var t = event.target, kb = false;
    try { kb = !!(t && t.matches && t.matches(':focus-visible')); } catch (e) { kb = false; }
    focused = kb; sync();
  });
  /* un clic o toque nunca congela la cinta: se limpia cualquier foco previo */
  document.addEventListener('pointerdown', function () { if (focused) { focused = false; sync(); } }, true);
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
