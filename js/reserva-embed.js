/* Horizonte Automotores · abre la reserva dentro del index (sin pestaña nueva).
   Reutiliza reserva.html tal cual, cargada en un diálogo a pantalla completa. */
(function () {
  'use strict';
  var dlg = document.getElementById('reserva-dlg');
  if (!dlg || typeof dlg.showModal !== 'function') return;
  var fr = dlg.querySelector('iframe'), root = document.documentElement, cargado = false, volver = null;
  var SEL = 'a[href="reserva.html"]';
  function cargar() { if (cargado) return; cargado = true; fr.src = fr.getAttribute('data-src'); }
  function abrir() {
    cargar(); volver = document.activeElement;
    if (!dlg.open) dlg.showModal();
    root.classList.add('rs-open');
    setTimeout(function () { try { fr.focus(); } catch (e) {} }, 80);
  }
  function cerrar() { if (dlg.open) dlg.close(); }
  dlg.addEventListener('close', function () {
    root.classList.remove('rs-open');
    try { fr.contentWindow.postMessage({ hz: 'reiniciar-reserva' }, location.origin); } catch (e) {}
    if (volver && volver.focus) { try { volver.focus(); } catch (e) {} }
  });
  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest(SEL);
    if (!a || e.defaultPrevented || e.button || e.metaKey || e.ctrlKey || e.shiftKey) return;
    e.preventDefault(); abrir();
  });
  ['pointerover', 'focusin', 'touchstart'].forEach(function (ev) {
    document.addEventListener(ev, function (e) { if (e.target.closest && e.target.closest(SEL)) cargar(); }, { passive: true });
  });
  window.addEventListener('message', function (e) {
    if (e.origin !== location.origin || !e.data) return;
    if (e.data.hz === 'cerrar-reserva') cerrar();
  });
})();
