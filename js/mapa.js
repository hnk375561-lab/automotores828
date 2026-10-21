/* Automotores 828 · js/mapa.js
   Mapa interactivo de «Horarios y ubicación». Leaflet + OpenStreetMap se cargan al acercarse a la sección
   (o al tocar «Ver mapa»). Usa tiles oscuros de Carto, marcador branded, botón para centrar y salida honesta si falla la red. */
(function () {
  'use strict';
  var root = document.querySelector('[data-leaflet]');
  if (!root) return;
  var view = root.querySelector('.dr-map-v');
  var ph = root.querySelector('[data-mapa-ph]');
  var trigger = root.querySelector('[data-mapa-abrir]');
  var status = root.querySelector('.map-m');
  if (!view) return;
  var lat = Number(root.dataset.lat), lng = Number(root.dataset.lng);
  var nombre = root.dataset.nombre || '', dir = root.dataset.dir || '', gmaps = root.dataset.gmaps || '';
  var iniciado = false, mapa = null;
  if (trigger) trigger.hidden = false;

  function el(tag, txt, cls) { var e = document.createElement(tag); if (txt != null) e.textContent = txt; if (cls) e.className = cls; return e; }
  function dijo(t) { if (status) status.textContent = t || ''; }

  function cargar(ok, fallo) {
    if (window.L) return ok();
    if (root.dataset.css && !document.querySelector('link[data-leaflet-css]')) {
      var l = document.createElement('link'); l.rel = 'stylesheet'; l.href = root.dataset.css; l.setAttribute('data-leaflet-css', ''); document.head.appendChild(l);
    }
    var s = document.createElement('script'); s.src = root.dataset.leaflet; s.onload = ok; s.onerror = fallo; document.head.appendChild(s);
  }

  /* Si la red no permite teselas, no se inventa un mapa estático ni se reemplaza por un embed genérico. */
  function respaldoMapa() {
    if (mapa) { try { mapa.remove(); } catch (e) {} mapa = null; }
    view.textContent = '';
    view.appendChild(el('p', 'No pudimos cargar el mapa interactivo. Abrí las indicaciones para ver el recorrido.', 'dr-map-error'));
    root.classList.add('is-open');
    if (ph) ph.hidden = false;
    dijo('Mapa no disponible; las indicaciones siguen activas.');
  }

  function popup() {
    var w = el('div', null, 'dr-pop');
    w.appendChild(el('p', nombre, 'dr-pop-t'));
    if (dir) w.appendChild(el('p', dir, 'dr-pop-a'));
    if (gmaps) { var a = el('a', 'Cómo llegar', 'dr-pop-l'); a.href = gmaps; a.target = '_blank'; a.rel = 'noopener noreferrer'; w.appendChild(a); }
    return w;
  }

  function pintar() {
    root.classList.add('is-open');
    if (ph) ph.hidden = true;
    var movil = !!(L.Browser && L.Browser.mobile);
    mapa = L.map(view, { scrollWheelZoom: false, dragging: !movil, zoomControl: true, attributionControl: true, zoomSnap: 1, minZoom: 12, maxZoom: 19, fadeAnimation: false, markerZoomAnimation: false, inertia: !movil }).setView([lat, lng], 17);

    var attr = '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a>';
    var fuentes = [
      { url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', o: { subdomains: 'abcd', maxZoom: 19, attribution: attr + ' · <a href="https://carto.com/attributions" target="_blank" rel="noopener noreferrer">CARTO</a>', keepBuffer: 3, updateWhenIdle: movil, updateWhenZooming: false } }
    ];
    var k = 0, errores = 0, tiles = null, cargo = false;
    function capa() {
      if (tiles) mapa.removeLayer(tiles);
      errores = 0; tiles = L.tileLayer(fuentes[k].url, fuentes[k].o);
      tiles.on('tileerror', function () {
        errores++;
        if (errores < 4 || cargo) return;
        if (k < fuentes.length - 1) { k++; capa(); return; }
        respaldoMapa();
      });
      tiles.on('tileload', function () { cargo = true; });
      tiles.addTo(mapa);
    }
    capa();

    var icono = L.divIcon({
      className: 'dr-pin',
      html: '<span class="dr-pin-r" aria-hidden="true"></span><span class="dr-pin-b"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 17h16M7 17a5 5 0 0 1 10 0M12 6v2.5M5.6 9.6l1.8 1.8M18.4 9.6l-1.8 1.8"/></svg></span>',
      iconSize: [44, 44], iconAnchor: [22, 53], popupAnchor: [0, -50]
    });
    var marca = L.marker([lat, lng], { icon: icono, title: nombre, keyboard: true, alt: nombre }).addTo(mapa);
    marca.bindPopup(popup(), { closeButton: false, minWidth: 210, maxWidth: 260, offset: [0, 0] });
    marca.bindTooltip(nombre, { permanent: true, direction: 'right', offset: [24, -26], className: 'dr-tt' });

    /* botón «Centrar» */
    var Centrar = L.Control.extend({
      options: { position: 'topright' },
      onAdd: function () {
        var b = L.DomUtil.create('button', 'dr-ctr'); b.type = 'button'; b.textContent = 'Centrar'; b.setAttribute('aria-label', 'Volver a centrar el mapa en ' + nombre);
        L.DomEvent.disableClickPropagation(b);
        L.DomEvent.on(b, 'click', function () { mapa.setView([lat, lng], 17); });
        return b;
      }
    });
    mapa.addControl(new Centrar());

    /* rueda del mouse: se activa al hacer clic en el mapa; en el celular, un toque habilita mover el mapa con un dedo */
    if (movil) {
      var cand = el('button', 'Tocá para mover el mapa', 'dr-lock'); cand.type = 'button';
      cand.addEventListener('click', function () { mapa.dragging.enable(); cand.remove(); });
      root.appendChild(cand);
    } else {
      mapa.on('click', function () { mapa.scrollWheelZoom.enable(); });
      view.addEventListener('mouseleave', function () { mapa.scrollWheelZoom.disable(); });
    }
    setTimeout(function () { mapa.invalidateSize(); }, 60);
    setTimeout(function () { mapa.invalidateSize(); }, 450);
    var rz = 0; window.addEventListener('resize', function () { if (rz) return; rz = requestAnimationFrame(function () { rz = 0; if (mapa) mapa.invalidateSize(); }); });
  }

  function iniciar() {
    if (iniciado) return; iniciado = true;
    if (trigger) trigger.disabled = true;
    dijo('Cargando el mapa…');
    cargar(function () { dijo(''); pintar(); }, function () { dijo(''); iniciado = false; if (trigger) trigger.disabled = false; respaldoMapa(); });
  }

  if (trigger) trigger.addEventListener('click', iniciar);
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (es) {
      if (es.some(function (e) { return e.isIntersecting; })) { io.disconnect(); iniciar(); }
    }, { rootMargin: '500px 0px' });
    io.observe(root);
  } else iniciar();
}());
