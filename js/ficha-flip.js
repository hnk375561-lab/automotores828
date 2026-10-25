/* Transición de apertura y cierre de la ficha (dialog.ficha).
   No reemplaza nada de js/secciones.js: se engancha al <dialog> que ese archivo ya crea y reutiliza.
     - attach(dlg)       una sola vez: envuelve dlg.close() y atiende «cancel» (Escape) para animar el cierre.
     - open(dlg, origen) después de showModal(): la tarjeta se «abre» como ficha.
   Todo es cosmético y con fallback: sin Web Animations, con prefers-reduced-motion, con la tarjeta fuera de
   pantalla o con cualquier error, el diálogo se comporta exactamente como antes.
   Se usa Web Animations API nativa (sin GSAP): el índice no carga GSAP y aquí solo se mueven dos elementos.
   Sin fill persistente: cancelar una animación deja siempre el diálogo en su estado normal. */
(function () {
  'use strict';
  var nativeClose = window.HTMLDialogElement && window.HTMLDialogElement.prototype.close;
  if (!nativeClose || !Element.prototype.animate) return;

  var mq = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;
  var reduce = function () { return !!(mq && mq.matches); };
  var narrow = function () { return window.innerWidth <= 800; };
  var ease = function () {
    var v = ''; try { v = getComputedStyle(document.documentElement).getPropertyValue('--mo-ease').trim(); } catch (e) {}
    return v || 'cubic-bezier(.22,.8,.24,1)';
  };
  /* Equipos que se declaran de gama baja (≤2 núcleos o ≤2 GB): solo el ascenso breve, sin morph ni vuelo de foto. */
  var lowEnd = (navigator.hardwareConcurrency || 8) <= 2 || (navigator.deviceMemory || 8) <= 2;
  var states = new WeakMap();
  var ghost = null, ghostImg = null;

  function st(dlg) {
    var s = states.get(dlg);
    if (!s) { s = { origin: null, anims: [], tgt: null, closing: false, sy: 0, wd: 0, onScroll: null, rv: undefined, tok: 0, settle: null, shown: false }; states.set(dlg, s); }
    return s;
  }
  function rect(el) { var r = el.getBoundingClientRect(); return { left: r.left, top: r.top, width: r.width, height: r.height }; }
  function visibleShare(r) {
    if (r.width < 24 || r.height < 24) return 0;
    var w = Math.min(r.left + r.width, window.innerWidth) - Math.max(r.left, 0);
    var h = Math.min(r.top + r.height, window.innerHeight) - Math.max(r.top, 0);
    return w > 0 && h > 0 ? (w * h) / (r.width * r.height) : 0;
  }
  function unitKey(u) {
    try { u = new URL(u, location.href).pathname; } catch (e) {}
    var m = /ml-(\d+)/.exec(u);
    return m ? m[1] : u.replace(/\.[a-z0-9]+$/i, '');
  }
  function track(s, el, kf, opts) {
    var a = el.animate(kf, opts); s.anims.push(a);
    a.addEventListener('finish', function () { if (s.settle) s.settle(); });
    return a;
  }

  /* Tarjeta (o botón del hero) que abrió la ficha. Devuelve null si no sirve como origen del movimiento. */
  function source(origin) {
    if (lowEnd || !origin || !origin.isConnected) return null;
    var li = origin.closest ? origin.closest('li.car') : null, box, photo = null, img = null;
    if (li) { box = li; photo = li.querySelector('.car-ph'); img = photo ? photo.querySelector('img') : null; }
    else box = origin;
    var r = rect(box);
    if (visibleShare(r) < 0.35) return null;
    var pr = photo ? rect(photo) : null;
    if (img && !(img.naturalWidth > 0 && pr && pr.width > 24 && pr.height > 24)) img = null;
    return { box: r, photo: pr, img: img };
  }

  /* Un único elemento «fantasma» en la capa superior (popover) para que la foto vuele por encima del diálogo. */
  function ghostEl() {
    if (!ghost) {
      if (!document.body || typeof HTMLElement.prototype.showPopover !== 'function') return null;
      ghost = document.createElement('div'); ghost.setAttribute('popover', 'manual'); ghost.setAttribute('aria-hidden', 'true');
      var g = ghost.style;
      g.position = 'fixed'; g.inset = 'auto'; g.margin = '0'; g.padding = '0'; g.border = '0'; g.background = 'transparent';
      g.overflow = 'visible'; g.pointerEvents = 'none'; g.maxWidth = 'none'; g.maxHeight = 'none';
      ghostImg = document.createElement('img'); ghostImg.alt = ''; ghostImg.decoding = 'sync';
      var i = ghostImg.style; i.position = 'absolute'; i.left = '0'; i.top = '0'; i.width = '100%'; i.height = '100%';
      i.display = 'block'; i.objectFit = 'cover'; i.maxWidth = 'none';
      ghost.appendChild(ghostImg); document.body.appendChild(ghost);
    }
    return ghost;
  }
  function hideGhost() {
    if (!ghost) return;
    try { if (ghost.matches(':popover-open')) ghost.hidePopover(); } catch (e) {}
    ghost.style.opacity = '';
  }

  /* Vuelo de la foto entre dos recuadros (C = tarjeta, T = foto de la ficha) con object-fit:cover en ambos.
     El fantasma mide lo que ocupa la imagen «cover» en T y se recorta con clip-path; así el recorte coincide
     con el de la tarjeta al inicio y con el de la ficha al final, y solo se anima transform + clip-path
     (sin deformar la foto y sin recalcular layout). dir: 'open' (C→T) o 'close' (T→C). */
  function fly(s, dir, C, T, url, nw, nh, dur, easing) {
    var g = ghostEl(); if (!g || !(nw > 0 && nh > 0)) return null;
    var kT = Math.max(T.width / nw, T.height / nh), W = nw * kT, H = nh * kT;
    var kC = Math.max(C.width / nw, C.height / nh), sc = kC / kT;
    var tx = T.left + T.width / 2, ty = T.top + T.height / 2, cx = C.left + C.width / 2, cy = C.top + C.height / 2;
    var clip = function (w, h) { return 'inset(' + Math.max(0, (H - h) / 2) + 'px ' + Math.max(0, (W - w) / 2) + 'px)'; };
    var atT = { transform: 'translate(0px,0px) scale(1)', clipPath: clip(T.width, T.height) };
    var atC = { transform: 'translate(' + (cx - tx) + 'px,' + (cy - ty) + 'px) scale(' + sc + ')', clipPath: clip(C.width / sc, C.height / sc) };
    var s0 = g.style;
    s0.left = (tx - W / 2) + 'px'; s0.top = (ty - H / 2) + 'px'; s0.width = W + 'px'; s0.height = H + 'px'; s0.opacity = '';
    if (ghostImg.getAttribute('src') !== url) ghostImg.src = url;
    try { if (!g.matches(':popover-open')) g.showPopover(); } catch (e) { return null; }
    return track(s, g, dir === 'open' ? [atC, atT] : [atT, atC], { duration: dur, easing: easing, fill: 'forwards' });
  }

  function cleanup(dlg, s) {
    s.tok++; s.settle = null; clearTimeout(s.wd);
    if (s.onScroll) { window.removeEventListener('scroll', s.onScroll); s.onScroll = null; }
    s.anims.forEach(function (a) { try { a.cancel(); } catch (e) {} }); s.anims = [];
    if (s.tgt) { s.tgt.style.visibility = ''; s.tgt = null; }
    hideGhost();
    dlg.style.willChange = '';
  }

  /* ---------- apertura ---------- */
  function open(dlg, origin) {
    try { attach(dlg); doOpen(dlg, origin); } catch (e) { cleanup(dlg, st(dlg)); }
  }
  function doOpen(dlg, origin) {
    var s = st(dlg), again = s.shown; cleanup(dlg, s); s.closing = false; s.origin = origin || null; s.sy = window.pageYOffset;
    s.shown = !!dlg.open;
    if (reduce() || !dlg.open) return;
    var easing = ease(), dur = narrow() ? 440 : 520;
    if (again) {
      /* otra unidad («Otras unidades») con la ficha ya abierta: el cuadro no se vuelve a abrir desde la tarjeta, solo entra el
         contenido nuevo. Esta unidad no tiene su tarjeta como destino, así que al cerrar se usa el cierre breve. */
      s.origin = null;
      [dlg.querySelector('.fi-x'), dlg.querySelector('.fi-g')].forEach(function (n) { if (n) track(s, n, [{ opacity: 0 }, { opacity: 1 }], { duration: 260, easing: easing }); });
      var tkA = ++s.tok;
      s.settle = function () { if (s.tok === tkA && s.anims.every(function (a) { return a.playState === 'finished'; })) cleanup(dlg, s); };
      s.wd = setTimeout(function () { if (s.tok === tkA) cleanup(dlg, s); }, 900);
      return;
    }
    var src = source(origin), D = rect(dlg), x = dlg.querySelector('.fi-x'), g = dlg.querySelector('.fi-g');
    var tgt = dlg.querySelector('.fi-t img'), T = tgt ? rect(tgt) : null;
    dlg.style.willChange = 'transform';

    if (!src || D.width < 40 || D.height < 40) {
      /* origen no disponible: ascenso breve y seguro; el resto de la entrada sigue como estaba */
      var a0 = track(s, dlg, [{ transform: 'translateY(22px) scale(.985)' }, { transform: 'none' }], { duration: 300, easing: easing });
      var tk = ++s.tok; a0.onfinish = function () { if (s.tok === tk) cleanup(dlg, s); };
      s.wd = setTimeout(function () { if (s.tok === tk) cleanup(dlg, s); }, 900);
      return;
    }

    /* el contenedor «crece» desde la tarjeta */
    var cl = function (v) { return Math.min(1.2, Math.max(0.04, v)); };
    var from = 'translate(' + (src.box.left - D.left) + 'px,' + (src.box.top - D.top) + 'px) scale(' + cl(src.box.width / D.width) + ',' + cl(src.box.height / D.height) + ')';
    var main = track(s, dlg, [{ transformOrigin: '0 0', transform: from, opacity: 0, offset: 0 }, { transformOrigin: '0 0', opacity: 1, offset: 0.3 },
      { transformOrigin: '0 0', transform: 'translate(0px,0px) scale(1,1)', opacity: 1, offset: 1 }], { duration: dur, easing: easing });

    /* el contenido llega cuando la caja ya casi tiene su tamaño; lo secundario entra escalonado y breve */
    var fade = [{ opacity: 0, offset: 0 }, { opacity: 0, offset: 0.25 }, { opacity: 1, offset: 0.72 }, { opacity: 1, offset: 1 }];
    [x, g].forEach(function (n) { if (n) track(s, n, fade, { duration: dur, easing: 'linear' }); });
    var info = dlg.querySelectorAll('.fi-i > *'), k;
    for (k = 0; k < info.length && k < 6; k++) {
      info[k].style.animation = 'none';   /* reemplaza la entrada anterior (moIn) de estos bloques */
      track(s, info[k], [{ opacity: 0, transform: 'translateY(14px)' }, { opacity: 1, transform: 'none' }],
        { duration: 360, delay: Math.round(dur * 0.3) + k * 40, easing: easing, fill: 'backwards' });
    }

    /* la foto de la tarjeta vuela hasta la primera foto de la ficha, solo si es la misma unidad */
    var flying = null;
    if (tgt && T && T.width > 40 && src.img && unitKey(src.img.currentSrc || src.img.src) === unitKey(tgt.currentSrc || tgt.src)) {
      tgt.style.animation = 'none'; tgt.style.visibility = 'hidden'; s.tgt = tgt;
      flying = fly(s, 'open', src.photo, T, src.img.currentSrc || src.img.src, src.img.naturalWidth, src.img.naturalHeight, dur, easing);
      if (!flying) { tgt.style.visibility = ''; s.tgt = null; }
    }

    var tok = ++s.tok;
    s.settle = function () {
      if (s.tok !== tok || s.tgt) return;
      if (s.anims.every(function (a) { return a.playState === 'finished'; })) cleanup(dlg, s);
    };
    /* al llegar la foto, se descubre la foto real y el fantasma se desvanece; si la foto grande aún no cargó, el fantasma la cubre (con tope) */
    var landed = function () {
      if (s.tok !== tok || !s.tgt) return;
      var t = s.tgt, done = function () {
        if (s.tok !== tok || s.tgt !== t) return;
        t.style.visibility = ''; s.tgt = null;
        if (ghost) track(s, ghost, [{ opacity: 1 }, { opacity: 0 }], { duration: 160, easing: 'linear', fill: 'forwards' });
        else s.settle();
      };
      if (t.complete && t.naturalWidth > 0) done();
      else { t.addEventListener('load', done, { once: true }); t.addEventListener('error', done, { once: true }); setTimeout(done, 1500); }
    };
    main.onfinish = function () { if (flying) landed(); };
    s.wd = setTimeout(function () { if (s.tok === tok && dlg.open && !s.closing) cleanup(dlg, s); }, dur + 2200);
  }

  /* ---------- cierre ---------- */
  function closeAnimated(dlg, rv) {
    var s = st(dlg);
    if (!dlg.open) { nativeClose.call(dlg, rv); return; }
    if (s.closing) return;
    if (reduce()) { cleanup(dlg, s); nativeClose.call(dlg, rv); return; }
    s.closing = true; s.rv = rv;
    /* si venía abriéndose, se parte del estado visual actual en lugar de saltar al final */
    var curT = 'none', curO = 1, cs = null, xo = dlg.querySelector('.fi-x'), go = dlg.querySelector('.fi-g');
    try { cs = getComputedStyle(dlg); curT = cs.transform; if (go) curO = parseFloat(getComputedStyle(go).opacity); } catch (e) {}
    if (!(curO >= 0 && curO <= 1)) curO = 1;
    var mid = s.anims.length > 0;
    cleanup(dlg, s); s.closing = true;

    var finished = false, finish = function () {
      if (finished) return; finished = true;
      clearTimeout(s.wd); if (s.onScroll) { window.removeEventListener('scroll', s.onScroll); s.onScroll = null; }
      nativeClose.call(dlg, s.rv);   /* el evento «close» de secciones.js devuelve el foco y limpia has-dlg */
    };
    /* si la página se desplaza mientras se cierra (p. ej. un enlace a #tu-usado), la tarjeta ya no está donde estaba */
    s.onScroll = function () { finish(); };
    window.addEventListener('scroll', s.onScroll, { passive: true });

    window.requestAnimationFrame(function () {
      if (finished || !dlg.open) { if (!finished) finish(); return; }
      try {
        if (Math.abs(window.pageYOffset - s.sy) > 1) { finish(); return; }
        var easing = ease(), src = source(s.origin), D = rect(dlg), dur;
        var start = curT && curT !== 'none' ? curT : 'translate(0px,0px) scale(1,1)';
        var kfMain, tgt = dlg.querySelector('.fi-t img'), flyOk = false;
        if (src && D.width > 40 && D.height > 40) {
          dur = narrow() ? 320 : 380;
          var cl = function (v) { return Math.min(1.2, Math.max(0.04, v)); };
          kfMain = [{ transformOrigin: '0 0', transform: start, opacity: 1, offset: 0 }, { transformOrigin: '0 0', opacity: 1, offset: 0.55 },
            { transformOrigin: '0 0', transform: 'translate(' + (src.box.left - D.left) + 'px,' + (src.box.top - D.top) + 'px) scale(' + cl(src.box.width / D.width) + ',' + cl(src.box.height / D.height) + ')', opacity: 0, offset: 1 }];
          /* la foto vuelve a la tarjeta solo si se está viendo la primera y no hubo una apertura a medias */
          var tr = tgt && tgt.parentNode;
          if (!mid && tgt && tr && src.img && tr.scrollLeft < 4 && unitKey(src.img.currentSrc || src.img.src) === unitKey(tgt.currentSrc || tgt.src)) {
            var T = rect(tgt), dr = rect(dlg);
            var cut = { left: Math.max(T.left, dr.left), top: Math.max(T.top, dr.top), right: Math.min(T.left + T.width, dr.left + dr.width), bottom: Math.min(T.top + T.height, dr.top + dr.height) };
            var share = Math.max(0, cut.right - cut.left) * Math.max(0, cut.bottom - cut.top) / Math.max(1, T.width * T.height);
            if (share > 0.7 && T.width > 40) {
              var ok = tgt.complete && tgt.naturalWidth > 0, im = ok ? tgt : src.img;
              s.tgt = tgt; tgt.style.visibility = 'hidden';
              var f = fly(s, 'close', src.photo, T, im.currentSrc || im.src, im.naturalWidth, im.naturalHeight, dur, easing);
              if (f) { flyOk = true; f.onfinish = finish; } else { tgt.style.visibility = ''; s.tgt = null; }
            }
          }
        } else {
          dur = 240;
          kfMain = [{ transform: start, opacity: 1 }, { transform: 'translateY(18px) scale(.985)', opacity: 0 }];
        }
        dlg.style.willChange = 'transform';
        var main = track(s, dlg, kfMain, { duration: dur, easing: easing, fill: 'forwards' });
        if (!flyOk) main.onfinish = finish;
        var out = [{ opacity: curO, offset: 0 }, { opacity: 0, offset: 0.4 }, { opacity: 0, offset: 1 }];
        [xo, go].forEach(function (n) { if (n) track(s, n, out, { duration: dur, easing: 'linear', fill: 'forwards' }); });
        try { track(s, dlg, [{ opacity: 1 }, { opacity: 0 }], { duration: dur, easing: 'linear', fill: 'forwards', pseudoElement: '::backdrop' }); } catch (e) {}
        s.wd = setTimeout(finish, dur + 250);   /* pase lo que pase, el diálogo termina de cerrarse */
      } catch (e) { finish(); }
    });
  }

  function attach(dlg) {
    var s = st(dlg);
    if (s.attached) return; s.attached = true;
    dlg.close = function (rv) { try { closeAnimated(dlg, rv); } catch (e) { cleanup(dlg, s); nativeClose.call(dlg, rv); } };
    dlg.addEventListener('cancel', function (e) { if (reduce()) return; e.preventDefault(); dlg.close(); });
    dlg.addEventListener('close', function () { s.closing = false; s.shown = false; cleanup(dlg, s); });
  }

  window.drFichaFlip = { attach: attach, open: open };
})();
