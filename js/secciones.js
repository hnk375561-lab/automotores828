/* Automotores 828 · js/secciones.js
   1) Catálogo: filtros, orden y comparador de hasta 4 unidades (lee el JSON de #cat-data, que genera scripts/build-index.mjs desde data/vehicles.json).
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

  /* ---------- 1) catálogo: filtros, orden y comparador ----------
     Lee el JSON de #cat-data (lo genera scripts/build-index.mjs desde data/vehicles.json) y trabaja sobre las
     fichas ya escritas en #cars. El estado de los filtros vive en la URL (?marca=Renault&anio_d=2017...). */
  (function () {
    var tools = $('#tools'), ul = $('#cars'), dataEl = $('#cat-data'), sinres = $('#sinres');
    if (!tools || !ul || !dataEl) return;
    var list = [];
    try { list = JSON.parse(dataEl.textContent); } catch (e) {}
    if (list.length < 2) return;

    var fmt = function (n) { return n.toLocaleString('es-AR'); };
    var norm = function (t) { return String(t).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim(); };
    var peso = function (a) { return (a.precio.moneda === 'USD' ? 'US$ ' : '$ ') + fmt(a.precio.monto); };
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
      a.pub = a.publicado ? Math.floor((Date.now() - new Date(a.publicado + 'T12:00:00').getTime()) / 864e5) : null;
      a.modeloTxt = a.titulo.indexOf(a.marca + ' ') === 0 ? a.titulo.slice(a.marca.length + 1) : a.titulo;
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
    GR.push(rango('precio', 'Precio en ARS', 3, function (a) { return a.monto; }, function (d) { return pasos(d, 2500000); }, function (n) { return '$ ' + fmt(n); }, 'Este rango solo incluye publicaciones en pesos; usá el filtro Moneda para ver las cotizadas en dólares.'));
    GR.push(porValor('moneda', 'select', 'Moneda', 2, function (a) { return a.precio && a.precio.moneda; }, null, { todos: 'Todas las monedas' }));
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
    GR = GR.filter(function (g) { return g.tipo === 'chips' ? g.ops.length > 0 : g.tipo === 'select' ? g.ops.length > 1 : g.vals.length > 1; });

    var ORDEN = [['', 'Orden de publicación'], ['p-asc', 'Precio: menor a mayor'], ['p-desc', 'Precio: mayor a menor'], ['a-desc', 'Año: más nuevo primero'], ['a-asc', 'Año: más antiguo primero'], ['k-asc', 'Kilometraje: menor primero'], ['k-desc', 'Kilometraje: mayor primero'], ['m-asc', 'Marca: de la A a la Z']];
    if (!list.some(function (a) { return a.monto != null; })) ORDEN = ORDEN.filter(function (o) { return o[0].charAt(0) !== 'p'; });
    if (list.some(function (a) { return a.publicado != null; })) ORDEN.splice(1, 0, ['f-desc', 'Publicación: más reciente primero'], ['f-asc', 'Publicación: más antigua primero']);
    var KEY = { f: function (a) { return a.publicado; }, p: function (a) { return st.moneda === 'USD' && a.precio && a.precio.moneda === 'USD' ? a.precio.monto : a.monto; }, a: function (a) { return a.anio; }, k: function (a) { return a.km; }, m: function (a) { return a.marca; } };

    /* ----- estado ----- */
    var st = { q: '', orden: '' };
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
      if (!sinQ) {
        var ws = norm(st.q).split(/\s+/).filter(Boolean);
        if (!ws.every(function (w) { return a.t.indexOf(w) > -1; })) return false;
      }
      return GR.every(function (g) { return g.k === salto || pasa(a, g); });
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

    var refs = {};   /* k -> { g, inputs:[{o,input,n}], select, note, d, h } */
    GR.forEach(function (g) {
      var fs = el('fieldset', null, 'fg s' + g.s), lg = el('legend', g.t), r = refs[g.k] = { g: g };
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
        sl.addEventListener('change', function () { st[g.k] = sl.value; aplicar(true); });
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
          if (st[g.k]) out.push({ t: g.t + ': ' + st[g.k], quitar: function () { st[g.k] = ''; } });
        } else {
          var d = st[g.k + 'D'], h = st[g.k + 'H'];
          if (d === '' && h === '') return;
          var txt = textoRango(g, d, h);
          out.push({ t: g.t + ': ' + txt, quitar: function () { st[g.k + 'D'] = ''; st[g.k + 'H'] = ''; } });
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
      var n = 0, quitados = podar();
      if (quitados.length) {
        ajuste.textContent = 'Se quitó ' + quitados.map(function (t) { return '«' + t + '»'; }).join(', ') + ' porque ninguna unidad coincide con esa combinación.';
        ajuste.hidden = false;
      } else { ajuste.textContent = ''; ajuste.hidden = true; }
      list.forEach(function (a) {
        var ok = coincide(a, null), li = items[a.i];
        li.hidden = !ok;
        if (ok) { li.style.removeProperty('display'); n++; } else li.style.setProperty('display', 'none', 'important');
      });
      list.slice().sort(ordenar).forEach(function (a) { ul.appendChild(items[a.i]); });
      ul.hidden = n === 0; if (sinres) sinres.hidden = n > 0;
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
          if (r.note) r.note.hidden = st[g.k + 'D'] === '' && st[g.k + 'H'] === '';
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
      history.replaceState(null, '', u.pathname + u.search + u.hash);
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

    q.addEventListener('input', function () { st.q = q.value; aplicar(true); });
    q.addEventListener('search', function () { st.q = q.value; aplicar(true); });
    ord.addEventListener('change', function () { st.orden = ord.value; aplicar(true); });
    lim.addEventListener('click', function () {
      st.q = ''; q.value = ''; st.orden = '';
      GR.forEach(function (g) {
        if (g.tipo === 'chips') st[g.k] = []; else if (g.tipo === 'select') st[g.k] = ''; else { st[g.k + 'D'] = ''; st[g.k + 'H'] = ''; }
      });
      aplicar(true); q.focus();
    });
    var nAct = 0;
    function etiquetaTg() { tg.textContent = (body.hidden ? 'Mostrar filtros' : 'Ocultar filtros') + (nAct ? ' (' + nAct + ')' : ''); tg.classList.toggle('is-on', !body.hidden); }
    function abrirPanel(si) { body.hidden = !si; tools.classList.toggle('is-open', !!si); tg.setAttribute('aria-expanded', si ? 'true' : 'false'); etiquetaTg(); }
    tg.addEventListener('click', function () { abrirPanel(body.hidden); if (!body.hidden) { try { body.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); } catch (e) {} } });

    /* ----- comparador: hasta 4 unidades, desde un botón en cada ficha ----- */
    var MAX = 4, cmp = [], tray = null, dlg = null;
    var cbs = $$('.car-c input', ul);
    $$('.car-c', ul).forEach(function (l) { l.hidden = false; });
    function sinMarca(a) { return a.modeloTxt; }
    function pintarBandeja() {
      cbs.forEach(function (c) { var on = cmp.indexOf(+c.value) > -1; c.checked = on; c.disabled = !on && cmp.length >= MAX; });
      document.body.classList.toggle('has-tray', cmp.length > 0);
      if (!cmp.length) { if (tray) tray.hidden = true; return; }
      if (!tray) {
        tray = el('div', null, 'tray'); tray.setAttribute('role', 'region'); tray.setAttribute('aria-label', 'Unidades para comparar');
        document.body.appendChild(tray);
      }
      tray.hidden = false; tray.textContent = '';
      var w = el('div', null, 'w'), lst = el('ul', null, 'tray-l');
      cmp.forEach(function (i) {
        var a = list[i], li = el('li', null, 'tray-i'), b = el('button', '×'); b.type = 'button'; b.setAttribute('aria-label', 'Quitar de la comparación: ' + a.titulo);
        if (a.media && a.media[0]) { var th = el('img', null, 'tray-th'); th.src = a.media[0].thumb || a.media[0].card || a.media[0].src; th.alt = ''; th.decoding = 'async'; li.appendChild(th); }
        li.appendChild(el('span', a.marca + ' ' + a.modeloTxt)); li.appendChild(b); lst.appendChild(li);
        b.addEventListener('click', function () { cmp.splice(cmp.indexOf(i), 1); pintarBandeja(); });
      });
      var ver = el('button', cmp.length < 2 ? 'Elegí una más para comparar' : 'Comparar ' + cmp.length + ' unidades', 'btn p sm'); ver.type = 'button'; ver.disabled = cmp.length < 2;
      var vac = el('button', 'Vaciar', 'btn sm'); vac.type = 'button';
      ver.addEventListener('click', abrirComparacion);
      vac.addEventListener('click', function () { cmp = []; pintarBandeja(); });
      w.appendChild(lst); w.appendChild(ver); w.appendChild(vac); tray.appendChild(w);
    }
    cbs.forEach(function (c) {
      c.addEventListener('change', function () {
        var i = +c.value, k = cmp.indexOf(i);
        if (c.checked && k < 0 && cmp.length < MAX) cmp.push(i);
        if (!c.checked && k > -1) cmp.splice(k, 1);
        pintarBandeja();
      });
    });

    function mejor(sel, f, dir) {
      var v = sel.map(f).filter(function (x) { return x != null; });
      if (v.length < 2) return null;
      var mn = Math.min.apply(null, v), mx = Math.max.apply(null, v);
      return mn === mx ? null : (dir < 0 ? mn : mx);
    }
    function abrirComparacion() {
      var sel = cmp.map(function (i) { return list[i]; });
      if (sel.length < 2) return;
      if (!dlg) {
        dlg = el('dialog', null, 'cmp cmp-lux'); dlg.setAttribute('aria-labelledby', 'cmp-ttl');
        dlg.addEventListener('click', function (e) { if (e.target === dlg) dlg.close(); });
        dlg.addEventListener('close', function () { document.documentElement.classList.remove('has-dlg'); });
        document.body.appendChild(dlg);
      }
      var soloDif = dlg.classList.contains('solo-dif');
      dlg.textContent = '';
      dlg.style.setProperty('--n', sel.length);

      /* ----- encabezado: bandera, título y controles ----- */
      var hd = el('div', null, 'cmp-hd'), tt = el('div', null, 'cmp-tt');
      var sun = el('span', null, 'cmp-flag'); sun.setAttribute('aria-hidden', 'true'); sun.innerHTML = '<svg viewBox="0 0 64 36" focusable="false"><path d="M8 3v32"/><path d="M8 6h46v20H8z"/><path d="M8 16h46M19.5 6v20M31 6v20M42.5 6v20"/></svg>';
      tt.appendChild(sun);
      var tx = el('div', null, 'cmp-tx');
      tx.appendChild(el('p', 'Automotores 828', 'cmp-ey'));
      var h = el('h2', 'Comparador'); h.id = 'cmp-ttl'; tx.appendChild(h);
      tx.appendChild(el('p', sel.length + ' unidades, lado a lado', 'cmp-sub'));
      tt.appendChild(tx); hd.appendChild(tt);
      var ct = el('div', null, 'cmp-ct');
      var sw = el('label', null, 'cmp-sw'), ck = el('input'); ck.type = 'checkbox'; ck.checked = soloDif;
      sw.appendChild(ck); sw.appendChild(el('span', null, 'cmp-sw-k')); sw.appendChild(el('span', 'Solo diferencias'));
      ck.addEventListener('change', function () { dlg.classList.toggle('solo-dif', ck.checked); });
      var x = el('button', 'Cerrar', 'btn sm'); x.type = 'button'; x.addEventListener('click', function () { dlg.close(); });
      ct.appendChild(sw); ct.appendChild(x); hd.appendChild(ct); dlg.appendChild(hd);
      dlg.appendChild(el('div', null, 'cmp-hz'));

      var minP = mejor(sel, function (a) { return a.monto; }, -1), maxP = Math.max.apply(null, sel.map(function (a) { return a.monto || 0; }));
      var maxA = mejor(sel, function (a) { return a.anio; }, 1);
      var minK = mejor(sel, function (a) { return a.km; }, -1), maxK = Math.max.apply(null, sel.map(function (a) { return a.km || 0; }));
      var base = Math.min.apply(null, sel.map(function (a) { return a.monto; }).filter(function (v) { return v != null; }));
      var esP = function (a) { return a.monto != null && minP != null && a.monto === minP; };
      var esA = function (a) { return a.anio != null && maxA != null && a.anio === maxA; };
      var esK = function (a) { return a.km != null && minK != null && a.km === minK; };

      /* ----- resumen: quién gana en cada cosa ----- */
      var ganan = [];
      [['Menor precio', esP], ['Más nuevo', esA], ['Menos kilómetros', esK]].forEach(function (g) {
        var a = sel.filter(g[1])[0]; if (a) ganan.push([g[0], a]);
      });
      if (ganan.length) {
        var rs = el('ul', null, 'cmp-win');
        ganan.forEach(function (g) {
          var li = el('li'), im = el('span', null, 'cmp-win-p');
          if (g[1].media && g[1].media[0]) { var i = el('img'); i.src = g[1].media[0].src; i.alt = ''; i.decoding = 'async'; im.appendChild(i); }
          li.appendChild(im);
          var t = el('span', null, 'cmp-win-t'); t.appendChild(el('small', g[0])); t.appendChild(el('b', g[1].marca + ' ' + g[1].modeloTxt)); li.appendChild(t);
          rs.appendChild(li);
        });
        dlg.appendChild(rs);
      }

      var t = el('table', null, 'cmpt cmpx'), cap = el('caption', 'Comparación de unidades'); cap.className = 'sr'; t.appendChild(cap);
      var hr = el('tr'), c0 = el('th'); c0.scope = 'col'; c0.appendChild(el('span', 'Dato', 'sr')); hr.appendChild(c0);
      sel.forEach(function (a, k) {
        var th = el('th', null, 'cmp-u'); th.scope = 'col';
        var ph = el('div', null, 'cmp-ph');
        if (a.media && a.media[0]) {
          var im = el('img'); im.src = a.media[0].src; if (a.media[0].srcset) im.srcset = a.media[0].srcset;
          im.sizes = '(max-width: 700px) 150px, 300px'; im.alt = a.media[0].alt || a.titulo; im.decoding = 'async'; if (k > 1) im.loading = 'lazy';
          ph.appendChild(im);
        }
        var md = el('span', null, 'cmp-md');
        [['Menor precio', esP(a)], ['Más nuevo', esA(a)], ['Menos km', esK(a)]].forEach(function (m) { if (m[1]) md.appendChild(el('span', m[0], 'cmp-medal')); });
        ph.appendChild(md);
        var rm = el('button', '×', 'cmp-rm'); rm.type = 'button'; rm.setAttribute('aria-label', 'Quitar de la comparación: ' + a.titulo);
        rm.addEventListener('click', function () {
          var j = cmp.indexOf(a.i); if (j > -1) cmp.splice(j, 1); pintarBandeja();
          if (cmp.length < 2) dlg.close(); else abrirComparacion();
        });
        ph.appendChild(rm);
        th.appendChild(ph);
        th.appendChild(el('span', a.marca, 'cb')); th.appendChild(el('span', sinMarca(a), 'cn'));
        th.appendChild(el('span', [a.anio, a.version].filter(Boolean).join(' · '), 'cv'));
        hr.appendChild(th);
      });
      var thead = el('thead'); thead.appendChild(hr); t.appendChild(thead);
      var tb = el('tbody');
      function grupo(txt) {
        var r = el('tr', null, 'cmp-g'), th = el('th', txt); th.scope = 'rowgroup'; th.colSpan = sel.length + 1; r.appendChild(th); tb.appendChild(r);
      }
      function fila(rotulo, celda, clave) {
        var r = el('tr'), th = el('th', rotulo); th.scope = 'row'; r.appendChild(th);
        sel.forEach(function (a) { var td = el('td'); celda(td, a); r.appendChild(td); });
        if (clave) { var ks = sel.map(function (a) { return String(clave(a)); }); if (ks.every(function (v) { return v === ks[0]; })) r.className = 'same'; }
        tb.appendChild(r);
      }
      function badge(td, txt) { td.appendChild(el('span', txt, 'bd')); }
      function barra(td, v, max, es) { if (v == null || !max) return; var b = el('span', null, 'mb' + (es ? ' best' : '')), i = el('i'); i.style.width = Math.max(4, Math.round(v / max * 100)) + '%'; b.appendChild(i); td.appendChild(b); }
      function gana(td, si) { if (si) td.className = 'win'; }

      grupo('Lo esencial');
      fila('Precio publicado', function (td, a) {
        td.appendChild(el('strong', a.precio ? peso(a) : 'Consultar', 'big' + (a.precio ? '' : ' nd')));
        if (esP(a)) badge(td, 'Menor precio');
        barra(td, a.monto, maxP, esP(a)); gana(td, esP(a));
      }, function (a) { return a.monto; });
      fila('Diferencia de precio', function (td, a) {
        if (a.monto == null) { td.textContent = 'Sin dato'; return; }
        td.textContent = a.monto === base ? (sel.length > 1 && minP != null ? 'La más económica' : '—') : '+ $ ' + fmt(a.monto - base);
      }, function (a) { return a.monto; });
      fila('Año', function (td, a) {
        td.appendChild(el('strong', a.anio != null ? String(a.anio) : 'Sin dato', 'big' + (a.anio != null ? '' : ' nd')));
        if (esA(a)) badge(td, 'Más nuevo'); gana(td, esA(a));
      }, function (a) { return a.anio; });
      fila('Kilómetros', function (td, a) {
        td.appendChild(el('strong', a.km != null ? fmt(a.km) + ' km' : 'Consultar', 'big' + (a.km != null ? '' : ' nd')));
        if (esK(a)) badge(td, 'Menos km');
        barra(td, a.km, maxK, esK(a)); gana(td, esK(a));
      }, function (a) { return a.km; });
      grupo('Mecánica');
      [['Caja', 'transmision'], ['Combustible', 'combustible'], ['Cilindrada', 'cilindrada']].forEach(function (p) {
        fila(p[0], function (td, a) { td.appendChild(el('span', a[p[1]] || 'Sin dato', a[p[1]] ? 'val' : 'val nd')); }, function (a) { return a[p[1]]; });
      });
      grupo('Detalle');
      fila('Color', function (td, a) {
        if (a.color && a.sw) { var d = el('i', null, 'sw'); d.style.setProperty('--sw', a.sw); td.appendChild(d); }
        td.appendChild(el('span', a.color || 'Sin dato', a.color ? 'val' : 'val nd'));
      }, function (a) { return a.color; });
      fila('Versión', function (td, a) { td.appendChild(el('span', a.version || 'Sin dato', a.version ? 'val' : 'val nd')); }, function (a) { return a.version; });
      fila('Carrocería', function (td, a) { td.appendChild(el('span', a.carroceria || 'Sin dato', a.carroceria ? 'val' : 'val nd')); }, function (a) { return a.carroceria; });
      var fr = el('tr', null, 'cmp-fr'), fth = el('th', 'Ficha'); fth.scope = 'row'; fr.appendChild(fth);
      sel.forEach(function (a) {
        var td = el('td');
        var c = el('a', 'Consultar esta unidad', 'btn p sm'); c.href = a.href; c.target = '_blank'; c.rel = 'noopener noreferrer';
        var v = el('a', 'Ver publicación', 'vp'); v.href = a.url; v.target = '_blank'; v.rel = 'noopener noreferrer';
        td.appendChild(c); td.appendChild(v); fr.appendChild(td);
      });
      tb.appendChild(fr);
      t.appendChild(tb);
      var sc = el('div', null, 'cmp-sc'); sc.appendChild(t); dlg.appendChild(sc);
      var f = sel.map(function (a) { return a.precio && a.precio.fecha; }).filter(Boolean);
      dlg.appendChild(el('p', 'Precios y kilometrajes' + (f.length ? ' al ' + fecha(f[0]) : '') + '. Consultá disponibilidad actualizada por WhatsApp.', 'src cmp-ft'));
      document.documentElement.classList.add('has-dlg');
      if (typeof dlg.showModal === 'function') { if (!dlg.open) dlg.showModal(); } else dlg.setAttribute('open', '');
      x.focus();
    }

    /* ----- ficha completa (diálogo), compartir y aviso breve ----- */
    var ctx = {};
    try { ctx = JSON.parse(($('#cat-ctx') || {}).textContent || '{}'); } catch (e) {}
    var fdlg = null, fOrigen = null, toast = null, toastT = 0;
    function aviso(msg) {
      if (!toast) { toast = el('div', null, 'toast'); toast.setAttribute('role', 'status'); toast.setAttribute('aria-live', 'polite'); document.body.appendChild(toast); }
      toast.textContent = msg; toast.classList.add('on');
      clearTimeout(toastT); toastT = setTimeout(function () { toast.classList.remove('on'); }, 2400);
    }
    function urlUnidad() { return /^https?:/.test(location.protocol) ? location.href.split('#')[0].split('?')[0] + '#unidades' : null; }
    function compartir(a) {
      var url = urlUnidad() || a.url, datos = { title: a.titulo, text: a.titulo + ' · ' + (ctx.nombre || ''), url: url };
      if (navigator.share) { navigator.share(datos).catch(function () {}); return; }
      copiar(datos.text + ' ' + url, function (ok) { aviso(ok ? 'Enlace copiado' : 'No se pudo copiar el enlace'); });
    }
    function enlace(txt, href, cls, ext) {
      var x = el('a', txt, cls || 'btn sm'); x.href = href;
      if (ext) { x.target = '_blank'; x.rel = 'noopener noreferrer'; }
      return x;
    }
    function boton(txt, cls, fn) { var b = el('button', txt, cls || 'btn sm'); b.type = 'button'; b.addEventListener('click', fn); return b; }
    function abrirFicha(i, origen) {
      var a = list[i]; if (!a) return;
      fOrigen = origen || null;
      if (!fdlg) {
        fdlg = el('dialog', null, 'ficha'); fdlg.setAttribute('aria-labelledby', 'fi-ttl');
        fdlg.addEventListener('click', function (e) { if (e.target === fdlg) fdlg.close(); });
        fdlg.addEventListener('close', function () { document.documentElement.classList.remove('has-dlg'); if (fOrigen && fOrigen.focus) { try { fOrigen.focus({ preventScroll: true }); } catch (e) {} } });
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
        if (a.media.length > 1) {
          var ir = function (k) { k = Math.max(0, Math.min(a.media.length - 1, k)); tr.scrollTo({ left: k * tr.clientWidth, behavior: 'smooth' }); };
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
          var tk = 0;
          tr.addEventListener('scroll', function () {
            if (tk) return; tk = requestAnimationFrame(function () { tk = 0; var c = act(); tbs.forEach(function (b, k) { b.classList.toggle('on', k === c); }); });
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
      if (a.anticipo && a.anticipo.monto != null) info.appendChild(el('p', 'Anticipo publicado: ' + (a.anticipo.moneda === 'USD' ? 'US$ ' : '$ ') + fmt(a.anticipo.monto), 'fi-n'));
      if (a.precio && a.precio.fecha) info.appendChild(el('p', 'Precio al ' + fecha(a.precio.fecha) + '.', 'fi-n'));
      var dl = el('dl', null, 'fi-d');
      function dato(k, v, sw) {
        if (v == null || v === '') return;
        var d = el('div'), dd = el('dd');
        if (sw) { var p = el('i', null, 'sw'); p.style.setProperty('--sw', sw); dd.appendChild(p); }
        dd.appendChild(document.createTextNode(String(v)));
        d.appendChild(el('dt', k)); d.appendChild(dd); dl.appendChild(d);
      }
      dato('Tipo', a.tipoVehiculo); dato('Tipo de moto', a.tipoMoto); dato('Año', a.anio); dato('Kilómetros', a.km != null ? fmt(a.km) + ' km' : 'Consultar'); dato('Caja', a.transmision); dato('Combustible', a.combustible);
      dato('Color', a.color, a.sw); dato('Cilindrada', a.cilindrada); dato('Motor', a.tipoVehiculo === 'Moto' ? a.motor : null); dato('Potencia', a.potencia); dato('Tracción', a.traccion);
      dato('Versión', a.version); dato('Carrocería', a.carroceria); dato('Puertas', a.puertas); dato('Velocidades', a.numeroVelocidades);
      if (a.relevadoEl) dato('Relevado', fecha(a.relevadoEl));
      info.appendChild(dl);
      var yaVisible = { 'año': 1, 'marca': 1, 'modelo': 1, 'versión': 1, 'kilómetros': 1, 'color': 1, 'tipo de combustible': 1, 'combustible': 1, 'transmisión': 1, 'motor': 1, 'cilindrada': 1, 'tipo de carrocería': 1, 'carrocería': 1, 'puertas': 1, 'potencia': 1, 'control de tracción': 1, 'tipo de moto': 1, 'numero de velocidades': 1, 'número de velocidades': 1 };
      var extras = (a.atributosPublicados || []).filter(function (x) { return x && x.nombre && x.valor && !yaVisible[norm(x.nombre)]; });
      if (extras.length) {
        var ep = el('section', null, 'fi-extra'); ep.appendChild(el('p', 'Más características publicadas', 'fi-s-k'));
        var edl = el('dl', null, 'fi-d');
        extras.forEach(function (x) { var row = el('div'); row.appendChild(el('dt', x.nombre)); row.appendChild(el('dd', x.valor)); edl.appendChild(row); });
        ep.appendChild(edl); ep.appendChild(el('p', 'Datos declarados en la publicación de Mercado Libre; confirmalos con la agencia.', 'fi-n')); info.appendChild(ep);
      }
      if (a.nota) info.appendChild(el('p', a.nota, 'fi-n'));

      /* acciones */
      var ac = el('div', null, 'fi-ac');
      ac.appendChild(enlace(a.vendida ? 'Consultar por similares' : ctx.wa ? 'Consultar por WhatsApp' : 'Consultar por Facebook', a.href, 'btn p sm', true));
      ac.appendChild(enlace('Agendar visita y prueba de manejo', 'reserva.html', 'btn sm', false));
      info.appendChild(ac);
      var ac2 = el('div', null, 'fi-ac2');
      if (a.hrefFin) ac2.appendChild(enlace('Consultar financiación', a.hrefFin, 'btn sm', true));
      if (a.mail) ac2.appendChild(enlace('Enviar correo', a.mail, 'btn sm', false));
      if (ctx.tel) ac2.appendChild(enlace('Llamar' + (ctx.telTxt ? ' · ' + ctx.telTxt : ''), 'tel:' + ctx.tel, 'btn sm', false));
      var tas = enlace('Tasar mi usado', '#tu-usado', 'btn sm', false); tas.addEventListener('click', function () { fdlg.close(); });
      if ($('#tu-usado')) ac2.appendChild(tas);
      ac2.appendChild(boton('Compartir', 'btn sm', function () { compartir(a); }));
      ac2.appendChild(boton('Copiar enlace', 'btn sm', function () { copiar((urlUnidad() || a.url), function (ok) { aviso(ok ? 'Enlace copiado' : 'No se pudo copiar el enlace'); }); }));
      var cb = cbs.filter(function (c) { return +c.value === a.i; })[0];
      if (cb) {
        var cm = boton(cb.checked ? 'Quitar de la comparación' : 'Agregar a comparar', 'btn sm', function () {
          if (!cb.checked && cb.disabled) { aviso('Ya hay 4 unidades para comparar'); return; }
          cb.checked = !cb.checked; cb.dispatchEvent(new Event('change', { bubbles: true }));
          cm.textContent = cb.checked ? 'Quitar de la comparación' : 'Agregar a comparar';
        });
        ac2.appendChild(cm);
      }
      if (a.url) ac2.appendChild(enlace('Ver publicación original', a.url, 'btn sm', true));
      if (ctx.maps) ac2.appendChild(enlace('Cómo llegar', ctx.maps, 'btn sm', true));
      info.appendChild(ac2);

      var pie = el('div', null, 'fi-p');
      pie.appendChild(el('p', 'Consultá precio y disponibilidad actualizados por WhatsApp.', 'fi-n'));
      info.appendChild(pie);

      /* relleno útil de la columna derecha: unidades parecidas del catálogo (datos reales) + guía para ver un usado */
      var sim = list.filter(function (c) { return c !== a && c.media && c.media.length; }).map(function (c) {
        var sc = (c.marca === a.marca ? 4 : 0) + (c.vendida ? 0 : 3) + (c.carroceria && c.carroceria === a.carroceria ? 1 : 0)
          - (a.anio != null && c.anio != null ? Math.min(Math.abs(c.anio - a.anio), 20) / 10 : 1);
        return { c: c, sc: sc };
      }).sort(function (x, y) { return y.sc - x.sc; }).slice(0, 3);
      if (sim.length) {
        var sb = el('section', null, 'fi-sim'); sb.setAttribute('aria-label', 'Otras unidades');
        sb.appendChild(el('p', 'Otras unidades que pueden interesarte', 'fi-s-k'));
        var sg = el('div', null, 'fi-sim-g');
        sim.forEach(function (o) {
          var c = o.c, b = el('button', null, 'fi-sim-c'); b.type = 'button';
          var im = el('img'); im.src = c.media[0].src; im.alt = ''; im.loading = 'lazy'; im.decoding = 'async'; b.appendChild(im);
          var tx = el('span', null, 'fi-sim-t');
          tx.appendChild(el('b', c.titulo || c.modeloTxt));
          tx.appendChild(el('small', (c.anio != null ? c.anio : '') + (c.vendida ? ' · Vendida' : (c.combustible ? (c.anio != null ? ' · ' : '') + c.combustible : ''))));
          b.appendChild(tx);
          b.addEventListener('click', function () { abrirFicha(list.indexOf(c), fOrigen); });
          sg.appendChild(b);
        });
        sb.appendChild(sg); info.appendChild(sb);
      }
      var gu = el('section', null, 'fi-gu'); gu.setAttribute('aria-label', 'Guía para ver un usado');
      gu.appendChild(el('p', 'Para ver esta unidad con tranquilidad', 'fi-s-k'));
      var gl = el('ul', null, 'fi-gu-l');
      ['Pedí ver la documentación: título, cédula y verificación policial.',
       'Revisá que no registre deudas ni infracciones antes de transferir.',
       'Probalo en ruta: frenos, dirección, caja y ruidos.',
       'Consultá por el historial de mantenimiento y los dueños anteriores.'].forEach(function (t) { gl.appendChild(el('li', t)); });
      gu.appendChild(gl); info.appendChild(gu);

      /* panel de marca bajo la foto: logotipo, qué ofrece la agencia y cómo visitarla (no repite lo de la derecha) */
      var pn = el('aside', null, 'fi-s'); pn.setAttribute('aria-label', 'Sobre ' + (ctx.nombre || 'la agencia'));
      var plate = el('div', null, 'fi-lg'), lg = el('img'); lg.src = 'images/logo-sm.png'; lg.width = 360; lg.height = 144; lg.alt = ctx.nombre || ''; lg.decoding = 'async';
      plate.appendChild(lg); pn.appendChild(plate);
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
        var hl = enlace('Ver horarios y mapa', '#horarios', 'btn sm', false); hl.addEventListener('click', function () { fdlg.close(); });
        vis.appendChild(hl);
      }
      pn.appendChild(vis);
      left.appendChild(pn);
      g.appendChild(info);
      fdlg.appendChild(x); fdlg.appendChild(g);
      document.documentElement.classList.add('has-dlg');
      if (fdlg.open) { fdlg.scrollTop = 0; } else if (typeof fdlg.showModal === 'function') fdlg.showModal(); else fdlg.setAttribute('open', '');
      x.focus({ preventScroll: true });
    }
    $$('[data-share]', ul).forEach(function (b) { b.hidden = false; });
    ul.addEventListener('click', function (e) {
      var b = e.target.closest ? e.target.closest('[data-ficha],[data-share],.car-ph') : null;
      if (!b || !ul.contains(b)) return;
      if (b.hasAttribute('data-ficha')) { abrirFicha(+b.getAttribute('data-ficha'), b); return; }
      if (b.hasAttribute('data-share')) { compartir(list[+b.getAttribute('data-share')]); return; }
      var li = b.closest('li.car'); if (li) abrirFicha(+li.getAttribute('data-i'), b.querySelector('img') ? li.querySelector('[data-ficha]') : null);
    });

    deUrl();
    abrirPanel(false);   /* los filtros arrancan cerrados: se abren solo al tocar «Mostrar filtros» */
    tg.setAttribute('aria-controls', 'fx-body');
    tools.hidden = false;
    aplicar(false);
  })();

  /* ---------- 1b) «Cómo comprar»: la sección se anima al llegar (sin JavaScript queda ya salido) ---------- */
  (function () {
    var r = $('.ruta');
    if (!r || !('IntersectionObserver' in window) || (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches)) return;
    r.classList.add('js');
    var io = new IntersectionObserver(function (es) {
      if (es.some(function (e) { return e.isIntersecting; })) { r.classList.add('on'); io.disconnect(); }
    }, { threshold: 0.35 });
    io.observe(r);
  })();

  /* ---------- 2) formularios que arman un mensaje ----------
     Tu usado y Tu búsqueda: campos con ejemplos, chips, formato de miles, progreso (el velocímetro avanza a medida que completás),
     vista previa del mensaje como burbuja, envío por WhatsApp con el texto ya armado y, en la búsqueda,
     coincidencias en vivo con el catálogo publicado (lee #cat-data). Nada se envía ni se guarda desde el sitio. */
  (function () {
    var CAT = [];
    try { CAT = JSON.parse(($('#cat-data') || {}).textContent || '[]'); } catch (e) {}
    var norm = function (t) { return String(t == null ? '' : t).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim(); };
    var miles = function (v) { var d = String(v).replace(/\D/g, '').slice(0, 10); return d ? Number(d).toLocaleString('es-AR') : ''; };
    var soloNum = function (v) { return parseInt(String(v).replace(/\D/g, ''), 10) || 0; };

    $$('form[data-msg]').forEach(function (f) {
      var vista = $('.msg-v', f), estado = $('.msg-s', f), btnCopiar = $('[data-copiar-msg]', f), wa = $('[data-wa-msg]', f);
      var bub = $('[data-bub-b]', f), progT = $('[data-prog-t]', f), progB = $('[data-prog-b]', f), sol = $('[data-sun]', f);
      var panel = $('[data-match]', f), mH = $('[data-match-h]', f), mL = $('[data-match-l]', f);
      var byId = function (id) { return f.querySelector('#' + id); };
      var val = function (id) { var c = byId(id); return c ? (c.value || '').trim() : ''; };

      /* select de unidades del catálogo */
      $$('select[data-stock]', f).forEach(function (s) {
        CAT.forEach(function (a) { var o = el('option', a.titulo + (a.anio ? ' · ' + a.anio : '')); o.value = a.titulo + (a.anio ? ' ' + a.anio : ''); s.appendChild(o); });
      });

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
        var n = trk.filter(function (c) { return (c.value || '').trim() !== ''; }).length, p = trk.length ? n / trk.length : 0;
        if (sol) sol.style.setProperty('--p', p.toFixed(3));
        if (progB) progB.style.width = Math.round(p * 100) + '%';
        if (progT) progT.textContent = !n ? 'Sin datos todavía' : n === trk.length ? 'Ficha completa' : n + ' de ' + trk.length + ' datos';
        if (sol) sol.classList.toggle('is-full', n === trk.length && n > 0);
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
        return CAT.filter(function (a) {
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
          var ln = el('a', 'Consultar', 'cv-m-a'); ln.href = a.href; ln.target = '_blank'; ln.rel = 'noopener noreferrer'; ln.setAttribute('aria-label', 'Consultar por ' + a.titulo);
          li.appendChild(ph); li.appendChild(tx); li.appendChild(ln); mL.appendChild(li);
        });
        if (r.length > 3) mL.appendChild(el('li', 'y ' + (r.length - 3) + ' más en «Nuestras unidades»', 'cv-m-more'));
      }

      /* Un solo repintado por cuadro de animación (antes cada tecla reconstruía todo) y las coincidencias esperan
         a que dejes de escribir. */
      var raf = 0, tMatch = 0;
      function ahoraTodo() {
        raf = 0;
        if (vista) vista.value = texto();
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
    });
  })();

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
