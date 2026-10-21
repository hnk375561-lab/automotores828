/* Horizonte Automotores · fondos con fotografía en las secciones oscuras.
   Cada imagen se descarga y decodifica recién cuando la sección está cerca de la pantalla; sin background-attachment:fixed. */
(function () {
  'use strict';
  if (navigator.connection && navigator.connection.saveData) return;
  var MAPA = [
    ['#guia', 'images/stock/cruze-1440.webp', 'images/stock/cruze-1080.webp', 'linear-gradient(rgba(10,16,18,.80),rgba(10,16,18,.90))'],
    ['#visita', 'images/stock/sonic-1440.webp', 'images/stock/sonic-1080.webp', 'linear-gradient(rgba(10,16,18,.78),rgba(10,16,18,.88))'],
    ['#contacto', 'images/stock/peugeot-207-1440.webp', 'images/stock/peugeot-207-1080.webp', 'linear-gradient(rgba(10,16,18,.80),rgba(10,16,18,.90))'],
    ['footer', 'images/stock/fox-1440.webp', 'images/stock/fox-1080.webp', 'linear-gradient(rgba(10,16,18,.84),rgba(10,16,18,.92))']
  ];
  var movil = window.matchMedia && window.matchMedia('(max-width: 700px)').matches;
  var cola = [], ocupado = false;
  function idle(f) { (window.requestIdleCallback || function (g) { setTimeout(g, 120); })(f, { timeout: 1500 }); }
  function siguiente() {
    if (ocupado || !cola.length) return;
    ocupado = true;
    var it = cola.shift(), el = it[0], cfg = it[1], url = movil ? cfg[2] : cfg[1], im = new Image();
    im.decoding = 'async';
    function listo() {
      var d = el.querySelector(':scope > .hz-bgimg');
      if (d) { d.style.backgroundImage = cfg[3] + ',url("' + url + '")'; d.classList.add('is-on'); }
      ocupado = false; setTimeout(function () { idle(siguiente); }, 400);
    }
    im.onload = function () { im.decode ? im.decode().then(listo, listo) : listo(); };
    im.onerror = function () { ocupado = false; idle(siguiente); };
    im.src = url;
  }
  function encolar(el) { cola.push([el, el.__hzbg]); idle(siguiente); }
  var io = 'IntersectionObserver' in window ? new IntersectionObserver(function (es) {
    es.forEach(function (e) { if (e.isIntersecting) { io.unobserve(e.target); encolar(e.target); } });
  }, { rootMargin: '1200px 0px' }) : null;
  function armar() {
    MAPA.forEach(function (cfg) {
      var el = document.querySelector(cfg[0]); if (!el) return;
      el.classList.add('hz-bgh');
      var d = document.createElement('div'); d.className = 'hz-bgimg'; d.setAttribute('aria-hidden', 'true');
      el.insertBefore(d, el.firstChild);
      el.__hzbg = cfg;
      io ? io.observe(el) : encolar(el);
    });
  }
  if (document.readyState === 'complete') setTimeout(armar, 1500); else window.addEventListener('load', function () { setTimeout(armar, 1500); });
})();
