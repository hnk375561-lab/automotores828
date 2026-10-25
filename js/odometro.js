/* Automotores 828 · T9 · odómetro de cifras reales (58 unidades · autos · motos).
   Solo anima el recuento hacia el número que ya está en el HTML (data-odo); sin GSAP, con requestAnimationFrame.
   Sin movimiento si hay prefers-reduced-motion o ahorro de datos. El valor final es siempre el dato publicado. */
(function () {
  'use strict';
  var els = [].slice.call(document.querySelectorAll('[data-odo]'));
  if (!els.length || !('IntersectionObserver' in window)) return;
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduce || document.documentElement.classList.contains('save-data')) return;
  var ease = function (t) { return 1 - Math.pow(1 - t, 3); };
  function run(el) {
    var fin = parseInt(el.getAttribute('data-odo'), 10); if (isNaN(fin)) return;
    var t0 = null, dur = 900;
    function paso(t) {
      if (t0 === null) t0 = t;
      var k = Math.min(1, (t - t0) / dur);
      el.textContent = String(k >= 1 ? fin : Math.round(fin * ease(k)));
      if (k < 1) requestAnimationFrame(paso);
    }
    requestAnimationFrame(paso);
  }
  var io = new IntersectionObserver(function (es) {
    es.forEach(function (e) { if (e.isIntersecting) { io.unobserve(e.target); run(e.target); } });
  }, { threshold: 0.6 });
  els.forEach(function (el) {
    var fin = el.getAttribute('data-odo'); el.style.minWidth = String(fin).length + 'ch';
    if (el.getBoundingClientRect().top > window.innerHeight) el.textContent = '0';
    io.observe(el);
  });
})();
