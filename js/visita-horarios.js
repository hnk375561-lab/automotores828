/* T6 · Horarios de visita: una sola fuente de elegibilidad para reserva.html y para la reserva inline.
   Lee los horarios publicados (data/dealership.json → build → atributo data-semana), nunca constantes propias:
   los días sin atención no se ofrecen y cada franja muestra su rango real. Sigue siendo una consulta, no un turno.
   Feriados: no hay dato cargado, así que no se inventan. Sin horarios cargados se conserva el comportamiento anterior. */
(function (root) {
  'use strict';
  var semana = null;
  function leer() {
    if (semana) return semana;
    semana = [];
    var src = document.querySelector('[data-semana]');
    if (src) { try { var v = JSON.parse(src.getAttribute('data-semana')); if (v && v.length) semana = v; } catch (e) {} }
    return semana;
  }
  function min(t) { var p = String(t).split(':'); return (+p[0]) * 60 + (+p[1] || 0); }
  function hora(t) { var p = String(t).split(':'); return String(+p[0]) + (+p[1] ? ':' + p[1] : ''); }
  function rangosDe(dow) {
    var s = leer();
    for (var i = 0; i < s.length; i++) if (s[i].dias.indexOf(dow) !== -1) return s[i].rangos;
    return [];
  }
  function franjas(date) {
    if (!date) return [];
    var dow = date.getDay();
    if (!leer().length) return dow === 0 ? [] : [{ id: 'Mañana', rango: '' }, { id: 'Tarde', rango: '' }];
    var usados = {};
    return rangosDe(dow).slice().sort(function (a, b) { return min(a[0]) - min(b[0]); }).map(function (r) {
      var id = min(r[0]) < 12 * 60 && !usados['Mañana'] ? 'Mañana' : 'Tarde';
      usados[id] = true;
      return { id: id, rango: hora(r[0]) + ' a ' + hora(r[1]) };
    });
  }
  function hoy() { var t = new Date(); return new Date(t.getFullYear(), t.getMonth(), t.getDate()); }
  function elegible(date) { return !!date && date >= hoy() && franjas(date).length > 0; }
  function motivo(date) { return !date ? '' : date < hoy() ? 'fecha pasada' : franjas(date).length ? '' : 'cerrado'; }
  root.drVisitaHorarios = { franjas: franjas, elegible: elegible, motivo: motivo };
})(window);
