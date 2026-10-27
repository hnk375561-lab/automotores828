/* Automotores 828 · anillo decorativo de interiores (entre «Unidades» y «Financiación»).
   7 tarjetas sobre una rueda inclinada, una sola animación con requestAnimationFrame.
   El anillo es solo decoración: sin interacción, aria-hidden. Pausa fuera de pantalla o con la pestaña oculta;
   con «reducir movimiento» o «ahorro de datos» queda quieto.
   Unidad en foco: debajo del anillo, el panel [data-anillo-info] muestra la unidad cuya tarjeta va al frente.
   Solo lee las profundidades que pintar() ya calcula: no cambia el giro, la velocidad ni la pausa del anillo. */
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

  /* Panel de la unidad en foco (opcional). Mientras la persona apunta con el mouse, toca o enfoca con teclado
     un botón del panel, el panel NO cambia de unidad (el anillo sigue girando igual), para que el clic caiga en la unidad que está viendo. */
  var info = document.querySelector('[data-anillo-info]');
  var paneles = info ? [].slice.call(info.querySelectorAll('[data-ring-i]')) : [];
  var enFoco = 0, frente = 0, hover = false, foco = false, toque = false, tToque = 0;

  function mostrar() {
    if (hover || foco || toque || frente === enFoco || !paneles.length) return;
    if (paneles[enFoco]) paneles[enFoco].classList.remove('is-on');
    if (paneles[frente]) paneles[frente].classList.add('is-on');
    enFoco = frente;
  }
  if (paneles.length) {
    var zona = info.querySelector('.ring-units') || info;
    zona.addEventListener('pointerenter', function (e) { if (e.pointerType === 'mouse') hover = true; });
    zona.addEventListener('pointerleave', function (e) { if (e.pointerType === 'mouse') { hover = false; mostrar(); } });
    zona.addEventListener('pointerdown', function (e) {
      if (e.pointerType === 'mouse') return;
      toque = true; clearTimeout(tToque);
      tToque = setTimeout(function () { toque = false; mostrar(); }, 2500);
    });
    zona.addEventListener('focusin', function (e) {
      var porTeclado = true;
      try { porTeclado = e.target.matches(':focus-visible'); } catch (err) {}
      if (porTeclado) foco = true;
    });
    zona.addEventListener('focusout', function (e) {
      if (zona.contains(e.relatedTarget)) return;
      foco = false; mostrar();
    });
  }

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
    frente = cards.indexOf(orden[N - 1]);        /* la tarjeta que queda arriba de todas */
    mostrar();
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
