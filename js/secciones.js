/* Automotores 828 · js/secciones.js
   1) Catálogo: filtros, orden y comparador de exactamente 2 unidades (lee js/units.min.json, que genera scripts/build-index.mjs desde data/vehicles.json).
   2) Formularios «Tu usado» y «Contanos qué auto buscás»: arman un mensaje que la persona copia y envía ella.
      No se transmite ni se guarda nada.
   Sin dependencias. Sin JavaScript, la página sigue completa: las fichas están en #unidades. */
(function () {
  'use strict';
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return [].slice.call((r || document).querySelectorAll(s)); };
  var el = function (tag, text, cls) { var e = document.createElement(tag); if (text != null) e.textContent = text; if (cls) e.className = cls; return e; };

  /* ---------- copiar al portapapeles (con alternativa) ---------- */
  function copiar(texto, ok) {
    function viejo() {
      var t = el('textarea'); t.value = texto; t.setAttribute('readonly', ''); t.style.cssText = 'position:fixed;top:0;left:0;opacity:0';
      document.body.appendChild(t); t.select();
      var r = false; try { r = document.execCommand('copy'); } catch (e) {}
      document.body.removeChild(t); ok(r);
    }
    if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(texto).then(function () { ok(true); }, viejo);
    else viejo();
  }

  /* ---------- datos del catálogo: archivo aparte y cacheable ----------
     Los datos de las unidades ya no van embebidos en el HTML: se piden a js/units.min.json
     (lo genera scripts/build-index.mjs desde data/vehicles.json). El HTML queda liviano y el JSON
     se reutiliza entre visitas. Si el archivo no se puede leer, el sitio sigue mostrando las
     tarjetas ya escritas en el HTML, pero sin filtros, comparador ni ficha. */
  var CAT_URL = 'js/units.min.json';
  var CAT = null, CAT_P = null;
  function catData() {
    if (CAT_P) return CAT_P;
    var d = $('#cat-data');
    var enLinea = d ? (d.textContent || '').trim() : '';
    if (enLinea) {
      try { CAT = JSON.parse(enLinea); CAT_P = Promise.resolve(CAT); return CAT_P; } catch (e) {}
    }
    var url = (d && d.getAttribute('data-src')) || CAT_URL;
    CAT_P = fetch(url, { credentials: 'same-origin' })
      .then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
      .then(function (j) { CAT = j || []; return CAT; })
      .catch(function () { CAT = []; return CAT; });
    return CAT_P;
  }

  /* ---------- 1) catálogo: filtros, orden y comparador ----------
     Usa los datos de js/units.min.json (los genera scripts/build-index.mjs desde data/vehicles.json) y trabaja
     sobre las fichas ya escritas en #cars. El estado de los filtros vive en la URL (?marca=Renault&anio_d=2017...). */
  (function () {
    var tools = $('#tools'), ul = $('#cars'), dataEl = $('#cat-data'), sinres = $('#sinres');
    if (!tools || !ul || !dataEl) return;
    var list = [];
    /* A3.4 · favoritos: ids reales de las unidades guardados en localStorage (si no está disponible, siguen en memoria) */
    var FAV_KEY = 'automotores828:favoritos';
    function favKey(a) { return String(a.id != null ? a.id : (a.url || a.titulo)); }
    function favLeer() {
      try {
        var v = JSON.parse(window.localStorage.getItem(FAV_KEY) || '[]');
        return Array.isArray(v) ? v.filter(function (k, n) { return typeof k === 'string' && k && v.indexOf(k) === n; }) : [];
      } catch (e) { return []; }
    }
    var favs = favLeer();
    function favGuardar() { try { window.localStorage.setItem(FAV_KEY, JSON.stringify(favs)); } catch (e) {} }
    /* El clic en una tarjeta se atiende desde el primer momento. Si los datos del catálogo todavía no
       llegaron, se espera a que lleguen y se abre la ficha recién ahí. */
    var accion = null, urlListo = false;   /* T1: los listeners del historial se registran una sola vez */
    ul.addEventListener('click', function (e) {
      var b = e.target.closest ? e.target.closest('[data-ficha],[data-share],.car-ph') : null;
      if (!b || !ul.contains(b)) return;
      var tipo = 'foto', i = 0, origen = null;
      if (b.hasAttribute('data-ficha')) { tipo = 'ficha'; i = +b.getAttribute('data-ficha'); origen = b; }
      else if (b.hasAttribute('data-share')) { tipo = 'share'; i = +b.getAttribute('data-share'); }
      else { var li = b.closest('li.car'); if (!li) return; i = +li.getAttribute('data-i'); origen = li.querySelector('[data-ficha]'); }
      if (accion) { accion(tipo, i, origen); return; }
      catData().then(function () { if (accion) accion(tipo, i, origen); });
    });
    /* Hero: la cinta se mueve, así que el puntero puede terminar sobre otra foto entre pointerdown y click
       (el navegador manda entonces el click al contenedor y la ficha no abría). Se recuerda la unidad
       sobre la que empezó el gesto y se usa si el click no cae justo en un botón. */
    var heroDown = null, heroDownT = 0;
    document.addEventListener('pointerdown', function (e) {
      heroDown = e.target.closest ? e.target.closest('[data-hero-unit]') : null; heroDownT = Date.now();
    }, true);
    document.addEventListener('click', function (e) {
      var t = e.target, heroButton = t.closest ? t.closest('[data-hero-unit]') : null;
      if (!heroButton && heroDown && Date.now() - heroDownT < 1500 && t.closest && t.closest('[data-hero-chain]')) heroButton = heroDown;
      heroDown = null;
      if (!heroButton) return;
      var unitId = heroButton.getAttribute('data-hero-unit');
      if (!unitId) return;
      function openMappedUnit(data) {
        if (!list.length && data) { list = data; arrancar(); }
        var unit = list.find(function (entry) { return String(entry.id) === String(unitId); });
        var index = unit ? list.indexOf(unit) : -1;
        if (index >= 0 && accion) accion('ficha', index, heroButton.tagName === 'BUTTON' ? heroButton : null, unit);
      }
      if (accion) { openMappedUnit(); return; }
      catData().then(openMappedUnit);
    });
    catData().then(function (d) { list = d || []; arrancar(); });
    function arrancar() {
      if (list.length < 2) return;
      accion = function (tipo, i, origen, record) {
        if (tipo === 'share') { if (list[i]) compartir(list[i]); return; }
        if (list[i]) abrirFicha(i, origen, record);
      };

      var fmt = function (n) { return n.toLocaleString('es-AR'); };
      var norm = function (t) { return String(t).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim(); };
      var peso = function (a) { return a.precio.moneda + ' ' + fmt(a.precio.monto); };
      var fecha = function (iso) { return iso.split('-').reverse().join('/'); };
      var alfa = function (x, y) { return String(x).localeCompare(String(y), 'es'); };
      var anioHoy = new Date().getFullYear();
      var items = {};
      $$('li.car', ul).forEach(function (li) { items[li.getAttribute('data-i')] = li; });
      list.forEach(function (a) {
        a.t = items[a.i] ? items[a.i].getAttribute('data-t') : norm(a.titulo);
        a.t = norm(a.t + ' ' + [a.tipoVehiculo, a.tipoMoto, a.modelo, a.version, a.carroceria, a.transmision, a.combustible, a.cilindrada].filter(Boolean).join(' '));
        a.ant = a.anio != null ? anioHoy - a.anio : null;
        a.monto = a.precio && a.precio.moneda === 'ARS' ? a.precio.monto : null;
        a.montoUsd = a.precio && a.precio.moneda === 'USD' ? a.precio.monto : null;   /* T2: cada precio se queda en su moneda; nunca se convierte */
        a.pub = a.publicado ? Math.floor((Date.now() - new Date(a.publicado + 'T12:00:00').getTime()) / 864e5) : null;
        a.modeloTxt = a.titulo.indexOf(a.marca + ' ') === 0 ? a.titulo.slice(a.marca.length + 1) : a.titulo;
      });

      /* A3.4 · favoritos: botón en cada tarjeta, sincronizado con la ficha y el acceso del panel */
      function favN() { return list.filter(function (a) { return favs.indexOf(favKey(a)) > -1; }).length; }
      function favSync() {
        $$('[data-fav]').forEach(function (b) {
          var on = favs.indexOf(b.getAttribute('data-fav')) > -1;
          b.setAttribute('aria-pressed', on ? 'true' : 'false'); b.classList.toggle('on', on);
          if (b.classList.contains('fav-fi')) b.textContent = on ? '♥ Quitar de favoritos' : '♡ Guardar en favoritos';
          else b.setAttribute('aria-label', (on ? 'Quitar de favoritos: ' : 'Guardar en favoritos: ') + (b.getAttribute('data-t') || ''));
        });
        var n = favN();
        favBtn.textContent = '♥ Favoritos' + (n ? ' (' + n + ')' : '');
        favBtn.setAttribute('aria-pressed', soloFav ? 'true' : 'false'); favBtn.classList.toggle('is-on', soloFav);
        if (typeof selRender === 'function' && typeof selPanel !== 'undefined') selRender();
      }
      function favToggle(a) {
        var k = favKey(a), i = favs.indexOf(k), adding = i < 0;
        if (i > -1) favs.splice(i, 1); else favs.push(k);
        favGuardar(); favSync();
        if (soloFav) aplicar(false);
        aviso(adding ? 'Unidad agregada a favoritos' : 'Unidad quitada de favoritos');
      }
      list.forEach(function (a) {
        var li = items[a.i]; if (!li) return;
        var b = el('button', null, 'fav-b'); b.type = 'button'; b.setAttribute('data-fav', favKey(a)); b.setAttribute('data-t', a.titulo || '');
        b.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M12 20.5s-8-4.9-8-11A4.5 4.5 0 0 1 12 6.8 4.5 4.5 0 0 1 20 9.5c0 6.100-8 11-8 11z"/></svg>';
        b.addEventListener('click', function (e) { e.preventDefault(); e.stopPropagation(); favToggle(a); });
        var h = li.querySelector('.car-h') || li;
        h.insertBefore(b, h.querySelector('.car-c'));
      });

      /* ----- definición de los filtros (todo sale de los datos publicados) ----- */
      function uniq(f) {
        var seen = {}, out = [];
        list.forEach(function (a) { var v = f(a); if (v != null && v !== '' && !seen[v]) { seen[v] = 1; out.push(v); } });
        return out;
      }
      function porValor(k, tipo, titulo, span, get, orden, extra) {
        var vals = uniq(get).sort(orden || alfa);
        return {
          k: k, tipo: tipo, t: titulo, s: span, todos: extra && extra.todos,
          ops: vals.map(function (v) {
            var o = { id: String(v), label: String(v), test: function (a) { return String(get(a)) === String(v); } };
            if (extra && extra.sw) o.sw = (list.filter(function (a) { return get(a) === v; })[0] || {}).sw;
            return o;
          })
        };
      }
      function pasos(vals, paso) {
        var mn = Math.min.apply(null, vals), mx = Math.max.apply(null, vals), out;
        for (;;) {
          out = [];
          for (var v = Math.floor(mn / paso) * paso; v <= Math.ceil(mx / paso) * paso; v += paso) out.push(v);
          if (out.length <= 12) return out;
          paso *= 2;
        }
      }
      function rango(k, titulo, span, get, valsFn, f, nota) {
        var datos = list.map(get).filter(function (x) { return x != null; });
        var vals = valsFn(datos);
        return { k: k, tipo: 'rango', t: titulo, s: span, get: get, vals: vals, f: f, nota: nota };
      }
      var GR = [];
      GR.push(porValor('tipoVehiculo', 'chips', 'Tipo de vehículo', 3, function (a) { return a.tipoVehiculo; }));
      GR.push(porValor('marca', 'chips', 'Marca', 5, function (a) { return a.marca; }));
      GR.push(porValor('carr', 'chips', 'Tipo de carrocería', 4, function (a) { return a.carroceria; }));
      GR.push(porValor('modelo', 'select', 'Modelo', 3, function (a) { return a.modelo; }, null, { todos: 'Todos los modelos' }));
      GR.push(porValor('version', 'select', 'Versión', 4, function (a) { return a.version; }, null, { todos: 'Todas las versiones' }));
      GR.push(rango('anio', 'Año', 3, function (a) { return a.anio; }, function (d) { return uniq(function (a) { return a.anio; }).sort(function (x, y) { return x - y; }); }, function (n) { return String(n); }));
      GR.push(rango('km', 'Kilómetros', 3, function (a) { return a.km; }, function (d) { return pasos(d, 10000); }, function (n) { return fmt(n) + ' km'; }, 'Las unidades sin kilometraje publicado no entran en este filtro.'));
      /* T2 · presupuesto bimoneda sin conversión: «Ver precios en» (Todos · Pesos · Dólares) define en qué moneda se filtra y ordena.
         El rango de precio se arma solo con las unidades de la moneda elegida; con «Todos» no se ofrece rango porque no se mezclan monedas. */
      var MON = { ARS: 'Pesos', USD: 'Dólares' };
      var PV = {
        ARS: (function (d) { return d.length ? pasos(d, 2500000) : []; })(list.map(function (a) { return a.monto; }).filter(function (x) { return x != null; })),
        USD: (function (d) { return d.length ? pasos(d, 1000) : []; })(list.map(function (a) { return a.montoUsd; }).filter(function (x) { return x != null; }))
      };
      var PF = { ARS: function (n) { return '$ ' + fmt(n); }, USD: function (n) { return 'US$ ' + fmt(n); } };
      function tituloPrecio() { return st.moneda === 'ARS' ? 'Precio en pesos' : st.moneda === 'USD' ? 'Precio en dólares' : 'Precio'; }
      GR.push(porValor('moneda', 'select', 'Ver precios en', 2, function (a) { return a.precio && a.precio.moneda; }, null, { todos: 'Todos' }));
      GR[GR.length - 1].ops.forEach(function (o) { o.label = MON[o.id] || o.label; });
      GR.push({
        k: 'precio', tipo: 'rango', dyn: true, t: 'Precio', s: 3,
        get: function (a) { return st.moneda === 'USD' ? a.montoUsd : st.moneda === 'ARS' ? a.monto : null; },
        get vals() { return (typeof st !== 'undefined' && st && PV[st.moneda]) || []; },
        f: function (n) { return (PF[st.moneda] || PF.ARS)(n); },
        nota: 'Sin conversión.'
      });
      GR.push({ k: 'pub', tipo: 'chips', uno: true, t: 'Publicación', s: 3, ops: [
        { id: '7', label: 'Últimos 7 días', test: function (a) { return a.pub != null && a.pub <= 7; } },
        { id: '15', label: 'Últimos 15 días', test: function (a) { return a.pub != null && a.pub <= 15; } },
        { id: '30', label: 'Últimos 30 días', test: function (a) { return a.pub != null && a.pub <= 30; } },
        { id: 'm', label: 'Más de 30 días', test: function (a) { return a.pub != null && a.pub > 30; } }
      ].filter(function (o) { return list.some(o.test); }) });
      GR.push({ k: 'kmq', tipo: 'chips', t: 'Kilometraje', s: 3, ops: [
        { id: 'a', label: 'Hasta 100.000 km', test: function (a) { return a.km != null && a.km <= 100000; } },
        { id: 'b', label: '100.000 a 140.000 km', test: function (a) { return a.km != null && a.km > 100000 && a.km <= 140000; } },
        { id: 'c', label: 'Más de 140.000 km', test: function (a) { return a.km != null && a.km > 140000; } }
      ].filter(function (o) { return list.some(o.test); }) });
      var buckets = [
        { id: 'a', label: 'Hasta 9 años', test: function (a) { return a.ant != null && a.ant <= 9; } },
        { id: 'b', label: '10 a 15 años', test: function (a) { return a.ant != null && a.ant >= 10 && a.ant <= 15; } },
        { id: 'c', label: 'Más de 15 años', test: function (a) { return a.ant != null && a.ant > 15; } }
      ].filter(function (o) { return list.some(o.test); });
      if (list.some(function (a) { return a.km == null; })) {
        GR.push({ k: 'datos', tipo: 'chips', t: 'Datos de la ficha', s: 3, ops: [{ id: 'km', label: 'Con kilometraje publicado', test: function (a) { return a.km != null; } }] });
      }
      GR.push(porValor('trans', 'chips', 'Caja', 2, function (a) { return a.transmision; }));
      GR.push(porValor('comb', 'chips', 'Combustible', 2, function (a) { return a.combustible; }));
      GR.push(porValor('cil', 'chips', 'Cilindrada', 2, function (a) { return a.cilindrada; }, function (x, y) { return parseFloat(x) - parseFloat(y); }));
      GR.push(porValor('color', 'chips', 'Color', 3, function (a) { return a.color; }, null, { sw: true }));
      GR.push({ k: 'ant', tipo: 'chips', t: 'Antigüedad del modelo', s: 3, ops: buckets });
      /* los filtros que no separan nada (un solo valor distinto en select o rango) no se muestran */
      GR = GR.filter(function (g) { return g.tipo === 'chips' ? g.ops.length > 0 : g.tipo === 'select' ? g.ops.length > 1 : g.dyn ? (PV.ARS.length > 1 || PV.USD.length > 1) : g.vals.length > 1; });

      var ORDEN = [['', 'Orden de publicación'], ['p-asc', 'Precio: menor a mayor'], ['p-desc', 'Precio: mayor a menor'], ['a-desc', 'Año: más nuevo primero'], ['a-asc', 'Año: más antiguo primero'], ['k-asc', 'Kilometraje: menor primero'], ['k-desc', 'Kilometraje: mayor primero'], ['m-asc', 'Marca: de la A a la Z']];
      if (!list.some(function (a) { return a.monto != null; })) ORDEN = ORDEN.filter(function (o) { return o[0].charAt(0) !== 'p'; });
      if (list.some(function (a) { return a.publicado != null; })) ORDEN.splice(1, 0, ['f-desc', 'Publicación: más reciente primero'], ['f-asc', 'Publicación: más antigua primero']);
      var KEY = { f: function (a) { return a.publicado; }, p: function (a) { return st.moneda === 'USD' && a.precio && a.precio.moneda === 'USD' ? a.precio.monto : a.monto; }, a: function (a) { return a.anio; }, k: function (a) { return a.km; }, m: function (a) { return a.marca; } };

      /* ----- estado ----- */
      var st = { q: '', orden: '' };
      var pendQuit = [];   /* T2: avisos de filtros que se quitaron al cambiar de moneda */
      var soloFav = false;
      GR.forEach(function (g) {
        if (g.tipo === 'chips') st[g.k] = [];
        else if (g.tipo === 'select') st[g.k] = '';
        else { st[g.k + 'D'] = ''; st[g.k + 'H'] = ''; }
      });
      function pasa(a, g) {
        if (g.tipo === 'chips') {
          var v = st[g.k]; if (!v.length) return true;
          return g.ops.some(function (o) { return v.indexOf(o.id) > -1 && o.test(a); });
        }
        if (g.tipo === 'select') {
          if (!st[g.k]) return true;
          return g.ops.some(function (o) { return o.id === st[g.k] && o.test(a); });
        }
        var x = g.get(a), d = st[g.k + 'D'], h = st[g.k + 'H'];
        if (d === '' && h === '') return true;
        if (x == null) return false;
        return (d === '' || x >= +d) && (h === '' || x <= +h);
      }
      function coincide(a, salto, sinQ) {
        if (soloFav && favs.indexOf(favKey(a)) < 0) return false;
        if (!sinQ) {
          var ws = norm(st.q).split(/\s+/).filter(Boolean);
          if (!ws.every(function (w) { return a.t.indexOf(w) > -1; })) return false;
        }
        return GR.every(function (g) { return g.k === salto || (salto === 'moneda' && g.dyn) || pasa(a, g); });   /* T2: al probar otra moneda no pesa el rango de la actual */
      }
      /* cantidad de unidades que quedarían si se eligiera esa opción, dado todo lo demás que ya está elegido */
      function contar(g, o, sinQ) { return list.filter(function (a) { return coincide(a, g.k, sinQ) && o.test(a); }).length; }
      function contarRango(g, d, h, sinQ) {
        return list.filter(function (a) {
          if (!coincide(a, g.k, sinQ)) return false;
          var x = g.get(a);
          return x != null && (d === '' || x >= +d) && (h === '' || x <= +h);
        }).length;
      }
      function textoRango(g, d, h) { return d !== '' && h !== '' ? g.f(+d) + ' a ' + g.f(+h) : d !== '' ? 'desde ' + g.f(+d) : 'hasta ' + g.f(+h); }
      /* Quita las elecciones que quedaron sin ninguna unidad por un cambio en otro filtro (la búsqueda por texto no cuenta). */
      function podar() {
        var quitados = [], cambio = true, vueltas = 0;
        while (cambio && vueltas++ < 20) {
          cambio = false;
          GR.forEach(function (g) {
            if (g.tipo === 'chips') {
              st[g.k].slice().forEach(function (id) {
                var o = g.ops.filter(function (x) { return x.id === id; })[0];
                if (o && contar(g, o, true) === 0) { st[g.k].splice(st[g.k].indexOf(id), 1); quitados.push(g.t + ': ' + o.label); cambio = true; }
              });
            } else if (g.tipo === 'select') {
              var o2 = st[g.k] ? g.ops.filter(function (x) { return x.id === st[g.k]; })[0] : null;
              if (o2 && contar(g, o2, true) === 0) { st[g.k] = ''; quitados.push(g.t + ': ' + o2.label); cambio = true; }
            } else {
              var d = st[g.k + 'D'], h = st[g.k + 'H'];
              if ((d !== '' || h !== '') && contarRango(g, d, h, true) === 0) {
                st[g.k + 'D'] = ''; st[g.k + 'H'] = ''; quitados.push(g.t + ': ' + textoRango(g, d, h)); cambio = true;
              }
            }
          });
        }
        return quitados;
      }

      /* ----- panel ----- */
      var top = el('div', null, 'fx-top'), body = el('div', null, 'fx-body'), act = el('div', null, 'fx-act');
      body.id = 'fx-body';
      var fq = el('div', null, 'f'), lq = el('label', 'Buscar por tipo, marca, modelo, año o color'), q = el('input');
      q.type = 'search'; q.id = 'q'; q.autocomplete = 'off'; q.maxLength = 60; lq.htmlFor = 'q'; fq.appendChild(lq); fq.appendChild(q);
      var fo = el('div', null, 'f'), lo = el('label', 'Ordenar'), ord = el('select');
      ord.id = 'orden'; lo.htmlFor = 'orden';
      ORDEN.forEach(function (o) { var op = el('option', o[1]); op.value = o[0]; ord.appendChild(op); });
      fo.appendChild(lo); fo.appendChild(ord);
      var tg = el('button', 'Ocultar filtros', 'btn sm fx-tg'); tg.type = 'button'; tg.setAttribute('aria-controls', 'fx-body');
      top.appendChild(fq); top.appendChild(fo); top.appendChild(tg);
      var favBtn = el('button', null, 'btn sm fx-fav'); favBtn.type = 'button'; favBtn.setAttribute('aria-pressed', 'false');
      top.appendChild(favBtn);
      var favVacio = el('p', 'Todavía no guardaste favoritos. Tocá el corazón de una unidad para guardarla y verla acá.', 'fx-favv');
      favVacio.setAttribute('role', 'status'); favVacio.hidden = true;
      var favTodas = el('button', 'Ver todas las unidades', 'btn sm'); favTodas.type = 'button';
      favVacio.appendChild(document.createTextNode(' ')); favVacio.appendChild(favTodas);
      if (sinres && sinres.parentNode) sinres.parentNode.insertBefore(favVacio, sinres); else act.appendChild(favVacio);
      favBtn.addEventListener('click', function () { soloFav = !soloFav; favSync(); aplicar(true); });
      favTodas.addEventListener('click', function () { soloFav = false; favSync(); aplicar(true); });
      window.addEventListener('storage', function (e) { if (e.key === FAV_KEY) { favs = favLeer(); favSync(); aplicar(false); } });
      /* ----- T4 · «Mi selección»: una sola fuente de verdad (favoritos). Comparar usa exactamente 2; la visita admite 1 a 3. ----- */
      var SEL_MAX_VISITA = 3, selPurgado = false;
      var selPanel = el('section', null, 'mi-sel'); selPanel.setAttribute('aria-labelledby', 'mi-sel-t'); selPanel.hidden = true;
      var selT = el('h3', 'Mi selección', 'mi-sel-t'); selT.id = 'mi-sel-t'; selT.tabIndex = -1;
      var selCount = el('p', null, 'mi-sel-n'); selCount.setAttribute('role', 'status'); selCount.setAttribute('aria-live', 'polite');
      var selCuerpo = el('div', null, 'mi-sel-b');
      selPanel.appendChild(selT); selPanel.appendChild(selCount); selPanel.appendChild(selCuerpo);
      if (ul.parentNode) ul.parentNode.insertBefore(selPanel, ul);
      function selUnidades() { return favs.map(porId).filter(Boolean); }
      function selPurgar() {
        if (selPurgado) return; selPurgado = true;
        var antes = favs.length; favs = favs.filter(function (k) { return !!porId(k); });
        if (favs.length < antes) { favGuardar(); setTimeout(function () { aviso('Se descartó una unidad guardada que ya no está en el catálogo.'); }, 0); }
      }
      function selFoco() { try { selT.focus({ preventScroll: true }); } catch (e) {} }
      function selVaciar() {
        favs = []; favGuardar(); soloFav = false; favSync(); aplicar(false); aviso('Selección vaciada');
        try { favBtn.focus({ preventScroll: true }); } catch (e) {}
      }
      function selRender() {
        selPurgar();
        var us = selUnidades(), n = us.length;
        selCuerpo.textContent = '';
        if (!n) { selPanel.hidden = true; selCount.textContent = ''; return; }
        selPanel.hidden = false;
        selCount.textContent = n === 1 ? '1 unidad en tu selección' : n + ' unidades en tu selección';
        var ls = el('ul', null, 'mi-sel-l');
        us.forEach(function (a) {
          var li = el('li', null, 'mi-sel-i'), t = el('span', (WAM ? WAM.desc(a) : a.titulo), 'mi-sel-u');
          var q = el('button', '×', 'mi-sel-q'); q.type = 'button'; q.setAttribute('aria-label', 'Quitar de la selección: ' + a.titulo);
          q.addEventListener('click', function () { favToggle(a); if (favs.length) selFoco(); else { try { favBtn.focus({ preventScroll: true }); } catch (e) {} } });
          li.appendChild(t); li.appendChild(q); ls.appendChild(li);
        });
        selCuerpo.appendChild(ls);
        var ac = el('div', null, 'mi-sel-a');
        var cb = el('button', n === 2 ? 'Comparar las 2 unidades' : 'Comparar (hacen falta exactamente 2)', 'btn sm'); cb.type = 'button'; cb.disabled = n !== 2;
        cb.addEventListener('click', function () {
          var u = selUnidades(); if (u.length !== 2) return;
          cmp = [favKey(u[0]), favKey(u[1])]; cmpVuelta = null; pintarBandeja(); abrirComparacion();
        });
        ac.appendChild(cb);
        if (ctx && ctx.wa && WAM && WAM.visitaVarias) {
          if (n <= SEL_MAX_VISITA) {
            var href = String(ctx.wa).split('?')[0] + '?text=' + encodeURIComponent(WAM.visitaVarias(us));
            ac.appendChild(enlace('Coordinar visita por WhatsApp' + (n > 1 ? ' (' + n + ' unidades)' : ''), href, 'btn p sm', true));
          } else {
            var vb = el('button', 'Coordinar visita por WhatsApp', 'btn p sm'); vb.type = 'button'; vb.disabled = true; ac.appendChild(vb);
          }
        }
        var vc = el('button', 'Vaciar selección', 'btn sm'); vc.type = 'button'; vc.addEventListener('click', selVaciar); ac.appendChild(vc);
        var vt = el('button', 'Volver al catálogo', 'btn sm'); vt.type = 'button';
        vt.addEventListener('click', function () { soloFav = false; favSync(); aplicar(true); try { ul.scrollIntoView({ block: 'start' }); } catch (e) {} });
        ac.appendChild(vt);
        selCuerpo.appendChild(ac);
        var nota = n > SEL_MAX_VISITA ? 'Para coordinar una visita elegí hasta ' + SEL_MAX_VISITA + ' unidades.' : (n > 2 ? 'Para comparar dejá exactamente 2 unidades.' : '');
        if (nota) selCuerpo.appendChild(el('p', nota, 'mi-sel-h'));
      }
      favSync();

      var refs = {};   /* k -> { g, inputs:[{o,input,n}], select, note, d, h } */
      GR.forEach(function (g) {
        var fs = el('fieldset', null, 'fg s' + g.s), lg = el('legend', g.t), r = refs[g.k] = { g: g, leg: lg };
        fs.appendChild(lg);
        if (g.tipo === 'chips') {
          var cw = el('div', null, 'chips'); r.inputs = [];
          g.ops.forEach(function (o) {
            var lb = el('label', null, 'chip'), inp = el('input'), sp = el('span'), n = el('b');
            inp.type = 'checkbox'; inp.value = o.id;
            lb.appendChild(inp);
            if (o.sw) { var dot = el('i', null, 'sw'); dot.style.setProperty('--sw', o.sw); sp.appendChild(dot); }
            sp.appendChild(el('em', o.label)); sp.appendChild(n); lb.appendChild(sp); cw.appendChild(lb);
            r.inputs.push({ o: o, input: inp, n: n });
            inp.addEventListener('change', function () {
              var v = st[g.k], k = v.indexOf(o.id);
              if (inp.checked && g.uno) { v.length = 0; v.push(o.id); }
              else {
                if (inp.checked && k < 0) v.push(o.id);
                if (!inp.checked && k > -1) v.splice(k, 1);
              }
              aplicar(true);
            });
          });
          fs.appendChild(cw);
        } else if (g.tipo === 'select') {
          var sl = el('select'); sl.id = 'f-' + g.k; sl.setAttribute('aria-label', g.t); r.select = sl;
          var o0 = el('option', g.todos); o0.value = ''; sl.appendChild(o0);
          g.ops.forEach(function (o) { var op = el('option', o.label); op.value = o.id; sl.appendChild(op); });
          sl.addEventListener('change', function () {
            if (g.k === 'moneda' && sl.value !== st.moneda) {   /* T2: el rango de una moneda no vale para la otra: se quita y se avisa */
              var gp = GR.filter(function (x) { return x.dyn; })[0];
              if (gp && (st.precioD !== '' || st.precioH !== '')) { pendQuit.push(tituloPrecio() + ': ' + textoRango(gp, st.precioD, st.precioH)); st.precioD = ''; st.precioH = ''; }
            }
            st[g.k] = sl.value; aplicar(true);
          });
          fs.appendChild(sl);
        } else {
          var rw = el('div', null, 'rng');
          ['D', 'H'].forEach(function (z) {
            var sl = el('select'); sl.setAttribute('aria-label', g.t + ': ' + (z === 'D' ? 'desde' : 'hasta'));
            var o0 = el('option', z === 'D' ? 'Desde' : 'Hasta'); o0.value = ''; sl.appendChild(o0);
            g.vals.forEach(function (v) { var op = el('option', g.f(v)); op.value = String(v); sl.appendChild(op); });
            r[z.toLowerCase()] = sl; rw.appendChild(sl);
            sl.addEventListener('change', function () {
              st[g.k + z] = sl.value;
              aplicar(true);
            });
          });
          fs.appendChild(rw);
          if (g.nota) { r.note = el('p', g.nota, 'fg-n'); r.note.hidden = true; fs.appendChild(r.note); }
        }
        body.appendChild(fs);
      });

      var cuenta = el('p', null, 'fx-n'), tags = el('div', null, 'fx-tags'), lim = el('button', 'Limpiar filtros', 'btn sm'), ajuste = el('p', null, 'fx-ajuste');
      cuenta.id = 'cuenta'; cuenta.setAttribute('role', 'status'); cuenta.setAttribute('aria-live', 'polite');
      ajuste.setAttribute('role', 'status'); ajuste.setAttribute('aria-live', 'polite'); ajuste.hidden = true;
      lim.type = 'button'; lim.id = 'limpiar'; lim.hidden = true;
      act.appendChild(cuenta); act.appendChild(tags); act.appendChild(lim); act.appendChild(ajuste);
      if (sinres && !sinres.querySelector('button')) {
        var limSin = el('button', 'Limpiar filtros', 'btn sm'); limSin.type = 'button'; limSin.addEventListener('click', function () { lim.click(); });
        sinres.appendChild(document.createTextNode(' ')); sinres.appendChild(limSin);
      }
      tools.appendChild(top); tools.appendChild(body); tools.appendChild(act);

      /* ----- aplicar ----- */
      function activos() {
        var out = [];
        if (st.q.trim()) out.push({ t: 'Búsqueda: ' + st.q.trim(), quitar: function () { st.q = ''; q.value = ''; } });
        GR.forEach(function (g) {
          if (g.tipo === 'chips') {
            st[g.k].slice().forEach(function (id) {
              var o = g.ops.filter(function (x) { return x.id === id; })[0];
              if (o) out.push({ t: g.t + ': ' + o.label, quitar: function () { st[g.k].splice(st[g.k].indexOf(id), 1); } });
            });
          } else if (g.tipo === 'select') {
            if (st[g.k]) out.push({ t: g.t + ': ' + (g.k === 'moneda' ? (MON[st[g.k]] || st[g.k]) : st[g.k]), quitar: function () { if (g.k === 'moneda') { if (st.precioD !== '' || st.precioH !== '') { var gp = GR.filter(function (x) { return x.dyn; })[0]; pendQuit.push(tituloPrecio() + ': ' + textoRango(gp, st.precioD, st.precioH)); } st.precioD = ''; st.precioH = ''; } st[g.k] = ''; } });
          } else {
            var d = st[g.k + 'D'], h = st[g.k + 'H'];
            if (d === '' && h === '') return;
            var txt = textoRango(g, d, h);
            out.push({ t: (g.dyn ? tituloPrecio() : g.t) + ': ' + txt, quitar: function () { st[g.k + 'D'] = ''; st[g.k + 'H'] = ''; } });
          }
        });
        return out;
      }
      function ordenar(a, b) {
        var o = st.orden.split('-'), f = KEY[o[0]], dir = o[1] === 'desc' ? -1 : 1;
        if (!f) return a.i - b.i;
        var x = f(a), y = f(b);
        if (x == null && y == null) return a.i - b.i;
        if (x == null) return 1;
        if (y == null) return -1;   /* sin dato: siempre al final */
        var c = typeof x === 'string' ? alfa(x, y) : x - y;
        return c * dir || a.i - b.i;
      }
      function aplicar(escribirUrl) {
        var flip = null;
        var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        if (escribirUrl && !reduce && !document.documentElement.classList.contains('save-data') && typeof Element.prototype.animate === 'function') {
          flip = new Map();
          list.forEach(function (a) { var node = items[a.i]; if (!node.hidden) flip.set(node, node.getBoundingClientRect()); });
        }
        var n = 0, visibles = 0, quitados = podar().concat(pendQuit.splice(0));
        var paso = window.innerWidth <= 700 ? 5 : 20;
        if (window._drCatalogoPaso !== paso) { window._drCatalogoPaso = paso; window._drCatalogoMostradas = paso; }
        else if (escribirUrl) { window._drCatalogoMostradas = paso; }
        var limite = window._drCatalogoMostradas || paso;
        if (quitados.length) {
          ajuste.textContent = 'Se quitó ' + quitados.map(function (t) { return '«' + t + '»'; }).join(', ') + ' porque ninguna unidad coincide con esa combinación.';
          ajuste.hidden = false;
        } else { ajuste.textContent = ''; ajuste.hidden = true; }
        list.forEach(function (a) {
          var ok = coincide(a, null), li = items[a.i];
          if (ok) n++;
          li.hidden = !ok;
          if (!ok) li.style.setProperty('display', 'none', 'important');
        });
        var frag = document.createDocumentFragment();
list.slice().sort(ordenar).forEach(function (a) { frag.appendChild(items[a.i]); });
ul.appendChild(frag);
        if (flip) flip.forEach(function (before, node) {
          if (!node.isConnected || node.hidden) return;
          var after = node.getBoundingClientRect(), dx = before.left - after.left, dy = before.top - after.top;
          if (Math.abs(dx) < 1 && Math.abs(dy) < 1) return;
          try { node.animate([{ transform: 'translate(' + dx + 'px,' + dy + 'px)', opacity: .88 }, { transform: 'translate(0,0)', opacity: 1 }], { duration: 240, easing: 'ease-out' }); } catch (e) {}
        });
        visibles = 0;
        list.slice().sort(ordenar).forEach(function (a) {
          var li = items[a.i], ok = coincide(a, null);
          li.hidden = !ok || visibles >= limite;
          if (ok && visibles < limite) { li.style.removeProperty('display'); visibles++; }
          else li.style.setProperty('display', 'none', 'important');
        });
        ul.hidden = n === 0;
        var sinFav = soloFav && favN() === 0;
        if (sinres) sinres.hidden = n > 0 || sinFav;
        favVacio.hidden = !sinFav;
        var more = document.getElementById('inventory-more'), moreNote = document.getElementById('inventory-more-note');
        if (more) {
          var restantes = Math.max(0, n - visibles), cantidad = Math.min(paso, restantes);
          more.hidden = restantes === 0;
          more.textContent = restantes ? ('Mostrar ' + cantidad + ' unidades más') : 'Todas las unidades están visibles';
          more.setAttribute('aria-label', restantes ? ('Mostrar las siguientes ' + cantidad + ' unidades; ' + restantes + ' restantes') : 'Todas las unidades están visibles');
        }
        if (moreNote) moreNote.textContent = n ? ('Viendo ' + visibles + ' de ' + n + ' unidades disponibles') : 'No hay unidades que coincidan con estos filtros.';
        /* opciones y cantidades según lo que ya está elegido en los demás filtros */
        GR.forEach(function (g) {
          var r = refs[g.k];
          if (g.tipo === 'chips') {
            r.inputs.forEach(function (x) {
              var c = contar(g, x.o), on = st[g.k].indexOf(x.o.id) > -1;
              x.input.checked = on; x.input.disabled = c === 0 && !on; x.n.textContent = String(c);
            });
          } else if (g.tipo === 'select') {
            [].slice.call(r.select.options).forEach(function (op, k) {
              if (k === 0) return;
              var o = g.ops[k - 1], c = contar(g, o), ver = c > 0 || st[g.k] === o.id;
              op.textContent = o.label + ' (' + c + ')'; op.disabled = !ver; op.hidden = !ver;
            });
            r.select.value = st[g.k];
          } else {
            if (g.dyn) {   /* T2: las opciones del rango siguen a la moneda elegida */
              if (r.mon !== st.moneda) {
                [r.d, r.h].forEach(function (sl, z) {
                  while (sl.options.length > 1) sl.remove(1);
                  g.vals.forEach(function (v) { var op = el('option', g.f(v)); op.value = String(v); sl.appendChild(op); });
                  sl.setAttribute('aria-label', tituloPrecio() + ': ' + (z === 0 ? 'desde' : 'hasta'));
                });
                r.mon = st.moneda;
              }
              r.d.disabled = r.h.disabled = !st.moneda;
              r.leg.textContent = tituloPrecio();
              r.note.textContent = st.moneda ? 'Cada unidad se muestra en la moneda en que fue publicada; no se convierte entre monedas.' : 'Elegí «Pesos» o «Dólares» en «Ver precios en» para acotar por precio. Los precios no se convierten entre monedas.';
              r.note.hidden = false; r.note.id = 'fg-precio-n';
              r.d.setAttribute('aria-describedby', 'fg-precio-n'); r.h.setAttribute('aria-describedby', 'fg-precio-n');
            }
            var D = st[g.k + 'D'], Hh = st[g.k + 'H'];
            [].slice.call(r.d.options).forEach(function (op, k) {
              if (k === 0) return;
              var v = g.vals[k - 1], ok = (Hh === '' || v <= +Hh) && contarRango(g, String(v), Hh) > 0;
              op.disabled = !ok && String(v) !== D;
            });
            [].slice.call(r.h.options).forEach(function (op, k) {
              if (k === 0) return;
              var v = g.vals[k - 1], ok = (D === '' || v >= +D) && contarRango(g, D, String(v)) > 0;
              op.disabled = !ok && String(v) !== Hh;
            });
            r.d.value = D; r.h.value = Hh;
            if (r.note && !g.dyn) r.note.hidden = st[g.k + 'D'] === '' && st[g.k + 'H'] === '';
          }
        });
        ord.value = st.orden;
        var act2 = activos();
        tags.textContent = '';
        act2.forEach(function (x) {
          var b = el('button', x.t, 'tag'); b.type = 'button'; b.setAttribute('aria-label', 'Quitar filtro: ' + x.t);
          b.addEventListener('click', function () { x.quitar(); aplicar(true); });
          tags.appendChild(b);
        });
        lim.hidden = !(act2.length || st.orden);
        cuenta.textContent = n === 0 ? 'Ninguna unidad coincide con lo elegido.' : (n === list.length ? 'Mostrando las ' + list.length + ' unidades' : 'Mostrando ' + n + ' de ' + list.length + ' unidades') + '.';
        nAct = act2.length; etiquetaTg();
        if (escribirUrl) aUrl();
      }

      window._drCatalogoPaso = window.innerWidth <= 700 ? 5 : 20;
      window._drCatalogoMostradas = window._drCatalogoPaso;
      var moreBtn = document.getElementById('inventory-more');
      if (moreBtn) moreBtn.addEventListener('click', function () {
        window._drCatalogoMostradas += window.innerWidth <= 700 ? 5 : 20;
        aplicar(false);
      });
      var catalogoResizeTimer = 0;
      window.addEventListener('resize', function () {
        window.clearTimeout(catalogoResizeTimer);
        catalogoResizeTimer = window.setTimeout(function () {
          var nuevoPaso = window.innerWidth <= 700 ? 5 : 20;
          if (nuevoPaso !== window._drCatalogoPaso) {
            window._drCatalogoPaso = nuevoPaso;
            window._drCatalogoMostradas = nuevoPaso;
            aplicar(false);
          }
        }, 120);
      }, { passive: true });

      /* ----- URL ----- */
      function aUrl() {
        var u = new URL(location.href), P = u.searchParams;
        var poner = function (k, v) { v ? P.set(k, v) : P.delete(k); };
        poner('q', st.q.trim()); poner('orden', st.orden);
        GR.forEach(function (g) {
          if (g.tipo === 'chips') poner(g.k, st[g.k].join(','));
          else if (g.tipo === 'select') poner(g.k, st[g.k]);
          else { poner(g.k + '_d', st[g.k + 'D']); poner(g.k + '_h', st[g.k + 'H']); }
        });
        history.replaceState(history.state, '', u.pathname + u.search + u.hash);
      }
      function deUrl() {
        var P = new URLSearchParams(location.search);
        st.q = (P.get('q') || '').slice(0, 60);
        var ov = P.get('orden') || ''; if (ORDEN.some(function (o) { return o[0] === ov; })) st.orden = ov;
        GR.forEach(function (g) {
          if (g.tipo === 'chips') {
            st[g.k] = (P.get(g.k) || '').split(',').filter(function (id, k, arr) { return arr.indexOf(id) === k && g.ops.some(function (o) { return o.id === id; }); });
            if (g.uno && st[g.k].length > 1) st[g.k] = st[g.k].slice(0, 1);
          } else if (g.tipo === 'select') {
            var v = P.get(g.k) || ''; st[g.k] = g.ops.some(function (o) { return o.id === v; }) ? v : '';
          } else {
            ['D', 'H'].forEach(function (z) {
              var v = P.get(g.k + '_' + z.toLowerCase()) || '';
              st[g.k + z] = g.vals.some(function (x) { return String(x) === v; }) ? v : '';
            });
            if (st[g.k + 'D'] !== '' && st[g.k + 'H'] !== '' && +st[g.k + 'D'] > +st[g.k + 'H']) { var tmp = st[g.k + 'D']; st[g.k + 'D'] = st[g.k + 'H']; st[g.k + 'H'] = tmp; }
          }
        });
        q.value = st.q;
      }

      /* D1 · debounce 120 ms para la búsqueda del catálogo */
      var qDebounce = 0;
      q.addEventListener('input', function () {
        st.q = q.value;
        clearTimeout(qDebounce);
        qDebounce = setTimeout(function () { aplicar(true); }, 120);
      });
      q.addEventListener('search', function () { st.q = q.value; clearTimeout(qDebounce); aplicar(true); });
      ord.addEventListener('change', function () { st.orden = ord.value; aplicar(true); });
      lim.addEventListener('click', function () {
        clearTimeout(qDebounce);
        st.q = ''; q.value = ''; st.orden = '';
        GR.forEach(function (g) {
          if (g.tipo === 'chips') st[g.k] = []; else if (g.tipo === 'select') st[g.k] = ''; else { st[g.k + 'D'] = ''; st[g.k + 'H'] = ''; }
        });
        aplicar(true); q.focus();
      });
      var nAct = 0;
      function etiquetaTg() { tg.textContent = (body.hidden ? 'Mostrar filtros' : 'Ocultar filtros') + (nAct ? ' (' + nAct + ')' : ''); tg.classList.toggle('is-on', !body.hidden); }
      function abrirPanel(si) { body.hidden = !si; tools.classList.toggle('is-open', !!si); tg.setAttribute('aria-expanded', si ? 'true' : 'false'); etiquetaTg(); }
      tg.addEventListener('click', function () { abrirPanel(body.hidden); if (!body.hidden) { try { body.scrollIntoView({ block: 'nearest', behavior: (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth') }); } catch (e) {} } });

      /* ----- comparador: exactamente 2 unidades · selección por id real (nunca por posición) ----- */
      var MAX = 2, cmp = [], tray = null, dlg = null, cmpVuelta = null;
      var cbs = $$('.car-c input', ul);
      $$('.car-c', ul).forEach(function (l) { l.hidden = false; });
      function sinMarca(a) { return a.modeloTxt; }
      function porId(id) { for (var k = 0; k < list.length; k++) { if (favKey(list[k]) === id) return list[k]; } return null; }
      function podarSel() {
        var antes = cmp.length;
        cmp = cmp.filter(function (id, k) { return cmp.indexOf(id) === k && !!porId(id); });
        if (cmp.length < antes) aviso('Se descartó una unidad que ya no está en el catálogo.');
      }
      function tx(v) { if (v == null) return null; var s = String(v).trim(); return s === '' ? null : s; }
      function nu(v) { return typeof v === 'number' && isFinite(v) ? v : null; }
      function pOk(a) { return !!(a.precio && nu(a.precio.monto) != null && tx(a.precio.moneda)); }
      function pTxt(a, m) { return a.precio.moneda + ' ' + fmt(m != null ? m : a.precio.monto); }
      /* --tray-h = alto real de la bandeja: el padding del cuerpo y los botones flotantes (.dr-fab) se apoyan en él para no tapar «Comparar» ni «Vaciar» */
      function trayAlto() { document.documentElement.style.setProperty('--tray-h', (tray && !tray.hidden ? tray.offsetHeight : 0) + 'px'); }
      window.addEventListener('resize', function () { if (tray && !tray.hidden) trayAlto(); });
      function pintarBandeja() {
        podarSel();
        cbs.forEach(function (c) { var a = list[+c.value]; c.checked = !!a && cmp.indexOf(favKey(a)) > -1; });
        document.body.classList.toggle('has-tray', cmp.length > 0);
        if (!cmp.length) { if (tray) tray.hidden = true; trayAlto(); return; }
        if (!tray) {
          tray = el('div', null, 'tray'); tray.setAttribute('role', 'region'); tray.setAttribute('aria-label', 'Unidades para comparar');
          document.body.appendChild(tray);
        }
        tray.hidden = false; tray.textContent = '';
        var w = el('div', null, 'w'), lst = el('ul', null, 'tray-l');
        var count = el('p', 'Unidades seleccionadas: ' + cmp.length + ' de ' + MAX, 'tray-count'); count.setAttribute('role', 'status'); count.setAttribute('aria-live', 'polite'); w.appendChild(count);
        cmp.forEach(function (id) {
          var a = porId(id), li = el('li', null, 'tray-i'), b = el('button', '×'); b.type = 'button'; b.setAttribute('aria-label', 'Quitar de la comparación: ' + a.titulo);
          if (a.media && a.media[0]) { var th = el('img', null, 'tray-th'); th.src = a.media[0].thumb || a.media[0].card || a.media[0].src; th.alt = ''; th.decoding = 'async'; li.appendChild(th); }
          li.appendChild(el('span', a.marca + ' ' + a.modeloTxt)); li.appendChild(b); lst.appendChild(li);
          b.addEventListener('click', function () { quitar(id); });
        });
        var ver = el('button', cmp.length < 2 ? 'Elegí una segunda unidad para comparar' : 'Comparar las 2 unidades', 'btn p sm'); ver.type = 'button'; ver.disabled = cmp.length < 2; ver.className += ' cmp-open';
        var vac = el('button', 'Vaciar', 'btn sm'); vac.type = 'button';
        ver.addEventListener('click', function () { abrirComparacion(); });
        vac.addEventListener('click', function () { cmp = []; pintarBandeja(); if (dlg && dlg.open) dlg.close(); aviso('Selección vaciada'); });
        w.appendChild(lst); w.appendChild(ver); w.appendChild(vac); tray.appendChild(w); trayAlto();
      }
      function quitar(id) {
        var k = cmp.indexOf(id); if (k < 0) return;
        cmp.splice(k, 1); pintarBandeja(); aviso('Unidad quitada del comparador');
        if (dlg && dlg.open) { if (cmp.length < 2) dlg.close(); else abrirComparacion(); }
      }
      cbs.forEach(function (c) {
        c.addEventListener('change', function () {
          var a = list[+c.value]; if (!a) { c.checked = false; return; }
          var id = favKey(a), k = cmp.indexOf(id);
          if (c.checked && k < 0) {
            if (cmp.length >= MAX) { c.checked = false; aviso('Ya elegiste 2 unidades. Quitá una en la bandeja o cambiala desde el comparador.'); return; }
            cmp.push(id);
            aviso(cmp.length < 2 ? 'Primera unidad elegida. Elegí una segunda para comparar.' : 'Segunda unidad elegida. Ya podés comparar.');
          } else if (!c.checked && k > -1) { cmp.splice(k, 1); aviso('Unidad quitada del comparador'); }
          pintarBandeja();
        });
      });

      /* T5 · desde la ficha: la selección pasa a ser exactamente estas dos unidades y se abre la comparación */
      function compararCon(a, c, origen) {
        var ka = favKey(a), kc = favKey(c), antes = cmp.slice();
        if (!porId(ka) || !porId(kc)) return;
        cmp = [ka, kc]; cmpVuelta = origen || null; pintarBandeja();
        if (antes.some(function (id) { return id !== ka && id !== kc; })) aviso('Se reemplazó la selección anterior por estas 2 unidades.');
        var cm0 = fdlg && fdlg.querySelector('[data-cmp-ficha]'); if (cm0) cm0.textContent = 'Quitar de la comparación';
        abrirComparacion();
      }
      function abrirComparacion(enfocar) {
        podarSel();
        var sel = cmp.map(porId);
        if (sel.length !== 2) return;
        if (!dlg) {
          dlg = el('dialog', null, 'cmp cmp-lux'); dlg.setAttribute('aria-labelledby', 'cmp-ttl');
          dlg.addEventListener('click', function (e) { if (e.target === dlg) dlg.close(); });
          dlg.addEventListener('close', function () {
            if (!(fdlg && fdlg.open)) document.documentElement.classList.remove('has-dlg');   /* T5: con la ficha abierta debajo, el bloqueo de scroll sigue */
            var v = cmpVuelta; cmpVuelta = null;
            if (v && v.isConnected && fdlg && fdlg.open) { try { v.focus({ preventScroll: true }); } catch (e) {} return; }   /* T5: el foco vuelve a la tarjeta de la ficha */
            var b = tray && tray.querySelector('.cmp-open'); if (b && !b.disabled) { try { b.focus({ preventScroll: true }); } catch (e) {} }
          });
          document.body.appendChild(dlg);
        }
        var soloDif = dlg.classList.contains('solo-dif');
        dlg.textContent = '';
        dlg.style.setProperty('--n', 2);

        /* ----- encabezado ----- */
        var hd = el('div', null, 'cmp-hd'), tt = el('div', null, 'cmp-tt');
        var sun = el('span', null, 'cmp-flag'); sun.setAttribute('aria-hidden', 'true'); sun.innerHTML = '<svg viewBox="0 0 64 36" focusable="false"><path d="M8 3v32"/><path d="M8 6h46v20H8z"/><path d="M8 16h46M19.5 6v20M31 6v20M42.5 6v20"/></svg>';
        tt.appendChild(sun);
        var tcx = el('div', null, 'cmp-tx');
        tcx.appendChild(el('p', 'Automotores 828', 'cmp-ey'));
        var h = el('h2', 'Comparador'); h.id = 'cmp-ttl'; tcx.appendChild(h);
        tcx.appendChild(el('p', 'Comparás dos unidades, lado a lado', 'cmp-sub'));
        tt.appendChild(tcx); hd.appendChild(tt);
        var ct = el('div', null, 'cmp-ct');
        var sw = el('label', null, 'cmp-sw'), ck = el('input'); ck.type = 'checkbox'; ck.checked = soloDif;
        sw.appendChild(ck); sw.appendChild(el('span', null, 'cmp-sw-k')); sw.appendChild(el('span', 'Solo diferencias'));
        ck.addEventListener('change', function () { dlg.classList.toggle('solo-dif', ck.checked); });
        var x = el('button', 'Cerrar', 'btn sm'); x.type = 'button'; x.addEventListener('click', function () { dlg.close(); });
        ct.appendChild(sw); ct.appendChild(x); hd.appendChild(ct); dlg.appendChild(hd);
        dlg.appendChild(el('div', null, 'cmp-hz'));

        /* ----- cálculos: solo con datos válidos y de la misma moneda ----- */
        var A = sel[0], B = sel[1];
        var mismaMon = pOk(A) && pOk(B) && A.precio.moneda === B.precio.moneda;
        var menorP = mismaMon && A.precio.monto !== B.precio.monto ? (A.precio.monto < B.precio.monto ? A : B) : null;
        var anioOk = nu(A.anio) != null && nu(B.anio) != null && A.anio !== B.anio;
        var nuevo = anioOk ? (A.anio > B.anio ? A : B) : null;
        var kmOk = nu(A.km) != null && nu(B.km) != null && A.km !== B.km;
        var menosKm = kmOk ? (A.km < B.km ? A : B) : null;

        var t = el('table', null, 'cmpt cmpx'), cap = el('caption', 'Comparación de dos unidades'); cap.className = 'sr'; t.appendChild(cap);
        var hr = el('tr'), c0 = el('th'); c0.scope = 'col'; c0.appendChild(el('span', 'Dato', 'sr')); hr.appendChild(c0);
        sel.forEach(function (a, k) {
          var th = el('th', null, 'cmp-u'); th.scope = 'col';
          th.appendChild(el('span', 'Unidad ' + (k + 1), 'cmp-slot'));
          var ph = el('div', null, 'cmp-ph');
          if (a.media && a.media[0]) {
            var im = el('img'); im.src = a.media[0].src; if (a.media[0].srcset) im.srcset = a.media[0].srcset;
            im.sizes = '(max-width: 700px) 150px, 300px'; im.alt = a.media[0].alt || a.titulo; im.decoding = 'async';
            if (a.media[0].width && a.media[0].height) { im.width = a.media[0].width; im.height = a.media[0].height; }
            ph.appendChild(im);
          } else { ph.className += ' sin-foto'; ph.setAttribute('role', 'img'); ph.setAttribute('aria-label', 'Sin fotografía publicada de ' + a.titulo); ph.appendChild(el('span', 'Sin foto', 'cmp-nf')); }
          var rm = el('button', '×', 'cmp-rm'); rm.type = 'button'; rm.setAttribute('aria-label', 'Quitar de la comparación: ' + a.titulo);
          rm.addEventListener('click', function () { quitar(favKey(a)); });
          ph.appendChild(rm);
          th.appendChild(ph);
          th.appendChild(el('span', a.marca, 'cb')); th.appendChild(el('span', sinMarca(a), 'cn'));
          th.appendChild(el('span', [a.anio != null ? a.anio : null, a.version].filter(Boolean).join(' · '), 'cv'));
          th.appendChild(el('span', pOk(a) ? pTxt(a) : 'Consultar precio', 'cmp-pr'));
          var ac = el('div', null, 'cmp-ac');
          var vf = el('button', 'Ver ficha', 'btn p sm'); vf.type = 'button'; vf.setAttribute('aria-label', 'Ver la ficha de ' + a.titulo);
          vf.addEventListener('click', function () { abrirFicha(a.i, vf); });
          var otro = sel[1 - k], sl = el('select', null, 'cmp-sel'); sl.setAttribute('aria-label', 'Cambiar la unidad ' + (k + 1) + ' (' + a.titulo + ')');
          var o0 = el('option', 'Cambiar unidad…'); o0.value = ''; sl.appendChild(o0);
          list.forEach(function (b) { if (favKey(b) === favKey(a) || favKey(b) === favKey(otro)) return; var o = el('option', b.titulo); o.value = favKey(b); sl.appendChild(o); });
          sl.addEventListener('change', function () {
            var id = sl.value; if (!id || !porId(id) || id === favKey(otro)) return;
            cmp[k] = id; pintarBandeja(); aviso('Unidad ' + (k + 1) + ' cambiada'); abrirComparacion(k);
          });
          ac.appendChild(vf); ac.appendChild(sl); th.appendChild(ac);
          hr.appendChild(th);
        });
        var thead = el('thead'); thead.appendChild(hr); t.appendChild(thead);
        var tb = el('tbody'), pend = null;
        function grupo(txt) { pend = txt; }
        function fila(rotulo, celda, clave, nc) {
          if (pend) { var g = el('tr', null, 'cmp-g'), gh = el('th', pend); gh.scope = 'rowgroup'; gh.colSpan = 3; g.appendChild(gh); tb.appendChild(g); pend = null; }
          var r = el('tr'), th = el('th', rotulo); th.scope = 'row'; r.appendChild(th);
          sel.forEach(function (a) { var td = el('td'); celda(td, a); r.appendChild(td); });
          var ks = sel.map(clave);
          if (nc && sel.some(nc)) r.className = 'nc';
          else if (ks[0] == null || ks[1] == null) r.className = 'nd';
          else r.className = ks[0] === ks[1] ? 'same' : 'diff';
          tb.appendChild(r);
        }
        function nota(td, txt) { if (txt) td.appendChild(el('small', txt, 'cmp-note')); }
        function campo(rot, k, moto, opc) {
          var v0 = tx(A[k]), v1 = tx(B[k]);
          var ncf = moto ? function (a) { return a.tipoVehiculo === 'Moto' && tx(a[k]) == null; } : null;
          if (opc && v0 == null && v1 == null && !(ncf && (ncf(A) || ncf(B)))) return;
          fila(rot, function (td, a) {
            var v = tx(a[k]);
            if (v == null && ncf && ncf(a)) { td.appendChild(el('span', 'No comparable', 'val nc')); return; }
            td.appendChild(el('span', v != null ? v : 'No informado', v != null ? 'val' : 'val nd'));
          }, function (a) { var v = tx(a[k]); return v == null ? null : v.toLowerCase(); }, ncf);
        }

        grupo('Lo esencial');
        fila('Precio publicado', function (td, a) {
          td.appendChild(el('strong', pOk(a) ? pTxt(a) : 'Consultar precio', 'big' + (pOk(a) ? '' : ' nd')));
          if (pOk(a) && tx(a.precio.fecha)) nota(td, 'Relevado el ' + fecha(a.precio.fecha));
          if (menorP === a) td.appendChild(el('span', 'Importe menor', 'bd'));
        }, function (a) { return pOk(a) ? a.precio.moneda + ' ' + a.precio.monto : null; });
        if (pOk(A) && pOk(B)) {
          fila('Diferencia de precio', function (td, a) {
            if (!mismaMon) { td.textContent = 'Monedas distintas: no se calcula una diferencia.'; td.className = 'nd'; return; }
            var d = Math.abs(A.precio.monto - B.precio.monto);
            td.textContent = d === 0 ? 'Mismo importe' : (menorP === a ? 'Importe menor' : '+ ' + pTxt(a, d) + ' respecto de la otra');
          }, function () { return null; });
        }
        fila('Año', function (td, a) {
          td.appendChild(el('strong', nu(a.anio) != null ? String(a.anio) : 'No informado', 'big' + (nu(a.anio) != null ? '' : ' nd')));
          if (nuevo === a) nota(td, Math.abs(A.anio - B.anio) + (Math.abs(A.anio - B.anio) === 1 ? ' año' : ' años') + ' más reciente');
        }, function (a) { return nu(a.anio); });
        fila('Kilómetros', function (td, a) {
          td.appendChild(el('strong', nu(a.km) != null ? fmt(a.km) + ' km' : 'No informado', 'big' + (nu(a.km) != null ? '' : ' nd')));
          if (menosKm === a) nota(td, fmt(Math.abs(A.km - B.km)) + ' km menos registrados');
        }, function (a) { return nu(a.km); });
        grupo('Mecánica');
        campo('Caja', 'transmision', false, false);
        campo('Combustible', 'combustible', false, false);
        campo('Cilindrada', 'cilindrada', false, true);
        campo('Motor', 'motor', false, true);
        campo('Potencia', 'potencia', false, true);
        campo('Tracción', 'traccion', false, true);
        grupo('Carrocería y detalle');
        campo('Carrocería', 'carroceria', true, true);
        campo('Puertas', 'puertas', true, true);
        campo('Color', 'color', false, true);
        campo('Versión', 'version', false, true);
        var fr = el('tr', null, 'cmp-fr'), fth = el('th', 'Publicación'); fth.scope = 'row'; fr.appendChild(fth);
        sel.forEach(function (a) {
          var td = el('td');
          var c = el('a', 'Consultar esta unidad', 'btn p sm'); c.href = hrefConsulta(a); c.target = '_blank'; c.rel = 'noopener noreferrer'; c.textContent = hrefU(a, 'consulta') ? 'Consultar por WhatsApp' : 'Consultar en Mercado Libre';
          td.appendChild(c);
          if (a.url && c.href !== a.url) { var v = el('a', 'Ver publicación', 'vp'); v.href = a.url; v.target = '_blank'; v.rel = 'noopener noreferrer'; td.appendChild(v); }
          fr.appendChild(td);
        });
        tb.appendChild(fr);
        t.appendChild(tb);
        var sc = el('div', null, 'cmp-sc'); sc.appendChild(t); dlg.appendChild(sc);
        var f = sel.map(function (a) { return a.precio && a.precio.fecha; }).filter(Boolean);
        var notaD = el('details', null, 'cmp-ft'), notaS = el('summary', 'Sobre estos datos'); notaD.appendChild(notaS);
        notaD.appendChild(el('p', 'Precios y kilometrajes relevados' + (f.length ? ' el ' + fecha(f[0]) : '') + '; no garantizan precio ni disponibilidad actuales. Las diferencias son observaciones entre estas dos unidades, no una recomendación de compra. Consultá disponibilidad por WhatsApp.', 'src'));   /* el aviso largo queda plegado: no le quita lugar a la comparación */
        dlg.appendChild(notaD);
        document.documentElement.classList.add('has-dlg');
        if (typeof dlg.showModal === 'function') { if (!dlg.open) dlg.showModal(); } else dlg.setAttribute('open', '');
        sc.scrollTop = 0; sc.scrollLeft = 0;
        var foco = typeof enfocar === 'number' ? dlg.querySelectorAll('.cmp-sel')[enfocar] : x;
        if (foco) foco.focus();
      }

      /* ----- consultas comerciales: un único constructor de mensajes WhatsApp, siempre por la unidad (id real) ----- */
      var WAM = window.drWaMensajes || null;   /* js/wa-mensajes.js: el mismo constructor que usa el build para las tarjetas */
      function descU(a) { return WAM ? WAM.desc(a) : String(a.titulo || ''); }
      function mensajeU(a, intencion) { return WAM ? WAM.mensaje(a, intencion) : ''; }
      function hrefU(a, intencion) { var b = WAM && ctx && ctx.wa ? String(ctx.wa).split('?')[0] : null; return b ? b + '?text=' + encodeURIComponent(mensajeU(a, intencion)) : null; }
      function hrefConsulta(a) { return (!a.vendida && hrefU(a, 'consulta')) || a.href; }

      /* ----- ficha completa (diálogo), compartir y aviso breve ----- */
      var ctx = {};
      try { ctx = JSON.parse(($('#cat-ctx') || {}).textContent || '{}'); } catch (e) {}
      selRender();   /* T4: ahora que WAM y ctx existen, el panel puede ofrecer la visita por WhatsApp */
      var fdlg = null, fOrigen = null, fFoco = null, fId = null, toast = null, toastT = 0, fRO = null, fSwap = false;
      function aviso(msg) {
        if (!toast) { toast = el('div', null, 'toast'); toast.setAttribute('role', 'status'); toast.setAttribute('aria-live', 'polite'); document.body.appendChild(toast); }
        toast.textContent = msg; toast.classList.add('on');
        clearTimeout(toastT); toastT = setTimeout(function () { toast.classList.remove('on'); }, 2400);
      }
      /* ----- T1 · enlace propio por unidad e historial -----
         Contrato: la URL es la única fuente de verdad de «qué ficha debe estar abierta». Formato: #unidad=<id real del catálogo>
         (los filtros siguen en la query y se conservan). Abrir una ficha crea UNA entrada de historial (pushState);
         con la ficha ya abierta, cambiar de unidad la reemplaza (replaceState). Atrás/Adelante (popstate) solo sincronizan
         la interfaz: mientras hNav es true, abrirFicha no escribe en el historial. Cerrar la ficha deshace su propia entrada
         (history.back) o, si la entrada no la creó la ficha (enlace directo, recarga), solo quita el fragmento. */
      var hNav = false, esperaBack = false, colaUrl = null, tBack = 0, anclaPend = null;
      function idDeUrl() {
        var m = /^#unidad=(.*)$/.exec(location.hash); if (!m) return null;
        try { return decodeURIComponent(m[1]); } catch (e) { return ''; }
      }
      function hashDe(id) { return '#unidad=' + encodeURIComponent(String(id)); }
      function urlBase() { return location.pathname + location.search; }
      function esperaFin() { clearTimeout(tBack); esperaBack = false; var f = colaUrl; colaUrl = null; if (f) f(); anclaYa(); }
      /* Enlaces internos (#tu-usado, #horarios) dentro de la ficha: si la entrada de historial la creó la ficha, primero se la deshace
         (history.back) y recién después se navega al ancla; así el ancla reemplaza a la ficha en vez de apilarse sobre ella y dejar
         una entrada #unidad=… huérfana. Si la entrada no es de la ficha (enlace directo, recarga) se deja la navegación nativa. */
      /* El navegador móvil restaura el scroll del historial DESPUÉS de nuestro popstate y las secciones diferidas cambian de alto:
         el salto nativo al ancla puede quedar lejos del destino. Se reafirma la posición unas veces, salvo que la persona toque o desplace. */
      function asegurarAncla(h) {
        var t = null; try { t = document.querySelector(h); } catch (e) {}
        if (!t) return;
        var paro = false, parar = function () { paro = true; };
        ['touchstart', 'wheel', 'keydown', 'mousedown'].forEach(function (n) { window.addEventListener(n, parar, { once: true, passive: true }); });
        [60, 250, 600, 1000, 1600].forEach(function (ms) {
          setTimeout(function () {
            if (paro || (fdlg && fdlg.open)) return;
            var hh = document.querySelector('header'), cs = window.getComputedStyle(t);
            var esperado = parseFloat(cs.scrollMarginTop) || (hh ? hh.offsetHeight : 0);
            if (Math.abs(t.getBoundingClientRect().top - esperado) > 24) { try { t.scrollIntoView({ block: 'start', behavior: 'auto' }); } catch (e) { t.scrollIntoView(); } }
          }, ms);
        });
      }
      function anclaYa() {
        if (!anclaPend || esperaBack) return;
        var h = anclaPend; anclaPend = null;
        var ir = function () { location.hash = h; asegurarAncla(h); };
        if (window.drAnclaListo) window.drAnclaListo(ir); else ir();   /* js/site.js: espera a que las secciones omitidas estén preparadas para que el scroll caiga bien */
      }
      function irAnclaDesdeFicha(ev, hash) {
        var st = history.state;
        if (fId != null && !esperaBack && idDeUrl() === fId && st && st.dr828Ficha === fId) {
          /* se deshace la entrada de la ficha en el acto: el popstate navega al ancla (esperaFin → anclaYa) y cierra la ficha con su animación, sin esperar el cierre */
          ev.preventDefault(); anclaPend = hash;
          esperaBack = true; clearTimeout(tBack);
          tBack = setTimeout(function () { esperaFin(); if (fdlg && fdlg.open) fdlg.close(); }, 400);   /* si el popstate no llega: igual se navega y se cierra */
          try { history.back(); } catch (e) { esperaFin(); if (fdlg && fdlg.open) fdlg.close(); }
          return;
        }
        fdlg.close();
      }
      function urlAbrir(a) {
        if (hNav || a.id == null) return;
        var id = String(a.id), estado = { dr828Ficha: id };
        if (esperaBack) { colaUrl = function () { if (fdlg && fdlg.open && fId === id) urlAbrir(a); }; return; }   /* un history.back() propio aún no llegó: se escribe después */
        if (idDeUrl() === id) { if (!history.state || history.state.dr828Ficha !== id) { try { history.replaceState(estado, '', urlBase() + hashDe(id)); } catch (e) {} } return; }
        try {
          /* con #unidad=… ya en la URL la entrada de la ficha anterior sigue arriba (ficha abierta, o cerrada cuyo «close» aún no llegó): se reutiliza */
          if (idDeUrl() !== null) history.replaceState(estado, '', urlBase() + hashDe(id));
          else history.pushState(estado, '', urlBase() + hashDe(id));
        } catch (e) {}
      }
      function urlCerrar() {
        var id = fId; fId = null;
        if (esperaBack) { colaUrl = null; return; }   /* ya hay un history.back() propio en camino: no se encadena otro */
        if (hNav || id == null || idDeUrl() !== id) return;   /* la URL ya cambió (Atrás, otro ancla): no hay nada que deshacer */
        var st = history.state;
        try {
          if (st && st.dr828Ficha === id) { esperaBack = true; clearTimeout(tBack); tBack = setTimeout(esperaFin, 400); history.back(); }
          else history.replaceState(st, '', urlBase());
        } catch (e) { esperaBack = false; }
      }
      function urlSincronizar() {
        if (esperaBack) { esperaFin(); }
        var id = idDeUrl(), abierta = !!(fdlg && fdlg.open);
        if (id === null) {
          if (!abierta) return;
          var gv = window.drGaleriaVisor;
          if (gv && gv.isOpen && gv.isOpen() && fId != null) {   /* Atrás con el visor abierto: cierra solo el visor y la ficha conserva su entrada */
            gv.close();
            try { history.pushState({ dr828Ficha: fId }, '', urlBase() + hashDe(fId)); } catch (e) {}
            return;
          }
          hNav = true; try { fdlg.close(); } finally { hNav = false; }
          return;
        }
        var u = id ? list.filter(function (x) { return String(x.id) === id; })[0] : null;
        if (!u) {   /* identificador inválido o unidad que ya no está publicada: el catálogo sigue operativo */
          try { history.replaceState(history.state && history.state.dr828Ficha ? null : history.state, '', urlBase()); } catch (e) {}
          if (abierta) { hNav = true; try { fdlg.close(); } finally { hNav = false; } }
          aviso('No encontramos esa unidad. Puede que ya no esté publicada: seguí viendo el catálogo.');
          return;
        }
        if (abierta && fId === id) return;
        hNav = true; try { abrirFicha(list.indexOf(u), null); } finally { hNav = false; }
      }
      /* enlace absoluto de una unidad concreta (sin filtros: quien lo recibe ve la unidad, no la búsqueda de quien lo envía) */
      function urlUnidad(a) { return /^https?:/.test(location.protocol) && a && a.id != null ? location.origin + location.pathname + hashDe(a.id) : null; }
      function compartir(a) {
        var url = urlUnidad(a) || a.url, datos = { title: a.titulo, text: a.titulo + ' · ' + (ctx.nombre || ''), url: url };
        if (navigator.share) { navigator.share(datos).catch(function () {}); return; }
        copiar(datos.text + ' ' + url, function (ok) { aviso(ok ? 'Enlace copiado' : 'No se pudo copiar el enlace'); });
      }
      function enlace(txt, href, cls, ext) {
        var x = el('a', txt, cls || 'btn sm'); x.href = href;
        if (ext) { x.target = '_blank'; x.rel = 'noopener noreferrer'; }
        return x;
      }
      function boton(txt, cls, fn) { var b = el('button', txt, cls || 'btn sm'); b.type = 'button'; b.addEventListener('click', fn); return b; }
      function abrirFicha(i, origen, record) {
        var a = record || list[i]; if (!a) return;
        fOrigen = origen || null;
        fId = a.id != null ? String(a.id) : null;
        fFoco = $('#cars').querySelector('[data-ficha="' + list.indexOf(a) + '"]');   /* foco de vuelta aunque la ficha se abra por enlace, Atrás o Adelante */
        urlAbrir(a);
        if (window.drGaleriaVisor) window.drGaleriaVisor.close(true);   /* el visor nunca sobrevive a la reconstrucción de la ficha */
        /* otra unidad con la ficha ya abierta: el contenido actual sale brevemente (js/ficha-flip.js) y recién entonces se reconstruye; la última selección prevalece */
        if (fdlg && fdlg.open && !fSwap && window.drFichaFlip && window.drFichaFlip.leave && window.drFichaFlip.leave(fdlg, function () { fSwap = true; try { abrirFicha(i, origen, record); } finally { fSwap = false; } })) return;
        if (!fdlg) {
          fdlg = el('dialog', null, 'ficha'); fdlg.setAttribute('aria-labelledby', 'fi-ttl');
          fdlg.addEventListener('click', function (e) { if (e.target === fdlg) fdlg.close(); });
          fdlg.addEventListener('close', function () { if (fdlg.open) return;   /* «close» tardío de un cierre anterior: la ficha ya volvió a abrirse (Adelante, otra unidad) */
          if (window.drGaleriaVisor) window.drGaleriaVisor.close(true); if (!(dlg && dlg.open)) document.documentElement.classList.remove('has-dlg'); urlCerrar(); anclaYa(); var fo = fOrigen && fOrigen.focus && fOrigen.isConnected ? fOrigen : fFoco; if (fo && fo.focus) { try { fo.focus({ preventScroll: true }); } catch (e) {} } });
          document.body.appendChild(fdlg);
        }
        fdlg.textContent = '';
        var x = boton('Cerrar', 'btn sm fi-x', function () { fdlg.close(); }); x.setAttribute('aria-label', 'Cerrar la ficha');
        var g = el('div', null, 'fi-g'), left = el('div', null, 'fi-l');
        g.appendChild(left);

        /* galería: todas las fotos publicadas de la unidad */
        if (a.media && a.media.length) {
          var gal = el('div', null, 'fi-m'), tr = el('div', null, 'fi-t'), th = null, tbs = [];
          tr.tabIndex = 0; tr.setAttribute('role', 'group'); tr.setAttribute('aria-label', 'Fotos de ' + a.titulo);
          a.media.forEach(function (m, k) {
            var im = el('img'); im.src = m.src; if (m.srcset) im.srcset = m.srcset;
            im.sizes = '(max-width: 800px) 100vw, 520px'; im.alt = m.alt || a.titulo; im.decoding = 'async'; if (k) im.loading = 'lazy';
            tr.appendChild(im);
          });
          gal.appendChild(tr);
          /* visor ampliado (js/galeria-visor.js): botón «Ampliar», contador y clic en la foto; si el módulo no cargó, la galería queda como antes */
          var vzCt = null, vzBtn = null, vzOn = !!(window.drGaleriaVisor && window.drGaleriaVisor.open);
          var vzIdx = function () { return Math.max(0, Math.min(a.media.length - 1, Math.round(tr.scrollLeft / Math.max(1, tr.clientWidth)))); };
          var vzAbrir = function (trigger) {
            window.drGaleriaVisor.open({ items: a.media, index: vzIdx(), title: a.titulo, trigger: trigger || tr,
              onIndex: function (k) { tr.scrollTo({ left: k * tr.clientWidth, behavior: 'auto' }); } });
          };
          if (vzOn) {
            var vz = el('div', null, 'fi-vz');
            vzBtn = boton('Ampliar', 'fi-zoom', function () { vzAbrir(vzBtn); }); vzBtn.setAttribute('aria-label', 'Ampliar foto');
            vz.appendChild(vzBtn);
            if (a.media.length > 1) { vzCt = el('span', '1 de ' + a.media.length, 'fi-ct'); vz.appendChild(vzCt); }
            gal.appendChild(vz); gal.classList.add('fi-vz-on');
            tr.addEventListener('click', function (e) { if (e.target && e.target.tagName === 'IMG') vzAbrir(tr); });
            tr.addEventListener('keydown', function (e) { if ((e.key === 'Enter' || e.key === ' ') && e.target === tr) { vzAbrir(tr); e.preventDefault(); } });
          }
          if (a.media.length > 1) {
            var ir = function (k) { k = Math.max(0, Math.min(a.media.length - 1, k)); tr.scrollTo({ left: k * tr.clientWidth, behavior: (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth') }); };
            var act = function () { return Math.round(tr.scrollLeft / Math.max(1, tr.clientWidth)); };
            var pv = boton('‹', 'fi-a fi-prev', function () { ir(act() - 1); }), nx = boton('›', 'fi-a fi-next', function () { ir(act() + 1); });
            pv.setAttribute('aria-label', 'Foto anterior'); nx.setAttribute('aria-label', 'Foto siguiente');
            gal.appendChild(pv); gal.appendChild(nx);
            th = el('div', null, 'fi-th');
            a.media.forEach(function (m, k) {
              var b = el('button'); b.type = 'button'; b.setAttribute('aria-label', 'Ver foto ' + (k + 1) + ' de ' + a.media.length);
              var im = el('img'); im.src = m.thumb || m.src; im.alt = ''; im.loading = 'lazy'; im.decoding = 'async'; b.appendChild(im);
              b.addEventListener('click', function () { ir(k); }); th.appendChild(b); tbs.push(b);
            });
            var tk = 0, ul = 0;
            tr.addEventListener('scroll', function () {
              if (tk) return; tk = requestAnimationFrame(function () { tk = 0; var c = act(); tbs.forEach(function (b, k) { b.classList.toggle('on', k === c); }); if (vzCt) vzCt.textContent = (c + 1) + ' de ' + a.media.length; if (c !== ul) { ul = c; var tb = tbs[c]; if (tb && th.scrollWidth > th.clientWidth) th.scrollTo({ left: tb.offsetLeft - (th.clientWidth - tb.offsetWidth) / 2, behavior: (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth') }); } });
            }, { passive: true });
            tbs[0].classList.add('on');
            tr.addEventListener('keydown', function (e) { if (e.key === 'ArrowRight') { ir(act() + 1); e.preventDefault(); } if (e.key === 'ArrowLeft') { ir(act() - 1); e.preventDefault(); } });
            gal.appendChild(th);
          }
          left.appendChild(gal);
        }

        /* datos */
        var info = el('div', null, 'fi-i');
        var mb = el('p', a.marca + (a.tipoVehiculo === 'Moto' ? ' · Moto' : ''), 'fi-b'); if (a.vendida) mb.appendChild(el('span', 'Vendida', 'fi-v')); info.appendChild(mb);
        var h = el('h2', a.modeloTxt); h.id = 'fi-ttl'; info.appendChild(h);
        info.appendChild(el('p', a.precio ? peso(a) : 'Consultar precio', 'fi-pr'));
        if (a.anticipo && a.anticipo.monto != null) info.appendChild(el('p', 'Anticipo publicado: ' + a.anticipo.moneda + ' ' + fmt(a.anticipo.monto), 'fi-n'));
        if (a.precio && a.precio.fecha) info.appendChild(el('p', 'Precio al ' + fecha(a.precio.fecha) + '.', 'fi-n'));
        /* T3 · lectura rápida: lo que más pesa al decidir, con el dato tal como lo publicó la agencia.
           Lo que la publicación no trae se lista una sola vez, sin afirmar que la unidad no lo tenga. */
        var rapDefs = [['Año', nu(a.anio) != null ? String(a.anio) : null], ['Kilómetros', nu(a.km) != null ? fmt(a.km) + ' km' : null], ['Caja', a.transmision || null], ['Combustible', a.combustible || null]];
        var rapHay = rapDefs.filter(function (r) { return r[1] != null; });
        if (rapHay.length) {
          var rp = el('dl', null, 'fi-rapido');
          rapHay.forEach(function (r) { var c = el('div'); c.appendChild(el('dt', r[0])); c.appendChild(el('dd', r[1])); rp.appendChild(c); });
          info.appendChild(rp);
          var sinDato = rapDefs.filter(function (r) { return r[1] == null; }).map(function (r) { return r[0]; });
          if (a.tipoVehiculo !== 'Moto') [['Carrocería', a.carroceria], ['Puertas', a.puertas], ['Potencia', a.potencia], ['Tracción', a.traccion]].forEach(function (r) { if (r[1] == null || r[1] === '') sinDato.push(r[0]); });
          if (sinDato.length) info.appendChild(el('p', 'No informado en la publicación: ' + sinDato.join(', ') + '.', 'fi-n fi-nd'));
        }
        var dl = el('dl', null, 'fi-d');
        function dato(k, v, sw) {
          if (v == null || v === '') return;
          var d = el('div'), dd = el('dd');
          if (sw) { var p = el('i', null, 'sw'); p.style.setProperty('--sw', sw); dd.appendChild(p); }
          if (String(v).trim().toLowerCase() === 'sí') dd.classList.add('fi-yes');
          dd.appendChild(document.createTextNode(String(v)));
          d.appendChild(el('dt', k)); d.appendChild(dd); dl.appendChild(d);
        }
        dato('Tipo', a.tipoVehiculo); dato('Tipo de moto', a.tipoMoto); 
        dato('Color', a.color, a.sw); dato('Cilindrada', a.cilindrada); dato('Motor', a.tipoVehiculo === 'Moto' ? a.motor : null); dato('Potencia', a.potencia); dato('Tracción', a.traccion);
        dato('Versión', a.version); dato('Carrocería', a.carroceria); dato('Puertas', a.puertas); dato('Velocidades', a.numeroVelocidades);
        info.appendChild(dl);
        var yaVisible = { 'año': 1, 'marca': 1, 'modelo': 1, 'versión': 1, 'kilómetros': 1, 'color': 1, 'tipo de combustible': 1, 'combustible': 1, 'transmisión': 1, 'motor': 1, 'cilindrada': 1, 'tipo de carrocería': 1, 'carrocería': 1, 'puertas': 1, 'potencia': 1, 'control de tracción': 1, 'tipo de moto': 1, 'numero de velocidades': 1, 'número de velocidades': 1 };
        Object.keys(yaVisible).forEach(function (k) { yaVisible[norm(k)] = 1; });   /* norm() quita acentos: sin esto «Año», «Kilómetros», «Transmisión»… se repetían abajo */
        var extras = (a.atributosPublicados || []).filter(function (x) { return x && x.nombre && x.valor && !yaVisible[norm(x.nombre)]; });
        if (extras.length) {
          /* Bloque permanente: las características publicadas no se esconden detrás
             de un acordeón ni generan un estado visual distinto entre unidades. */
          var ep = el('section', null, 'fi-extra');
          ep.appendChild(el('h3', 'Características publicadas (' + extras.length + ')', 'fi-s-k'));
          var filasDe = function (arr) { var d = el('dl', null, 'fi-d'); arr.forEach(function (x) { var row = el('div'), val = el('dd', x.valor); if (String(x.valor).trim().toLowerCase() === 'sí') val.className = 'fi-yes'; row.appendChild(el('dt', x.nombre)); row.appendChild(val); d.appendChild(row); }); return d; };
          var VISIBLES = 8;   /* T3: la lista completa llega a ~50 filas; las primeras quedan a la vista y el resto se despliega con teclado o toque */
          ep.appendChild(filasDe(extras.slice(0, VISIBLES)));
          if (extras.length > VISIBLES) {
            var mas = el('details', null, 'fi-mas');
            mas.appendChild(el('summary', 'Ver todas las características (' + extras.length + ')'));
            mas.appendChild(filasDe(extras.slice(VISIBLES)));
            ep.appendChild(mas);
          }
          ep.appendChild(el('p', 'Datos declarados en la publicación de Mercado Libre; confirmalos con la agencia.', 'fi-n')); info.appendChild(ep);
        }
        if (a.nota) info.appendChild(el('p', a.nota, 'fi-n'));
        /* T3 · de dónde salen estos datos: fecha real del relevamiento y enlace a la publicación original */
        var urlOrig = typeof a.url === 'string' && /^https:\/\//.test(a.url) ? a.url : null;
        if (a.relevadoEl || urlOrig) {
          var fu = el('details', null, 'fi-fuente');
          fu.appendChild(el('summary', 'De dónde salen estos datos'));
          var fc = el('div', null, 'fi-fuente-c');
          fc.appendChild(el('p', 'Precio y características son los declarados en la publicación; no son el resultado de una inspección del vehículo.'));
          if (a.relevadoEl) fc.appendChild(el('p', 'Relevado el ' + fecha(a.relevadoEl) + '.'));
          fc.appendChild(el('p', 'Precio y disponibilidad pueden cambiar: confirmalos con Automotores 828 antes de decidir.'));
          if (urlOrig) fc.appendChild(enlace('Ver la publicación original', urlOrig, 'fi-lnk', true));
          fu.appendChild(fc); info.appendChild(fu);
        }

        /* Mini mapa de la agencia, no de la unidad; Leaflet lo inicia al acercarse a la ficha. */
        if (ctx.coordenadas && Number.isFinite(Number(ctx.coordenadas.lat)) && Number.isFinite(Number(ctx.coordenadas.lng))) {
          var miniMap = el('div', null, 'dr-map fi-map');
          miniMap.dataset.lat = String(ctx.coordenadas.lat); miniMap.dataset.lng = String(ctx.coordenadas.lng);
          miniMap.dataset.nombre = ctx.nombre || 'Automotores 828'; miniMap.dataset.dir = ctx.dir || '';
          miniMap.dataset.gmaps = ctx.maps || ''; miniMap.dataset.leaflet = 'js/vendor/leaflet.js'; miniMap.dataset.css = 'js/vendor/leaflet.css';
          var miniView = el('div', null, 'dr-map-v'); miniView.setAttribute('role', 'region');
          miniView.setAttribute('aria-label', 'Mapa de ubicación de la agencia; no indica la ubicación del vehículo');
          miniMap.appendChild(miniView); info.appendChild(miniMap);
        }

        /* acciones */
        var ac = el('div', null, 'fi-ac');
        ac.appendChild(enlace(a.vendida ? 'Consultar por similares' : ctx.wa ? 'Consultar por WhatsApp' : 'Consultar en Mercado Libre', hrefConsulta(a), 'btn p sm', true));
        ac.appendChild(enlace('Agendar visita y prueba de manejo', 'reserva.html' + (a.id != null ? '?unidad=' + encodeURIComponent(String(a.id)) : ''), 'btn sm', false));
        info.appendChild(ac);
        var ac2 = el('div', null, 'fi-ac2');
        /* WhatsApp ya es el botón principal de arriba (a.href); no se repite en la grilla */
        if (ctx.ig) ac2.appendChild(enlace('Instagram', ctx.ig, 'btn sm', true));
        if (a.hrefFin) ac2.appendChild(enlace('Consultar financiación', hrefU(a, 'fin') || a.hrefFin, 'btn sm', true));
        if (a.mail) ac2.appendChild(enlace('Enviar correo', a.mail, 'btn sm', false));
        if (ctx.tel) ac2.appendChild(enlace('Llamar' + (ctx.telTxt ? ' · ' + ctx.telTxt : ''), 'tel:' + ctx.tel, 'btn sm', false));
        var tas = enlace('Tasar mi usado', '#tu-usado', 'btn sm', false); tas.addEventListener('click', function (ev) { if (window.drTasarRef) window.drTasarRef(a); irAnclaDesdeFicha(ev, '#tu-usado'); });
        if ($('#tu-usado')) ac2.appendChild(tas);
        ac2.appendChild(boton('Compartir', 'btn sm', function () { compartir(a); }));
        var fvb = boton('♡ Guardar en favoritos', 'btn sm fav-fi', function () { favToggle(a); });
        fvb.setAttribute('data-fav', favKey(a)); fvb.setAttribute('aria-pressed', 'false'); ac2.appendChild(fvb); favSync();
        ac2.appendChild(boton('Copiar enlace', 'btn sm', function () { copiar((urlUnidad(a) || a.url), function (ok) { aviso(ok ? 'Enlace copiado' : 'No se pudo copiar el enlace'); }); }));
        var cb = cbs.filter(function (c) { return +c.value === a.i; })[0];
        if (cb) {
          var cm = boton(cb.checked ? 'Quitar de la comparación' : 'Agregar a comparar', 'btn sm', function () {
            cb.checked = !cb.checked; cb.dispatchEvent(new Event('change', { bubbles: true }));
            cm.textContent = cb.checked ? 'Quitar de la comparación' : 'Agregar a comparar';
          });
          cm.setAttribute('data-cmp-ficha', ''); ac2.appendChild(cm);
        }
        if (a.url) ac2.appendChild(enlace('Ver publicación original', a.url, 'btn sm', true));
        if (ctx.maps) ac2.appendChild(enlace('Cómo llegar', ctx.maps, 'btn sm', true));
        info.appendChild(ac2);

        var pie = el('div', null, 'fi-p');
        pie.appendChild(el('p', 'Consultá precio y disponibilidad actualizados por WhatsApp.', 'fi-n'));
        info.appendChild(pie);

        /* A3 · «Coordiná tu visita»: horarios reales (ctx.horario / drEstado) y WhatsApp prellenado con la unidad; no reserva ni confirma nada */
        if (!a.vendida && (ctx.wa || ctx.horario)) {
          var vi = el('section', null, 'fi-visit'); vi.setAttribute('aria-label', 'Coordiná tu visita');
          vi.appendChild(el('p', 'Coordiná tu visita', 'fi-s-k'));
          var evv = window.drEstado ? window.drEstado() : null;
          if (ctx.horario) {
            vi.appendChild(el('p', 'Horario de atención: ' + ctx.horario, 'fi-visit-h'));
            if (evv && evv.txt) { var ee = el('p', evv.txt, 'fi-visit-e'); ee.setAttribute('data-abierto', evv.abierto ? '1' : '0'); vi.appendChild(ee); }
          } else vi.appendChild(el('p', 'Consultá los horarios de atención por WhatsApp.', 'fi-visit-h'));
          if (ctx.dir) vi.appendChild(el('p', ctx.dir, 'fi-visit-a'));
          if (ctx.wa) {
            var desc = String(a.titulo || ''), nd = norm(desc);
            if (a.version && nd.indexOf(norm(a.version)) < 0) desc += ' ' + a.version;
            if (a.anio != null && nd.indexOf(String(a.anio)) < 0) desc += ' ' + a.anio;
            var msg = mensajeU(a, 'visita');
            var wv = enlace('Coordinar visita por WhatsApp', ctx.wa.split('?')[0] + '?text=' + encodeURIComponent(msg), 'btn p sm', true);
            wv.setAttribute('aria-label', 'Coordinar por WhatsApp una visita para ver ' + desc.trim());
            vi.appendChild(wv);
          }
          vi.appendChild(el('p', 'Es una consulta por WhatsApp: no reserva la unidad ni confirma la visita. La agencia te responde para acordar día y horario.', 'fi-n'));
          info.appendChild(vi);
        }

        /* A3.1 · Calculadora de cuotas: usa el precio publicado (editable); la tasa la carga la persona, no se inventa ninguna */
        var cal = el('section', null, 'fi-calc'); cal.setAttribute('aria-label', 'Calculadora de cuotas');
        cal.appendChild(el('p', 'Calculá una cuota estimada', 'fi-s-k'));
        var mon = a.precio && a.precio.moneda ? a.precio.moneda : 'ARS';
        var campo = function (id, rotulo, valor, modo, ayuda) {
          var w = el('div', null, 'fi-calc-f'), lb = el('label', rotulo); lb.setAttribute('for', id);
          var inp = el('input'); inp.id = id; inp.type = 'text'; inp.inputMode = modo; inp.autocomplete = 'off'; inp.value = valor;
          w.appendChild(lb); w.appendChild(inp);
          if (ayuda) { var h2 = el('small', ayuda); h2.id = id + '-h'; inp.setAttribute('aria-describedby', h2.id); w.appendChild(h2); }
          cal.appendChild(w); return inp;
        };
        var cgrid = el('div', null, 'fi-calc-g'); cal.appendChild(cgrid);
        var cPrecio = campo('fi-c-precio', 'Precio (' + mon + ')', a.precio && a.precio.monto > 0 ? fmt(a.precio.monto) : '', 'numeric');
        var cAnt = campo('fi-c-ant', 'Anticipo (' + mon + ')', a.anticipo && a.anticipo.monto != null && a.anticipo.moneda === mon ? fmt(a.anticipo.monto) : '', 'numeric');
        var cN = campo('fi-c-n', 'Cantidad de cuotas', '12', 'numeric');
        var cTna = campo('fi-c-tna', 'Tasa nominal anual (%)', '', 'decimal', 'Opcional. Si la dejás vacía, se calcula sin interés.');
        [cPrecio, cAnt, cN, cTna].forEach(function (c) { cgrid.appendChild(c.parentNode); });
        if (!(a.precio && a.precio.monto > 0)) cal.insertBefore(el('p', 'El precio de esta unidad no está publicado: ingresá un monto propio para simular.', 'fi-n'), cgrid);
        var cOut = el('div', null, 'fi-calc-r'); cOut.setAttribute('role', 'status'); cOut.setAttribute('aria-live', 'polite'); cal.appendChild(cOut);
        cal.appendChild(el('p', 'Resultado estimativo: depende de las condiciones reales de financiación, que se confirman con la agencia o la entidad. No constituye una oferta.', 'fi-n'));
        var num = function (v) { return parseInt(String(v).replace(/\D/g, ''), 10) || 0; };
        var calcular = function () {
          var P = num(cPrecio.value), A = num(cAnt.value), n = num(cN.value), tTxt = String(cTna.value).replace(',', '.').trim();
          var t = tTxt === '' ? 0 : Number(tTxt), err = '';
          if (!P) err = 'Ingresá un precio mayor a cero.';
          else if (A >= P) err = 'El anticipo debe ser menor al precio.';
          else if (n < 1 || n > 120) err = 'Ingresá entre 1 y 120 cuotas.';
          else if (!isFinite(t) || t < 0 || t > 500) err = 'La tasa debe estar entre 0 y 500 %.';
          cOut.textContent = '';
          if (err) { cOut.appendChild(el('p', err, 'fi-calc-e')); return; }
          var S = P - A, r = t / 100 / 12, q = r === 0 ? S / n : S * r / (1 - Math.pow(1 + r, -n));
          if (!isFinite(q) || q <= 0) { cOut.appendChild(el('p', 'No se pudo calcular con estos datos.', 'fi-calc-e')); return; }
          q = Math.round(q);
          var fila = function (k, v, g) { var d = el('div', null, g ? 'big' : ''); d.appendChild(el('span', k)); d.appendChild(el('strong', mon + ' ' + fmt(v))); cOut.appendChild(d); };
          fila('Cuota estimada (' + n + ' cuotas)', q, true);
          fila('Saldo a financiar', S);
          fila('Total estimado (anticipo + cuotas)', A + q * n);
        };
        [cPrecio, cAnt].forEach(function (c) { c.addEventListener('blur', function () { var v = num(c.value); c.value = v ? fmt(v) : ''; }); });
        [cPrecio, cAnt, cN, cTna].forEach(function (c) { c.addEventListener('input', calcular); });
        calcular(); info.appendChild(cal);

        /* T5 · «Comparalo con»: hasta 3 unidades elegidas solo con datos estructurados (mismo tipo, misma carrocería si la unidad la publica,
           misma moneda y precio dentro de ±50 %); nunca se convierte moneda ni se dice cuál es «mejor». Un toque abre el comparador con las dos.
           Sin candidata con criterio claro, el bloque no aparece. */
        var sim = [];
        if (pOk(a) && a.precio.monto > 0 && tx(a.tipoVehiculo) && porId(favKey(a))) {
          sim = list.filter(function (c) {
            if (c === a || c.vendida || !(c.media && c.media.length) || !pOk(c) || !(c.precio.monto > 0)) return false;
            if (c.tipoVehiculo !== a.tipoVehiculo) return false;
            if (tx(a.carroceria) && c.carroceria !== a.carroceria) return false;
            if (c.precio.moneda !== a.precio.moneda) return false;
            var rz = c.precio.monto / a.precio.monto; return rz >= 1 / 1.5 && rz <= 1.5;
          }).map(function (c) {
            return { c: c, d: Math.abs(Math.log(c.precio.monto / a.precio.monto)), y: a.anio != null && c.anio != null ? Math.abs(c.anio - a.anio) : 99 };
          }).sort(function (x, y) { return x.d - y.d || x.y - y.y || x.c.i - y.c.i; }).slice(0, 3);
        }
        if (sim.length) {
          var sb = el('section', null, 'fi-sim'); sb.setAttribute('aria-label', 'Comparalo con');
          sb.appendChild(el('p', 'Comparalo con', 'fi-s-k'));
          var sg = el('div', null, 'fi-sim-g');
          sim.forEach(function (o) {
            var c = o.c, w = el('div', null, 'fi-sim-w'), b = el('button', null, 'fi-sim-c'); b.type = 'button';
            b.setAttribute('aria-label', 'Comparar con ' + (c.titulo || c.modeloTxt) + ', ' + pTxt(c));
            var im = el('img'); im.src = c.media[0].thumb || c.media[0].card || c.media[0].src; im.alt = ''; im.loading = 'lazy'; im.decoding = 'async'; b.appendChild(im);
            var tx2 = el('span', null, 'fi-sim-t');
            tx2.appendChild(el('b', c.titulo || c.modeloTxt));
            tx2.appendChild(el('small', pTxt(c) + (c.anio != null ? ' · ' + c.anio : '')));
            b.appendChild(tx2);
            b.addEventListener('click', function () { compararCon(a, c, b); });
            var vf = el('button', 'Ver ficha', 'fi-sim-v'); vf.type = 'button'; vf.setAttribute('aria-label', 'Ver la ficha de ' + (c.titulo || c.modeloTxt));
            vf.addEventListener('click', function () { abrirFicha(list.indexOf(c), fOrigen); });
            w.appendChild(b); w.appendChild(vf); sg.appendChild(w);
          });
          sb.appendChild(sg); info.appendChild(sb);
        }
        var gu = el('section', null, 'fi-gu'); gu.setAttribute('aria-label', 'Guía para ver un usado');
        gu.appendChild(el('p', 'Para ver esta unidad con tranquilidad', 'fi-s-k'));
        var gl = el('ul', null, 'fi-gu-l');
        /* A3.2 · checklist interactivo: mismos textos; el avance vive solo en esta ficha abierta */
        var gItems = ['Pedí ver la documentación: título, cédula y verificación policial.',
         'Revisá que no registre deudas ni infracciones antes de transferir.',
         'Probalo en ruta: frenos, dirección, caja y ruidos.',
         'Consultá por el historial de mantenimiento y los dueños anteriores.'];
        var gProg = el('p', null, 'fi-gu-p'); gProg.setAttribute('role', 'status'); gProg.setAttribute('aria-live', 'polite');
        var gBar = el('span', null, 'fi-gu-b'), gFill = el('i'); gBar.appendChild(gFill);
        var gCuenta = function () {
          var ok = $$('input:checked', gl).length;
          gProg.textContent = ok + ' de ' + gItems.length + ' revisados';
          gFill.style.width = (ok / gItems.length * 100) + '%';
        };
        gItems.forEach(function (t, k) {
          var li = el('li'), lb = el('label'), cbx = el('input'); cbx.type = 'checkbox'; cbx.id = 'fi-gu-' + k;
          cbx.addEventListener('change', function () { li.classList.toggle('on', cbx.checked); gCuenta(); });
          lb.appendChild(cbx); lb.appendChild(el('span', t)); li.appendChild(lb); gl.appendChild(li);
        });
        gu.appendChild(gProg); gu.appendChild(gBar); gu.appendChild(gl); gCuenta(); info.appendChild(gu);

        /* A3.3 · preguntas de la unidad en acordeón (reutiliza details.dd; solo con textos ya publicados en el sitio) */
        var fq = el('section', null, 'fi-faq'); fq.setAttribute('aria-label', 'Preguntas sobre esta unidad');
        fq.appendChild(el('p', 'Preguntas frecuentes sobre esta unidad', 'fi-s-k'));
        [['¿Los datos y el precio están confirmados?', 'Son los datos publicados de la unidad. Consultá a la agencia para confirmar precio y disponibilidad antes de moverte.'],
         ['¿Aceptan permutas o financiación?', 'Permutas, consignaciones y financiación se resuelven por consulta con la agencia.'],
         ['¿Cómo coordino una visita?', 'Elegí un horario con «Agendar visita y prueba de manejo» y conocé la unidad con tiempo para revisarla.']].forEach(function (qa) {
          var dt = el('details', null, 'dd'), sm = el('summary', qa[0]);
          dt.appendChild(sm); dt.appendChild(el('p', qa[1])); fq.appendChild(dt);
        });
        info.appendChild(fq);

        /* panel de marca bajo la foto: logotipo, qué ofrece la agencia y cómo visitarla (no repite lo de la derecha) */
        var pn = el('aside', null, 'fi-s'); pn.setAttribute('aria-label', 'Sobre ' + (ctx.nombre || 'la agencia'));
        if (ctx.ciudad) pn.appendChild(el('p', 'Compra y venta de usados en ' + ctx.ciudad, 'fi-s-t'));
        if (ctx.servicios && ctx.servicios.length) {
          pn.appendChild(el('p', 'Qué ofrece la agencia', 'fi-s-k'));
          var sv = el('ul', null, 'fi-sv');
          ctx.servicios.forEach(function (t) { sv.appendChild(el('li', t)); });
          pn.appendChild(sv);
        }
        var vis = el('div', null, 'fi-vs');
        vis.appendChild(el('p', 'Visitanos', 'fi-s-k'));
        if (ctx.dir) vis.appendChild(el('p', ctx.dir, 'fi-s-a'));
        var ev = window.drEstado ? window.drEstado() : null, est = ev ? ev.txt : (ctx.horario || '');
        if (est) { var le = el('p', est, 'fi-e'); if (ev) le.setAttribute('data-abierto', ev.abierto ? '1' : '0'); vis.appendChild(le); }
        if ($('#horarios')) {
          var hl = enlace('Ver horarios y mapa', '#horarios', 'btn sm', false); hl.addEventListener('click', function (ev) { irAnclaDesdeFicha(ev, '#horarios'); });
          vis.appendChild(hl);
        }
        pn.appendChild(vis);
        var trust = el('section', null, 'fi-trust'); trust.setAttribute('aria-label', 'Cómo te ayudamos');
        trust.appendChild(el('p', 'Una compra más clara', 'fi-s-k'));
        var tl = el('ul', null, 'fi-sv');
        ['Fotos y datos publicados para comparar unidades.',
         'Consulta directa para confirmar precio y disponibilidad.',
         'Permutas, consignaciones y financiación por consulta.'].forEach(function (t) { tl.appendChild(el('li', t)); });
        trust.appendChild(tl); pn.appendChild(trust);
        var proof = el('section', null, 'fi-proof'); proof.setAttribute('aria-label', 'Claves de una compra segura');
        proof.appendChild(el('p', 'Claves de una compra segura', 'fi-s-k'));
        proof.appendChild(el('p', 'La información justa para decidir mejor, sin vueltas ni promesas vacías.', 'fi-proof-lead'));
        var proofGrid = el('div', null, 'fi-proof-g');
        [['01', 'Datos visibles', 'Año, kilometraje y características publicados para comparar con criterio.'],
         ['02', 'Atención directa', 'Confirmá precio y disponibilidad con la agencia antes de moverte.'],
         ['03', 'Visita coordinada', 'Elegí un horario y conocé la unidad con tiempo para revisarla.']].forEach(function (item) {
          var card = el('article', null, 'fi-proof-c');
          var lgw = el('b', null, 'fi-proof-logo'); lgw.setAttribute('aria-hidden', 'true');
          var lgi = document.createElement('img'); lgi.src = 'images/logo-circle.png'; lgi.alt = ''; lgi.width = 60; lgi.height = 60; lgi.decoding = 'async';
          lgw.appendChild(lgi); card.appendChild(lgw);
          card.appendChild(el('strong', item[1]));
          card.appendChild(el('span', item[2]));
          proofGrid.appendChild(card);
        });
        proof.appendChild(proofGrid); pn.appendChild(proof);
        var path = el('section', null, 'fi-path'); path.setAttribute('aria-label', 'Tu próxima visita');
        path.appendChild(el('p', 'Tu próxima visita', 'fi-s-k'));
        var steps = el('ol', null, 'fi-path-l');
        ['Elegí una unidad y revisá sus datos publicados.',
         'Escribinos para confirmar precio y disponibilidad.',
         'Coordiná tu visita en Monte Grande con la agencia.'].forEach(function (t) { steps.appendChild(el('li', t)); });
        path.appendChild(steps); pn.appendChild(path);
        left.appendChild(pn);
        g.appendChild(info);
        fdlg.appendChild(x); fdlg.appendChild(g);
        document.documentElement.classList.add('has-dlg');
        if (typeof fdlg.showModal === 'function') { if (!fdlg.open) fdlg.showModal(); } else fdlg.setAttribute('open', '');
        /* siempre desde el principio: el diálogo se reutiliza y recordaba el scroll de la ficha anterior */
        var arriba = function () { fdlg.scrollTop = 0; fdlg.scrollLeft = 0; [].forEach.call(fdlg.querySelectorAll('*'), function (n) { if (n.scrollTop) n.scrollTop = 0; }); };
        arriba(); window.requestAnimationFrame(arriba); window.setTimeout(arriba, 80);
        x.focus({ preventScroll: true });
        /* A1: la columna más corta queda fija (sticky) mientras se recorre la más larga, para que no quede un hueco debajo */
        if (fRO) { fRO.disconnect(); fRO = null; }
        var pegar = function () {
          left.style.position = ''; left.style.top = ''; info.style.position = ''; info.style.top = '';
          if (!fdlg.open || window.innerWidth <= 800 || getComputedStyle(g).gridTemplateColumns.split(' ').length < 2) return;
          var hl = left.offsetHeight, hi = info.offsetHeight;
          if (hl === hi) return;
          var s = hl < hi ? left : info;
          s.style.position = 'sticky';
          s.style.top = Math.min(0, fdlg.clientHeight - s.offsetHeight) + 'px';
        };
        pegar();
        if (window.ResizeObserver) { fRO = new ResizeObserver(pegar); fRO.observe(left); fRO.observe(info); fRO.observe(fdlg); }
        else window.addEventListener('resize', pegar);
        /* transición tarjeta → ficha (js/ficha-flip.js); si ese archivo no carga, la ficha abre como siempre */
        if (window.drFichaFlip) window.drFichaFlip.open(fdlg, fOrigen);
      }
      $$('[data-share]', ul).forEach(function (b) { b.hidden = false; });

      deUrl();
      abrirPanel(false);   /* los filtros arrancan cerrados: se abren solo al tocar «Mostrar filtros» */
      tg.setAttribute('aria-controls', 'fx-body');
      tools.hidden = false;
      aplicar(false);
      /* T1: con el catálogo ya listo, se atiende #unidad=<id> (apertura directa, recarga) y se siguen Atrás/Adelante */
      if (!urlListo) { urlListo = true; window.addEventListener('popstate', urlSincronizar); window.addEventListener('hashchange', urlSincronizar); }
      urlSincronizar();
    }
  })();

  /* ---------- 1b) «Cómo comprar»: la sección se anima al llegar (sin JavaScript queda ya salido) ---------- */
  (function () {
    var r = $('.ruta');
    if (!r || !('IntersectionObserver' in window) || (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches)) return;
    r.classList.add('js');
var io = new IntersectionObserver(function (es) {
  if (es.some(function (e) { return e.isIntersecting; })) { r.classList.add('on'); io.unobserve(r); io.disconnect(); }
}, { threshold: 0.35 });
    io.observe(r);
  })();

  /* ---------- 2) formularios que arman un mensaje ----------
     Tu usado y Tu búsqueda: campos con ejemplos, chips, formato de miles, progreso (el velocímetro avanza a medida que completás),
     vista previa del mensaje como burbuja, envío por WhatsApp con el texto ya armado y, en la búsqueda,
     coincidencias en vivo con el catálogo publicado (lee js/units.min.json). Nada se envía ni se guarda desde el sitio. */
  (function () {
    var STOCK = [];
    var pendientes = [];   /* repintados que hay que hacer cuando llegan los datos del catálogo */
    var norm = function (t) { return String(t == null ? '' : t).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim(); };
    var miles = function (v) { var d = String(v).replace(/\D/g, '').slice(0, 10); return d ? Number(d).toLocaleString('es-AR') : ''; };
    var soloNum = function (v) { return parseInt(String(v).replace(/\D/g, ''), 10) || 0; };

    /* select de unidades del catálogo: se puebla apenas llegan los datos */
    function poblarSelects() {
      $$('select[data-stock]').forEach(function (s) {
        if (s.options.length > 1) return;
        STOCK.forEach(function (a) { var o = el('option', a.titulo + (a.anio ? ' · ' + a.anio : '')); o.value = a.titulo + (a.anio ? ' ' + a.anio : ''); s.appendChild(o); });
      });
    }
    catData().then(function (d) {
      STOCK = d || [];
      poblarSelects();
      pendientes.forEach(function (fn) { fn(); });
    });

    /* Checklist de guía: persistencia aislada y fallo seguro si localStorage está bloqueado. */
    (function () {
      var items = $$('.gd [data-guide-item]'), progress = $('[data-guide-progress]');
      if (!items.length || !progress) return;
      var key = 'dr828-guide-checklist-v1', saved = {};
      try { saved = JSON.parse(localStorage.getItem(key) || '{}') || {}; } catch (e) {}
      function paint() {
        var n = items.filter(function (i) { return i.checked; }).length;
        progress.textContent = n + ' de ' + items.length + ' puntos seleccionados';
      }
      items.forEach(function (item) {
        item.checked = saved[item.getAttribute('data-guide-item')] === true;
        item.addEventListener('change', function () {
          saved[item.getAttribute('data-guide-item')] = item.checked;
          try { localStorage.setItem(key, JSON.stringify(saved)); } catch (e) {}
          paint();
        });
      });
      paint();
    }());

    /* A4 · «Tasá tu usado» desde una ficha: la unidad que se estaba viendo se carga en el campo existente
       «¿Alguna unidad te interesa?» (referencia de la consulta, editable). No toca «Marca y modelo» ni «Año», que son
       los del usado de la persona, y no pisa lo que ya eligió. Entrando directo a la sección no cambia nada. */
    window.drTasarRef = function (a) {
      var sel = $('#u-un'); if (!sel || !a || !a.titulo || sel.value) return;
      var v = a.titulo + (a.anio ? ' ' + a.anio : ''), ok = [].slice.call(sel.options).some(function (o) { return o.value === v; });
      if (!ok) { var o = el('option', v); o.value = v; sel.appendChild(o); }
      sel.value = v;
      var nota = $('#u-un-ref');
      if (!nota) { nota = el('small', 'Unidad de referencia: la que estabas viendo. Podés cambiarla; los datos de tu usado se completan arriba.', 'fi-n'); nota.id = 'u-un-ref'; sel.parentNode.appendChild(nota); }
      sel.dispatchEvent(new Event('change', { bubbles: true }));
    };

    $$('form[data-msg]').forEach(function (f) {
      var vista = $('.msg-v', f), estado = $('.msg-s', f), btnCopiar = $('[data-copiar-msg]', f), wa = $('[data-wa-msg]', f);
      var lastMessage = '', messageBox = vista;
      var bub = $('[data-bub-b]', f), progT = $('[data-prog-t]', f), progB = $('[data-prog-b]', f), sol = $('[data-sun]', f);
      var panel = $('[data-match]', f), mH = $('[data-match-h]', f), mL = $('[data-match-l]', f);
      var byId = function (id) { return f.querySelector('#' + id); };
      var val = function (id) { var c = byId(id); return c ? (c.value || '').trim() : ''; };

      /* ----- texto del mensaje ----- */
      function lineas() {
        var out = [];
        $$('[data-lbl]', f).forEach(function (c) {
          var v = (c.value || '').replace(/\s+/g, ' ').trim();
          if (!v) return;
          var pre = c.getAttribute('data-pre');
          if (pre) { var p = $(pre, f); if (p && p.value) v = p.value + ' ' + v; }
          out.push([c.getAttribute('data-lbl'), v]);
        });
        return out;
      }
      function texto() {
        return [f.getAttribute('data-intro') || 'Hola!'].concat(lineas().map(function (l) { return '• ' + l[0] + ': ' + l[1]; })).join('\n');
      }

      /* ----- burbuja de vista previa ----- */
      var ultBub = null;
      function pintarBurbuja() {
        if (!bub) return;
        var clave = texto();
        if (clave === ultBub) return;
        ultBub = clave;
        bub.textContent = '';
        bub.appendChild(el('p', f.getAttribute('data-intro') || 'Hola!', 'cv-b-i'));
        var ls = lineas();
        if (!ls.length) bub.appendChild(el('p', 'Completá los datos y tu mensaje aparece acá.', 'cv-b-v'));
        ls.forEach(function (l) { var d = el('p', null, 'cv-b-l'); d.appendChild(el('b', l[0])); d.appendChild(document.createTextNode(' ' + l[1])); bub.appendChild(d); });
        bub.appendChild(el('span', 'ahora ✓✓', 'cv-b-h'));
      }

      /* ----- progreso: el velocímetro avanza a medida que completás ----- */
      var trk = $$('[data-p]', f);
      function progreso() {
        var req = $$('[required]', f);
        var fields = req.length ? req : trk;
        var valid = fields.filter(function (c) { return (c.value || '').trim() !== '' && (!c.checkValidity || c.checkValidity()); }).length;
        var n = fields.length ? valid : 0, p = fields.length ? n / fields.length : 0;
        if (sol) sol.style.setProperty('--p', p.toFixed(3));
        if (progB) progB.style.width = Math.round(p * 100) + '%';
        if (progT) progT.textContent = !n ? 'Sin datos obligatorios todavía' : n === fields.length ? 'Datos obligatorios completos' : n + ' de ' + fields.length + ' campos obligatorios';
        if (sol) sol.classList.toggle('is-full', n === fields.length && n > 0);
      }

      /* ----- WhatsApp con el mensaje ya armado ----- */
      function actualizarWa() {
        if (!wa) return;
        var num = wa.getAttribute('data-wa');
        wa.href = 'https://wa.me/' + num + '?text=' + encodeURIComponent(texto());
      }

      /* ----- coincidencias con el catálogo (solo en la búsqueda) ----- */
      function coincidencias() {
        var q = norm(val('b-mm')).split(/\s+/).filter(Boolean), an = soloNum(val('b-an')), tr = norm(val('b-tr'));
        var co = val('b-co').split(', ').filter(Boolean).map(norm), ca = val('b-ca').split(', ').filter(Boolean).map(norm);
        var pr = soloNum(val('b-pr')), mo = val('b-mo') === 'US$' ? 'USD' : 'ARS';
        var hay = q.length || an || tr || co.length || ca.length || pr;
        if (!hay) return null;
        return STOCK.filter(function (a) {
          var t = norm([a.marca, a.modelo, a.version, a.titulo].join(' '));
          if (q.length && !q.every(function (w) { return t.indexOf(w) > -1; })) return false;
          if (an && (a.anio == null || a.anio < an)) return false;
          if (tr && norm(a.transmision) !== tr) return false;
          if (co.length && co.indexOf(norm(a.combustible)) < 0) return false;
          if (ca.length && ca.indexOf(norm(a.carroceria)) < 0) return false;
          if (pr && a.monto != null && a.precio && a.precio.moneda === mo && a.monto > pr) return false;
          return true;
        });
      }
      var ultMatch = null;
      function pintarMatch() {
        if (!panel) return;
        var clave = ['b-mm', 'b-an', 'b-tr', 'b-co', 'b-ca', 'b-pr', 'b-mo'].map(val).join('|');
        if (clave === ultMatch) return;
        ultMatch = clave;
        var r = coincidencias();
        mL.textContent = '';
        panel.classList.toggle('has-r', !!(r && r.length));
        if (r === null) { mH.textContent = 'Escribí una marca o modelo para ver qué hay publicado'; return; }
        if (!r.length) { mH.textContent = 'Hoy no hay una coincidencia publicada en esta web. Podés enviar la consulta igual.'; return; }
        mH.textContent = r.length === 1 ? '1 unidad publicada coincide con lo que buscás' : r.length + ' unidades publicadas coinciden con lo que buscás';
        r.slice(0, 3).forEach(function (a) {
          var li = el('li', null, 'cv-m'), ph = el('span', null, 'cv-m-p');
          if (a.media && a.media[0]) { var im = el('img'); im.src = a.media[0].src; im.alt = ''; im.loading = 'lazy'; im.decoding = 'async'; ph.appendChild(im); }
          var tx = el('span', null, 'cv-m-t');
          tx.appendChild(el('b', a.titulo));
          tx.appendChild(el('small', [a.anio, a.km != null ? a.km.toLocaleString('es-AR') + ' km' : null, a.transmision, a.combustible].filter(Boolean).join(' · ')));
          var ln = el('a', 'Consultar', 'cv-m-a'); ln.href = hrefConsulta(a); ln.target = '_blank'; ln.rel = 'noopener noreferrer'; ln.setAttribute('aria-label', 'Consultar por ' + a.titulo);
          li.appendChild(ph); li.appendChild(tx); li.appendChild(ln); mL.appendChild(li);
        });
        if (r.length > 3) mL.appendChild(el('li', 'y ' + (r.length - 3) + ' más en «Nuestras unidades»', 'cv-m-more'));
      }

      /* Un solo repintado por cuadro de animación (antes cada tecla reconstruía todo) y las coincidencias esperan
         a que dejes de escribir. */
      var raf = 0, tMatch = 0;
      function ahoraTodo() {
        raf = 0;
        if (vista) {
          var freshMessage = texto();
          if (vista.value !== freshMessage) {
            vista.value = freshMessage;
            if (!window.matchMedia || !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
              vista.classList.remove('msg-updated'); void vista.offsetWidth; vista.classList.add('msg-updated');
              window.setTimeout(function () { vista.classList.remove('msg-updated'); }, 320);
            }
          }
        }
        pintarBurbuja(); progreso(); actualizarWa();
        if (panel) { clearTimeout(tMatch); tMatch = setTimeout(pintarMatch, 180); }
      }
      function todo() { if (!raf) raf = requestAnimationFrame(ahoraTodo); }

      /* ----- chips (selección simple o múltiple) ----- */
      function chipsDe(g) { return $$('.cv-chip', g); }
      function syncChips(hid) {
        var g = $('[data-chips][data-target="' + hid.id + '"]', f); if (!g) return;
        var vs = (hid.value || '').split(', ').filter(Boolean);
        chipsDe(g).forEach(function (c) { var on = vs.indexOf(c.getAttribute('data-v')) > -1; c.classList.toggle('is-on', on); c.setAttribute('aria-pressed', on ? 'true' : 'false'); });
      }
      $$('[data-chips]', f).forEach(function (g) {
        var hid = byId(g.getAttribute('data-target')), multi = g.hasAttribute('data-multi');
        chipsDe(g).forEach(function (c) {
          c.addEventListener('click', function () {
            var v = c.getAttribute('data-v'), vs = (hid.value || '').split(', ').filter(Boolean), k = vs.indexOf(v);
            if (multi) { if (k > -1) vs.splice(k, 1); else vs.push(v); } else vs = k > -1 ? [] : [v];
            hid.value = vs.join(', '); syncChips(hid); todo();
          });
        });
      });
      /* moneda del presupuesto */
      $$('[data-cur]', f).forEach(function (b) {
        b.addEventListener('click', function () {
          $$('[data-cur]', f).forEach(function (x) { var on = x === b; x.classList.toggle('is-on', on); x.setAttribute('aria-pressed', on ? 'true' : 'false'); });
          var h = byId('b-mo'); if (h) h.value = b.getAttribute('data-cur'); todo();
        });
      });
      /* sugerencias rápidas (años) */
      $$('[data-set]', f).forEach(function (b) {
        b.addEventListener('click', function () { var c = byId(b.getAttribute('data-set')); if (c) { c.value = b.getAttribute('data-v'); c.dispatchEvent(new Event('input', { bubbles: true })); } });
      });
      /* formatos */
      $$('[data-fmt="miles"]', f).forEach(function (c) { c.addEventListener('input', function () { var n = miles(c.value); if (c.value !== n) c.value = n; }); });
      $$('[data-anio]', f).forEach(function (c) { c.addEventListener('input', function () { var n = c.value.replace(/\D/g, '').slice(0, 4); if (c.value !== n) c.value = n; }); });
      $$('textarea[maxlength]', f).forEach(function (t) {
        var n = t.parentNode.querySelector('[data-cnt]');
        var u = function () { if (n) n.textContent = t.value.length + ' / ' + t.getAttribute('maxlength'); };
        t.addEventListener('input', u); u();
      });

      f.addEventListener('input', todo, { passive: true });
      f.addEventListener('change', todo, { passive: true });

      /* ----- ejemplo y limpiar ----- */
      var bEj = $('[data-ejemplo]', f), bLi = $('[data-limpiar]', f);
      function poner(id, v) {
        var c = byId(id); if (!c) return;
        c.value = v;
        if (c.type === 'hidden') { syncChips(c); if (id === 'b-mo') $$('[data-cur]', f).forEach(function (x) { var on = x.getAttribute('data-cur') === v; x.classList.toggle('is-on', on); x.setAttribute('aria-pressed', on ? 'true' : 'false'); }); }
        c.dispatchEvent(new Event('input', { bubbles: true }));
      }
      if (bEj) {
        bEj.hidden = false;
        bEj.addEventListener('click', function () {
          var d = {}; try { d = JSON.parse(bEj.getAttribute('data-ejemplo')); } catch (e) {}
          Object.keys(d).forEach(function (k) { poner(k, d[k]); });
          estado.textContent = 'Es un ejemplo para que veas cómo queda: cambiá los datos por los tuyos.';
        });
      }
      if (bLi) {
        bLi.hidden = false;
        bLi.addEventListener('click', function () {
          f.reset();
          $$('[data-chips] input, input[type="hidden"]', f).forEach(function (h) { if (h.id !== 'b-mo') h.value = ''; });
          $$('[data-chips]', f).forEach(function (g) { chipsDe(g).forEach(function (c) { c.classList.remove('is-on'); c.setAttribute('aria-pressed', 'false'); }); });
          $$('[data-cur]', f).forEach(function (x) { var on = x.getAttribute('data-cur') === '$'; x.classList.toggle('is-on', on); x.setAttribute('aria-pressed', on ? 'true' : 'false'); });
          var mo = byId('b-mo'); if (mo) mo.value = '$';
          $$('textarea[maxlength]', f).forEach(function (t) { var n = t.parentNode.querySelector('[data-cnt]'); if (n) n.textContent = '0 / ' + t.getAttribute('maxlength'); });
          estado.textContent = '';
          todo();
        });
      }

      /* ----- enviar por WhatsApp (valida el campo obligatorio) ----- */
      if (wa) wa.addEventListener('click', function (e) {
        actualizarWa();
        if (f.checkValidity && !f.checkValidity()) { e.preventDefault(); f.reportValidity(); estado.textContent = 'Completá el campo obligatorio para armar el mensaje.'; return; }
        estado.textContent = 'Se abre WhatsApp con tu mensaje listo para enviar.';
      });

      /* ----- copiar ----- */
      f.addEventListener('submit', function (e) {
        e.preventDefault();
        var t = texto(); if (vista) vista.value = t;
        copiar(t, function (ok) {
          estado.textContent = ok ? 'Mensaje copiado. Pegalo en una conversación con la agencia (WhatsApp, Facebook o Instagram).' : 'No se pudo copiar solo: seleccioná el mensaje de arriba, copialo y pegalo en una conversación con la agencia.';
        });
      });
      if (btnCopiar) btnCopiar.hidden = false;
      todo();
      /* cuando llegan los datos del catálogo, se repinta la lista de coincidencias */
      pendientes.push(function () { ultMatch = null; todo(); });
    });
  })();

  /* ---------- buscador en preguntas y glosario ---------- */
  (function () {
    var root = $('[data-qa]'), input = $('#qa-search'), status = $('[data-qa-search-status]');
    if (!root || !input) return;
    var tabs = $$('.qa-tabs [role="tab"]', root), panels = $$('.qa-p[role="tabpanel"]', root);
    function select(panel) {
      panels.forEach(function (p) { p.hidden = p !== panel; });
      tabs.forEach(function (t) { var active = t.getAttribute('aria-controls') === panel.id; t.setAttribute('aria-selected', active ? 'true' : 'false'); t.tabIndex = active ? 0 : -1; });
    }
    function applySearch() {
      var term = input.value.trim().toLocaleLowerCase(), count = 0;
      panels.forEach(function (panel) {
        var found = 0;
        $$('details', panel).forEach(function (row) {
          var match = !term || row.textContent.toLocaleLowerCase().indexOf(term) !== -1;
          row.hidden = !match; if (match) found++;
        });
        panel.dataset.emptySearch = term && !found ? 'true' : 'false';
        count += found;
      });
      if (status) status.textContent = term ? (count ? count + ' resultados.' : 'No se encontraron coincidencias.') : '';
      if (term) {
        var active = panels.find(function (p) { return Array.from(p.querySelectorAll('details')).some(function (d) { return !d.hidden; }); });
        if (active) select(active);
      }
    }
    tabs.forEach(function (tab) { tab.addEventListener('click', function () { var panel = $('#' + tab.getAttribute('aria-controls')); if (panel) select(panel); }); });
    tabs.forEach(function (tab, index) { tab.addEventListener('keydown', function (e) { if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return; e.preventDefault(); var next = tabs[(index + (e.key === 'ArrowRight' ? 1 : tabs.length - 1)) % tabs.length]; next.focus(); next.click(); }); });
    input.addEventListener('input', applySearch);
    panels.forEach(function (panel) { panel.querySelectorAll('details').forEach(function (row) { if (row.id) row.setAttribute('tabindex', '-1'); }); });
    var hash = location.hash.slice(1), target = hash && document.getElementById(hash);
    if (target && root.contains(target) && target.tagName === 'DETAILS') { select(target.closest('[role="tabpanel"]')); target.open = true; requestAnimationFrame(function () { target.scrollIntoView({ block: 'center' }); }); }
  }());

  /* ---------- copiar dirección ---------- */
  $$('[data-copiar]').forEach(function (b) {
    b.hidden = false;
    b.addEventListener('click', function () {
      var antes = b.textContent;
      copiar(b.getAttribute('data-copiar'), function (ok) {
        b.textContent = ok ? 'Dirección copiada' : 'No se pudo copiar';
        setTimeout(function () { b.textContent = antes; }, 2200);
      });
    });
  });
})();
