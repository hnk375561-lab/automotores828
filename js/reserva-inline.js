/* Automotores 828 · reserva dentro de «Visita»: se expande como una sección más (mismo flujo que reserva.html:
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
  var VH = window.drVisitaHorarios;   /* T6: horarios publicados, los mismos que usa reserva.html (js/visita-horarios.js) */
  var now0 = new Date(), st = { month: new Date(now0.getFullYear(), now0.getMonth(), 1), day: null, slot: null, step: 'month' };
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var box = document.createElement('div');
  box.className = 'rz'; box.id = 'reserva-inline';
  box.innerHTML =
    '<div class="rz-clip"><div class="rz-box" role="region" aria-label="Coordiná tu visita">' +
    '<div class="rz-bar"><span><b>Coordiná tu visita</b> / consulta</span><span class="rz-acts"><button type="button" data-back hidden>← Atrás</button><button type="button" data-close>✕ Cerrar</button></span></div>' +
    '<div class="rz-step" data-s="month"><div><p class="rz-k">Automotores 828</p><h3 id="rz-t">Elegí<em>cuándo</em><em>venir.</em></h3><p class="rz-p">Elegí un día en el calendario y armá la consulta. Todavía no es un turno. Los feriados no están cargados: el negocio confirma el día y la hora.</p></div>' +
    '<div class="rz-cal"><div class="rz-ch"><button type="button" data-prev aria-label="Mes anterior">←</button><strong data-ml></strong><button type="button" data-next aria-label="Mes siguiente">→</button></div>' +
    '<div class="rz-wd" aria-hidden="true"><span>LU</span><span>MA</span><span>MI</span><span>JU</span><span>VI</span><span>SA</span><span>DO</span></div><div class="rz-days" data-days role="group" aria-label="Calendario de consulta"></div></div></div>' +
    '<div class="rz-step" data-s="time" hidden><div class="rz-big" aria-hidden="true"><small data-dm></small><span data-dn></span><strong data-dw></strong></div>' +
    '<div><p class="rz-k">Franja del día</p><h3>¿Mañana<em>o tarde?</em></h3><p class="rz-p">La hora exacta se acuerda con el negocio.</p><div class="rz-slots" data-slots role="listbox" aria-label="Franja del día"></div><button type="button" class="rz-go" data-confirm disabled>Ver resumen <span aria-hidden="true">→</span></button></div></div>' +
    '<div class="rz-step" data-s="confirm" hidden><div><p class="rz-k">Tu visita</p><h3><span data-sd>DÍA</span><em data-sf>FRANJA</em></h3><p class="rz-p">' + addr + '</p></div>' +
    '<div><div class="rz-acts2"><a class="btn p" data-wa target="_blank" rel="noopener noreferrer" href="' + (wa ? 'https://wa.me/' + wa : '#') + '">Escribir por WhatsApp ↗</a>' + (maps ? '<a class="btn" target="_blank" rel="noopener noreferrer" href="' + maps + '">Abrir Maps</a>' : '') + '<button type="button" class="btn" data-restart>Elegir otro día</button></div>' +
    '<p class="rz-st" role="status" aria-live="polite" data-send></p>' +
    '<p class="rz-dis">Con este mensaje consultás por una visita. El día y la hora se acuerdan con Automotores 828.</p></div></div>' +
    '</div></div></div><div class="sr" aria-live="polite" data-live></div>';
  grid.parentNode.insertBefore(box, grid.nextSibling);

  function q(s) { return box.querySelector(s); }
  var live = q('[data-live]');
  /* contexto de la unidad: el id llega en ?unidad= del enlace de la ficha y se valida contra js/units.min.json (nunca se confía en un título recibido).
     Estados: ninguna · cargando · lista · inexistente · error. El resumen espera mientras carga; si falla, la consulta sigue como general. */
  var WAM = window.drWaMensajes || null, UNITS = null;
  function unidades() {
    if (!UNITS) {
      var ctl = window.AbortController ? new AbortController() : null, tm = ctl ? setTimeout(function () { ctl.abort(); }, 8000) : 0;
      UNITS = fetch('js/units.min.json', ctl ? { signal: ctl.signal } : undefined).then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
        .then(function (l) { clearTimeout(tm); return l; }, function (err) { clearTimeout(tm); UNITS = null; throw err; });
    }
    return UNITS;
  }
  var TXT_UNIDAD = { cargando: 'Cargando los datos de la unidad…', inexistente: 'No encontramos esa unidad: la consulta será general.', error: 'No pudimos cargar los datos de la unidad: podés seguir con una consulta general.' };
  function pintarUnidad() {
    var t = st.unitEstado === 'lista' && st.unit ? 'Consulta por: ' + (WAM ? WAM.desc(st.unit) : st.unit.titulo) : (TXT_UNIDAD[st.unitEstado] || '');
    [].forEach.call(box.querySelectorAll('[data-unit]'), function (n) { n.hidden = !t; n.textContent = t; });
  }
  [].forEach.call(box.querySelectorAll('.rz-step[data-s="month"] .rz-p, .rz-step[data-s="confirm"] .rz-p'), function (pp) {
    var u = document.createElement('p'); u.className = 'rz-p'; u.setAttribute('data-unit', ''); u.hidden = true; pp.parentNode.insertBefore(u, pp.nextSibling);
  });
  function resolvio() { pintarUnidad(); var f = st.espera; st.espera = null; if (f) f(); }
  function fijarUnidad(id) {
    st.unit = null; st.espera = null;
    if (!id || !/^[A-Za-z0-9_-]{1,40}$/.test(id)) { st.unitEstado = id ? 'inexistente' : 'ninguna'; pintarUnidad(); return; }
    st.unitEstado = 'cargando'; pintarUnidad();
    unidades().then(function (l) {
      if (st.unitId !== id) return;
      var u = null; for (var k = 0; k < l.length; k++) { if (String(l[k].id) === id) { u = l[k]; break; } }
      st.unit = u; st.unitEstado = u ? 'lista' : 'inexistente'; resolvio();
    }, function () { if (st.unitId !== id) return; st.unitEstado = 'error'; resolvio(); });
  }
  function say(t) { live.textContent = t; }
  function today() { var t = new Date(); return new Date(t.getFullYear(), t.getMonth(), t.getDate()); }
  function esDiaElegible(date) { return VH ? VH.elegible(date) : date >= today() && date.getDay() !== 0; }
  function fmt(d) { return d.toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' }); }

  function cal() {
    var m = st.month, c = q('[data-days]'), first = (new Date(m.getFullYear(), m.getMonth(), 1).getDay() + 6) % 7, n = new Date(m.getFullYear(), m.getMonth() + 1, 0).getDate();
    q('[data-ml]').textContent = MES[m.getMonth()] + ' ' + m.getFullYear();
    c.textContent = '';
    for (var e = 0; e < first; e++) { var s = document.createElement('span'); s.className = 'rz-d rz-d--e'; s.setAttribute('aria-hidden', 'true'); c.appendChild(s); }
    for (var d = 1; d <= n; d++) {
      var date = new Date(m.getFullYear(), m.getMonth(), d), b = document.createElement('button'), ok = esDiaElegible(date), sel = st.day && st.day.getTime() === date.getTime();
      b.type = 'button'; b.className = 'rz-d'; b.dataset.day = d; b.disabled = !ok; if (!ok && VH) b.setAttribute('aria-label', fmt(date) + ', ' + (VH.motivo(date) || 'no disponible')); b.setAttribute('aria-pressed', String(!!sel));
      b.innerHTML = '<span>' + (d < 10 ? '0' + d : d) + '</span><small>' + (date.getTime() === today().getTime() ? 'hoy' : '') + '</small>';
      c.appendChild(b);
    }
  }
  function slots() {
    var c = q('[data-slots]'); c.textContent = '';
    (VH ? VH.franjas(st.day) : [{ id: 'Mañana', rango: '' }, { id: 'Tarde', rango: '' }]).forEach(function (f) {
      var s = f.id, b = document.createElement('button'); b.type = 'button'; b.className = 'rz-slot'; b.dataset.slot = s; b.setAttribute('role', 'option'); b.setAttribute('aria-selected', String(st.slot === s));
      b.innerHTML = '<b>' + s + '</b><small>' + (f.rango ? f.rango + ' · hora a coordinar' : 'a coordinar') + '</small>'; if (f.rango) b.setAttribute('aria-label', s + ', ' + f.rango + ', hora a coordinar'); c.appendChild(b);
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
    q('[data-send]').textContent = sent ? (wa ? 'WhatsApp se abrió. Revisá el mensaje y enviálo cuando quieras.' : 'Mensaje copiado. Pegalo en Facebook o Instagram y enviálo cuando quieras.') : (wa ? 'Listo para enviar · lo mandás vos por WhatsApp' : 'Listo para copiar · lo mandás vos por Facebook o Instagram');
  }
  function summary() {
    if (!st.day || !st.slot) return;
    if (st.unitEstado === 'cargando') { st.espera = summary; q('[data-send]').textContent = 'Cargando la unidad… el resumen se completa en un momento'; say('Esperando los datos de la unidad'); return; }
    q('[data-sd]').textContent = st.day.getDate() + ' ' + MES[st.day.getMonth()]; q('[data-sf]').textContent = st.slot;
    var u = st.unitEstado === 'lista' ? st.unit : null, a = q('[data-wa]');
    var msg = WAM ? WAM.visita(u, fmt(st.day), st.slot) : 'Hola! Quiero coordinar una visita el ' + fmt(st.day) + ', por la ' + st.slot.toLowerCase() + '. ¿Me confirman si se puede y a qué hora?';
    a.dataset.msg = msg; if (wa) a.href = 'https://wa.me/' + wa + '?text=' + encodeURIComponent(msg);
    sendState(false); show('confirm'); say('Resumen listo: ' + fmt(st.day) + ', por la ' + st.slot.toLowerCase());
  }
  function back() { show(st.step === 'confirm' ? 'time' : 'month'); }
  function reset() { st.day = null; st.slot = null; st.espera = null; var a = q('[data-wa]'); if (a) { delete a.dataset.msg; if (wa) a.href = 'https://wa.me/' + wa; } cal(); slots(); show('month'); }
  function abrir(id) {
    if (st.unitId !== (id || null) || st.unitEstado === 'error') { st.unitId = id || null; fijarUnidad(st.unitId); }
    var dl = document.querySelector('dialog[open]'); if (dl && dl.close) dl.close();
    box.classList.add('is-open');
    var hh = document.querySelector('header'), off = (hh ? hh.offsetHeight : 68) + 16;
    window.scrollTo({ top: Math.max(0, box.getBoundingClientRect().top + window.pageYOffset - off), behavior: reduce ? 'auto' : 'smooth' });
    setTimeout(function () { var f = q('.rz-d:not(:disabled)'); if (f) { try { f.focus({ preventScroll: true }); } catch (e) { f.focus(); } } }, reduce ? 0 : 450);
  }
  function cerrar() { box.classList.remove('is-open'); st.unitId = null; st.unit = null; st.unitEstado = 'ninguna'; st.espera = null; pintarUnidad(); reset(); var go = sec.querySelector('.vz-go'); if (go) { try { go.focus({ preventScroll: true }); } catch (e) {} } }

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
    var a = e.target.closest && e.target.closest('a[href^="reserva.html"]');
    if (!a || e.defaultPrevented || e.button || e.metaKey || e.ctrlKey || e.shiftKey) return;
    e.preventDefault(); var id = null; try { id = new URL(a.getAttribute('href'), location.href).searchParams.get('unidad'); } catch (err) {} abrir(id);
  });
  cal(); slots();
})();
