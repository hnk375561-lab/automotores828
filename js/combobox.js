/* Automotores 828 · desplegables propios (reemplazan el popup nativo del <select> y del <datalist>).
   Mejora progresiva: si este script no corre, los campos siguen funcionando con el control nativo.
   - select[data-stock]  → botón + lista oscura. El <select> original queda oculto y es la fuente del valor,
     así que el resto del código (secciones.js) lo sigue leyendo y escribiendo sin cambios.
   - input[list]         → el campo sigue siendo un <input> libre; la lista filtra mientras se escribe.
   La lista se dibuja en <body> con position:fixed para que ningún contenedor con overflow/clip-path la recorte. */
(function () {
  'use strict';

  var uid = 0;
  var abierto = null;   /* instancia con la lista visible */

  function norm(t) { return String(t == null ? '' : t).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim(); }
  function crear(tag, cls, txt) { var e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; }

  /* ---------- lista flotante (compartida por ambos tipos) ---------- */
  function Lista(ancla, tipo) {
    this.ancla = ancla;
    this.id = 'dr-cb-l' + (++uid);
    this.ul = crear('ul', 'dr-cb-list');
    this.ul.id = this.id;
    this.ul.setAttribute('role', 'listbox');
    this.ul.hidden = true;
    this.ul.setAttribute('data-tipo', tipo);
    this.items = [];     /* [{ li, valor, texto }] visibles */
    this.activo = -1;
    document.body.appendChild(this.ul);
    var self = this;
    /* mousedown (no click): evita que el campo pierda el foco antes de elegir */
    this.ul.addEventListener('mousedown', function (e) { e.preventDefault(); });
    this.ul.addEventListener('click', function (e) {
      var li = e.target.closest ? e.target.closest('li[role="option"]') : null;
      if (li && self.alElegir) self.alElegir(li.__valor, li.__texto);
    });
    this.ul.addEventListener('mousemove', function (e) {
      var li = e.target.closest ? e.target.closest('li[role="option"]') : null;
      if (!li) return;
      var k = self.items.indexOf(li.__it);
      if (k > -1 && k !== self.activo) self.marcar(k, false);
    });
  }
  Lista.prototype.pintar = function (opciones, valorActual) {
    var self = this;
    this.ul.textContent = '';
    this.items = [];
    this.activo = -1;
    opciones.forEach(function (o, k) {
      var li = crear('li', 'dr-cb-opt', o.texto);
      li.id = self.id + '-o' + k;
      li.setAttribute('role', 'option');
      var sel = valorActual != null && o.valor === valorActual && o.valor !== '';
      li.setAttribute('aria-selected', sel ? 'true' : 'false');
      if (o.vacio) li.classList.add('is-empty');
      li.__valor = o.valor; li.__texto = o.texto;
      var it = { li: li, valor: o.valor, texto: o.texto };
      li.__it = it;
      self.items.push(it);
      self.ul.appendChild(li);
    });
    if (!opciones.length) this.ul.appendChild(crear('li', 'dr-cb-none', 'Sin coincidencias'));
  };
  Lista.prototype.marcar = function (k, scroll) {
    if (!this.items.length) return;
    k = (k + this.items.length) % this.items.length;
    if (this.activo > -1 && this.items[this.activo]) this.items[this.activo].li.classList.remove('is-active');
    this.activo = k;
    var li = this.items[k].li;
    li.classList.add('is-active');
    if (scroll !== false) {
      var u = this.ul, t = li.offsetTop, b = t + li.offsetHeight;
      if (t < u.scrollTop) u.scrollTop = t; else if (b > u.scrollTop + u.clientHeight) u.scrollTop = b - u.clientHeight;
    }
    if (this.alMarcar) this.alMarcar(li.id);
  };
  Lista.prototype.posicionar = function () {
    var r = this.ancla.getBoundingClientRect(), vh = window.innerHeight || document.documentElement.clientHeight;
    var abajo = vh - r.bottom - 12, arriba = r.top - 12, max = 280;
    var haciaArriba = abajo < 170 && arriba > abajo;
    var alto = Math.max(110, Math.min(max, haciaArriba ? arriba : abajo));
    var s = this.ul.style;
    s.left = Math.round(r.left) + 'px';
    s.width = Math.round(r.width) + 'px';
    s.maxHeight = alto + 'px';
    if (haciaArriba) { s.top = 'auto'; s.bottom = Math.round(vh - r.top + 4) + 'px'; this.ul.classList.add('is-up'); }
    else { s.bottom = 'auto'; s.top = Math.round(r.bottom + 4) + 'px'; this.ul.classList.remove('is-up'); }
  };
  Lista.prototype.mostrar = function () {
    this.ul.hidden = false;
    this.posicionar();
  };
  Lista.prototype.ocultar = function () { this.ul.hidden = true; };
  Lista.prototype.visible = function () { return !this.ul.hidden; };

  function cerrarAbierto(salvo) { if (abierto && abierto !== salvo) abierto.cerrar(); }
  function reubicar() { if (abierto && abierto.lista.visible()) abierto.lista.posicionar(); }
  window.addEventListener('resize', reubicar);
  window.addEventListener('scroll', reubicar, true);
  document.addEventListener('mousedown', function (e) {
    if (!abierto) return;
    if (abierto.raiz.contains(e.target) || abierto.lista.ul.contains(e.target)) return;
    abierto.cerrar();
  });

  /* ---------- 1) <select> → botón + lista ---------- */
  function mejorarSelect(sel) {
    if (sel.__drcb) return;
    sel.__drcb = true;
    var raiz = crear('div', 'dr-cb dr-cb--select');
    var btn = crear('button', 'dr-cb-btn');
    btn.type = 'button';
    btn.setAttribute('role', 'combobox');
    btn.setAttribute('aria-haspopup', 'listbox');
    btn.setAttribute('aria-expanded', 'false');
    var txt = crear('span', 'dr-cb-txt');
    btn.appendChild(txt);
    /* el label for="u-un" apuntaba al select: ahora apunta al botón */
    if (sel.id) {
      var lb = document.querySelector('label[for="' + sel.id + '"]');
      if (lb) { if (!lb.id) lb.id = sel.id + '-lbl'; btn.setAttribute('aria-labelledby', lb.id + ' ' + (btn.id = sel.id + '-btn')); lb.setAttribute('for', btn.id); }
    }
    sel.parentNode.insertBefore(raiz, sel);
    raiz.appendChild(btn);
    raiz.appendChild(sel);
    sel.classList.add('dr-cb-native');
    sel.tabIndex = -1;
    sel.setAttribute('aria-hidden', 'true');

    var lista = new Lista(btn, 'select');
    btn.setAttribute('aria-controls', lista.id);
    var inst = { raiz: raiz, lista: lista, cerrar: cerrar };

    function opciones() {
      return [].slice.call(sel.options).map(function (o) { return { valor: o.value, texto: o.textContent, vacio: o.value === '' }; });
    }
    function reflejar() {
      var o = sel.options[sel.selectedIndex];
      txt.textContent = o ? o.textContent : '';
      raiz.classList.toggle('is-empty', !sel.value);
    }
    function abrir() {
      cerrarAbierto(inst);
      abierto = inst;
      lista.pintar(opciones(), sel.value);
      lista.mostrar();
      btn.setAttribute('aria-expanded', 'true');
      raiz.classList.add('is-open');
      var k = Math.max(0, sel.selectedIndex);
      lista.marcar(k);
    }
    function cerrar() {
      lista.ocultar();
      btn.setAttribute('aria-expanded', 'false');
      btn.removeAttribute('aria-activedescendant');
      raiz.classList.remove('is-open');
      if (abierto === inst) abierto = null;
    }
    function elegir(valor) {
      if (sel.value !== valor) { sel.value = valor; sel.dispatchEvent(new Event('input', { bubbles: true })); sel.dispatchEvent(new Event('change', { bubbles: true })); }
      reflejar(); cerrar(); btn.focus();
    }
    lista.alElegir = elegir;
    lista.alMarcar = function (id) { btn.setAttribute('aria-activedescendant', id); };

    btn.addEventListener('click', function () { lista.visible() ? cerrar() : abrir(); });
    btn.addEventListener('keydown', function (e) {
      var k = e.key;
      if (k === 'ArrowDown' || k === 'ArrowUp') {
        e.preventDefault();
        if (!lista.visible()) abrir(); else lista.marcar(lista.activo + (k === 'ArrowDown' ? 1 : -1));
      } else if (k === 'Home' && lista.visible()) { e.preventDefault(); lista.marcar(0); }
      else if (k === 'End' && lista.visible()) { e.preventDefault(); lista.marcar(lista.items.length - 1); }
      else if ((k === 'Enter' || k === ' ') && lista.visible()) {
        e.preventDefault();
        var it = lista.items[lista.activo]; if (it) elegir(it.valor); else cerrar();
      } else if (k === 'Escape' && lista.visible()) { e.preventDefault(); cerrar(); }
      else if (k === 'Tab' && lista.visible()) cerrar();
      else if (k.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey && k !== ' ') {
        /* escribir una letra salta a la primera opción que empieza con ella */
        var q = norm(k), idx = -1, opts = opciones();
        for (var i = 0; i < opts.length; i++) { if (norm(opts[i].texto).indexOf(q) === 0) { idx = i; break; } }
        if (idx > -1) { if (!lista.visible()) abrir(); lista.marcar(idx); }
      }
    });
    btn.addEventListener('blur', function () { setTimeout(function () { if (lista.visible() && document.activeElement !== btn) cerrar(); }, 120); });

    sel.addEventListener('change', reflejar);
    /* el catálogo llega después y secciones.js agrega las <option>: se vuelve a dibujar */
    if (window.MutationObserver) new MutationObserver(function () { reflejar(); if (lista.visible()) { lista.pintar(opciones(), sel.value); lista.mostrar(); } }).observe(sel, { childList: true });
    reflejar();
  }

  /* ---------- 2) input[list] → campo libre con sugerencias ---------- */
  function mejorarInput(inp) {
    if (inp.__drcb) return;
    var dl = document.getElementById(inp.getAttribute('list'));
    if (!dl) return;
    inp.__drcb = true;
    var base = [].slice.call(dl.options).map(function (o) { return o.value; }).filter(Boolean);
    inp.setAttribute('data-list', inp.getAttribute('list'));
    inp.removeAttribute('list');            /* apaga el popup nativo */
    var raiz = crear('div', 'dr-cb dr-cb--input');
    inp.parentNode.insertBefore(raiz, inp);
    raiz.appendChild(inp);
    var lista = new Lista(inp, 'input');
    inp.setAttribute('role', 'combobox');
    inp.setAttribute('aria-autocomplete', 'list');
    inp.setAttribute('aria-expanded', 'false');
    inp.setAttribute('aria-controls', lista.id);
    var inst = { raiz: raiz, lista: lista, cerrar: cerrar };

    function filtrar() {
      var q = norm(inp.value);
      var ini = [], med = [];
      base.forEach(function (m) { var n = norm(m); if (!q || n.indexOf(q) === 0) ini.push(m); else if (n.indexOf(q) > -1) med.push(m); });
      return ini.concat(med).map(function (m) { return { valor: m, texto: m }; });
    }
    function abrir() {
      var ops = filtrar();
      /* si lo escrito coincide exacto con la única opción, no hace falta sugerir lo que ya está */
      if (ops.length === 1 && norm(ops[0].valor) === norm(inp.value)) { cerrar(); return; }
      cerrarAbierto(inst);
      abierto = inst;
      lista.pintar(ops, null);
      lista.mostrar();
      inp.setAttribute('aria-expanded', 'true');
      raiz.classList.add('is-open');
      if (ops.length && inp.value.trim()) lista.marcar(0, false);
    }
    function cerrar() {
      lista.ocultar();
      inp.setAttribute('aria-expanded', 'false');
      inp.removeAttribute('aria-activedescendant');
      raiz.classList.remove('is-open');
      if (abierto === inst) abierto = null;
    }
    function elegir(valor) {
      inp.value = valor;
      inp.dispatchEvent(new Event('input', { bubbles: true }));
      inp.dispatchEvent(new Event('change', { bubbles: true }));
      cerrar();
      inp.focus();
    }
    lista.alElegir = elegir;
    lista.alMarcar = function (id) { inp.setAttribute('aria-activedescendant', id); };

    inp.addEventListener('focus', abrir);
    inp.addEventListener('click', function () { if (!lista.visible()) abrir(); });
    inp.addEventListener('input', abrir);
    inp.addEventListener('keydown', function (e) {
      var k = e.key;
      if (k === 'ArrowDown' || k === 'ArrowUp') {
        e.preventDefault();
        if (!lista.visible()) abrir();
        if (lista.items.length) lista.marcar(lista.activo < 0 ? (k === 'ArrowDown' ? 0 : lista.items.length - 1) : lista.activo + (k === 'ArrowDown' ? 1 : -1));
      } else if (k === 'Enter' && lista.visible() && lista.activo > -1) {
        e.preventDefault(); elegir(lista.items[lista.activo].valor);
      } else if (k === 'Escape' && lista.visible()) { e.preventDefault(); cerrar(); }
      else if (k === 'Tab') cerrar();
    });
    inp.addEventListener('blur', function () { setTimeout(function () { if (document.activeElement !== inp) cerrar(); }, 120); });
  }

  function iniciar() {
    [].slice.call(document.querySelectorAll('select[data-stock]')).forEach(mejorarSelect);
    [].slice.call(document.querySelectorAll('.cv-form input[list]')).forEach(mejorarInput);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar); else iniciar();
})();
