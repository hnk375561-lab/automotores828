/* Automotores 828 · hero editorial con 10 fotos, crossfade y Ken Burns. */
(function () {
  'use strict';
  var root = document.querySelector('[data-hero-carousel]');
  if (!root) return;
  var hero = root.closest('.hero') || root.parentNode;
  var slides = [].slice.call(root.querySelectorAll('[data-hero-slide]'));
  var controls = hero.querySelector('[data-hero-controls]');
  slides.forEach(function (slide) {
    var img = slide.querySelector('img');
    if (img && img.src) slide.style.setProperty('--hero-image', 'url("' + img.src.replace(/"/g, '%22') + '")');
  });
  if (slides.length < 2) return;
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var INTERVAL = 2000, i = 0, timer = null, inView = true, userPaused = false;
  var count = controls && controls.querySelector('[data-hero-count]');
  var toggle = controls && controls.querySelector('[data-hero-toggle]');

  function load(s) {
    var img = s && s.querySelector('img');
    if (img && img.loading === 'lazy') img.loading = 'eager';
    return img;
  }
  function renderCount() {
    if (count) count.textContent = String(i + 1).padStart(2, '0') + ' / ' + String(slides.length).padStart(2, '0');
  }
  function go(k) {
    k = (k + slides.length) % slides.length;
    if (k === i) return;
    var previous = slides[i];
    previous.classList.add('is-leaving');
    window.setTimeout(function () { previous.classList.remove('is-leaving'); }, 760);
    i = k;
    slides.forEach(function (slide, n) {
      var active = n === i;
      slide.classList.toggle('is-active', active);
      if (active) slide.classList.remove('is-leaving');
    });
    load(slides[(i + 1) % slides.length]);
    renderCount();
  }
  function start() {
    if (reduce || timer || userPaused || document.hidden || !inView) return;
    hero.classList.remove('is-paused');
    timer = window.setInterval(function () { go(i + 1); }, INTERVAL);
  }
  function stop() {
    if (timer) { window.clearInterval(timer); timer = null; }
    hero.classList.add('is-paused');
  }
  function setPaused(value) {
    userPaused = value;
    if (toggle) {
      toggle.textContent = userPaused ? 'Reanudar' : 'Pausar';
      toggle.setAttribute('aria-pressed', String(userPaused));
    }
    userPaused ? stop() : start();
  }

  hero.classList.add('hero-carousel-ready');
  renderCount();
  if (controls) {
    controls.querySelector('[data-hero-prev]').addEventListener('click', function () { go(i - 1); });
    controls.querySelector('[data-hero-next]').addEventListener('click', function () { go(i + 1); });
    toggle.addEventListener('click', function () { setPaused(!userPaused); });
  }
  if (reduce) return;

  slides.slice(1).forEach(function (slide, k) {
    window.setTimeout(function () {
      var img = load(slide);
      if (img && img.decode) img.decode().catch(function () {});
    }, 180 * k);
  });
  start();
  document.addEventListener('visibilitychange', function () { document.hidden ? stop() : start(); });
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (entries) {
      inView = entries[entries.length - 1].isIntersecting;
      inView ? start() : stop();
    }, { threshold: 0 }).observe(hero);
  }
})();
