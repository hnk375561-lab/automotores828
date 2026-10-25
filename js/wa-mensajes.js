/* Automotores 828 · constructor ÚNICO de mensajes de WhatsApp.
   Lo cargan el navegador (window.drWaMensajes: fichas, tarjetas, comparador, reserva) y scripts/build-index.mjs (vm),
   para que tarjetas y fichas nunca generen textos distintos. Solo usa datos del registro de la unidad; lo ausente se omite.
   El mensaje se abre en WhatsApp para que la persona lo revise y lo envíe: nada se manda solo. */
(function (root) {
  'use strict';
  function norm(t) { return String(t).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim(); }
  function miles(n) { return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, '.'); }
  function desc(a) {
    var d = String(a && a.titulo || ''), nd = norm(d);
    if (a && a.version && nd.indexOf(norm(a.version)) < 0) d += ' ' + a.version;
    if (a && a.anio != null && nd.indexOf(String(a.anio)) < 0) d += ' ' + a.anio;
    return d.trim();
  }
  function precio(a) {
    var p = a && a.precio;
    return p && typeof p.monto === 'number' && isFinite(p.monto) && p.moneda ? p.moneda + ' ' + miles(p.monto) : '';
  }
  /* intenciones: rapida (tarjeta) · consulta (ficha, comparador, búsqueda) · fin · visita · similares (vendida) · general */
  function mensaje(a, intencion) {
    if (!a || intencion === 'general') return 'Hola! Quería hacer una consulta sobre los vehículos disponibles. ¿Me podrían orientar?';
    var d = desc(a), p = precio(a);
    if (intencion === 'rapida') return 'Hola! Me interesa el ' + d + (p ? ' (' + p + ')' : '') + '. ¿Sigue disponible?';
    if (intencion === 'similares') return 'Hola! Vi que el ' + d + ' figura como vendido. ¿Tienen unidades similares?';
    if (intencion === 'fin') return 'Hola! Quería consultar por financiación para el ' + d + '. ¿Me pueden informar las condiciones?';
    if (intencion === 'visita') return 'Hola! Quería coordinar una visita para conocer el ' + d + '. ¿Podemos acordar un día y horario?';
    return 'Hola! Quería consultar por el ' + d + (p ? ' (publicado a ' + p + ')' : '') + '. ¿Me confirman si sigue disponible y el precio?';
  }
  /* visita con día y franja elegidos en el calendario (a puede ser null: consulta general) */
  function visita(a, dia, franja) {
    return 'Hola! Quiero coordinar una visita ' + (a ? 'para conocer el ' + desc(a) + ' ' : '') + 'el ' + dia + ', por la ' + String(franja).toLowerCase() + '. ¿Me confirman si se puede y a qué hora?';
  }
  /* T4 · visita con 1 a 3 unidades. Con una sola, el texto es EXACTAMENTE el de mensaje(a, 'visita'). */
  function visitaVarias(lista) {
    var l = (lista || []).filter(Boolean).slice(0, 3);
    if (!l.length) return mensaje(null, 'general');
    if (l.length === 1) return mensaje(l[0], 'visita');
    return 'Hola! Quería coordinar una visita para conocer estas ' + l.length + ' unidades:\n' +
      l.map(function (a) { var p = precio(a); return '- ' + desc(a) + (p ? ' (' + p + ')' : ''); }).join('\n') +
      '\n¿Podemos acordar un día y horario?';
  }
  root.drWaMensajes = { desc: desc, precio: precio, mensaje: mensaje, visita: visita, visitaVarias: visitaVarias };
})(typeof window !== 'undefined' ? window : globalThis);
