/* Visor de fotos ampliadas de la ficha (dialog.gv).
   No reemplaza nada de js/secciones.js ni de js/ficha-flip.js: js/secciones.js lo invoca desde la galería de la ficha.
     window.drGaleriaVisor.open({ items, index, title, trigger, onIndex })
     window.drGaleriaVisor.close(sinFoco)   cierra al instante (la ficha lo usa al reconstruirse)
     window.drGaleriaVisor.isOpen()
   Es un segundo <dialog> nativo que se abre ENCIMA de la ficha: la ficha queda intacta debajo (no se cierra ni se
   reconstruye), el navegador la vuelve inerte y Escape cierra solo el visor (el «cancel» llega al diálogo superior).
   Sin Web Animations o con prefers-reduced-motion funciona igual, sin animar.
   Si este archivo no carga, la galería de la ficha sigue funcionando como antes. */
(function () {
  'use strict';
  if (!window.HTMLDialogElement || typeof HTMLDialogElement.prototype.showModal !== 'function') return;

  var mq = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;
  var reduce = function () { return !!(mq && mq.matches); };
  var canAnim = typeof Element.prototype.animate === 'function';
  var ease = 'cubic-bezier(.22,.8,.24,1)';

  var dlg = null, stage = null, img = null, err = null, ct = null, bPrev = null, bNext = null, bClose = null;
  var S = { items: [], i: 0, title: '', trigger: null, onIndex: null, tok: 0, open: false, closing: false, wd: 0, anim: null, pre: [], sx: 0, sy: 0, sid: null, st: 0 };

  function mk(tag, cls, txt) { var n = document.createElement(tag); if (cls) n.className = cls; if (txt != null) n.textContent = txt; return n; }
  function btn(cls, label, txt, fn) {
    var b = mk('button', cls, txt); b.type = 'button'; b.setAttribute('aria-label', label); b.addEventListener('click', fn); return b;
  }
  function stop(a) { if (a) { try { a.cancel(); } catch (e) {} } }

  function build() {
    if (dlg) return;
    dlg = mk('dialog', 'gv'); dlg.setAttribute('aria-label', 'Fotos ampliadas');
    var bar = mk('div', 'gv-bar');
    ct = mk('p', 'gv-ct'); ct.setAttribute('role', 'status'); ct.setAttribute('aria-live', 'polite'); ct.setAttribute('aria-atomic', 'true');
    bClose = btn('gv-x', 'Cerrar fotos ampliadas', 'Cerrar', function () { close(); });
    bar.appendChild(ct); bar.appendChild(bClose);

    stage = mk('div', 'gv-st');
    img = mk('img', 'gv-img'); img.alt = ''; img.decoding = 'async'; img.draggable = false;
    err = mk('p', 'gv-err', 'No se pudo cargar esta foto. Podés seguir con las demás.'); err.hidden = true;
    stage.appendChild(img); stage.appendChild(err);

    bPrev = btn('gv-a gv-prev', 'Foto anterior', '‹', function () { go(S.i - 1); });
    bNext = btn('gv-a gv-next', 'Foto siguiente', '›', function () { go(S.i + 1); });

    dlg.appendChild(bar); dlg.appendChild(stage); dlg.appendChild(bPrev); dlg.appendChild(bNext);
    document.body.appendChild(dlg);

    /* Escape: cierra solo el visor (con salida breve). El «cancel» se atiende siempre para que la ficha de abajo no se entere. */
    dlg.addEventListener('cancel', function (e) { e.preventDefault(); close(); });
    dlg.addEventListener('close', finish);
    dlg.addEventListener('keydown', function (e) {
      if (e.altKey || e.ctrlKey || e.metaKey) return;
      var k = e.key;
      if (k === 'ArrowRight') { go(S.i + 1); e.preventDefault(); }
      else if (k === 'ArrowLeft') { go(S.i - 1); e.preventDefault(); }
      else if (k === 'Home') { go(0); e.preventDefault(); }
      else if (k === 'End') { go(S.items.length - 1); e.preventDefault(); }
    });

    /* Gesto horizontal: solo cuenta un deslizamiento claramente horizontal; un toque, un arrastre corto o un gesto
       vertical no hacen nada. El segundo dedo (zoom con pellizco) anula el gesto. */
    stage.addEventListener('pointerdown', function (e) {
      if (!e.isPrimary) { S.sid = null; return; }
      S.sid = e.pointerId; S.sx = e.clientX; S.sy = e.clientY; S.st = Date.now();
    });
    stage.addEventListener('pointerup', function (e) {
      if (S.sid !== e.pointerId) return; S.sid = null;
      var dx = e.clientX - S.sx, dy = e.clientY - S.sy;
      if (Math.abs(dx) >= 48 && Math.abs(dx) > Math.abs(dy) * 1.5 && Date.now() - S.st < 900) go(S.i + (dx < 0 ? 1 : -1));
    });
    ['pointercancel', 'lostpointercapture'].forEach(function (n) { stage.addEventListener(n, function () { S.sid = null; }); });
  }

  function setDisabled(b, off) { b.classList.toggle('off', off); b.setAttribute('aria-disabled', off ? 'true' : 'false'); }

  function sync() {
    var n = S.items.length;
    ct.textContent = (S.i + 1) + ' de ' + n;
    setDisabled(bPrev, S.i <= 0); setDisabled(bNext, S.i >= n - 1);
    var one = n < 2; bPrev.hidden = one; bNext.hidden = one;
  }

  function preload(k) {
    var it = S.items[k]; if (!it || !it.src) return;
    var p = new Image(); p.decoding = 'async'; p.src = it.src; S.pre.push(p);
    if (S.pre.length > 4) S.pre.shift();
  }

  /* Muestra la foto k. La anterior se mantiene hasta que la nueva está lista (sin destello vacío); si una llegada tardía
     corresponde a una foto que ya no es la pedida, se descarta. */
  function show(k, first) {
    var it = S.items[k], tok = ++S.tok; if (!it) return;
    err.hidden = true; stage.classList.add('gv-load');
    var n = new Image(); n.decoding = 'async';
    if (it.srcset) { n.srcset = it.srcset; n.sizes = '100vw'; }
    n.onload = function () {
      if (tok !== S.tok || !S.open) return;
      stage.classList.remove('gv-load'); err.hidden = true; img.hidden = false;
      if (it.srcset) { img.srcset = it.srcset; img.sizes = '100vw'; } else img.removeAttribute('srcset');
      img.src = it.src; img.alt = it.alt || S.title || '';
      if (it.width && it.height) { img.width = it.width; img.height = it.height; }
      if (!reduce() && canAnim) {
        stop(S.anim);
        S.anim = img.animate([{ opacity: 0, transform: first ? 'scale(.965)' : 'scale(.985)' }, { opacity: 1, transform: 'none' }], { duration: first ? 280 : 200, easing: ease });
      }
      preload(k + 1); preload(k - 1);
    };
    n.onerror = function () {
      if (tok !== S.tok || !S.open) return;
      stage.classList.remove('gv-load'); img.hidden = true; img.removeAttribute('src'); err.hidden = false;
    };
    n.src = it.src;
  }

  function go(k) {
    var n = S.items.length; if (!S.open || S.closing || !n) return;
    k = Math.max(0, Math.min(n - 1, k)); if (k === S.i) return;
    S.i = k; sync(); show(k, false);
    if (typeof S.onIndex === 'function') { try { S.onIndex(k); } catch (e) {} }
  }

  function open(o) {
    o = o || {}; var items = (o.items || []).filter(function (m) { return m && m.src; });
    if (!items.length) return false;
    build();
    if (S.open) { clearTimeout(S.wd); stop(S.anim); if (dlg.open) { try { dlg.close(); } catch (e) {} } finish(true); }
    S.items = items; S.i = Math.max(0, Math.min(items.length - 1, o.index | 0)); S.title = o.title || '';
    S.trigger = o.trigger || null; S.onIndex = o.onIndex || null; S.pre = []; S.closing = false; S.sid = null; S.tok++;
    dlg.setAttribute('aria-label', 'Fotos ampliadas' + (S.title ? ' de ' + S.title : ''));
    img.hidden = false; img.removeAttribute('src'); img.removeAttribute('srcset'); img.alt = ''; err.hidden = true;
    sync(); S.open = true;
    try { dlg.showModal(); } catch (e) { S.open = false; return false; }
    if (!reduce() && canAnim) { stop(S.anim); S.anim = dlg.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 180, easing: 'linear' }); }
    try { bClose.focus({ preventScroll: true }); } catch (e) {}
    show(S.i, true);
    return true;
  }

  /* Cierre con salida breve; pase lo que pase, el diálogo termina de cerrarse. */
  function close(immediate) {
    if (!dlg || !S.open || !dlg.open) return;
    if (immediate === true || reduce() || !canAnim) { clearTimeout(S.wd); stop(S.anim); dlg.close(); return; }
    if (S.closing) return;
    S.closing = true; stop(S.anim);
    var done = function () { clearTimeout(S.wd); stop(S.anim); S.closing = false; if (dlg.open) dlg.close(); };
    try { S.anim = dlg.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 150, easing: 'linear', fill: 'forwards' }); S.anim.onfinish = done; } catch (e) { done(); return; }
    S.wd = setTimeout(done, 400);
  }

  /* «close» (también si el navegador cierra el diálogo por su cuenta): deja todo limpio y devuelve el foco. Es idempotente. */
  function finish(noFocus) {
    if (dlg && dlg.open) return;   /* un «close» tardío de una sesión anterior no debe cerrar la sesión nueva */
    var t = S.trigger, was = S.open;
    clearTimeout(S.wd); stop(S.anim); S.anim = null; S.tok++; S.open = false; S.closing = false; S.sid = null; S.onIndex = null; S.pre = []; S.trigger = null;
    if (!dlg) return;
    stage.classList.remove('gv-load'); err.hidden = true;
    img.removeAttribute('src'); img.removeAttribute('srcset'); img.alt = '';   /* nunca queda la foto de una unidad anterior */
    dlg.style.opacity = '';
    if (was && noFocus !== true && t && t.isConnected) { try { t.focus({ preventScroll: true }); } catch (e) {} }
  }

  window.drGaleriaVisor = {
    open: open,
    close: function (sinFoco) { if (!dlg || !S.open) return; if (sinFoco === true) S.trigger = null; close(true); },
    isOpen: function () { return !!(dlg && S.open && dlg.open); }
  };
})();
