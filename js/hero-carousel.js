/* DR Automóviles · carrusel del hero
   Cambia de foto cada 2 segundos (todas, incluida la primera), con crossfade y zoom (Ken Burns) en cada una.
   Se detiene solo con la pestaña oculta; con «reducir movimiento» queda fija la primera foto. */
(function () {
  'use strict';
  var root = document.querySelector('[data-hero-carousel]');
  if (!root) return;
  var hero = root.closest('.hero') || root.parentNode;
  var slides = [].slice.call(root.querySelectorAll('[data-hero-slide]'));
  if (slides.length < 2) return;
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var INTERVAL = 2000, i = 0, timer = null, inView = true;

  function load(s) {
    var m = s && s.querySelector('img');
    if (m && m.loading === 'lazy') m.loading = 'eager';
    return m;
  }
  function go(k) {
    k = (k + slides.length) % slides.length;
    if (k === i) return;
    var prev = slides[i];
    prev.classList.add('is-leaving');
    setTimeout(function () { prev.classList.remove('is-leaving'); }, 1000);
    i = k;
    slides.forEach(function (s, n) {
      var on = n === i;
      s.classList.toggle('is-active', on);
      if (on) s.classList.remove('is-leaving');
    });
    load(slides[(i + 1) % slides.length]);
  }
  function start() {
    if (reduce || timer || document.hidden || !inView) return;
    hero.classList.remove('is-paused');
    timer = setInterval(function () { go(i + 1); }, INTERVAL);
  }
  function stop() {
    if (timer) { clearInterval(timer); timer = null; }
    hero.classList.add('is-paused');
  }

  hero.classList.add('hero-carousel-ready');
  if (reduce) return;

  /* Antes de arrancar, se bajan y decodifican las fotos de a una para que ninguna aparezca a medias. */
  var pend = slides.slice(1);
  function preload() {
    pend.forEach(function (s, k) {
      setTimeout(function () {
        var m = load(s);
        if (m && m.decode) m.decode().catch(function () {});
      }, 250 * k);
    });
  }
  if (document.readyState === 'complete') preload(); else window.addEventListener('load', preload);
  start(); /* el reloj arranca ya: la primera foto dura lo mismo que las demás (2 s) */
  document.addEventListener('visibilitychange', function () { document.hidden ? stop() : start(); });
  /* Con el hero fuera de pantalla se frena el carrusel (y su zoom): el scroll de las unidades queda liviano. */
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (es) {
      inView = es[es.length - 1].isIntersecting;
      inView ? start() : stop();
    }, { threshold: 0 }).observe(hero);
  }
})();
