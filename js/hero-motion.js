/* Pausa automática solo cuando el hero no está visible o el sistema pide movimiento reducido. */
(function () {
  'use strict';
  var chain = document.querySelector('[data-hero-chain]');
  if (!chain) return;

  var interactionArea = chain.closest('.hero') || chain;
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)');
  var focused = false;
  var hoverPaused = false;
  var touchPaused = false;
  var inView = true;

  function sync() {
    var reduced = !!(reduce && reduce.matches);
    var saveData = document.documentElement.classList.contains('save-data');
    chain.classList.toggle('is-paused', reduced || saveData || document.hidden || !inView || focused || hoverPaused || touchPaused);
  }

  interactionArea.addEventListener('focusin', function () { focused = true; sync(); });
  interactionArea.addEventListener('focusout', function (event) {
    if (!interactionArea.contains(event.relatedTarget)) { focused = false; sync(); }
  });
  interactionArea.addEventListener('pointerenter', function (event) {
    if (event.pointerType === 'mouse') { hoverPaused = true; sync(); }
  });
  interactionArea.addEventListener('pointerleave', function (event) {
    if (event.pointerType === 'mouse') { hoverPaused = false; sync(); }
  });
  interactionArea.addEventListener('pointerdown', function (event) {
    if (event.pointerType === 'touch') { touchPaused = true; sync(); }
  }, { passive: true });
  ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(function (name) {
    window.addEventListener(name, function () { if (touchPaused) { touchPaused = false; sync(); } }, { passive: true });
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
