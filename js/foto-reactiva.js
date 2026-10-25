/* Automotores 828 · foto reactiva al cursor en las tarjetas del inventario (#unidades .cars).
   Solo escribe dos variables CSS (--ph-x, --ph-y, en %) sobre el marco .car-ph de la tarjeta bajo el puntero; el movimiento lo hace
   la propiedad «translate» de la foto (css/damero-secciones.css), que se compone con el scale del Hover Reveal sin tocarlo.
   - Solo mouse/lápiz con hover real y puntero fino; nada con táctil, movimiento reducido o ahorro de datos.
   - Eventos delegados en la lista (no hay listeners por tarjeta) y como máximo una escritura de estilo por fotograma.
   - Sin bucle permanente: cualquier salida, cancelación, cambio de capacidad o tarjeta oculta devuelve el estado neutral.
   - Sin JavaScript las variables no existen y la foto queda como siempre. */
(function () {
  'use strict';
  var lista = document.querySelector('#unidades .cars');
  if (!lista || !window.matchMedia) return;
  var mqHover = window.matchMedia('(hover: hover) and (pointer: fine)');
  var mqRM = window.matchMedia('(prefers-reduced-motion: reduce)');
  var AX = 3, AY = 0.8;   /* % del tamaño de la foto; dentro del margen que deja el scale(1.07) del hover (sin mostrar bordes vacíos) */
  var ESPERA = 180;       /* ms: el scale del hover aún está creciendo al entrar; el movimiento empieza cuando ya hay margen */
  var marco = null, caja = null, medidoEn = 0, entro = 0, tx = 0, ty = 0, raf = 0;

  function activo() { return mqHover.matches && !mqRM.matches && !document.documentElement.classList.contains('save-data'); }
  function suave(n) { return Math.sin(Math.max(-1, Math.min(1, n)) * Math.PI / 2); }   /* proporcional al centro, sin tope brusco en los bordes */
  function invalidar() { caja = null; }

  function pintar() {
    raf = 0;
    if (!marco) return;
    marco.style.setProperty('--ph-x', tx.toFixed(2) + '%');
    marco.style.setProperty('--ph-y', ty.toFixed(2) + '%');
  }
  function neutral() {
    if (raf) { cancelAnimationFrame(raf); raf = 0; }
    if (marco) { marco.style.removeProperty('--ph-x'); marco.style.removeProperty('--ph-y'); if (!marco.getAttribute('style')) marco.removeAttribute('style'); }
    if (marco) { window.removeEventListener('scroll', invalidar); window.removeEventListener('resize', invalidar); }
    marco = null; caja = null; tx = ty = 0;
  }

  lista.addEventListener('pointermove', function (e) {
    if (e.pointerType === 'touch' || !activo()) { if (marco) neutral(); return; }
    var t = e.target, f = t && t.closest ? t.closest('.car-ph') : null;
    if (f !== marco) {
      neutral();
      if (!f || !f.isConnected) return;
      marco = f; entro = e.timeStamp || Date.now();
      window.addEventListener('scroll', invalidar, { passive: true });
      window.addEventListener('resize', invalidar);
    }
    if (!marco) return;
    /* La tarjeta puede estar moviéndose (entrada por scroll o reordenamiento): se vuelve a medir si la medida tiene más de 250 ms. */
    var ahora = e.timeStamp || Date.now();
    if (ahora - entro < ESPERA) return;
    if (!caja || ahora - medidoEn > 250) { caja = marco.getBoundingClientRect(); medidoEn = ahora; }
    if (caja.width < 40 || caja.height < 40) return;
    var nx = ((e.clientX - caja.left) / caja.width) * 2 - 1, ny = ((e.clientY - caja.top) / caja.height) * 2 - 1;
    tx = -suave(nx) * AX; ty = -suave(ny) * AY;   /* la foto se desplaza en sentido contrario al cursor: efecto de profundidad */
    if (!raf) raf = requestAnimationFrame(pintar);
  }, { passive: true });

  lista.addEventListener('pointerleave', neutral);
  lista.addEventListener('pointercancel', neutral);
  lista.addEventListener('pointerdown', function (e) { if (e.pointerType === 'touch') neutral(); }, { passive: true });
  window.addEventListener('blur', neutral);
  document.addEventListener('visibilitychange', function () { if (document.hidden) neutral(); });
  [mqHover, mqRM].forEach(function (m) { if (m.addEventListener) m.addEventListener('change', function () { if (!activo()) neutral(); }); });
})();
