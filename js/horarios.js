/* Automotores 828 · js/horarios.js
   Sección «Horarios y ubicación»: estado «Abierto ahora / Cerrado ahora» según el horario de data/dealership.json
   (viaja en data-semana), cuenta regresiva en horas, minutos y segundos hasta que abre o cierra, y resaltado de hoy.
   Hora de Argentina (UTC-3, sin horario de verano). Sin red ni cookies.
   Rendimiento: cada segundo solo se reescriben unos pocos textos; el resto (estado, filas) se repinta cuando algo cambia.
   Expone window.drEstado() para que otras partes (la ficha) lean el estado. */
(function () {
  'use strict';
  var src = document.querySelector('[data-semana]');
  if (!src) return;
  var semana;
  try { semana = JSON.parse(src.getAttribute('data-semana')); } catch (e) { return; }
  if (!semana || !semana.length) return;
  var NOMBRES = ['el domingo', 'el lunes', 'el martes', 'el miércoles', 'el jueves', 'el viernes', 'el sábado'];

  function seg(t) { var p = t.split(':'); return (+p[0]) * 3600 + (+p[1]) * 60 + (p[2] ? +p[2] : 0); }
  function hora(t) { return t.replace(/^0/, ''); }
  function dos(n) { return n < 10 ? '0' + n : '' + n; }
  function rangos(dia) {
    for (var i = 0; i < semana.length; i++) if (semana[i].dias.indexOf(dia) !== -1) return semana[i].rangos;
    return [];
  }
  function ahora() {
    var n = new Date();
    return new Date(n.getTime() + n.getTimezoneOffset() * 60000 - 3 * 3600000);
  }

  function estado(a) {
    a = a || ahora();
    var dia = a.getDay(), s = a.getHours() * 3600 + a.getMinutes() * 60 + a.getSeconds(), r = rangos(dia), i;
    for (i = 0; i < r.length; i++) if (s >= seg(r[i][0]) && s < seg(r[i][1])) {
      return { abierto: true, dia: dia, idx: i, falta: seg(r[i][1]) - s, etiqueta: 'Falta para que cierre', corto: 'Cierra en ',
        titulo: 'Abierto ahora', detalle: 'Hoy cerramos a las ' + hora(r[i][1]), txt: 'Abierto ahora · cierra a las ' + hora(r[i][1]) };
    }
    for (i = 0; i < r.length; i++) if (s < seg(r[i][0])) {
      return { abierto: false, dia: dia, idx: -1, falta: seg(r[i][0]) - s, etiqueta: 'Falta para que abra', corto: 'Abre en ',
        titulo: 'Cerrado ahora', detalle: (i ? 'Volvemos a abrir hoy a las ' : 'Hoy abrimos a las ') + hora(r[i][0]), txt: 'Cerrado ahora · abre hoy a las ' + hora(r[i][0]) };
    }
    for (var k = 1; k <= 7; k++) {
      var d = (dia + k) % 7, rr = rangos(d);
      if (rr.length) {
        var cuando = k === 1 ? 'mañana' : NOMBRES[d];
        return { abierto: false, dia: dia, idx: -1, falta: (86400 - s) + (k - 1) * 86400 + seg(rr[0][0]), etiqueta: 'Falta para que abra', corto: 'Abre en ',
          titulo: 'Cerrado ahora', detalle: 'Abrimos ' + cuando + ' a las ' + hora(rr[0][0]), txt: 'Cerrado ahora · abre ' + cuando + ' a las ' + hora(rr[0][0]) };
      }
    }
    return { abierto: false, dia: dia, idx: -1, falta: 0, etiqueta: '', corto: '', titulo: 'Cerrado ahora', detalle: '', txt: 'Cerrado ahora' };
  }
  window.drEstado = function () { return estado(); };

  /* nodos (se buscan una sola vez) */
  function todos(sel) { return Array.prototype.slice.call(document.querySelectorAll(sel)); }
  var N = {
    est: todos('[data-estado]'), t: todos('[data-estado-t]'), d: todos('[data-estado-d]'), live: todos('[data-live]'),
    lbl: todos('[data-cd-lbl]'), h: todos('[data-cd-h]'), m: todos('[data-cd-m]'), s: todos('[data-cd-s]'),
    full: todos('[data-cd-full]'), reloj: todos('[data-reloj]'), dias: todos('[data-dias]')
  };

  function poner(lista, txt) { for (var i = 0; i < lista.length; i++) if (lista[i].textContent !== txt) lista[i].textContent = txt; }

  /* lo que cambia poco: estado, textos y fila de hoy */
  function pintar(e, a) {
    var i, dia = String(a.getDay());
    for (i = 0; i < N.est.length; i++) {
      N.est[i].textContent = e.txt; N.est[i].setAttribute('data-abierto', e.abierto ? '1' : '0'); N.est[i].hidden = false;
    }
    poner(N.t, e.titulo);
    for (i = 0; i < N.d.length; i++) { N.d[i].textContent = e.detalle; N.d[i].hidden = !e.detalle; }
    poner(N.lbl, e.etiqueta);
    for (i = 0; i < N.live.length; i++) { N.live[i].setAttribute('data-abierto', e.abierto ? '1' : '0'); N.live[i].setAttribute('data-listo', '1'); }
    for (i = 0; i < N.dias.length; i++) {
      var on = N.dias[i].getAttribute('data-dias').split(',').indexOf(dia) !== -1;
      N.dias[i].classList.toggle('hoy', on);
    }
    /* franja en curso dentro de la fila de hoy */
    var rg = todos('.dr-tbl .dr-rg');
    for (i = 0; i < rg.length; i++) {
      var fila = rg[i].closest('tr'), pos = Array.prototype.indexOf.call(fila.querySelectorAll('.dr-rg'), rg[i]);
      rg[i].classList.toggle('is-on', !!(e.abierto && fila.classList.contains('hoy') && pos === e.idx));
    }
  }

  /* lo que cambia cada segundo: solo números */
  function numeros(e, a) {
    var f = e.falta, h = Math.floor(f / 3600), m = Math.floor((f % 3600) / 60), s = f % 60;
    poner(N.h, dos(h)); poner(N.m, dos(m)); poner(N.s, dos(s));
    poner(N.full, e.corto ? e.corto + h + ' h ' + dos(m) + ' min ' + dos(s) + ' s' : '');
    poner(N.reloj, dos(a.getHours()) + ':' + dos(a.getMinutes()) + ':' + dos(a.getSeconds()));
  }

  var ultimo = '';
  function tick() {
    if (document.hidden) return;
    var a = ahora(), e = estado(a), clave = e.txt + '|' + e.dia;
    if (clave !== ultimo) { ultimo = clave; pintar(e, a); }
    numeros(e, a);
  }
  function bucle() { tick(); setTimeout(bucle, 1000 - (Date.now() % 1000) + 5); }
  bucle();
  document.addEventListener('visibilitychange', function () { if (!document.hidden) tick(); });
})();
