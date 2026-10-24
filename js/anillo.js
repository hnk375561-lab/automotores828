/* Automotores 828 · anillo decorativo de interiores (entre «Unidades» y «Financiación»).
   7 tarjetas sobre una rueda inclinada, una sola animación con requestAnimationFrame.
   Solo decoración: sin interacción, aria-hidden. Pausa fuera de pantalla o con la pestaña oculta;
   con «reducir movimiento» o «ahorro de datos» queda quieto. */
(function () {
  'use strict';
  var root = document.querySelector('[data-anillo]');
  if (!root) return;
  var stage = root.querySelector('.ring-stage');
  var cards = [].slice.call(root.querySelectorAll('.ring-card'));
  var N = cards.length;
  if (!stage || !N) return;

  var TAU = Math.PI * 2, IDLE = 0.0045;
  var quieto = (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) ||
    (navigator.connection && navigator.connection.saveData);
  var rot = 0, R = 0, visible = false, raf = 0, last = 0, vel = IDLE;

  function medir() {
    var r = stage.getBoundingClientRect();
    R = 0.62 * Math.min(r.width, r.height);
  }

  function pintar() {
    var orden = cards.slice(), i, c, a, x, y, z, d, s;
    for (i = 0; i < N; i++) {
      c = cards[i];
      a = rot + (i / N) * TAU;
      var sn = Math.sin(a), cs = Math.cos(a);
      x = sn * R; z = cs * R; y = -cs * R * 0.42;
      d = (z / R + 1) / 2;                      /* 0 atrás · 1 adelante */
      s = 0.55 + d * 0.55;
      c.__z = z;
      c.style.transform = 'translate(-50%,-50%) translate3d(' + x.toFixed(2) + 'px,' + y.toFixed(2) + 'px,0) rotate(' + (sn * 14).toFixed(2) + 'deg) scale(' + s.toFixed(3) + ')';
      c.style.opacity = (0.30 + d * 0.70).toFixed(3);
      c.style.filter = 'brightness(' + (0.5 + d * 0.7).toFixed(3) + ')';
    }
    /* el navegador no resuelve solo tarjetas tan superpuestas: se ordena por profundidad a mano */
    orden.sort(function (p, q) { return p.__z - q.__z; });
    for (i = 0; i < N; i++) orden[i].style.zIndex = i;
  }

  function cuadro(t) {
    raf = 0;
    if (!visible || document.hidden) { last = 0; return; }
    var dt = last ? Math.min(64, t - last) : 16.67;
    last = t;
    rot += vel * (dt / 16.67);
    pintar();
    raf = requestAnimationFrame(cuadro);
  }
  function arrancar() { if (!quieto && !raf && visible && !document.hidden) raf = requestAnimationFrame(cuadro); }

  medir(); pintar();
  if (quieto) { window.addEventListener('resize', function () { medir(); pintar(); }); return; }

  window.addEventListener('resize', function () { medir(); pintar(); });
  document.addEventListener('visibilitychange', function () { last = 0; arrancar(); });
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (es) { visible = es[0].isIntersecting; last = 0; arrancar(); }, { rootMargin: '120px 0px' }).observe(root);
  } else { visible = true; arrancar(); }
})();
