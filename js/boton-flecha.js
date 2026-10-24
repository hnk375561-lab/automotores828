/* Automotores 828 · botones «flecha que cruza» (v13).
   A cada .btn le agrega dos ventanas recortadas: una vacía al frente (icono según el destino:
   WhatsApp, correo, Instagram, mapa…) y otra al final con la flecha. El movimiento es CSS puro
   (ver «v13» en estilos.css); este archivo solo arma el marcado y lo repara si otro script
   reescribe el texto del botón (p. ej. «Copiado»). Sin dependencias. */
(function () {
  'use strict';
  var NS = 'http://www.w3.org/2000/svg';
  var P = {
    arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
    wa: '<path d="M4 20l1.3-4A8 8 0 1 1 8 18.7z"/><path d="M9 9c0 3 3 6 6 6l1-1.5-2-1-1 .8a4 4 0 0 1-2-2l.8-1-1-2z"/>',
    mail: '<rect x="3.5" y="5.5" width="17" height="13" rx="1.5"/><path d="M4 7l8 6 8-6"/>',
    ig: '<rect x="3.5" y="3.5" width="17" height="17" rx="5"/><circle cx="12" cy="12" r="4"/><path d="M17.4 6.6h.01"/>',
    fb: '<path d="M14 8.5h2V5h-2.5A3.5 3.5 0 0 0 10 8.5V11H8v3.2h2V20h3.2v-5.8H16l.5-3.2h-3.3V9a.5.5 0 0 1 .5-.5z"/>',
    pin: '<path d="M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11z"/><circle cx="12" cy="10" r="2.5"/>',
    ext: '<path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/>',
    file: '<path d="M7 3.5h7l4 4V20H7z"/><path d="M14 3.5V8h4M9.5 13h5M9.5 16.5h5"/>',
    copy: '<rect x="8.5" y="8.5" width="11" height="11" rx="1.5"/><path d="M15.5 8.5v-3h-10v10h3"/>',
    share: '<circle cx="18" cy="5" r="2.5"/><circle cx="6" cy="12" r="2.5"/><circle cx="18" cy="19" r="2.5"/><path d="M8.2 10.8l7.6-4.6M8.2 13.2l7.6 4.6"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    car: '<path d="M3.5 15.5v-3l2-5h13l2 5v3zM6.5 15.5V18M17.5 15.5V18M3.5 12.5h17"/>',
    down: '<path d="M12 5v14M6 13l6 6 6-6"/>',
    swap: '<path d="M6 8h12l-3-3M18 16H6l3 3"/>',
    phone: '<path d="M6.5 4h3l1.5 4-2 1.5a10 10 0 0 0 5.5 5.5L16 13l4 1.5v3a2 2 0 0 1-2 2A14 14 0 0 1 4.5 6a2 2 0 0 1 2-2z"/>',
    home: '<path d="M4 11l8-6.5 8 6.5M6 9.5V20h12V9.5"/>',
    cal: '<rect x="4" y="5.5" width="16" height="14.5" rx="1.5"/><path d="M4 10h16M8.5 3.5v4M15.5 3.5v4"/>'
  };

  function icono(el) {
    if (el.hasAttribute('data-ficha') || el.classList.contains('ficha-trigger')) return 'file';
    if (el.hasAttribute('data-share')) return 'share';
    if (el.hasAttribute('data-copiar') || el.hasAttribute('data-copiar-msg')) return 'copy';
    if (el.hasAttribute('data-mapa-abrir')) return 'pin';
    if (el.id === 'inventory-more') return 'plus';
    var h = (el.getAttribute('href') || '').toLowerCase();
    if (!h) return /plegar/i.test(el.textContent) ? 'down' : null;
    if (/reserva\.html/.test(h)) return 'cal';
    if (/^https?:\/\/(wa\.me|api\.whatsapp\.com|wa\.link)/.test(h)) return 'wa';
    if (h.indexOf('mailto:') === 0) return 'mail';
    if (h.indexOf('tel:') === 0) return 'phone';
    if (h.indexOf('instagram.com') > -1) return 'ig';
    if (h.indexOf('facebook.com') > -1) return 'fb';
    if (/google\.[a-z.]+\/maps|maps\.app\.goo\.gl|goo\.gl\/maps/.test(h)) return 'pin';
    if (h === '#unidades') return 'car';
    if (h === '#tu-usado') return 'swap';
    if (h.charAt(0) === '#') return 'down';
    if (h === './' || h === '/' || h === 'index.html') return 'home';
    if (/^https?:/.test(h)) return 'ext';
    return null;
  }

  function svg(clave) {
    var s = document.createElementNS(NS, 'svg');
    s.setAttribute('viewBox', '0 0 24 24');
    s.setAttribute('aria-hidden', 'true');
    s.setAttribute('focusable', 'false');
    s.innerHTML = P[clave];
    return s;
  }
  function ventana(cls, clave) {
    var w = document.createElement('span');
    w.className = 'bf ' + cls;
    w.setAttribute('aria-hidden', 'true');
    w.appendChild(svg(clave));
    return w;
  }
  function armado(el) {
    var a = el.firstElementChild, z = el.lastElementChild;
    return a && z && a.classList.contains('bf-l') && z.classList.contains('bf-t');
  }
  function mejorar(el) {
    if (el.hasAttribute('data-bf')) return;
    /* los que ya traen su propio icono (formularios .cv-btn) no se tocan */
    if (el.matches('.cv-btn') || el.querySelector('svg')) return;
    var clave = icono(el);
    if (!clave) return;
    el.insertBefore(ventana('bf-l', clave), el.firstChild);
    el.appendChild(ventana('bf-t', 'arrow'));
    el.setAttribute('data-bf', clave);
  }
  /* otro script puede reescribir el texto (textContent): se vuelven a poner las dos ventanas */
  function reparar(el) {
    if (armado(el)) return;
    var clave = el.getAttribute('data-bf');
    [].slice.call(el.querySelectorAll(':scope > .bf')).forEach(function (n) { n.remove(); });
    el.insertBefore(ventana('bf-l', clave), el.firstChild);
    el.appendChild(ventana('bf-t', 'arrow'));
  }
  function barrer(raiz) {
    if (raiz.nodeType !== 1) return;
    if (raiz.matches('.btn')) mejorar(raiz);
    [].forEach.call(raiz.querySelectorAll('.btn'), mejorar);
  }

  function iniciar() {
    barrer(document.body);
    if (!('MutationObserver' in window)) return;
    new MutationObserver(function (ms) {
      var i, j, m, n, b;
      for (i = 0; i < ms.length; i++) {
        m = ms[i];
        for (j = 0; j < m.addedNodes.length; j++) {
          n = m.addedNodes[j];
          if (n.nodeType === 1 && !(n.classList && n.classList.contains('bf'))) barrer(n);
        }
        b = m.target.nodeType === 1 && m.target.closest ? m.target.closest('.btn[data-bf]') : null;
        if (b && m.target === b) reparar(b);
      }
    }).observe(document.body, { childList: true, subtree: true });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar);
  else iniciar();
})();
