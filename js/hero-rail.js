/* Horizonte Automotores · carrusel del hero: cambia de foto cada 2 segundos, de forma permanente.
   Solo se detiene con la pestaña oculta o si el sistema pide reducir movimiento. */
(function () {
  'use strict';
  var root = document.querySelector('[data-hero-carousel]');
  if (!root) return;
  var slides = [].slice.call(root.querySelectorAll('[data-hero-slide]'));
  if (slides.length < 2) return;
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var i = 0, timer = null, paused = false;
  function go(k) {
    var prev = slides[i];
    k = (k + slides.length) % slides.length;
    if (k !== i && prev) { prev.classList.add('is-leaving'); setTimeout(function () { prev.classList.remove('is-leaving'); }, 900); }
    i = k;
    slides.forEach(function (s, n) {
      var on = n === i;
      s.classList.toggle('is-active', on);
      if (on) s.classList.remove('is-leaving');
      s.setAttribute('aria-hidden', on ? 'false' : 'true');
      var img = s.querySelector('img'); if (on && img && img.loading === 'lazy') img.loading = 'eager';
    });
  }
  function stop() { if (timer) { clearInterval(timer); timer = null; } }
  function start() { if (reduce || paused || timer || document.hidden) return; timer = setInterval(function () { go(i + 1); }, 2000); }
  setTimeout(start, 2000);
  document.addEventListener('visibilitychange', function () { document.hidden ? stop() : start(); });
  /* las fotos 2 a 4 se bajan y decodifican de a una, después de la carga, para no trabar el arranque */
  function precargar() {
    slides.slice(1).forEach(function (s, k) {
      setTimeout(function () { var m = s.querySelector('img'); if (!m) return; m.loading = 'eager'; if (m.decode) m.decode().catch(function () {}); }, 900 * (k + 1));
    });
  }
  if (document.readyState === 'complete') precargar(); else window.addEventListener('load', precargar);
})();
