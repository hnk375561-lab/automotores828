/* Unidad destacada (hist-*): revelado cinematográfico + disolución orgánica al cerrar.
   IIFE sin dependencias (sin GSAP). Expone window.drHistoria (controlador) y window.drHistoriaKernel (funciones puras).
   Se carga diferido (data-dr-diferido). Un solo requestAnimationFrame vivo a la vez, con reloj propio que se congela
   cuando la pestaña está oculta, la sección fuera de pantalla, hay una superposición del sitio o la persona pulsó «Pausar».
   Fases publicadas en section[data-hist-fase]: cerrado · reglas · apertura · abierto · cierre. */
(function () {
  'use strict';
  var root = typeof window !== 'undefined' ? window : globalThis;
  if (root.drHistoriaKernel && root.drHistoria && root.drHistoria.__listo) return;

  /* ====================== KERNEL (puro, determinista, sin DOM) ====================== */
  function fract(x) { return x - Math.floor(x); }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function clamp01(x) { return Math.min(1, Math.max(0, x)); }
  function Hh(x, y, s) { return fract(Math.sin(127.1 * x + 311.7 * y + 74.7 * s) * 43758.5453); }
  function N(x, y, s) {
    var x0 = Math.floor(x), y0 = Math.floor(y);
    var fx = x - x0, fy = y - y0;
    var ex = fx * fx * (3 - 2 * fx), ey = fy * fy * (3 - 2 * fy);
    var v00 = Hh(x0, y0, s), v10 = Hh(x0 + 1, y0, s), v01 = Hh(x0, y0 + 1, s), v11 = Hh(x0 + 1, y0 + 1, s);
    return lerp(lerp(v00, v10, ex), lerp(v01, v11, ex), ey);
  }
  function Q(x, y, s) {
    var i = 0.8 * x + 0.6 * y, j = -0.6 * x + 0.8 * y;
    var a = N(0.7 * x + 3.1, 0.7 * y + 7.3, s + 11.3) - 0.5;
    var b = N(0.7 * x + 9.7, 0.7 * y + 1.9, s + 23.9) - 0.5;
    var c = N(x + 1.6 * a, y + 1.6 * b, s);
    var d = N(2.13 * i + 5.2, 2.13 * j + 1.3, s + 31.7);
    var e = N(4.7 * x + 2.6, 4.7 * y + 8.4, s + 57.1);
    return Math.tanh((((c + 0.3 * d + 0.15 * e) / 1.45) - 0.5) / 0.17);
  }
  /* power2.inOut: UNA sola vez; el resultado alimenta el kernel directamente (no encadenar easings) */
  function potencia2InOut(t) {
    t = clamp01(t);
    return t < 0.5 ? 2 * t * t : 1 - 2 * (1 - t) * (1 - t);
  }

  var cacheGrillas = {};
  /* Grilla cacheada por (W,H,semilla). nx, ny = cantidad de celdas; los puntos son (nx+1)×(ny+1) y el anillo exterior queda «alto». */
  function grilla(W, H, semilla) {
    W = Math.round(W); H = Math.round(H);
    var k = W + 'x' + H + 's' + semilla;
    var g = cacheGrillas[k];
    if (g) return g;
    var cell = Math.max(12, Math.sqrt(W * H / 14000));
    var nx = Math.ceil(W / cell) + 2, ny = Math.ceil(H / cell) + 2;
    var P = nx + 1, R = ny + 1, total = P * R;
    var n0 = new Float32Array(total), n1 = new Float32Array(total), slope = new Float32Array(total);
    for (var j = 0; j < R; j++) {
      for (var i = 0; i < P; i++) {
        var x = -cell + i * cell, y = -cell + j * cell, idx = j * P + i;
        n0[idx] = Q(x / 140, y / 140, semilla);
        n1[idx] = Q(x / 140 + 17.3, y / 140 + 5.9, semilla + 137.13);
        slope[idx] = (clamp01(y / H) - 0.3 * (0.5 - 0.5 * Math.cos(Math.PI * clamp01(x / W)))) * 4.5;
      }
    }
    var nodos = total * 2;
    g = {
      W: W, H: H, cell: cell, nx: nx, ny: ny, P: P, R: R, n0: n0, n1: n1, slope: slope,
      valores: new Float32Array(total),
      link0: new Int32Array(nodos), link1: new Int32Array(nodos),
      px: new Float32Array(nodos), py: new Float32Array(nodos),
      usados: new Int32Array(nodos), visto: new Uint8Array(nodos)
    };
    cacheGrillas = {}; /* una sola grilla viva: al cambiar de tamaño se descarta la anterior */
    cacheGrillas[k] = g;
    return g;
  }

  function campo(W, H, q, semilla) {
    semilla = semilla == null ? 1 : semilla;
    var g = grilla(W, H, semilla);
    var fase = q * 0.35 * Math.PI / 2, c = Math.cos(fase), s = Math.sin(fase);
    var v = g.valores, P = g.P, R = g.R;
    for (var j = 0; j < R; j++) {
      for (var i = 0; i < P; i++) {
        var idx = j * P + i;
        v[idx] = (i === 0 || j === 0 || i === P - 1 || j === R - 1) ? 1e9 : g.n0[idx] * c + g.n1[idx] * s + g.slope[idx];
      }
    }
    return { nx: g.nx, ny: g.ny, cell: g.cell, valores: v };
  }

  function fmtN(n) { n = Math.round(n * 10) / 10; return String(n); }

  /* Devuelve null (q=0: sin recorte), 'oculto' (q=1) o 'path(evenodd,"…")' */
  function contornos(W, H, q, semilla) {
    semilla = semilla == null ? 1 : semilla;
    W = Math.round(W); H = Math.round(H);
    if (!(W > 0) || !(H > 0)) return null;
    if (q <= 0) return null;
    if (q >= 1) return 'oculto';
    var f = campo(W, H, q, semilla);
    var g = grilla(W, H, semilla);
    var v = g.valores, P = g.P, cell = g.cell, nx = g.nx, ny = g.ny;
    var thr = lerp(-2.40, 5.55, q);
    g.link0.fill(-1); g.link1.fill(-1);
    var nUsados = 0, link0 = g.link0, link1 = g.link1, px = g.px, py = g.py, usados = g.usados;

    function posicion(key) {
      var tipo = key & 1, idx = key >> 1, j = (idx / P) | 0, i = idx - j * P;
      var a = v[idx], b = tipo === 0 ? v[idx + 1] : v[idx + P];
      var d = b - a, u = d === 0 ? 0.5 : clamp01((thr - a) / d);
      var x = -cell + i * cell, y = -cell + j * cell;
      if (tipo === 0) { px[key] = x + u * cell; py[key] = y; } else { px[key] = x; py[key] = y + u * cell; }
    }
    function enlazar(a, b) {
      if (link0[a] < 0 && link1[a] < 0) { posicion(a); usados[nUsados++] = a; }
      if (link0[b] < 0 && link1[b] < 0) { posicion(b); usados[nUsados++] = b; }
      if (link0[a] < 0) link0[a] = b; else if (link1[a] < 0) link1[a] = b;
      if (link0[b] < 0) link0[b] = a; else if (link1[b] < 0) link1[b] = a;
    }

    for (var j = 0; j < ny; j++) {
      for (var i = 0; i < nx; i++) {
        var iTL = j * P + i, iTR = iTL + 1, iBL = iTL + P, iBR = iBL + 1;
        var vTL = v[iTL], vTR = v[iTR], vBR = v[iBR], vBL = v[iBL];
        var caso = (vTL < thr ? 8 : 0) | (vTR < thr ? 4 : 0) | (vBR < thr ? 2 : 0) | (vBL < thr ? 1 : 0);
        if (caso === 0 || caso === 15) continue;
        var T = iTL * 2, B = iBL * 2, L = iTL * 2 + 1, Rr = iTR * 2 + 1;
        switch (caso) {
          case 1: case 14: enlazar(L, B); break;
          case 2: case 13: enlazar(B, Rr); break;
          case 3: case 12: enlazar(L, Rr); break;
          case 4: case 11: enlazar(T, Rr); break;
          case 6: case 9: enlazar(T, B); break;
          case 7: case 8: enlazar(T, L); break;
          case 5: case 10: {
            var media = (vTL + vTR + vBR + vBL) / 4;
            if ((caso === 5) === (media < thr)) { enlazar(T, L); enlazar(B, Rr); } else { enlazar(T, Rr); enlazar(L, B); }
            break;
          }
        }
      }
    }

    var visto = g.visto;
    for (var u = 0; u < nUsados; u++) visto[usados[u]] = 0;
    var partes = ['M0 0H' + W + 'V' + H + 'H0Z'];
    for (var s = 0; s < nUsados; s++) {
      var inicio = usados[s];
      if (visto[inicio]) continue;
      var xs = [], ys = [], cur = inicio, prev = -1;
      for (;;) {
        visto[cur] = 1;
        xs.push(px[cur]); ys.push(py[cur]);
        var sig = link0[cur] !== prev ? link0[cur] : link1[cur];
        if (sig < 0 || sig === inicio || visto[sig]) break;
        prev = cur; cur = sig;
      }
      var n = xs.length;
      if (n < 3) continue;
      var area = 0;
      for (var k = 0; k < n; k++) { var k2 = (k + 1) % n; area += xs[k] * ys[k2] - xs[k2] * ys[k]; }
      if (Math.abs(area) / 2 < 9 * 9 * 0.25) continue;
      var d = 'M' + fmtN((xs[n - 1] + xs[0]) / 2) + ' ' + fmtN((ys[n - 1] + ys[0]) / 2);
      for (var m = 0; m < n; m++) {
        var m2 = (m + 1) % n;
        d += 'Q' + fmtN(xs[m]) + ' ' + fmtN(ys[m]) + ' ' + fmtN((xs[m] + xs[m2]) / 2) + ' ' + fmtN((ys[m] + ys[m2]) / 2);
      }
      partes.push(d + 'Z');
    }
    return 'path(evenodd,"' + partes.join('') + '")';
  }

  root.drHistoriaKernel = { campo: campo, contornos: contornos, potencia2InOut: potencia2InOut, mediaPotencia2InOut: potencia2InOut };

  if (typeof document === 'undefined') return;

  /* ====================== CONTROLADOR ====================== */
  function bezier(x1, y1, x2, y2) {
    function cx(t) { return 3 * x1 * t * (1 - t) * (1 - t) + 3 * x2 * t * t * (1 - t) + t * t * t; }
    function cy(t) { return 3 * y1 * t * (1 - t) * (1 - t) + 3 * y2 * t * t * (1 - t) + t * t * t; }
    function dx(t) { return 3 * x1 * (1 - t) * (1 - t) + 6 * (x2 - x1) * (1 - t) * t + 3 * (1 - x2) * t * t; }
    return function (x) {
      if (x <= 0) return 0;
      if (x >= 1) return 1;
      var t = x;
      for (var i = 0; i < 8; i++) {
        var e = cx(t) - x;
        if (Math.abs(e) < 1e-5) return cy(t);
        var d = dx(t);
        if (Math.abs(d) < 1e-6) break;
        t -= e / d;
      }
      var lo = 0, hi = 1; t = x;
      for (var k = 0; k < 20; k++) { if (cx(t) < x) lo = t; else hi = t; t = (lo + hi) / 2; }
      return cy(t);
    };
  }
  var easeAbrir = bezier(0.625, 0.05, 0, 1);
  function easeIO(t) { return potencia2InOut(t); }
  function easeOut(t) { t = clamp01(t); return 1 - (1 - t) * (1 - t); }

  var T_REGLAS = 450, T_ABRIR = 1050, T_CERRAR = 850, T_CIERRE_SIMPLE = 280, FPS_CONTORNO = 1000 / 30;
  var mqReducido = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;
  var reducido = function () { return !!(mqReducido && mqReducido.matches); };
  var conn = navigator.connection || {};
  var redLenta = function () {
    var c = navigator.connection || conn;
    return document.documentElement.classList.contains('save-data') || !!c.saveData || /^(slow-2g|2g|3g)$/.test(c.effectiveType || '');
  };
  var gamaBaja = function () { return (navigator.hardwareConcurrency || 8) <= 2 || (navigator.deviceMemory || 8) <= 2; };
  var soportaPath = !!(window.CSS && CSS.supports && CSS.supports('clip-path', 'path(evenodd,"M0 0Z")'));

  function montar(sec) {
    if (sec.__drHist) return sec.__drHist;
    var btn = sec.querySelector('[data-historia-abrir]');
    var overlay = sec.querySelector('.hist-overlay');
    var escena = sec.querySelector('.hist-stage') || sec; /* con el recorrido, el escenario del revelado es el marco fijo (.hist-stage), no la sección alta */
    if (!btn || !overlay) return null;
    var reglaA = btn.querySelector('.hist-rule--top'), reglaB = btn.querySelector('.hist-rule--bottom');
    var media = overlay.querySelector('.hist-media'), placa = overlay.querySelector('.hist-plate');
    var info = overlay.querySelector('.hist-info'), cerrarBtn = overlay.querySelector('.hist-close');
    var img = overlay.querySelector('.hist-fg');
    var enlaceFicha = overlay.querySelector('[data-historia-ficha]');
    /* Datos por unidad (JSON del generador): el mismo revelado sirve a la unidad destacada y a cada tarjeta del recorrido */
    var datosEl = sec.querySelector('script[data-hist-datos]'), DATOS = null;
    try { DATOS = datosEl ? JSON.parse(datosEl.textContent) : null; } catch (e) { DATOS = null; }
    var idPrincipal = sec.getAttribute('data-hist-main') || (DATOS && DATOS.main) || '';
    var elTitulo = overlay.querySelector('.hist-info h3'), elDatos = overlay.querySelector('.hist-datos'), elPrecio = overlay.querySelector('.hist-info .n');
    var elWa = overlay.querySelector('[data-historia-wa]'), fondoEl = overlay.querySelector('.hist-bg');
    var htmlEl = document.documentElement, origenEl = null, ultimaOpc = null;

    var estado = 'cerrado', listo = false, mostrado = false;
    var running = !document.hidden, enPantalla = true, pausadoUsuario = false;
    var btnPausa = sec.querySelector('[data-historia-pausa]'), btnRepetir = sec.querySelector('[data-historia-repetir]');
    var grupoCtl = sec.querySelector('.hist-ctl'), aviso = sec.querySelector('[data-historia-estado]');
    var txtPausa = btnPausa && btnPausa.querySelector('[data-l-off]'), txtReanudar = btnPausa && btnPausa.querySelector('[data-l-on]');
    var ioPrep = null;
    function fase(f) { sec.setAttribute('data-hist-fase', f); }
    function anunciar(t) { if (aviso) aviso.textContent = t; }
    var trabajo = null, raf = 0, elapsed = 0, last = null;
    var inertados = [], medidas = null, destruido = false, imgPromesa = null;
    var W = 0, H = 0, ultimoCalculo = -1e9;

    function setRunning(v) {
      if (v === running) return;
      running = v;
      if (!v) { last = null; if (raf) { cancelAnimationFrame(raf); raf = 0; } }
      else if (trabajo && !raf) raf = requestAnimationFrame(frame);
    }
    function recalcRunning() { setRunning(!document.hidden && enPantalla && !pausadoUsuario); }
    function fijarPausa(v) {
      v = !!v;
      if (v === pausadoUsuario) return;
      pausadoUsuario = v;
      if (btnPausa) { btnPausa.setAttribute('aria-pressed', v ? 'true' : 'false'); if (txtPausa) txtPausa.hidden = v; if (txtReanudar) txtReanudar.hidden = !v; }
      anunciar(v ? 'Animación en pausa.' : 'Animación reanudada.');
      recalcRunning();
    }

    function frame(ts) {
      raf = 0;
      if (!trabajo) return;
      if (!running) { last = null; return; }
      /* pausa bajo superposiciones del sitio (ficha, visor, intro): el reloj no avanza */
      if (document.querySelector('dialog.ficha[open],dialog.gv[open],.prelude[data-state="run"]')) { last = null; raf = requestAnimationFrame(frame); return; }
      if (last !== null) elapsed += ts - last;
      last = ts;
      trabajo.update(elapsed);
      if (elapsed >= trabajo.dur) { var t = trabajo; trabajo = null; t.fin(); return; }
      raf = requestAnimationFrame(frame);
    }
    function correr(dur, update, fin) {
      if (raf) { cancelAnimationFrame(raf); raf = 0; }
      elapsed = 0; last = null; ultimoCalculo = -1e9;
      trabajo = { dur: dur, update: update, fin: fin };
      if (running) raf = requestAnimationFrame(frame);
    }
    function detener() { trabajo = null; if (raf) { cancelAnimationFrame(raf); raf = 0; } }

    function idActual() {
      var a = sec.getAttribute('data-rec-actual');
      return (a && DATOS && DATOS.unidades && DATOS.unidades[a]) ? a : idPrincipal;
    }
    /* completa el panel y la foto del revelado con los datos reales de la unidad elegida */
    function pintarUnidad(id) {
      var u = DATOS && DATOS.unidades && DATOS.unidades[id];
      if (!u) return false;
      if (elTitulo) elTitulo.textContent = u.t;
      if (elDatos) { elDatos.textContent = u.d || ''; elDatos.hidden = !u.d; }
      if (elPrecio) { elPrecio.textContent = u.p || ''; elPrecio.hidden = !u.p; }
      if (enlaceFicha) enlaceFicha.setAttribute('href', '#unidad=' + id);
      if (elWa) { if (u.w) { elWa.setAttribute('href', u.w); elWa.hidden = false; } else elWa.hidden = true; }
      overlay.setAttribute('aria-label', 'Unidad destacada: ' + u.t);
      if (fondoEl) fondoEl.style.backgroundImage = u.b ? 'url(' + u.b + ')' : '';
      overlay.style.setProperty('--hist-ar', (u.f.w / u.f.h).toFixed(4));
      overlay.setAttribute('data-forma', u.f.w / u.f.h < 1.3 ? 'vertical' : 'ancha');
      if (img) {
        if (img.getAttribute('src') !== u.f.s) { img.setAttribute('src', u.f.s); imgPromesa = null; }
        img.setAttribute('width', u.f.w); img.setAttribute('height', u.f.h); img.setAttribute('alt', u.f.a);
      }
      return true;
    }
    /* «Cerrar» siempre por debajo de la cabecera fija del sitio (que tapa el borde superior del escenario) */
    function fijarTope() {
      var hd = document.querySelector('header'), s = escena.getBoundingClientRect();
      var b = hd ? hd.getBoundingClientRect().bottom : 0;
      overlay.style.setProperty('--hist-top', Math.max(12, Math.round(b - s.top + 12)) + 'px');
      overlay.style.setProperty('--hist-hdr', Math.max(0, Math.round(b - s.top)) + 'px'); /* la foto se centra debajo de la cabecera: no queda tapada */
    }

    /* ---- inert del resto de la página (se guarda solo lo que se agregó) ---- */
    function inertar() {
      fijarTope();
      htmlEl.classList.add('hist-lock'); /* la página no se desplaza por detrás del efecto abierto */
      var nodo = overlay;
      while (nodo && nodo !== document.body) {
        var padre = nodo.parentNode;
        if (!padre) break;
        for (var h = padre.firstElementChild; h; h = h.nextElementSibling) {
          if (h === nodo || /^(SCRIPT|STYLE|LINK|NOSCRIPT|TEMPLATE)$/.test(h.tagName) || h.inert) continue;
          h.inert = true; inertados.push(h);
        }
        nodo = padre;
      }
    }
    function desinertar() { for (var i = 0; i < inertados.length; i++) inertados[i].inert = false; inertados = []; htmlEl.classList.remove('hist-lock'); }

    function resetEstilos() {
      btn.style.removeProperty('visibility');
      [reglaA, reglaB].forEach(function (r) { if (r) { r.style.transform = ''; r.style.visibility = ''; } });
      overlay.classList.remove('is-anim');
      overlay.style.clipPath = ''; overlay.style.visibility = '';
      if (media) { media.style.transform = ''; media.style.opacity = ''; }
      if (placa) placa.style.opacity = '';
      if (info) info.style.opacity = '';
      if (cerrarBtn) cerrarBtn.style.opacity = '';
    }
    function mostrarFinalAbierto() {
      overlay.hidden = false; mostrado = true;
      overlay.classList.remove('is-anim');
      overlay.style.clipPath = 'none'; overlay.style.visibility = '';
      if (media) { media.style.transform = 'none'; media.style.opacity = '1'; }
      if (placa) placa.style.opacity = '0';
      if (info) info.style.opacity = '1';
      if (cerrarBtn) cerrarBtn.style.opacity = '1';
      [reglaA, reglaB].forEach(function (r) { if (r) r.style.visibility = 'hidden'; });
      if (!inertados.length) inertar();
    }
    function terminarApertura() {
      detener();
      mostrarFinalAbierto();
      estado = 'abierto'; fase('abierto');
      btn.setAttribute('aria-expanded', 'true');
      if (cerrarBtn) cerrarBtn.focus({ preventScroll: true });
    }
    function terminarCierre(opts) {
      detener();
      overlay.hidden = true; mostrado = false;
      resetEstilos();
      desinertar();
      estado = 'cerrado'; fase('cerrado');
      btn.setAttribute('aria-expanded', 'false');
      document.removeEventListener('keydown', onKey, true);
      if (!(opts && opts.sinFoco)) enfocarDisparador();
    }
    /* devuelve el foco al botón disparador; si la página lo reemplazó, vuelve a buscarlo */
    function enfocarDisparador() {
      var b = (origenEl && origenEl.isConnected && !origenEl.hidden) ? origenEl : (btn.isConnected ? btn : sec.querySelector('[data-historia-abrir]'));
      if (b) b.focus({ preventScroll: true });
    }

    /* ---- imagen ---- */
    function asegurarImg() {
      if (imgPromesa) return imgPromesa;
      imgPromesa = new Promise(function (ok) {
        if (!img) return ok();
        img.loading = 'eager';
        var fin = function () { ok(); };
        if (img.decode) img.decode().then(fin, fin);
        else if (img.complete) fin();
        else { img.addEventListener('load', fin, { once: true }); img.addEventListener('error', fin, { once: true }); }
      });
      return imgPromesa;
    }
    function marcarListo() {
      if (destruido) return;
      listo = true;
      btn.setAttribute('data-hist-estado', 'listo');
      btn.removeAttribute('aria-busy');
      if (grupoCtl) grupoCtl.hidden = false;
      if (root.__drHistPend === 1) { root.__drHistPend = 0; abrir(); }
    }
    function preparar() {
      var esperas = [];
      if (document.fonts && document.fonts.ready) esperas.push(document.fonts.ready.catch(function () {}));
      if (redLenta()) { Promise.all(esperas).then(marcarListo); return; }
      var lanzar = function () { esperas.push(asegurarImg()); Promise.all(esperas).then(marcarListo); };
      if ('IntersectionObserver' in window) {
        ioPrep = new IntersectionObserver(function (es) {
          if (es.some(function (e) { return e.isIntersecting; })) { ioPrep.disconnect(); ioPrep = null; lanzar(); }
        }, { rootMargin: '600px 0px' });
        ioPrep.observe(sec);
      } else lanzar();
    }

    /* ---- apertura ---- */
    function medir(orig) {
      if (orig) { /* apertura desde una tarjeta: el revelado nace del rectángulo de su foto */
        var es = escena.getBoundingClientRect(), o = orig.getBoundingClientRect();
        medidas = { top: Math.max(0, o.top - es.top), right: Math.max(0, es.right - o.right), bottom: Math.max(0, es.bottom - o.bottom), left: Math.max(0, o.left - es.left), k: 1, w: escena.clientWidth, h: escena.clientHeight };
        return;
      }
      var s = escena.getBoundingClientRect(), a = reglaA.getBoundingClientRect(), b = reglaB.getBoundingClientRect(), bt = btn.getBoundingClientRect();
      var top = Math.min(a.top, b.top) - s.top, left = Math.min(a.left, b.left) - s.left;
      var right = s.right - Math.max(a.right, b.right), bottom = s.bottom - Math.max(a.bottom, b.bottom);
      medidas = { top: top, right: right, bottom: bottom, left: left, k: Math.max(1, bt.height / 2), w: escena.clientWidth, h: escena.clientHeight };
    }
    function abrir(opc) {
      opc = opc || {};
      var rectEl = opc.orig || null;
      if (estado !== 'cerrado' || destruido || (!rectEl && !listo)) return;
      var id = opc.id || idActual();
      ultimaOpc = { id: id, orig: rectEl, foco: opc.foco || null };
      origenEl = opc.foco || null;
      if (id && DATOS) pintarUnidad(id);
      if (pausadoUsuario) fijarPausa(false); /* activar el botón es una orden explícita: se retoma el reloj */
      if (reducido()) { estado = 'abriendo'; terminarApertura(); document.addEventListener('keydown', onKey, true); return; }
      var lanzarAnim = function () {
        if (estado !== 'cerrado') return;
        estado = 'abriendo'; fase(rectEl ? 'apertura' : 'reglas');
        medir(rectEl);
        document.addEventListener('keydown', onKey, true);
        var mostrar = false, tReglas = rectEl ? 0 : T_REGLAS;
        correr(tReglas + T_ABRIR + 100, function (t) {
          if (t < tReglas) {
            var e = easeIO(t / T_REGLAS), esc = 1 + (medidas.k - 1) * e;
            reglaA.style.transform = 'scaleY(' + esc + ')';
            reglaB.style.transform = 'scaleY(' + esc + ')';
            return;
          }
          if (!mostrar) {
            mostrar = true; fase('apertura');
            if (!rectEl) { reglaA.style.visibility = 'hidden'; reglaB.style.visibility = 'hidden'; }
            overlay.hidden = false; mostrado = true;
            overlay.classList.add('is-anim');
            media.style.opacity = '0'; info.style.opacity = '0'; cerrarBtn.style.opacity = '0'; placa.style.opacity = '1';
            inertar();
          }
          var u = t - tReglas, p = easeAbrir(clamp01(u / T_ABRIR)), r = 1 - p;
          overlay.style.clipPath = 'inset(' + (medidas.top * r).toFixed(2) + 'px ' + (medidas.right * r).toFixed(2) + 'px ' + (medidas.bottom * r).toFixed(2) + 'px ' + (medidas.left * r).toFixed(2) + 'px)';
          media.style.transform = 'scale(' + (0.94 + 0.06 * p).toFixed(4) + ')';
          placa.style.opacity = String(1 - easeOut((u - 120) / 600));
          var m = clamp01((u - 350) / 500);
          media.style.opacity = String(m); info.style.opacity = String(clamp01((u - 450) / 500));
          cerrarBtn.style.opacity = String(clamp01((u - 550) / 600));
        }, terminarApertura);
      };
      if (imgPromesa) lanzarAnim();
      else { asegurarImg(); var cap = new Promise(function (ok) { setTimeout(ok, 4000); }); Promise.race([imgPromesa, cap]).then(lanzarAnim); }
    }

    /* ---- cierre ---- */
    function cerrar(opts) {
      opts = opts || {};
      if (estado === 'cerrado' || estado === 'cerrando') return;
      if (pausadoUsuario) fijarPausa(false);
      var estabaAbriendo = estado === 'abriendo';
      detener();
      if (!mostrado) { resetEstilos(); estado = 'cerrado'; fase('cerrado'); btn.setAttribute('aria-expanded', 'false'); document.removeEventListener('keydown', onKey, true); if (!opts.sinFoco) enfocarDisparador(); return; }
      if (opts.inmediato || reducido()) { terminarCierre(opts); return; }
      estado = 'cerrando'; fase('cierre');
      /* cerrar en pleno revelado: se cancela la apertura y la disolución parte de un escenario totalmente cubierto */
      if (estabaAbriendo) mostrarFinalAbierto();
      overlay.classList.add('is-anim');
      /* debajo del overlay, el botón vuelve a su estado normal para cuando la disolución lo vaya dejando ver */
      [reglaA, reglaB].forEach(function (r) { r.style.transform = ''; r.style.visibility = ''; });
      W = escena.clientWidth; H = escena.clientHeight;
      if (gamaBaja() || redLenta() || !soportaPath || !(W > 0 && H > 0)) {
        correr(T_CIERRE_SIMPLE, function (t) {
          overlay.style.clipPath = 'inset(' + (100 * easeIO(t / T_CIERRE_SIMPLE)).toFixed(2) + '% 0 0 0)';
        }, function () { terminarCierre(opts); });
        return;
      }
      correr(T_CERRAR, function (t) {
        if (t - ultimoCalculo < FPS_CONTORNO && t < T_CERRAR) return;
        ultimoCalculo = t;
        var qv = potencia2InOut(t / T_CERRAR);
        var c = contornos(W, H, qv, 1);
        if (c === null) overlay.style.clipPath = 'none';
        else if (c === 'oculto') overlay.style.clipPath = 'inset(100% 0 0 0)';
        else overlay.style.clipPath = c;
      }, function () { terminarCierre(opts); });
    }

    /* ---- teclado: Escape y trampa de foco ---- */
    function onKey(e) {
      if (estado === 'cerrado') return;
      if (e.key === 'Escape') {
        if (document.querySelector('dialog.ficha[open], dialog.gv[open]')) return;
        e.preventDefault(); cerrar(); return;
      }
      if (e.key !== 'Tab' || estado === 'cerrando') return;
      var f = Array.prototype.filter.call(overlay.querySelectorAll('a[href],button:not([disabled])'), function (n) { return n.offsetParent !== null || n === document.activeElement; });
      if (!f.length) { e.preventDefault(); return; }
      var primero = f[0], ultimo = f[f.length - 1], act = document.activeElement;
      if (!overlay.contains(act)) { e.preventDefault(); primero.focus(); }
      else if (e.shiftKey && act === primero) { e.preventDefault(); ultimo.focus(); }
      else if (!e.shiftKey && act === ultimo) { e.preventDefault(); primero.focus(); }
    }

    /* ---- eventos ---- */
    function onClickAbrir(e) { e.preventDefault(); abrir(); }
    /* cada tarjeta del recorrido abre SU efecto (sin JS sigue enlazando a su ficha) */
    function abrirUnidad(a) {
      if (!a || estado !== 'cerrado') return;
      abrir({ id: a.getAttribute('data-hist-unit'), orig: a.querySelector('.rec__photo') || a, foco: a });
    }
    function onClickTarjeta(e) {
      var a = e.target.closest && e.target.closest('[data-hist-unit]');
      if (!a || !sec.contains(a) || e.defaultPrevented) return;
      if (e.ctrlKey || e.metaKey || e.shiftKey || e.altKey || e.button > 0) return; /* abrir en pestaña nueva sigue yendo a la ficha */
      e.preventDefault();
      abrirUnidad(a);
    }
    function onPausa() { fijarPausa(!pausadoUsuario); }
    function forzarCerrado() {
      detener();
      if (mostrado) terminarCierre({ sinFoco: true });
      else { resetEstilos(); estado = 'cerrado'; fase('cerrado'); btn.setAttribute('aria-expanded', 'false'); document.removeEventListener('keydown', onKey, true); }
    }
    function onRepetir() {
      if (!listo || destruido) return;
      if (pausadoUsuario) fijarPausa(false);
      forzarCerrado();
      var op = ultimaOpc;
      requestAnimationFrame(function () { if (!destruido) abrir(op || undefined); });
    }
    function onClickCerrar() { cerrar(); }
    function onFicha(e) {
      var h = enlaceFicha && enlaceFicha.getAttribute('href');
      if (!h || h.indexOf('#unidad=') !== 0) return;
      e.preventDefault();
      cerrar({ inmediato: true, sinFoco: true });
      location.hash = h;
    }
    function onVisibilidad() { recalcRunning(); }
    function onResize() {
      /* se remide la abertura (las reglas congeladas) y, al cerrar, se regenera el campo para el tamaño nuevo */
      if (estado !== 'cerrado') fijarTope();
      if (estado === 'abriendo') medir(ultimaOpc && ultimaOpc.orig);
      else if (estado === 'cerrando') { W = escena.clientWidth; H = escena.clientHeight; ultimoCalculo = -1e9; }
    }
    function onCambioReducido() {
      if (!reducido()) return;
      if (estado === 'abriendo') terminarApertura();
      else if (estado === 'cerrando') terminarCierre({});
    }
    btn.addEventListener('click', onClickAbrir);
    sec.addEventListener('click', onClickTarjeta);
    if (btnPausa) btnPausa.addEventListener('click', onPausa);
    if (btnRepetir) btnRepetir.addEventListener('click', onRepetir);
    if (cerrarBtn) cerrarBtn.addEventListener('click', onClickCerrar);
    if (enlaceFicha) enlaceFicha.addEventListener('click', onFicha);
    document.addEventListener('visibilitychange', onVisibilidad);
    window.addEventListener('resize', onResize);
    if (mqReducido && mqReducido.addEventListener) mqReducido.addEventListener('change', onCambioReducido);
    var ioVista = null;
    if ('IntersectionObserver' in window) {
      ioVista = new IntersectionObserver(function (es) { enPantalla = es.some(function (e) { return e.isIntersecting; }); recalcRunning(); });
      ioVista.observe(sec);
    }

    function destroy() {
      destruido = true; detener();
      btn.removeEventListener('click', onClickAbrir);
      sec.removeEventListener('click', onClickTarjeta);
      if (btnPausa) btnPausa.removeEventListener('click', onPausa);
      if (btnRepetir) btnRepetir.removeEventListener('click', onRepetir);
      if (ioPrep) { ioPrep.disconnect(); ioPrep = null; }
      if (cerrarBtn) cerrarBtn.removeEventListener('click', onClickCerrar);
      if (enlaceFicha) enlaceFicha.removeEventListener('click', onFicha);
      document.removeEventListener('visibilitychange', onVisibilidad);
      document.removeEventListener('keydown', onKey, true);
      window.removeEventListener('resize', onResize);
      if (mqReducido && mqReducido.removeEventListener) mqReducido.removeEventListener('change', onCambioReducido);
      if (ioVista) ioVista.disconnect();
      desinertar(); resetEstilos(); overlay.hidden = true; estado = 'cerrado'; fase('cerrado');
      sec.removeAttribute('data-hist-fase');
      delete sec.__drHist;
    }

    fase('cerrado');
    preparar();
    var api = {
      abrir: function (a) { return abrir(typeof a === 'string' ? { id: a } : a); }, cerrar: cerrar, repetir: onRepetir, pausar: fijarPausa, destroy: destroy,
      estado: function () { return estado; }, listo: function () { return listo; },
      pausado: function () { return pausadoUsuario || !running; }, tiempo: function () { return elapsed; }
    };
    sec.__drHist = api;
    /* una tarjeta pulsada antes de que este archivo cargara (el script de la sección la dejó pendiente) */
    var pend = root.__drHistPend;
    if (pend && pend.id) { root.__drHistPend = 0; abrirUnidad(sec.querySelector('[data-hist-unit="' + pend.id + '"]')); }
    return api;
  }

  var secciones = document.querySelectorAll('[data-historia]');
  var primera = null;
  for (var i = 0; i < secciones.length; i++) { var a = montar(secciones[i]); if (a && !primera) primera = a; }
  root.drHistoria = primera ? { __listo: true, abrir: primera.abrir, cerrar: primera.cerrar, repetir: primera.repetir, pausar: primera.pausar, estado: primera.estado, listo: primera.listo, pausado: primera.pausado, tiempo: primera.tiempo, destroy: primera.destroy } : { __listo: true };
})();
