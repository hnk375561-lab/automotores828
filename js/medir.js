/* Automotores 828 · T8 · medición de eventos, apagada por defecto.
   - Lee <meta name="dr-medicion">: «off» (demo y por defecto) = no hace NADA ni emite ninguna petición de red.
   - Encendida (content = endpoint https, solo en producción): envía únicamente eventos de una lista cerrada con campos de una lista cerrada.
   - Nunca envía teléfono, textos de formularios, URL completa ni huella del dispositivo. Respeta «No rastrear» y Global Privacy Control. */
(function () {
  'use strict';
  var meta = document.querySelector('meta[name="dr-medicion"]');
  var endpoint = meta ? meta.getAttribute('content') : 'off';
  var noop = function () {};
  window.drMedir = noop;
  if (!endpoint || endpoint === 'off' || !/^https:\/\//.test(endpoint)) return;
  var dnt = navigator.doNotTrack === '1' || window.doNotTrack === '1' || navigator.globalPrivacyControl === true;
  if (dnt || !navigator.sendBeacon) return;

  var EVENTOS = { ficha_abierta: 'id', whatsapp_clic: 'origen', comparador_abierto: '', favorito_agregado: '', filtro_usado: 'filtro' };
  var ORIGENES = { unidades: 1, contacto: 1, visita: 1, 'tu-usado': 1, 'tu-busqueda': 1, horarios: 1, nosotros: 1, ficha: 1, reserva: 1, otro: 1 };
  var FILTROS = { marca: 1, precio: 1, anio: 1, km: 1, moneda: 1, orden: 1, otro: 1 };
  var visto = {};

  function medir(evento, dato) {
    if (!Object.prototype.hasOwnProperty.call(EVENTOS, evento)) return;
    var campo = EVENTOS[evento], body = { e: evento };
    if (campo === 'id') { if (!/^\d{4,14}$/.test(String(dato))) return; body.id = String(dato); }
    if (campo === 'origen') body.origen = ORIGENES[dato] ? dato : 'otro';
    if (campo === 'filtro') body.filtro = FILTROS[dato] ? dato : 'otro';
    var k = evento + '|' + (body.id || body.origen || body.filtro || '');
    var now = Date.now(); if (visto[k] && now - visto[k] < 1500) return; visto[k] = now;
    try { navigator.sendBeacon(endpoint, JSON.stringify(body)); } catch (e) { /* medir nunca rompe el sitio */ }
  }
  window.drMedir = medir;

  function origen(el) {
    if (el.closest('dialog.ficha')) return 'ficha';
    if (/reserva\.html/.test(location.pathname)) return 'reserva';
    var s = el.closest('section[id],div[id]'); return s && ORIGENES[s.id] ? s.id : 'otro';
  }
  window.addEventListener('hashchange', function () { var m = /^#unidad=(\d+)$/.exec(location.hash); if (m) medir('ficha_abierta', m[1]); });
  document.addEventListener('click', function (ev) {
    var t = ev.target; if (!t || !t.closest) return;
    var a = t.closest('a[href]');
    if (a && /^https:\/\/(wa\.me|api\.whatsapp\.com)\//.test(a.href)) medir('whatsapp_clic', origen(a));
    var f = t.closest('[data-fav]'); if (f && f.getAttribute('aria-pressed') === 'false') medir('favorito_agregado');
  }, true);
  document.addEventListener('change', function (ev) {
    var t = ev.target; if (!t || !t.closest || !t.closest('#tools')) return;
    var id = (t.id || t.name || '').toLowerCase();
    medir('filtro_usado', /marca/.test(id) ? 'marca' : /precio/.test(id) ? 'precio' : /anio|año/.test(id) ? 'anio' : /km/.test(id) ? 'km' : /moneda/.test(id) ? 'moneda' : /orden/.test(id) ? 'orden' : 'otro');
  });
  new MutationObserver(function (ms) {
    ms.forEach(function (m) { var d = m.target; if (d.nodeName === 'DIALOG' && d.hasAttribute('open') && /cmp/.test(d.className)) medir('comparador_abierto'); });
  }).observe(document.documentElement, { subtree: true, attributes: true, attributeFilter: ['open'] });
})();
