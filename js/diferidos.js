/* Automotores 828 · scripts no críticos, fuera del camino de carga.
   index.html los declara como <script type="text/plain" data-dr-diferido src="…">: el navegador no los descarga ni los ejecuta.
   Este archivo los carga, en el mismo orden, cuando la página ya terminó de cargar y el hilo está libre
   (o antes si la persona toca, scrollea o usa el teclado). Sin JavaScript no hacen falta: son solo mejoras de movimiento. */
(function () {
  'use strict';
  var tags = [].slice.call(document.querySelectorAll('script[data-dr-diferido]'));
  if (!tags.length) return;
  var lanzado = false, EVT = ['pointerdown', 'keydown', 'touchstart', 'scroll'];
  function cargar() {
    if (lanzado) return; lanzado = true;
    EVT.forEach(function (e) { window.removeEventListener(e, cargar, true); });
    tags.forEach(function (t) {
      var src = t.getAttribute('src'); if (!src) return;
      var s = document.createElement('script');
      s.src = src; s.async = false;   /* async=false: se ejecutan en el orden escrito */
      document.body.appendChild(s);
    });
  }
  function enOcio() { (window.requestIdleCallback || function (f) { setTimeout(f, 200); })(cargar, { timeout: 2000 }); }
  EVT.forEach(function (e) { window.addEventListener(e, cargar, { capture: true, passive: true }); });
  if (document.readyState === 'complete') enOcio(); else window.addEventListener('load', enOcio, { once: true });
})();
