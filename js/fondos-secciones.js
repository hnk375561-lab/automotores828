/* Automotores 828 · fotos de fondo en alta calidad para las secciones.
   Cada foto se descarga y decodifica recién cuando la sección está cerca de la pantalla, de a una por vez.
   Sin background-attachment:fixed. Con "ahorro de datos" no se cargan. */
(function () {
  'use strict';
  if (navigator.connection && navigator.connection.saveData) return;
  var INK = '6,6,7';
  /* velo propio: oscuro a la izquierda (donde va el texto), más suave a la derecha, con un fundido corto a negro arriba y abajo.
     Tu usado y Tu búsqueda ya traen su velo en el CSS: ahí va la foto sola (null). */
  function velo(izq, der) {
    return 'linear-gradient(180deg,rgb(' + INK + ') 0%,rgba(' + INK + ',0) 5%,rgba(' + INK + ',0) 95%,rgb(' + INK + ') 100%),' +
      'linear-gradient(90deg,rgba(' + INK + ',' + izq + ') 0%,rgba(' + INK + ',' + (izq + der) / 2 + ') 45%,rgba(' + INK + ',' + der + ') 100%)';
  }
  var PLANO = 'linear-gradient(rgba(' + INK + ',.74),rgba(' + INK + ',.74))';
  /* [selector, foto, posición vertical, velo de escritorio] */
  var MAPA = [
    ['#financiacion', 'financiacion', '40%', velo(.84, .3)],
    ['#tu-usado', 'tu-usado', '40%', null],
    ['#busqueda', 'busqueda', '40%', null],
    ['#guia', 'guia', '40%', velo(.82, .4)],
    ['#visita', 'visita', '50%', velo(.82, .4)],
    ['#donde', 'donde', '68%', velo(.8, .45)],
    ['#contacto', 'contacto', '58%', velo(.84, .45)],
    ['footer', 'footer', '58%', velo(.88, .6)]
  ];
  var movil = window.matchMedia && window.matchMedia('(max-width: 700px)').matches;
  var cola = [], ocupado = false;
  function idle(f) { (window.requestIdleCallback || function (g) { setTimeout(g, 120); })(f, { timeout: 1500 }); }
  function siguiente() {
    if (ocupado || !cola.length) return;
    ocupado = true;
    var it = cola.shift(), cfg = it.cfg, capa = it.capa;
    var url = 'images/fondos/fondo-' + cfg[1] + (movil ? '-800' : '') + '.webp', im = new Image();
    function fin() { ocupado = false; setTimeout(function () { idle(siguiente); }, 250); }
    function listo() {
      var capas = movil ? (cfg[3] ? PLANO : null) : cfg[3];
      capa.style.backgroundImage = (capas ? capas + ',' : '') + 'url("' + url + '")';
      capa.style.backgroundPosition = (capas ? 'center,' : '') + '50% ' + cfg[2];
      requestAnimationFrame(function () { capa.classList.add('is-on'); });
      fin();
    }
    im.decoding = 'async';
    im.onload = function () { im.decode ? im.decode().then(listo, listo) : listo(); };
    im.onerror = fin;
    im.src = url;
  }
  function encolar(el) { cola.push(el.__dr); idle(siguiente); }
  var io = 'IntersectionObserver' in window ? new IntersectionObserver(function (es) {
    es.forEach(function (e) { if (e.isIntersecting) { io.unobserve(e.target); encolar(e.target); } });
  }, { rootMargin: '900px 0px' }) : null;
  function armar() {
    MAPA.forEach(function (cfg) {
      var el = document.querySelector(cfg[0]);
      if (!el) return;
      var capa = document.createElement('div');
      capa.className = 'dr-fondo'; capa.setAttribute('aria-hidden', 'true');
      el.classList.add('has-fondo');
      el.insertBefore(capa, el.firstChild);
      el.__dr = { cfg: cfg, capa: capa };
      io ? io.observe(el) : encolar(el);
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', armar); else armar();
})();
