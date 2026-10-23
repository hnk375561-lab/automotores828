/* Pausa automática de la cinta del hero al interactuar y cuando no está visible. */
(function () {
  'use strict';
  var chain = document.querySelector('[data-hero-chain]');
  if (!chain) return;
  var interactionArea = chain.closest('.hero') || chain;

  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)');
  var hovering = false;
  var focused = false;
  var inView = true;

  function sync() {
    var reduced = !!(reduce && reduce.matches);
    var saveData = document.documentElement.classList.contains('save-data');
    chain.classList.toggle('is-paused', reduced || saveData || document.hidden || !inView || hovering || focused);
  }

  interactionArea.addEventListener('pointerenter', function () { hovering = true; sync(); });
  interactionArea.addEventListener('pointerleave', function () { hovering = false; sync(); });
  interactionArea.addEventListener('focusin', function () { focused = true; sync(); });
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
