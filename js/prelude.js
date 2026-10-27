/* Automotores 828 · Intro «Prelude» (solo portada).
   Un único reloj lógico (t, en ms desde el primer fotograma) gobierna toda la composición; ningún valor depende de la cantidad de fotogramas.
   Órbita: el trazo usa pathLength=1 y stroke-dasharray=1. stroke-dashoffset = progresoOrbita:
     1 = trazo oculto, 0 = trazo completo. El arco se dibuja desde el inicio de cada path (izquierda → derecha por arriba y por abajo).
   Cierre: se conservan las persianas y se omite el texto «Prelude.»; la lámina marfil se desvanece sobre el sitio (t = 3800 → 4500 ms). */
(function () {
  'use strict';
  var root = document.querySelector('.prelude');
  if (!root) return;
  var mqReduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  /* Navegadores automatizados (Playwright, Selenium…) no ven la intro, para que las pruebas e2e puedan operar sobre la portada.
     Para probar la intro real con automatización: abrir /?prelude=1. */
  var forzada = /[?&]prelude=1(?:&|$)/.test(location.search);
  if (mqReduce.matches || (navigator.webdriver && !forzada)) { root.parentNode && root.parentNode.removeChild(root); return; }

  var CLOSE0 = 2100;          /* inicio del cierre (close = t - 2100) */
  var COVER = 3700;           /* las persianas ya cubren todo: la lámina pasa a marfil opaco y se retira «Saltar» */
  var FADE0 = 3800, FADE_D = 700;   /* desvanecimiento de la lámina marfil: termina en 4500 ms */
  var mqPhone = window.matchMedia('(max-width: 600px)');

  var stage = root.querySelector('.prelude__stage');
  var ringsGroup = root.querySelector('.prelude__rings');
  var rings = [].slice.call(root.querySelectorAll('.prelude__rings circle'));
  var thin = [].slice.call(root.querySelectorAll('.prelude__thin i'));
  var core = root.querySelector('.prelude__core');
  var orbit = root.querySelector('.prelude__orbit');
  var arcs = [].slice.call(root.querySelectorAll('.prelude__orbit path'));
  var blinds = [].slice.call(root.querySelectorAll('.prelude__blind'));
  var skipBtn = root.querySelector('.prelude__skip');

  /* ---------- curva cubic-bezier(.175,.885,.32,1): se resuelve X para obtener Y ---------- */
  var BX1 = 0.175, BY1 = 0.885, BX2 = 0.32, BY2 = 1;
  function bez(a, b, u) { var v = 1 - u; return 3 * v * v * u * a + 3 * v * u * u * b + u * u * u; }
  function bezD(a, b, u) { var v = 1 - u; return 3 * v * v * a + 6 * v * u * (b - a) + 3 * u * u * (1 - b); }
  function ease(x) {
    if (x <= 0) return 0; if (x >= 1) return 1;
    var u = x, i, dx;
    for (i = 0; i < 8; i++) {                      /* Newton–Raphson */
      dx = bez(BX1, BX2, u) - x;
      if (Math.abs(dx) < 1e-6) return bez(BY1, BY2, u);
      var d = bezD(BX1, BX2, u);
      if (Math.abs(d) < 1e-6) break;
      u -= dx / d;
    }
    var lo = 0, hi = 1; u = x;                      /* bisección de respaldo */
    for (i = 0; i < 30; i++) { dx = bez(BX1, BX2, u) - x; if (Math.abs(dx) < 1e-6) break; if (dx > 0) hi = u; else lo = u; u = (lo + hi) / 2; }
    return bez(BY1, BY2, u);
  }
  function clamp(x) { return x < 0 ? 0 : x > 1 ? 1 : x; }
  function phase(t, d, D) { return ease(clamp((t - d) / D)); }
  function quadInOut(x) { return x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2; }

  /* ---------- estado ---------- */
  var raf = 0, start = 0, hiddenAt = 0, last = {}, ended = false, ro = null;
  var inerted = [];

  function setStyle(el, key, prop, val) { if (last[key] === val) return; last[key] = val; el.style[prop] = val; }

  function render(t) {
    var i, close = t - CLOSE0, phoneNow = mqPhone.matches;

    /* anillos principales: escala = entrada * salida */
    for (i = 0; i < 4; i++) {
      var s = phase(t, 50 * i, 1000) * (1 - phase(t - CLOSE0, 250 + (3 - i) * 30, 1400));
      setStyle(rings[i], 'r' + i, 'transform', 'scale(' + s.toFixed(4) + ')');
    }
    /* grupo: rotación continua −360° cada 40 s; se desvanece tras close = 1400 durante 500 ms */
    ringsGroup.style.transform = 'rotate(' + (-360 * t / 40000).toFixed(3) + 'deg)';
    setStyle(ringsGroup, 'rg', 'opacity', (1 - phase(close, 1400, 500)).toFixed(3));

    /* círculos secundarios (máx. 0.22) */
    var fadeThin = 1 - phase(t - CLOSE0, 0, 600);
    for (i = 0; i < 34; i++) setStyle(thin[i], 't' + i, 'opacity', (0.22 * phase(t, 400 + 20 * i, 600) * fadeThin).toFixed(4));

    /* órbita */
    var prog = 1 - quadInOut(clamp((t - 500) / 1500));
    var pv = prog.toFixed(4);
    setStyle(arcs[0], 'o0', 'strokeDashoffset', pv);
    setStyle(arcs[1], 'o1', 'strokeDashoffset', pv);
    setStyle(orbit, 'oo', 'opacity', (1 - phase(t - CLOSE0, 100, 1400)).toFixed(3));

    /* núcleo con el logo */
    var cs = phase(t, 0, 1000) * (1 - phase(t - CLOSE0, 340, 1400));
    setStyle(core, 'c', 'transform', 'scale(' + cs.toFixed(4) + ')');

    /* persianas: expansión horizontal; las tres centrales escalan 1 → 1.3 en vertical */
    var ex = phase(close, 400, 1200);
    var vy = phase(close, phoneNow ? 500 : 600, phoneNow ? 600 : 1000);
    for (i = 0; i < 5; i++) {
      var sy = (i >= 1 && i <= 3) ? 1 + 0.3 * vy : 1;
      setStyle(blinds[i], 'b' + i, 'transform', 'scale(' + ex.toFixed(4) + ',' + sy.toFixed(4) + ')');
    }

    /* cierre: lámina marfil opaca → se desvanece y revela el sitio */
    if (t >= COVER && root.getAttribute('data-state') !== 'exit') root.setAttribute('data-state', 'exit');
    if (t >= FADE0) setStyle(root, 'fade', 'opacity', (1 - phase(t, FADE0, FADE_D)).toFixed(3));
  }

  function frame(now) {
    raf = 0;
    if (ended) return;
    if (!start) start = now;
    var t = now - start;
    render(t);
    if (t >= FADE0 + FADE_D) finish(); else raf = requestAnimationFrame(frame);
  }

  /* ---------- pausa por visibilidad: sin saltos al volver ---------- */
  function onVis() {
    if (ended) return;
    if (document.hidden) {
      hiddenAt = performance.now();
      if (raf) { cancelAnimationFrame(raf); raf = 0; }
    } else if (hiddenAt) {
      if (start) start += performance.now() - hiddenAt;
      hiddenAt = 0;
      if (!raf) raf = requestAnimationFrame(frame);
    }
  }

  /* ---------- salida ---------- */
  function onKey(e) {
    if (e.key === 'Escape') { e.preventDefault(); skip(); return; }
    if (e.target !== skipBtn && /^( |PageUp|PageDown|Home|End|ArrowUp|ArrowDown)$/.test(e.key)) e.preventDefault();
  }
  function stop(e) { e.preventDefault(); }

  function skip() {
    if (ended) return;
    if (raf) { cancelAnimationFrame(raf); raf = 0; }
    root.setAttribute('data-state', 'skip');
    var done = false;
    function fin() { if (done) return; done = true; finish(); }
    if (root.animate) {
      var a = root.animate([{ opacity: +(last.fade || 1) }, { opacity: 0 }], { duration: 280, easing: 'ease-out', fill: 'forwards' });
      a.onfinish = fin;
    }
    setTimeout(fin, 400);
  }

  function finish() {
    if (ended) return;
    ended = true;
    if (raf) { cancelAnimationFrame(raf); raf = 0; }
    document.removeEventListener('visibilitychange', onVis);
    document.removeEventListener('keydown', onKey, true);
    root.removeEventListener('wheel', stop);
    root.removeEventListener('touchmove', stop);
    root.removeEventListener('pointerdown', onTap);
    skipBtn.removeEventListener('click', skip);
    if (mqReduce.removeEventListener) mqReduce.removeEventListener('change', onReduce);
    if (ro) { ro.disconnect(); ro = null; }
    inerted.forEach(function (n) { n.removeAttribute('inert'); });
    inerted = [];
    root.setAttribute('data-state', 'done');
    if (root.parentNode) root.parentNode.removeChild(root);
  }
  function onTap(e) { if (e.target !== skipBtn) skip(); }
  function onReduce() { if (mqReduce.matches) skip(); }

  /* ---------- trazo de la órbita: 1,5 px reales con el SVG escalado (800 unidades de ancho) ---------- */
  function fitStroke() {
    var w = stage.getBoundingClientRect().width;
    if (w > 0) orbit.style.strokeWidth = (1.5 * 800 / w).toFixed(3);
  }

  /* ---------- arranque ---------- */
  [].slice.call(document.body.children).forEach(function (n) {
    if (n !== root && !n.hasAttribute('inert')) { n.setAttribute('inert', ''); inerted.push(n); }
  });
  arcs.forEach(function (p) { p.style.strokeDashoffset = '1'; });
  fitStroke();
  if (window.ResizeObserver) { ro = new ResizeObserver(fitStroke); ro.observe(stage); }
  document.addEventListener('visibilitychange', onVis);
  document.addEventListener('keydown', onKey, true);
  root.addEventListener('wheel', stop, { passive: false });
  root.addEventListener('touchmove', stop, { passive: false });
  root.addEventListener('pointerdown', onTap);
  skipBtn.addEventListener('click', skip);
  if (mqReduce.addEventListener) mqReduce.addEventListener('change', onReduce);
  if (!document.hidden) raf = requestAnimationFrame(frame); else hiddenAt = performance.now();
})();
