/* Automotores 828 · mapas Leaflet + OpenStreetMap.
   La creación de Leaflet se difiere a un momento ocioso para no bloquear el scroll al entrar en la sección. */
(function () {
  'use strict';
  var scheduled = new WeakSet(), started = new WeakSet(), leafletPromise = null;
  var scrolling = false, scrollTimer = 0, idleHandles = [];

  function el(tag, txt, cls) { var e = document.createElement(tag); if (txt != null) e.textContent = txt; if (cls) e.className = cls; return e; }
  function cargar(root) {
    if (window.L) return Promise.resolve();
    if (leafletPromise) return leafletPromise;
    leafletPromise = new Promise(function (resolve, reject) {
      if (root.dataset.css && !document.querySelector('link[data-leaflet-css]')) {
        var l = document.createElement('link'); l.rel = 'stylesheet'; l.href = root.dataset.css; l.setAttribute('data-leaflet-css', ''); document.head.appendChild(l);
      }
      var s = document.createElement('script'); s.src = root.dataset.leaflet; s.onload = resolve; s.onerror = reject; document.head.appendChild(s);
    });
    return leafletPromise;
  }
  function cancelIdle() {
    idleHandles.forEach(function (h) { if (window.cancelIdleCallback) window.cancelIdleCallback(h); else clearTimeout(h); });
    idleHandles = [];
  }
  function markScrollEnd() {
    clearTimeout(scrollTimer);
    scrollTimer = setTimeout(function () { scrolling = false; flushReady(); }, 180);
  }
  function onScroll() {
    scrolling = true; cancelIdle(); markScrollEnd();
  }
  function queueIdle(fn) {
    cancelIdle();
    if (scrolling) return;
    var run = function () { idleHandles = []; if (!scrolling) fn(); };
    if (window.requestIdleCallback) idleHandles.push(window.requestIdleCallback(run, { timeout: 1800 }));
    else idleHandles.push(setTimeout(run, 120));
  }
  var pending = [];
  function defer(root, job) { pending.push({ root: root, job: job, ready: false }); }
  function flushIdle(root, onlyReady) {
    if (scrolling) { pending.forEach(function (item) { if (!root || item.root === root) item.ready = true; }); return; }
    var jobs = pending.filter(function (item) { return (!root || item.root === root) && (!onlyReady || item.ready); });
    pending = pending.filter(function (item) { return !((!root || item.root === root) && (!onlyReady || item.ready)); });
    if (jobs.length) queueIdle(function () { jobs.forEach(function (item) { item.job(); }); });
  }
  function flushReady() {
    if (pending.some(function (item) { return item.ready; })) flushIdle(null, true);
  }
  window.addEventListener('scroll', onScroll, { passive: true });

  function init(root, immediate) {
    if (!root || scheduled.has(root) || started.has(root)) return;
    var view = root.querySelector('.dr-map-v, .map-v');
    if (!view) return;
    scheduled.add(root);
    var ph = root.querySelector('[data-mapa-ph]') || root.querySelector('.map-p');
    var trigger = root.querySelector('[data-mapa-abrir]');
    var status = root.querySelector('.map-m');
    var lat = Number(root.dataset.lat), lng = Number(root.dataset.lng);
    var nombre = root.dataset.nombre || 'Automotores 828', dir = root.dataset.dir || '', gmaps = root.dataset.gmaps || '';
    var mapa = null;
    function dijo(t) { if (status) status.textContent = t || ''; }
    function respaldo() {
      if (mapa) { try { mapa.remove(); } catch (e) {} mapa = null; }
      view.textContent = '';
      view.appendChild(el('p', 'No pudimos cargar el mapa interactivo. Abrí las indicaciones para ver el recorrido.', 'dr-map-error'));
      root.classList.add('is-open'); if (ph) ph.hidden = false; dijo('Mapa no disponible; las indicaciones siguen activas.');
    }
    function popup() {
      var w = el('div', null, 'dr-pop'); w.appendChild(el('p', nombre, 'dr-pop-t'));
      if (dir) w.appendChild(el('p', dir, 'dr-pop-a'));
      if (gmaps) { var a = el('a', 'Cómo llegar', 'dr-pop-l'); a.href = gmaps; a.target = '_blank'; a.rel = 'noopener noreferrer'; w.appendChild(a); }
      return w;
    }
    function pintar() {
      started.add(root); root.classList.add('is-open'); if (ph) ph.hidden = true;
      var movil = !!(L.Browser && L.Browser.mobile);
      mapa = L.map(view, { scrollWheelZoom: false, dragging: !movil, zoomControl: true, attributionControl: true, zoomSnap: 1, minZoom: 12, maxZoom: 19, fadeAnimation: false, zoomAnimation: false, markerZoomAnimation: false, inertia: !movil, preferCanvas: true }).setView([lat, lng], 17);
      var attr = '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors';
      var tiles = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: attr, keepBuffer: 1, updateWhenIdle: true, updateWhenZooming: false, noWrap: true });
      var errores = 0, cargado = false;
      tiles.on('tileload', function () { cargado = true; });
      tiles.on('tileerror', function () { if (++errores >= 4 && !cargado) respaldo(); });
      tiles.addTo(mapa);
      var icono = L.divIcon({ className: 'dr-pin', html: '<span class="dr-pin-r" aria-hidden="true"></span><span class="dr-pin-b"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 17h16M7 17a5 5 0 0 1 10 0M12 6v2.5M5.6 9.6l1.8 1.8M18.4 9.6l-1.8 1.8"/></svg></span>', iconSize: [44, 44], iconAnchor: [22, 53], popupAnchor: [0, -50] });
      var marca = L.marker([lat, lng], { icon: icono, title: nombre, keyboard: true, alt: nombre }).addTo(mapa);
      marca.bindPopup(popup(), { closeButton: false, minWidth: 210, maxWidth: 260 });
      marca.bindTooltip(nombre, { permanent: true, direction: 'right', offset: [24, -26], className: 'dr-tt' });
      var Centrar = L.Control.extend({ options: { position: 'topright' }, onAdd: function () { var b = L.DomUtil.create('button', 'dr-ctr'); b.type = 'button'; b.textContent = 'Centrar'; b.setAttribute('aria-label', 'Volver a centrar el mapa en ' + nombre); L.DomEvent.disableClickPropagation(b); L.DomEvent.on(b, 'click', function () { mapa.setView([lat, lng], 17); }); return b; } });
      mapa.addControl(new Centrar());
      if (movil) { var cand = el('button', 'Tocá para mover el mapa', 'dr-lock'); cand.type = 'button'; cand.addEventListener('click', function () { mapa.dragging.enable(); cand.remove(); }); root.appendChild(cand); }
      else { mapa.on('click', function () { mapa.scrollWheelZoom.enable(); }); view.addEventListener('mouseleave', function () { if (mapa) mapa.scrollWheelZoom.disable(); }); }
      requestAnimationFrame(function () { if (mapa) mapa.invalidateSize({ pan: false }); });
    }
    function iniciar() {
      if (started.has(root)) return;
      started.add(root);
      dijo('Cargando el mapa…');
      cargar(root).then(function () { dijo(''); pintar(); }).catch(function () { dijo(''); respaldo(); });
    }
    if (trigger) { trigger.hidden = false; trigger.addEventListener('click', function () { if (!started.has(root)) { cancelIdle(); iniciar(); } }); }
    if (immediate) iniciar();
    else {
      defer(root, iniciar);
      if ('IntersectionObserver' in window) {
        var io = new IntersectionObserver(function (es) {
          if (es.some(function (e) { return e.isIntersecting; })) { io.disconnect(); flushIdle(root); }
        }, { rootMargin: '180px 0px', threshold: 0.01 });
        io.observe(root);
      } else flushIdle(root);
    }
  }
  function scan(node) { if (!node || node.nodeType !== 1) return; if (node.matches('[data-leaflet]')) init(node); node.querySelectorAll('[data-leaflet]').forEach(init); }
  document.querySelectorAll('[data-leaflet]').forEach(init);
  if (window.MutationObserver) new MutationObserver(function (ms) { ms.forEach(function (m) { m.addedNodes.forEach(scan); }); }).observe(document.body, { childList: true, subtree: true });
  window.drCrearMapa = function (root) { init(root, true); };
}());
