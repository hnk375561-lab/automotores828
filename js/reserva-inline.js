/* DR Automóviles · reserva dentro de «Visita»: se expande como una sección más (mismo flujo que reserva.html:
   mes → día y franja → resumen con WhatsApp). El número y el mapa salen de los botones que ya tiene la sección. */
(function () {
  'use strict';
  var sec = document.getElementById('visita'), grid = sec && sec.querySelector('.vz-grid');
  if (!grid) return;
  var waA = sec.querySelector('a[href^="https://wa.me/"]'), mapA = sec.querySelector('a[href*="google.com/maps"]');
  var wa = ''; if (waA) { var mm = waA.getAttribute('href').match(/wa\.me\/(\d+)/); if (mm) wa = mm[1]; }
  var maps = mapA ? mapA.href : '';
  var adEl = sec.querySelector('.vz-addr span'), addr = adEl ? adEl.textContent.replace(/,\s*Buenos Aires\s*$/, '') : '';
  var MES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
  var SLOTS = ['Mañana', 'Tarde'];
  var now0 = new Date(), st = { month: new Date(now0.getFullYear(), now0.getMonth(), 1), day: null, slot: null, step: 'month' };
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var box = document.createElement('div');
  box.className = 'rz'; box.id = 'reserva-inline';
  box.innerHTML =
    '<div class="rz-clip"><div class="rz-box" role="region" aria-label="Coordiná tu visita">' +
    '<div class="rz-bar"><span><b>Coordiná tu visita</b> / consulta</span><span class="rz-acts"><button type="button" data-back hidden>← Atrás</button><button type="button" data-close>✕ Cerrar</button></span></div>' +
    '<div class="rz-step" data-s="month"><div><p class="rz-k">DR Automóviles</p><h3 id="rz-t">Elegí<em>cuándo</em><em>venir.</em></h3><p class="rz-p">Elegí un día en el calendario y armá la consulta. Todavía no es un turno.</p></div>' +
    '<div class="rz-cal"><div class="rz-ch"><button type="button" data-prev aria-label="Mes anterior">←</button><strong data-ml></strong><button type="button" data-next aria-label="Mes siguiente">→</button></div>' +
    '<div class="rz-wd" aria-hidden="true"><span>LU</span><span>MA</span><span>MI</span><span>JU</span><span>VI</span><span>SA</span><span>DO</span></div><div class="rz-days" data-days role="group" aria-label="Calendario de consulta"></div></div></div>' +
    '<div class="rz-step" data-s="time" hidden><div class="rz-big" aria-hidden="true"><small data-dm></small><span data-dn></span><strong data-dw></strong></div>' +
    '<div><p class="rz-k">Franja del día</p><h3>¿Mañana<em>o tarde?</em></h3><p class="rz-p">La hora exacta se acuerda con el negocio.</p><div class="rz-slots" data-slots role="listbox" aria-label="Franja del día"></div><button type="button" class="rz-go" data-confirm disabled>Ver resumen <span aria-hidden="true">→</span></button></div></div>' +
    '<div class="rz-step" data-s="confirm" hidden><div><p class="rz-k">Tu visita</p><h3><span data-sd>DÍA</span><em data-sf>FRANJA</em></h3><p class="rz-p">' + addr + '</p></div>' +
    '<div><div class="rz-acts2"><a class="btn p" data-wa target="_blank" rel="noopener noreferrer" href="' + (wa ? 'https://wa.me/' + wa : '#') + '">Escribir por WhatsApp ↗</a>' + (maps ? '<a class="btn" target="_blank" rel="noopener noreferrer" href="' + maps + '">Abrir Maps</a>' : '') + '<button type="button" class="btn" data-restart>Elegir otro día</button></div>' +
    '<p class="rz-st" role="status" aria-live="polite" data-send></p>' +
    '<p class="rz-dis">Con este mensaje consultás por una visita. El día y la hora se acuerdan con DR Automóviles.</p></div></div>' +
    '</div></div></div><div class="sr" aria-live="polite" data-live></div>';
  grid.parentNode.insertBefore(box, grid.nextSibling);

  function q(s) { return box.querySelector(s); }
  var live = q('[data-live]');
  function say(t) { live.textContent = t; }
  function today() { var t = new Date(); return new Date(t.getFullYear(), t.getMonth(), t.getDate()); }
  function esDiaElegible(date) { return date >= today() && date.getDay() !== 0; }
  function fmt(d) { return d.toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' }); }

  function cal() {
    var m = st.month, c = q('[data-days]'), first = (new Date(m.getFullYear(), m.getMonth(), 1).getDay() + 6) % 7, n = new Date(m.getFullYear(), m.getMonth() + 1, 0).getDate();
    q('[data-ml]').textContent = MES[m.getMonth()] + ' ' + m.getFullYear();
    c.textContent = '';
    for (var e = 0; e < first; e++) { var s = document.createElement('span'); s.className = 'rz-d rz-d--e'; s.setAttribute('aria-hidden', 'true'); c.appendChild(s); }
    for (var d = 1; d <= n; d++) {
      var date = new Date(m.getFullYear(), m.getMonth(), d), b = document.createElement('button'), ok = esDiaElegible(date), sel = st.day && st.day.getTime() === date.getTime();
      b.type = 'button'; b.className = 'rz-d'; b.dataset.day = d; b.disabled = !ok; b.setAttribute('aria-pressed', String(!!sel));
      b.innerHTML = '<span>' + (d < 10 ? '0' + d : d) + '</span><small>' + (date.getTime() === today().getTime() ? 'hoy' : '') + '</small>';
      c.appendChild(b);
    }
  }
  function slots() {
    var c = q('[data-slots]'); c.textContent = '';
    SLOTS.forEach(function (s) {
      var b = document.createElement('button'); b.type = 'button'; b.className = 'rz-slot'; b.dataset.slot = s; b.setAttribute('role', 'option'); b.setAttribute('aria-selected', String(st.slot === s));
      b.innerHTML = '<b>' + s + '</b><small>a coordinar</small>'; c.appendChild(b);
    });
  }
  function show(step) {
    st.step = step;
    [].forEach.call(box.querySelectorAll('.rz-step'), function (s) { s.hidden = s.getAttribute('data-s') !== step; });
    q('[data-back]').hidden = step === 'month';
  }
  function pickDay(d) {
    var date = new Date(st.month.getFullYear(), st.month.getMonth(), d); if (!esDiaElegible(date)) return;
    st.day = date; st.slot = null;
    q('[data-dn]').textContent = d < 10 ? '0' + d : String(d);
    q('[data-dm]').textContent = MES[date.getMonth()] + ' ' + date.getFullYear();
    q('[data-dw]').textContent = date.toLocaleDateString('es-AR', { weekday: 'long' });
    q('[data-confirm]').disabled = true; cal(); slots(); show('time'); say('Día seleccionado: ' + fmt(date));
  }
  function sendState(sent) {
    q('[data-send]').textContent = sent ? (wa ? 'Consulta abierta en WhatsApp · la respuesta llega por ahí' : 'Mensaje copiado · pegalo en Facebook o Instagram') : (wa ? 'Listo para enviar · lo mandás vos por WhatsApp' : 'Listo para copiar · lo mandás vos por Facebook o Instagram');
  }
  function summary() {
    if (!st.day || !st.slot) return;
    q('[data-sd]').textContent = st.day.getDate() + ' ' + MES[st.day.getMonth()]; q('[data-sf]').textContent = st.slot;
    var msg = 'Hola! Quiero coordinar una visita el ' + fmt(st.day) + ', por la ' + st.slot.toLowerCase() + '. ¿Me confirman disponibilidad y horario?', a = q('[data-wa]');
    a.dataset.msg = msg; if (wa) a.href = 'https://wa.me/' + wa + '?text=' + encodeURIComponent(msg);
    sendState(false); show('confirm'); say('Resumen listo: ' + fmt(st.day) + ', por la ' + st.slot.toLowerCase());
  }
  function back() { show(st.step === 'confirm' ? 'time' : 'month'); }
  function reset() { st.day = null; st.slot = null; var a = q('[data-wa]'); if (a) { delete a.dataset.msg; if (wa) a.href = 'https://wa.me/' + wa; } cal(); slots(); show('month'); }
  function abrir() {
    var dl = document.querySelector('dialog[open]'); if (dl && dl.close) dl.close();
    box.classList.add('is-open');
    var hh = document.querySelector('header'), off = (hh ? hh.offsetHeight : 68) + 16;
    window.scrollTo({ top: Math.max(0, box.getBoundingClientRect().top + window.pageYOffset - off), behavior: reduce ? 'auto' : 'smooth' });
    setTimeout(function () { var f = q('.rz-d:not(:disabled)'); if (f) { try { f.focus({ preventScroll: true }); } catch (e) { f.focus(); } } }, reduce ? 0 : 450);
  }
  function cerrar() { box.classList.remove('is-open'); reset(); var go = sec.querySelector('.vz-go'); if (go) { try { go.focus({ preventScroll: true }); } catch (e) {} } }

  box.addEventListener('click', function (e) {
    var t = e.target;
    if (t.closest('[data-close]')) return cerrar();
    if (t.closest('[data-back]')) return back();
    if (t.closest('[data-restart]')) return reset();
    if (t.closest('[data-confirm]')) return summary();
    if (t.closest('[data-prev]')) { st.month.setMonth(st.month.getMonth() - 1); cal(); return; }
    if (t.closest('[data-next]')) { st.month.setMonth(st.month.getMonth() + 1); cal(); return; }
    var d = t.closest('button[data-day]'); if (d && !d.disabled) return pickDay(+d.dataset.day);
    var s = t.closest('button[data-slot]'); if (s) { st.slot = s.dataset.slot; [].forEach.call(box.querySelectorAll('.rz-slot'), function (b) { b.setAttribute('aria-selected', String(b === s)); }); q('[data-confirm]').disabled = false; say('Franja seleccionada: ' + st.slot); return; }
    var w = t.closest('[data-wa]');
    if (w) { if (wa) { sendState(true); return; } e.preventDefault(); var m = w.dataset.msg || ''; if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(m).then(function () { sendState(true); }, function () { q('[data-send]').textContent = m; }); else q('[data-send]').textContent = m; }
  });
  box.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') { if (st.step === 'month') cerrar(); else back(); return; }
    var a = document.activeElement;
    if (st.step === 'month' && a && a.matches('.rz-d')) {
      var ds = [].slice.call(box.querySelectorAll('button.rz-d')), p = ds.indexOf(a), k = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : e.key === 'ArrowDown' ? 7 : e.key === 'ArrowUp' ? -7 : 0;
      if (k) { var t = ds[p + k]; while (t && t.disabled && Math.abs(k) === 1) { p += k; t = ds[p + k]; } if (t && !t.disabled) { e.preventDefault(); t.focus(); } }
    }
  });
  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a[href="reserva.html"]');
    if (!a || e.defaultPrevented || e.button || e.metaKey || e.ctrlKey || e.shiftKey) return;
    e.preventDefault(); abrir();
  });
  cal(); slots();
})();
