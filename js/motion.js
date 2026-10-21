/* ════════════════════════════════════════════════════════════════════════════════════════
   AUTOMOTORES 828 · CAPA DE MOVIMIENTO  (js/motion.js)
   GSAP = motor · ScrollTrigger = narrativa · Lenis = inercia del scroll.

   Archivo único y autocontenido: solo importa el bundle ya servido en js/vendor/.
   No cambia HTML, CSS, contenido ni identidad visual: únicamente el movimiento.

   FIRMAS (los momentos propios de este sitio)
     1 · APERTURA     El hero se abre con una sola secuencia: el telón del marco sube y deja ver la
                      foto de portada tal como es (sin zoom), el título entra palabra por palabra
                      y el panel de la unidad aparece al final.
     2 · ARMADO       El banner se arma letra por letra con el scroll (cada letra llega desde su
                      propio lugar) y después las palabras derivan a distinta profundidad.
     3 · ODÓMETRO     Los números del sitio (reseñas, grupos, año del registro) giran como un
                      tablero de kilometraje y se asientan en su valor real.
     4 · VENTANA      Mapa e itinerario del local se abren como iris/ventana con el avance.
     5 · INERCIA      La velocidad y la dirección del scroll inclinan títulos y fotos de las
                      tarjetas y esconden/muestran el header.
     6 · CURSOR       Anillo con estados (ver, arrastrar, mover…), estiramiento direccional y
                      botones magnéticos.
     7 · RESORTE      La inercia del scroll es un resorte subamortiguado: al frenar, títulos y
                      fotos se pasan un poco y se asientan (banda elástica), en vez de frenar en seco.
     8 · FOTO FIEL    Las fotos del hero nunca se escalan, giran ni se atenúan: se ven al 100 %
                      de su calidad en la entrada, en el cambio de unidad y al hacer scroll.
     9 · COLUMNAS     En la grilla de unidades cada columna reacciona distinto a la velocidad
                      (la izquierda se atrasa, la derecha se adelanta) y se reacomoda al filtrar.
    10 · RECESIÓN     La sección que se va retrocede (escala, opacidad, ascenso) mientras la siguiente
                      la cubre; el pie sube por capas y se asienta justo al llegar al final.
    11 · HAZ          En Trayectoria el hito que se lee en el centro es el que brilla; los leídos se atenúan.
       + ROLL         El menú gira letra por letra al apuntarlo (copia aria-hidden, nombre accesible intacto).
       + ATERRIZAJE   Las anclas corrigen su destino al llegar si el layout se movió durante el viaje.

   REGLAS
     · Solo transform / opacity / clip-path. Cero lecturas de layout por frame.
     · prefers-reduced-motion: no se oculta ni se mueve nada.
     · Móvil: sin pines, sin efectos de mouse, distancias reducidas; el dedo siempre es nativo.
     · Contratos con el resto del sitio: eventos dr:hero / dr:vr, window.drScroll,
       clases html.m / html.mh / html.cm-reduce, <dialog id="dlg">.
   ════════════════════════════════════════════════════════════════════════════════════════ */
import { gsap, ScrollTrigger, Lenis } from "./vendor/gsap-stack.js";

gsap.registerPlugin(ScrollTrigger);
gsap.defaults({ overwrite: "auto" });
ScrollTrigger.config({ ignoreMobileResize: true, limitCallbacks: true });

/* ── Utilidades ─────────────────────────────────────────────────────────────────────── */
const root = document.documentElement;
/* PERF · Rueda del mouse: con Lenis (true) cada frame de scroll pasa por JS en el hilo principal y cualquier trabajo de pintado
   se nota como tirón. Con false el scroll de rueda es el nativo del navegador (corre en el compositor) y Lenis se usa solo
   para los saltos a anclas (menú, botones). Para volver al scroll suavizado de antes: poner true. */
const SMOOTH_WHEEL = false;
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
const MQ = {
  motion: "(prefers-reduced-motion: no-preference)",
  desktop: "(min-width: 900px)",
  fine: "(hover: hover) and (pointer: fine)"
};
const EASE = {
  expo: "expo.out", mask: "expo.inOut", soft: "power3.out", settle: "power2.out",
  spring: "back.out(1.7)", linear: "none", drive: "power3.in"
};
const qs = (selector, scope = document) => scope.querySelector(selector);
const qsa = (selector, scope = document) => [...scope.querySelectorAll(selector)];
const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const noop = () => {};

/* Aleatorio con semilla: las letras siempre «llegan» desde el mismo lugar (reproducible entre recargas). */
function seeded(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* Toma control de propiedades CSS inline (p. ej. anular una animación CSS que compite con GSAP)
   y devuelve la función que las restituye. */
function claim(targets, props) {
  const list = (Array.isArray(targets) ? targets : [targets]).filter(Boolean);
  const saved = [];
  list.forEach((el) => Object.entries(props).forEach(([name, value]) => {
    saved.push([el, name, el.style.getPropertyValue(name), el.style.getPropertyPriority(name)]);
    el.style.setProperty(name, value);
  }));
  return () => saved.forEach(([el, name, value, priority]) => (value ? el.style.setProperty(name, value, priority) : el.style.removeProperty(name)));
}

/* Dispara una vez al entrar (o al volver a entrar si la carga fue más abajo). */
function once(trigger, start, run) {
  let done = false;
  const fire = () => { if (done) return; done = true; run(); };
  return ScrollTrigger.create({ trigger, start, onEnter: fire, onEnterBack: fire, once: true });
}
function batch(targets, enter, { start = "top 90%", gap = 0.1, max = 6 } = {}) {
  if (!targets.length) return;
  ScrollTrigger.batch(targets, { start, interval: gap, batchMax: max, once: true, onEnter: enter, onEnterBack: enter });
}
const scrub = (trigger, start, end, extra = {}) => ({ trigger, start, end, scrub: true, ...extra });

/* ── Texto partido (palabras / letras) sin perder <em> ni <br>. Idempotente. ─────────────── */
const WORD = "mo-w", INNER = "mo-i", CHAR = "mo-c";
function split(element, { chars = false, skip = null } = {}) {
  if (!element) return [];
  if (element.dataset.moSplit) return qsa(chars ? `.${CHAR}` : `.${INNER}`, element);
  const label = element.textContent.replace(/\s+/g, " ").trim();
  const walk = (node) => {
    [...node.childNodes].forEach((child) => {
      if (child.nodeType === 3) {
        const fragment = document.createDocumentFragment();
        child.textContent.split(/(\s+)/).forEach((token) => {
          if (!token) return;
          if (/^\s+$/.test(token)) { fragment.appendChild(document.createTextNode(" ")); return; }
          const word = document.createElement("span"); word.className = WORD; word.setAttribute("aria-hidden", "true");
          const inner = document.createElement("span"); inner.className = INNER;
          if (chars) [...token].forEach((letter) => { const c = document.createElement("span"); c.className = CHAR; c.textContent = letter; inner.appendChild(c); });
          else inner.textContent = token;
          word.appendChild(inner); fragment.appendChild(word);
        });
        child.replaceWith(fragment);
      } else if (child.nodeType === 1 && child.tagName !== "BR" && !(skip && child.matches(skip))) walk(child);
    });
  };
  walk(element);
  element.setAttribute("aria-label", label);
  element.dataset.moSplit = chars ? "chars" : "words";
  return qsa(chars ? `.${CHAR}` : `.${INNER}`, element);
}

/* ════════════════════════════════════════════════════════════════════════════════════════
   INERCIA (firma 5) · velocidad y dirección del scroll compartidas
   Un solo bucle: lee el scroll una vez por frame, suaviza la velocidad y la reparte a los
   elementos visibles con quickSetter (sin tweens, sin lecturas de layout).
   ════════════════════════════════════════════════════════════════════════════════════════ */
function createInertia() {
  /* v = velocidad suavizada (cursor, lecturas). s/sv = resorte subamortiguado que persigue a v:
     al frenar el scroll, los elementos se pasan un poco y vuelven (efecto «banda elástica»). */
  const state = { v: 0, s: 0, sv: 0, dir: 1 };
  const items = new Map();
  let rest = true;
  const io = new IntersectionObserver((entries) => {
    entries.forEach((entry) => { const item = items.get(entry.target); if (item) item.vis = entry.isIntersecting; });
  }, { rootMargin: "15% 0px" });
  const drop = (el) => { io.unobserve(el); items.delete(el); };
  return {
    state,
    /* gain puede ser una función: se reevalúa en cada refresh (p. ej. columnas de una grilla responsive). */
    add(el, prop, gain, unit = "", max = Infinity) {
      return; /* sin efectos de inercia: los textos y tarjetas no se mueven al scrollear */
      if (!el || items.has(el)) return;
      const fn = typeof gain === "function" ? gain : null;
      items.set(el, { set: gsap.quickSetter(el, prop, unit), gain: fn ? fn() : gain, fn, max, vis: false });
      io.observe(el);
    },
    remove(el) { if (items.has(el)) drop(el); },
    refresh() {
      items.forEach((item, el) => { if (!el.isConnected) drop(el); else if (item.fn) item.gain = item.fn(); });
    },
    step(instant, dt = 1) {
      state.v += (instant - state.v) * (1 - Math.pow(0.84, dt));
      if (Math.abs(state.v) < 0.03) state.v = 0;
      if (instant !== 0) state.dir = instant > 0 ? 1 : -1;
      state.sv += (state.v - state.s) * 0.09 * dt;
      state.sv *= Math.pow(0.8, dt);
      state.s += state.sv * dt;
      const settled = state.v === 0 && Math.abs(state.s) < 0.02 && Math.abs(state.sv) < 0.02;
      if (settled) { state.s = 0; state.sv = 0; }
      if (settled && rest) return;
      rest = settled;
      items.forEach((item) => { if (item.vis || rest) item.set(clamp(state.s * item.gain, -item.max, item.max)); });
    },
    destroy() { io.disconnect(); items.forEach((item) => item.set(0)); items.clear(); }
  };
}

/* ════════════════════════════════════════════════════════════════════════════════════════
   SCROLL · Lenis → gsap.ticker → ScrollTrigger (un solo reloj, un solo loop)
   Touch queda nativo: el scroll del dedo nunca se toca.
   ════════════════════════════════════════════════════════════════════════════════════════ */
const easeOutExpo = (t) => (t === 1 ? 1 : 1 - Math.pow(2, -10 * t));

function initScroll({ desktop }) {
  const inertia = createInertia();
  const lenis = new Lenis({
    lerp: desktop ? 0.12 : 0.14,
    wheelMultiplier: 1,
    smoothWheel: SMOOTH_WHEEL,
    syncTouch: false,
    allowNestedScroll: true,
    autoRaf: false
  });

  let lastY = lenis.scroll;
  const tick = (time) => {
    lenis.raf(time * 1000);
    const y = lenis.scroll;
    const dt = Math.min(gsap.ticker.deltaRatio(), 4) || 1;
    inertia.step((y - lastY) / dt, dt);
    lastY = y;
  };
  lenis.on("scroll", ScrollTrigger.update);
  gsap.ticker.add(tick);
  const onRefresh = () => inertia.refresh();
  ScrollTrigger.addEventListener("refresh", onRefresh);
  gsap.ticker.lagSmoothing(0);

  const header = qs("header");
  const headerOffset = () => -(header?.offsetHeight || 0);
  const to = (target, options = {}) => {
    let distance = 800;
    if (typeof target === "number") distance = Math.abs(target - lenis.scroll);
    else if (target instanceof Element) distance = Math.abs(target.getBoundingClientRect().top + (options.offset || 0));
    const duration = options.duration ?? clamp(0.9 + distance / 3400, 1.1, 2.4);
    /* Aterrizaje exacto: Lenis calcula el destino al salir. Si el layout se movió durante el viaje (imágenes lazy,
       filtros, acordeones) se corrige al llegar con un tramo corto; máximo 2 reintentos para no oscilar. */
    const settle = (tries) => () => {
      if (!(target instanceof Element) || tries <= 0) return;
      const miss = target.getBoundingClientRect().top + (options.offset || 0);
      if (Math.abs(miss) > 4) lenis.scrollTo(target, { duration: 0.7, easing: easeOutExpo, ...options, onComplete: settle(tries - 1) });
    };
    return lenis.scrollTo(target, { duration, easing: easeOutExpo, ...options, onComplete: settle(2) });
  };

  const onClick = (event) => {
    if (event.defaultPrevented || event.button || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const link = event.target.closest?.('a[href^="#"]');
    if (!link) return;
    const hash = link.getAttribute("href");
    if (hash === "#" || hash === "#top") { event.preventDefault(); to(0); history.pushState(null, "", location.pathname + location.search); return; }
    let target = null;
    try { target = document.getElementById(decodeURIComponent(hash.slice(1))); } catch (e) { /* hash inválido */ }
    if (!target) return;                       // #unidad-… y similares los resuelve el sitio
    event.preventDefault();
    to(target, { offset: headerOffset() });
    history.pushState(null, "", hash);
  };
  document.addEventListener("click", onClick);

  /* La ficha (<dialog>) bloquea el scroll de fondo y conserva el suyo. */
  const dialog = qs("dialog");
  let observer = null;
  if (dialog) {
    dialog.setAttribute("data-lenis-prevent", "");
    observer = new MutationObserver(() => (dialog.open ? lenis.stop() : lenis.start()));
    observer.observe(dialog, { attributes: true, attributeFilter: ["open"] });
  }
  /* v11: el comparador (.tw) ya no se excluye de Lenis: sacar la rueda de Lenis sobre toda la sección hacía que el scroll se trabara. */

  /* Hash inicial (enlace compartido a una sección): se resuelve cuando el layout ya es definitivo. */
  const goHash = () => {
    if (location.hash.length < 2) return;
    let target = null;
    try { target = document.getElementById(decodeURIComponent(location.hash.slice(1))); } catch (e) { /* noop */ }
    if (target) lenis.scrollTo(target, { offset: headerOffset(), immediate: true, force: true });
  };
  if (document.readyState === "complete") requestAnimationFrame(goHash);
  else window.addEventListener("load", () => setTimeout(goHash, 60), { once: true });

  window.drScroll = { to, lenis };
  return {
    lenis, inertia,
    dispose() {
      document.removeEventListener("click", onClick);
      observer?.disconnect();
      gsap.ticker.remove(tick);
      ScrollTrigger.removeEventListener("refresh", onRefresh);
      inertia.destroy();
      lenis.destroy();
      if (window.drScroll?.lenis === lenis) delete window.drScroll;
    }
  };
}

/* ════════════════════════════════════════════════════════════════════════════════════════
   NAVEGACIÓN · sombra, header por dirección (con histéresis) y scrollspy
   ════════════════════════════════════════════════════════════════════════════════════════ */
function initNavigation() {
  const header = qs("header");
  if (!header) return noop;
  let hidden = false;
  const setHidden = (value) => {
    if (value === hidden) return;
    hidden = value;
    gsap.to(header, { yPercent: value ? -100 : 0, duration: value ? 0.5 : 0.6, ease: value ? "power3.in" : EASE.expo, overwrite: "auto" });
  };
  const onFocus = () => setHidden(false);
  header.addEventListener("focusin", onFocus);

  const ctx = gsap.context(() => {
    ScrollTrigger.create({ start: 8, end: "max", onToggle: (self) => header.classList.toggle("s", self.isActive) });

    /* El header queda siempre fijo y visible (sin esconderse al bajar). */

    qsa('nav a[href^="#"]', header).forEach((link) => {
      const section = document.getElementById(link.getAttribute("href").slice(1));
      if (!section) return;
      ScrollTrigger.create({
        trigger: section, start: "top 46%", end: "bottom 46%",
        onToggle: (self) => (self.isActive ? link.setAttribute("aria-current", "true") : link.removeAttribute("aria-current"))
      });
    });
  });
  return () => { header.removeEventListener("focusin", onFocus); gsap.set(header, { clearProps: "transform" }); header.classList.remove("s"); ctx.revert(); };
}

/* ════════════════════════════════════════════════════════════════════════════════════════
   CAMBIO DE DIAPOSITIVA con cortina de máscara (hero: dr:hero · Vender/permutar: dr:vr)
   El sitio solo alterna .on y avisa por evento; acá vive la coreografía.
   ════════════════════════════════════════════════════════════════════════════════════════ */
function bindSlides({ event, frame, slide, ctx, axis = "x", extra }) {
  if (!frame) return noop;
  let swap = null;
  const onChange = (e) => {
    const { from, to, dir = 1 } = e.detail || {};
    const slides = qsa(slide, frame);
    const next = slides[to] || qs(`${slide}.on`, frame), prev = slides[from];
    if (!next) return;
    ctx.add(() => {
      swap?.progress(1).kill();
      frame.classList.add("mo-swap");
      const img = qs("img", next), prevImg = prev ? qs("img", prev) : null;
      const hidden = axis === "x" ? (dir > 0 ? "inset(0 0 0 100%)" : "inset(0 100% 0 0)") : (dir > 0 ? "inset(100% 0 0 0)" : "inset(0 0 100% 0)");
      if (prev) gsap.set(prev, { autoAlpha: 1, zIndex: 1 });
      gsap.set(next, { zIndex: 2, autoAlpha: 1, clipPath: hidden });
      swap = gsap.timeline({
        onComplete: () => {
          if (prev) gsap.set(prev, { clearProps: "opacity,visibility,zIndex" });
          if (prevImg) gsap.set(prevImg, { clearProps: "transform" });
          gsap.set(next, { clearProps: "opacity,visibility,zIndex,clipPath" });
          requestAnimationFrame(() => frame.classList.remove("mo-swap"));
        }
      });
      swap.to(next, { clipPath: "inset(0 0 0 0)", duration: 1.05, ease: EASE.mask }, 0);
      /* La foto que sale se desplaza hacia el lado opuesto: dos planos que se cruzan. */
      if (prevImg) swap.to(prevImg, { xPercent: axis === "x" ? -dir * 9 : 0, yPercent: axis === "y" ? -dir * 9 : 0, scale: 1.08, duration: 1.05, ease: EASE.mask, overwrite: false }, 0);
      if (img) swap.fromTo(img, { scale: 1.3, xPercent: axis === "x" ? dir * 4 : 0, yPercent: axis === "y" ? dir * 4 : 0 }, { scale: 1, xPercent: 0, yPercent: 0, duration: 1.7, ease: EASE.expo }, 0);
      extra?.(swap, { next, prev, dir });
    });
  };
  document.addEventListener(event, onChange);
  return () => { document.removeEventListener(event, onChange); swap?.kill(); frame.classList.remove("mo-swap"); };
}

/* ════════════════════════════════════════════════════════════════════════════════════════
   HERO (firma 1 · APERTURA)
   El HTML y el carrusel viven en index.html (bloque «Hero v10»); acá solo está la entrada.
   Una única secuencia: header, telón de la foto, logo, palabras del título, bajada, botones y
   panel de la unidad. La foto no se escala ni se atenúa en ningún momento (se ve a calidad real),
   no se descargan las demás unidades para animarlas y no hay pin ni salida por scroll: el hero
   entra completo en la pantalla y se va con el scroll normal.
   ════════════════════════════════════════════════════════════════════════════════════════ */
let introPlayed = false;

function initHero() {
  const hero = qs(".hero");
  if (!hero) { root.classList.remove("mh"); return noop; }

  const logo = qs(".hx-logo", hero), title = qs(".hx-h1", hero), lead = qs(".hx-lead", hero);
  const go = qs(".hx-go", hero), info = qs(".hx-info", hero), veil = qs(".hx-veil", hero);
  const headerItems = qsa("header .w > *");
  const words = split(title, { skip: ".sr" });
  const goItems = go ? [...go.children] : [];
  const infoItems = info ? [...info.children] : [];

  const ctx = gsap.context(() => {});
  ctx.add(() => {
    if (introPlayed) { root.classList.remove("mh"); return; }
    introPlayed = true;

    /* Estado inicial. El CSS mantiene oculto el texto con .mh hasta este punto; la foto está pintada desde el
       primer frame (el telón la cubre), así que la imagen principal no espera al JS para empezar a descargarse. */
    if (headerItems.length) gsap.set(headerItems, { yPercent: -120, opacity: 0 });
    if (logo) gsap.set(logo, { opacity: 0, y: 12 });
    if (words.length) gsap.set(words, { yPercent: 118, rotate: 4, transformOrigin: "0% 100%" });
    if (lead) gsap.set(lead, { opacity: 0, y: 18 });
    if (goItems.length) gsap.set(goItems, { opacity: 0, y: 16 });
    if (infoItems.length) gsap.set(infoItems, { opacity: 0, y: 16 });
    if (veil) gsap.set(veil, { display: "block", yPercent: 0 });
    root.classList.remove("mh");

    const clean = [logo, lead, ...words, ...goItems, ...infoItems, veil, ...headerItems].filter(Boolean);
    /* Solo se animan los elementos que existen (GSAP avisa "target not found" con null o listas vacías). */
    const tl = gsap.timeline({
      defaults: { ease: EASE.soft },
      onComplete: () => { gsap.set(clean, { clearProps: "all" }); ScrollTrigger.refresh(); }
    });
    tl.to(headerItems, { yPercent: 0, opacity: 1, duration: 0.9, stagger: 0.07, ease: EASE.expo }, 0);
    if (veil) tl.to(veil, { yPercent: -100, duration: 1.25, ease: EASE.mask }, 0.1);
    if (logo) tl.to(logo, { opacity: 1, y: 0, duration: 0.8 }, 0.3);
    tl.to(words, { yPercent: 0, rotate: 0, duration: 1.05, ease: EASE.expo, stagger: 0.055 }, 0.4)
      .to(lead, { opacity: 1, y: 0, duration: 0.9 }, 0.85)
      .to(goItems, { opacity: 1, y: 0, duration: 0.8, stagger: 0.1 }, 1.0);
    if (infoItems.length) tl.to(infoItems, { opacity: 1, y: 0, duration: 0.8, stagger: 0.1 }, 1.0);
  });

  return () => { ctx.revert(); };
}

/* ════════════════════════════════════════════════════════════════════════════════════════
   TIPOGRAFÍA · cada título entra con la personalidad de su sección
   ════════════════════════════════════════════════════════════════════════════════════════ */
function initTypography({ desktop }, inertia) {
  const undo = [];
  const ctx = gsap.context(() => {
    /* Las animaciones CSS por view() de estos bloques compiten con GSAP: se anulan donde GSAP toma el control. */
    undo.push(claim(qsa(".xt .xl, .xt .xk, .xb .xp, .xb .xs, .loc .xt, .loc .xb"), { animation: "none" }));

    const R = seeded(11);
    qsa("main section h2").forEach((heading) => {
      if (heading.closest("#bd, [hidden]") || heading.querySelector("img,svg,button,a")) return;
      const section = heading.closest("section");
      const id = section?.id || "";
      const start = desktop ? "top 88%" : "top 94%";

      /* UNIDADES: letras en 3D que caen desde el centro hacia los costados. */
      if (id === "unidades") {
        const chars = split(heading, { chars: true });
        if (!chars.length) return;
        gsap.set(chars, { yPercent: 120, rotate: () => (R() - 0.5) * 36, transformOrigin: "0% 100%" });
        once(heading, start, () => gsap.to(chars, { yPercent: 0, rotate: 0, duration: 1.2, ease: EASE.expo, stagger: { each: 0.045, from: "center" } }));
        inertia?.add(heading, "skewY", -0.35, "deg", 3);
        return;
      }

      const words = split(heading);
      if (!words.length || words.length > 24) return;
      inertia?.add(heading, "skewY", -0.3, "deg", 2.6);

      /* MODELOS: las palabras se cruzan desde los costados, alternando sentido. */
      if (id === "modelos") {
        gsap.set(words, { xPercent: (i) => (i % 2 ? 110 : -110), opacity: 0 });
        once(heading, start, () => gsap.to(words, { xPercent: 0, opacity: 1, duration: 1.15, ease: EASE.expo, stagger: 0.08 }));
        return;
      }
      /* COMPARAR: llegan «desde atrás», con escala y rebote corto. */
      if (id === "versus") {
        gsap.set(words, { yPercent: 40, scale: 0.55, opacity: 0, transformOrigin: "50% 100%" });
        once(heading, start, () => gsap.to(words, { yPercent: 0, scale: 1, opacity: 1, duration: 1.2, ease: "back.out(1.5)", stagger: 0.07 }));
        return;
      }
      /* NOSOTROS: ascenso con skew que se endereza (tipografía «de imprenta»). */
      if (id === "nosotros") {
        gsap.set(words, { yPercent: 125, skewX: -14, transformOrigin: "0% 100%" });
        once(heading, start, () => gsap.to(words, { yPercent: 0, skewX: 0, duration: 1.15, ease: EASE.expo, stagger: 0.055 }));
        return;
      }
      /* Resto: máscara ascendente con giro corto. */
      gsap.set(words, { yPercent: 118, rotate: 3.5, transformOrigin: "0% 100%" });
      once(heading, start, () => gsap.to(words, { yPercent: 0, rotate: 0, duration: 1.05, ease: EASE.expo, stagger: desktop ? 0.05 : 0.035 }));
    });

    /* Declaraciones (.xl): el scroll las «lee»: cada palabra sube dentro de su máscara y se enciende. */
    qsa(".xl, .xb .xp").forEach((statement) => {
      const words = split(statement);
      if (!words.length) return;
      gsap.set(words, { opacity: 0.12, yPercent: 46 });
      gsap.to(words, {
        opacity: 1, yPercent: 0, ease: EASE.linear, stagger: 0.12, overwrite: false,
        scrollTrigger: scrub(statement, desktop ? "top 84%" : "top 92%", desktop ? "bottom 46%" : "bottom 60%")
      });
      if (desktop && statement.matches(".xl")) inertia?.add(statement, "skewY", -0.22, "deg", 1.8);
    });

    /* Eyebrows: se destapan con un wipe horizontal (distinto al ascenso de los títulos). */
    const eyebrows = qsa("main section :is(.ey, .pde, .pdt, .xk)").filter((el) => !el.closest(".hero"));
    if (eyebrows.length) gsap.set(eyebrows, { clipPath: "inset(0 100% 0 0)", x: -14 });
    if (eyebrows.length) batch(eyebrows, (group) => gsap.to(group, { clipPath: "inset(0 0% 0 0)", x: 0, duration: 0.95, ease: EASE.mask, stagger: 0.08, clearProps: "clipPath,transform" }), { start: "top 94%" });
  });
  return () => { undo.forEach((fn) => fn()); ctx.revert(); };
}

/* ════════════════════════════════════════════════════════════════════════════════════════
   ARMADO (firma 2) · el banner se construye con el scroll
   Cada letra llega desde su propio lugar (con semilla), y una vez armado el título las palabras
   derivan a distinta profundidad mientras el banner cruza la pantalla.
   (El banner mide más que la ventana: no se ancla, el scroll es el que lo arma.)
   ════════════════════════════════════════════════════════════════════════════════════════ */
function initBanner({ desktop }) {
  const banner = qs("#bd");
  if (!banner) return noop;
  const undo = [];
  const ctx = gsap.context(() => {
    const title = qs("h2", banner);
    const chars = split(title, { chars: true });
    const words = qsa(`.${WORD}`, title);
    const eyebrow = qs(".bdk", banner), brand = qs(".bde", banner), lead = qs(".bdp", banner);
    const rest = [qs(".btn", banner), qs(".bdf", banner)].filter(Boolean);
    undo.push(claim([eyebrow, lead, qs(".bdf", banner)], { animation: "none" }));

    const R = seeded(23);
    const spread = desktop ? 1 : 0.5;
    const origin = chars.map(() => ({ x: (R() - 0.5) * Math.min(innerWidth * 0.42, 520) * spread, y: (R() - 0.5) * Math.min(innerHeight * 0.5, 360) * spread, rotation: (R() - 0.5) * 170, scale: 0.35 + R() * 1.5 }));

    gsap.set(words, { overflow: "visible" });                  // las letras vuelan fuera de su máscara
    gsap.set(chars, { x: (i) => origin[i].x, y: (i) => origin[i].y, rotation: (i) => origin[i].rotation, scale: (i) => origin[i].scale, opacity: 0, transformOrigin: "50% 50%" });
    gsap.set([eyebrow, brand, lead, ...rest], { opacity: 0, y: 34 });

    if (desktop) {
      /* Acto 1 · las letras se arman mientras el título sube por la pantalla */
      gsap.timeline({ defaults: { ease: EASE.linear }, scrollTrigger: scrub(title, "top 92%", "top 36%") })
        .to(brand, { opacity: 1, y: 0, duration: 0.45, ease: EASE.soft }, 0)
        .to(chars, { x: 0, y: 0, rotation: 0, scale: 1, opacity: 1, duration: 0.85, ease: "power3.out", stagger: { amount: 0.55, from: "random" } }, 0.1);

      /* Acto 2 · el resto de la escena aparece con el avance */
      gsap.timeline({ defaults: { ease: EASE.soft }, scrollTrigger: scrub(title, "top 60%", "bottom 30%") })
        .to(eyebrow, { opacity: 1, y: 0, duration: 0.5 }, 0)
        .to(lead, { opacity: 1, y: 0, duration: 0.6 }, 0.25)
        .to(rest, { opacity: 1, y: 0, duration: 0.5, stagger: 0.2 }, 0.55);

      /* Acto 3 · derivan las palabras (profundidad): cada una a su velocidad */
      words.forEach((word, i) => {
        const depth = (i % 3 - 1) * 26 + (i % 2 ? 8 : -8);
        gsap.fromTo(word, { y: depth }, { y: -depth, ease: EASE.linear, overwrite: false, scrollTrigger: scrub(banner, "top bottom", "bottom top") });
      });
    } else {
      gsap.timeline({
        scrollTrigger: { trigger: title, start: "top 85%", once: true }
      })
        .to(brand, { opacity: 1, y: 0, duration: 0.6, ease: EASE.soft }, 0)
        .to(chars, { x: 0, y: 0, rotation: 0, scale: 1, opacity: 1, duration: 1.1, ease: EASE.expo, stagger: { amount: 0.5, from: "random" } }, 0.1)
        .to([eyebrow, lead, ...rest], { opacity: 1, y: 0, duration: 0.7, ease: EASE.soft, stagger: 0.12 }, 0.5);
    }
  });
  return () => { undo.forEach((fn) => fn()); ctx.revert(); };
}

/* ════════════════════════════════════════════════════════════════════════════════════════
   COSTURAS · cada sección se apoya sobre la anterior (transición continua)
   Oscuras: hoja que se ensancha con esquinas redondeadas. Claras: el contenido sube desde atrás.
   ════════════════════════════════════════════════════════════════════════════════════════ */
/* FONDOS ÚNICOS · un plano fotográfico por sección, sin repetir imágenes. */
function initSectionBackdrops({ desktop }) {
  /* Secciones en color sólido (sin foto): unidades, modelos, trayectoria, contacto (lo cubre el mapa), local, como-comprar, operaciones, equipo, preguntas.
     El resto lleva una foto de interior; con 6 fotos y 9 secciones se reutilizan, nunca en secciones contiguas. */
  const sources = { versus:"images/bg/stock-1.webp", entregas:"images/bg/stock-2.webp", nosotros:"images/bg/stock-3.webp", opiniones:"images/bg/stock-5.webp", bd:"images/bg/stock-6.webp", financiacion:"images/bg/stock-1.webp", guia:"images/bg/stock-4.webp", visita:"images/bg/stock-3.webp" };
  const dark = new Set(["versus","entregas","contacto","bd","financiacion","guia","visita"]);
  const veil = (id) => dark.has(id) ? "linear-gradient(rgba(6,17,26,.74),rgba(6,17,26,.74))" : "linear-gradient(rgba(243,245,246,.82),rgba(243,245,246,.82))";
  const mobile = !desktop, clean = [];
  qsa("main > section").forEach((section, index) => {
    const src = sources[section.id]; if (!src) return;
    section.style.position = "relative"; section.style.isolation = "isolate";
    const layer = document.createElement("div"); layer.className = "dr-section-backdrop"; layer.setAttribute("aria-hidden", "true");
    layer.style.cssText = ["position:absolute","inset:0","z-index:0","pointer-events:none","overflow:clip",`background-image:${veil(section.id)}`,"background-size:cover",`background-position:${index % 2 ? "58% 46%" : "42% 54%"}`,"background-repeat:no-repeat","opacity:1!important","filter:none!important","transform:scale(1.04)","transform-origin:50% 50%","will-change:transform"].join(";");
    section.prepend(layer);
    /* La foto se pide solo cuando la sección está cerca del viewport (antes bajaban las 5 al abrir el sitio). */
    const paint = () => { layer.style.backgroundImage = `${veil(section.id)},url(${src})`; };
    if ("IntersectionObserver" in window) {
      const io = new IntersectionObserver((entries) => { if (entries.some((e) => e.isIntersecting)) { io.disconnect(); paint(); } }, { rootMargin: "1200px 0px" });
      io.observe(section); clean.push(() => io.disconnect());
    } else paint();
    const tween = gsap.fromTo(layer,{yPercent:mobile?-1.5:-3,scale:1.04},{yPercent:mobile?1.5:3,scale:1.04,ease:EASE.linear,immediateRender:true,scrollTrigger:scrub(section,"top 104%","bottom -8%")});
    clean.push(() => { tween.kill(); layer.remove(); section.style.removeProperty("position"); section.style.removeProperty("isolation"); });
  });
  return () => clean.forEach((fn) => fn());
}

/* MAPA · carga anticipada y visible sin depender de un clic. */
function initMapExperience() {
  const map = qs("#contacto .mp"), iframe = qs("#contacto .mp iframe");
  if (!map || !iframe) return noop;
  let observer = null, fallback = 0;
  const reveal = () => {
    if (!iframe.src && iframe.dataset.src) { iframe.addEventListener("load", () => map.classList.add("rd"), { once:true }); iframe.src = iframe.dataset.src; iframe.removeAttribute("data-src"); }
    map.classList.add("rd"); fallback = window.setTimeout(() => map.classList.add("rd"), 1200);
  };
  const onPointer = () => reveal(); map.addEventListener("pointerdown", onPointer, { passive:true }); map.addEventListener("click", onPointer, { passive:true });
  if ("IntersectionObserver" in window) { observer = new IntersectionObserver((entries) => { if (entries.some((e) => e.isIntersecting)) { observer.disconnect(); reveal(); } }, { rootMargin:"900px 0px" }); observer.observe(map); } else window.addEventListener("load", reveal, { once:true });
  return () => { observer?.disconnect(); window.clearTimeout(fallback); map.removeEventListener("pointerdown", onPointer); map.removeEventListener("click", onPointer); };
}

function initSeams({ desktop }) {
  const SHEET = new Set(["versus", "financiacion", "guia", "visita"]); /* "contacto" (mapa) fuera: un recorte animado repinta el iframe en cada frame */
  const ctx = gsap.context(() => {
    qsa("main > section").forEach((section) => {
      if (section.id === "unidades" || section.id === "contacto" || section.id === "bd" || section.classList.contains("bd")) return;
      const inner = qs(":scope > .w", section);
      const k = desktop ? 1 : 0.45;

      if (SHEET.has(section.id)) {
        gsap.fromTo(section,
          { clipPath: desktop ? "inset(0% 5% 0% 5% round 44px 44px 0px 0px)" : "inset(0% 3% 0% 3% round 26px 26px 0px 0px)" },
          { clipPath: "inset(0% 0% 0% 0% round 0px 0px 0px 0px)", ease: EASE.linear, immediateRender: true, scrollTrigger: scrub(section, "top 100%", "top 38%") });
      }
      if (inner && section.id !== "versus") {
        gsap.fromTo(inner, { y: 90 * k }, { y: 0, ease: EASE.linear, immediateRender: false, scrollTrigger: scrub(section, "top 100%", "top 42%") });
      }
    });

    /* RECESIÓN: la sección que se va no desaparece de golpe: su contenido retrocede (escala, opacidad, leve
       ascenso) mientras la siguiente la cubre. Escala y opacidad no las toca ningún otro efecto del contenedor.
       Se omiten Unidades (portón), el banner, Modelos (panel sticky) y la última antes del pie. */
    const k2 = desktop ? 1 : 0.5;
    qsa("main > section").forEach((section) => {
      if (["unidades", "bd", "modelos", "preguntas", "contacto", "como-comprar", "entregas"].includes(section.id) || section.classList.contains("bd")) return;
      const inner = qs(":scope > .w", section);
      if (!inner) return;
      gsap.fromTo(inner,
        { scale: 1, opacity: 1, yPercent: 0, transformOrigin: "50% 100%" },
        { scale: 1 - 0.05 * k2, opacity: desktop ? 0.4 : 0.55, yPercent: -2.2 * k2, ease: EASE.linear, overwrite: false, immediateRender: false, scrollTrigger: scrub(section, "bottom 78%", "bottom 6%") });
    });

    /* Comparar entra «desde atrás»: escala + profundidad (más teatral que el resto). */
    const versus = qs("#versus > .w");
    if (versus) gsap.fromTo(versus, { y: desktop ? 110 : 40, scale: desktop ? 0.93 : 0.98, transformOrigin: "50% 0%" }, { y: 0, scale: 1, ease: EASE.linear, immediateRender: false, scrollTrigger: scrub("#versus", "top 100%", "top 28%") });
  });
  return () => ctx.revert();
}

/* ════════════════════════════════════════════════════════════════════════════════════════
   REVELADOS · cada familia de elementos entra con su propio gesto
   ════════════════════════════════════════════════════════════════════════════════════════ */
/* ENTRADAS DE SECCIÓN · una firma distinta por sección, siempre ligada al scroll. */
function initSectionEntrances({ desktop }) {
  const k = desktop ? 1 : .55;
  const ctx = gsap.context(() => {});
  const recipes = {
    unidades:(s,i)=>gsap.fromTo(i,{y:60*k},{y:0,ease:EASE.linear,clearProps:"transform",scrollTrigger:scrub(s,"top 96%","top 60%")}),
    modelos:(s,i)=>gsap.fromTo(i,{x:-90*k,clipPath:"inset(0 100% 0 0)"},{x:0,clipPath:"inset(0 0% 0 0)",ease:EASE.linear,scrollTrigger:scrub(s,"top 94%","top 42%")}),
    versus:(s,i)=>gsap.fromTo(i,{scale:.82,rotateY:desktop?-12:0,opacity:.2,transformPerspective:1400},{scale:1,rotateY:0,opacity:1,ease:EASE.linear,scrollTrigger:scrub(s,"top 100%","top 32%")}),
    nosotros:(s,i)=>gsap.fromTo(i,{y:100*k,clipPath:"inset(14% 0 0 0)"},{y:0,clipPath:"inset(0% 0 0 0)",ease:EASE.linear,scrollTrigger:scrub(s,"top 96%","top 38%")}),
    trayectoria:(s,i)=>gsap.fromTo(i,{x:80*k,opacity:.25},{x:0,opacity:1,ease:EASE.linear,scrollTrigger:scrub(s,"top 95%","top 40%")}),
        local:(s,i)=>gsap.fromTo(i,{x:-70*k,skewX:desktop?-3:0},{x:0,skewX:0,ease:EASE.linear,scrollTrigger:scrub(s,"top 96%","top 36%")}),
    opiniones:(s,i)=>gsap.fromTo(i,{y:-70*k,rotateX:desktop?-8:0,transformPerspective:1000},{y:0,rotateX:0,ease:EASE.linear,scrollTrigger:scrub(s,"top 96%","top 42%")}),
    bd:(s,i)=>gsap.fromTo(i,{scale:.7,opacity:.1,rotate:desktop?-3:0},{scale:1,opacity:1,rotate:0,ease:EASE.linear,scrollTrigger:scrub(s,"top 102%","top 46%")}),
    financiacion:(s,i)=>gsap.fromTo(i,{scale:.9,y:60*k},{scale:1,y:0,ease:EASE.linear,scrollTrigger:scrub(s,"top 96%","top 40%")}),
    guia:(s,i)=>gsap.fromTo(i,{clipPath:"circle(10% at 50% 50%)",scale:1.12},{clipPath:"circle(76% at 50% 50%)",scale:1,ease:EASE.linear,scrollTrigger:scrub(s,"top 100%","top 40%")}),
    equipo:(s,i)=>gsap.fromTo(i,{x:-65*k,y:55*k,opacity:.15},{x:0,y:0,opacity:1,ease:EASE.linear,scrollTrigger:scrub(s,"top 96%","top 40%")}),
    visita:(s,i)=>gsap.fromTo(i,{y:110*k,clipPath:"inset(100% 0 0 0)"},{y:0,clipPath:"inset(0% 0 0 0)",ease:EASE.linear,scrollTrigger:scrub(s,"top 98%","top 42%")}),
    preguntas:(s,i)=>gsap.fromTo(i,{scale:.94,y:45*k,opacity:.35},{scale:1,y:0,opacity:1,ease:EASE.linear,scrollTrigger:scrub(s,"top 96%","top 44%")})
  };
  ctx.add(() => {
    qsa("main > section").forEach((section) => { const inner=qs(":scope > .w",section)||section.querySelector(":scope > .bdm"), recipe=recipes[section.id]; if(recipe&&inner) recipe(section,inner); });
  });
  return () => ctx.revert();
}

function initReveals({ desktop }, inertia) {
  const d = desktop ? 1 : 0.55;
  let observer = null, timer = 0;
  const undo = [];

  const ctx = gsap.context(() => {
    /* STOCK · abanico por columna: la tarjeta sube, la foto se destapa y el interior se acerca. */
    const grid = qs("#stockGrid");
    const colCount = () => Math.max(1, (getComputedStyle(grid).gridTemplateColumns || "").split(" ").filter(Boolean).length);
    const prepare = (cards) => {
      cards.forEach((card) => { card.dataset.mo = "1"; card.dataset.mr = "p"; });
      /* v11: las tarjetas nacen visibles y quietas (sin clip, zoom ni opacidad): las fotos ya no rebotan ni titilan. */
    };
    const play = (group) => {
      const cols = grid ? colCount() : 1;
      const tl = gsap.timeline();
      group.forEach((card, i) => {
        const col = Array.prototype.indexOf.call(card.parentNode.children, card) % cols;
        const at = i * 0.09, frame = qs(".im", card), ct = qs(".ct", card);
        gsap.set(card, { x: (col - (cols - 1) / 2) * 26 * d });
        tl.to(card, { opacity: 1, y: 0, x: 0, rotationX: 0, duration: 1.15, ease: EASE.expo, clearProps: "opacity,transform", onComplete: () => card.removeAttribute("data-mr") }, at);
        if (frame) tl.to(frame, { clipPath: "inset(0 0 0% 0)", duration: 1.2, ease: EASE.mask, clearProps: "clipPath" }, at + 0.06);
        if (ct) tl.to(ct, { scale: 1, duration: 1.7, ease: EASE.expo, clearProps: "scale" }, at + 0.06);
      });
    };
    const cards = qsa(".car", grid || document);
    prepare(cards);
    void play;

    /* COLUMNAS: cada columna de la grilla responde distinto a la velocidad del scroll (la de la izquierda
       se atrasa, la de la derecha se adelanta) y se acomodan con el resorte al frenar. Solo desktop. */
    const columnDrift = (card) => inertia?.add(card, "yPercent", () => {
      const n = grid ? colCount() : 1;
      if (n < 2) return 0;
      /* El filtro del sitio oculta (hidden) y reordena las mismas tarjetas: la columna se cuenta solo entre las visibles. */
      const col = [...grid.children].filter((c) => !c.hidden).indexOf(card);
      return col < 0 ? 0 : ((col % n) - (n - 1) / 2) * 0.1;
    }, "", 5);
    void columnDrift;

    /* Filtros / orden vuelven a pintar la grilla: las tarjetas nuevas entran en cascada corta. */
    if (grid) {
      observer = new MutationObserver(() => {
        clearTimeout(timer);
        timer = setTimeout(() => {
          inertia?.refresh();                       // filtros / orden: las columnas se reasignan al nuevo acomodo
          const fresh = qsa(".car:not([data-mo])", grid);
          if (!fresh.length) return;
          fresh.forEach((card) => { card.dataset.mo = "1"; });
          ScrollTrigger.refresh();
        }, 60);
      });
      observer.observe(grid, { childList: true });
    }

    /* MODELOS · las filas entran desde la izquierda, una tras otra. */
    const rows = qsa("#mdl > li");
    void rows;

    /* RESEÑAS · caída con perspectiva; las estrellas se encienden una a una. */
    const reviews = qsa("#opiniones .rvc");
    if (reviews.length) gsap.set(reviews, { opacity: 0, y: -30 * d, rotationX: desktop ? -16 : 0, transformPerspective: 900, transformOrigin: "50% 0%" });
    reviews.forEach((card) => { const stars = qsa(".rvs svg", card); if (stars.length) gsap.set(stars, { scale: 0, rotate: -50, transformOrigin: "50% 55%" }); });
    batch(reviews, (g) => g.forEach((card, i) => {
      gsap.to(card, { opacity: 1, y: 0, rotationX: 0, duration: 1, ease: "power4.out", delay: i * 0.12, clearProps: "opacity,transform" });
      const stars = qsa(".rvs svg", card);
      if (stars.length) gsap.to(stars, { scale: 1, rotate: 0, duration: 0.6, ease: "back.out(2.4)", stagger: 0.09, delay: i * 0.12 + 0.35 });
    }), { start: "top 92%" });

    /* PRECIO Y PAGO · vienen «desde atrás» (escala). */
    const pay = qsa("#financiacion .pdc");
    if (pay.length) gsap.set(pay, { opacity: 0, scale: 0.86, y: 40 * d, transformOrigin: "50% 60%" });
    if (pay.length) batch(pay, (g) => gsap.to(g, { opacity: 1, scale: 1, y: 0, duration: 1.05, ease: "power3.out", stagger: 0.14, clearProps: "opacity,transform" }));

    /* CÓMO TRABAJAMOS / EQUIPO · pasos con marcador que «pega» un rebote. */
    [["#historia .hwl li", 0.16], ["#equipo .eqk li", 0.12]].forEach(([selector, gap]) => {
      const steps = qsa(selector);
      if (!steps.length) return;
      gsap.set(steps, { opacity: 0, y: 32 * d });
      steps.forEach((step) => { const mark = qs("span", step); if (mark) gsap.set(mark, { scale: 0.2, rotate: 90 }); });
      batch(steps, (g) => {
        gsap.to(g, { opacity: 1, y: 0, duration: 0.95, ease: EASE.soft, stagger: gap, clearProps: "opacity,transform" });
        gsap.to(g.map((s) => qs("span", s)).filter(Boolean), { scale: 1, rotate: 0, duration: 0.8, ease: "back.out(2.6)", stagger: gap, delay: 0.15, clearProps: "transform" });
      }, { start: "top 88%", max: 4 });
    });

    /* Textos secundarios: ascenso corto. */
    const body = qsa("main section :is(.sub, .pdl > p, .mdt, .oh > p, .rvh > p, .eqh > p, .hwh > p, .pdr)").filter((el) => !el.closest(".hero"));
    gsap.set(body, { opacity: 0, y: 26 * d });
    batch(body, (g) => gsap.to(g, { opacity: 1, y: 0, duration: 0.95, ease: EASE.soft, stagger: 0.07, clearProps: "opacity,transform" }), { start: "top 92%" });

    /* Formulario de visita y pie. */
    const form = qs("#visitaForm");
    if (form) {
      gsap.set(form, { opacity: 0, y: 64 * d, scale: 0.96, transformOrigin: "50% 100%" });
      once(form, "top 90%", () => gsap.to(form, { opacity: 1, y: 0, scale: 1, duration: 1.25, ease: EASE.expo, clearProps: "opacity,transform" }));
    }
    /* CORTINA DEL PIE: cada capa del pie (logo, dirección, enlaces, avisos) sube a su propia velocidad y se
       asienta justo al llegar al final de la página. «bottom bottom» siempre es alcanzable: nunca queda a medias. */
    const footer = qs("footer"), foot = qs("footer > .w");
    if (footer && foot) {
      const layers = [...foot.children];
      gsap.fromTo(layers,
        { yPercent: (i) => 26 + i * 16, opacity: 0 },
        { yPercent: 0, opacity: 1, ease: "power2.out", stagger: { each: 0.12 }, immediateRender: true, scrollTrigger: scrub(footer, "top 98%", "bottom bottom") });
    }
  });
  return () => { clearTimeout(timer); observer?.disconnect(); undo.forEach((fn) => fn()); ctx.revert(); };
}

/* ════════════════════════════════════════════════════════════════════════════════════════
   PARALLAX MULTICAPA + IMÁGENES QUE SE TRANSFORMAN + VENTANA (firma 4)
   Cada plano con su propia velocidad; los marcos se abren con el avance.
   ════════════════════════════════════════════════════════════════════════════════════════ */
function initParallax({ desktop }) {
  const k = desktop ? 1 : 0.45;
  const undo = [];
  const ctx = gsap.context(() => {
    /* NOSOTROS · el marco gira y se acomoda; la foto se «abre» desde un arco y se desplaza dentro (3 planos). */
    const frame = qs("#nph"), photo = qs("#nph img"), column = frame?.nextElementSibling;
    if (frame && photo) {
      /* v11: foto y texto de «Quiénes somos» quedan quietos para medir exactamente lo mismo (sin giro, zoom, recorte ni parallax). */
      void column;
    }
    /* Las tres líneas (Usados / Permutas / Consignaciones) se destapan con un wipe controlado por el scroll. */
    qsa("#nosotros .pl > div").forEach((row) => {
      gsap.fromTo(row, { clipPath: "inset(0 100% 0 0)" }, { clipPath: "inset(0 0% 0 0)", ease: EASE.linear, immediateRender: true, scrollTrigger: scrub(row, "top 98%", "top 86%") });
    });

    /* TRAYECTORIA · cada hito se destapa con el scroll y su año se desliza desde la izquierda. */
    qsa("#trayectoria .arl li").forEach((item) => {
      gsap.fromTo(item, { clipPath: "inset(0 0 100% 0)", opacity: 0.2 }, { clipPath: "inset(0 0 0% 0)", opacity: 1, ease: EASE.linear, immediateRender: true, scrollTrigger: scrub(item, "top 94%", "top 64%") });
      const year = qs(".ary", item);
      if (year) gsap.fromTo(year, { x: -30 * k }, { x: 0, ease: EASE.linear, immediateRender: false, scrollTrigger: scrub(item, "top 94%", "top 60%") });
    });

    /* HAZ DE LECTURA: una vez leído, cada hito se atenúa y se corre al seguir subiendo; el que está en el
       centro de la pantalla es el que brilla. Actúa sobre el texto interior (el <li> ya usa opacidad). */
    qsa("#trayectoria .arl li > div").forEach((box) => {
      gsap.fromTo(box, { opacity: 1, x: 0 }, { opacity: desktop ? 0.28 : 0.45, x: -18 * k, ease: EASE.linear, overwrite: false, immediateRender: false, scrollTrigger: scrub(box.parentElement, "top 34%", "bottom 8%") });
    });

    /* COMPARAR · los chips convergen desde los costados hacia su lugar con el avance del scroll. */
    const chips = qsa("#versus .vdp");
    if (chips.length) {
      undo.push(claim(chips, { "transition-property": "background, border-color" }));   // el CSS anima transform con transition: choca con el scrub
      gsap.fromTo(chips,
        { x: (i) => (i - (chips.length - 1) / 2) * 38 * k, y: 28 * k, opacity: 0 },
        { x: 0, y: 0, opacity: 1, ease: EASE.linear, stagger: { each: 0.05 }, immediateRender: true, scrollTrigger: scrub("#versus .vdk", "top 98%", "top 60%") });
    }

    /* DÓNDE ESTAMOS · el mapa se abre como un iris y llega acercándose. */
    const map = qs("#contacto .mp");
    if (map) {
      /* sin iris ni zoom: recortar y escalar un iframe a pantalla completa lo repinta en cada frame (lag) */
      gsap.fromTo(map.querySelector(".mph"), { opacity:0, y:12 }, { opacity:1, y:0, ease:EASE.linear, immediateRender:false, scrollTrigger:scrub("#contacto", "top 92%", "top 56%") });
    }

    /* LOCAL · el marco del recorrido es una ventana que se abre; el fondo y la foto viajan a distinta velocidad. */
    const tour = qs("#local .vv");
    if (tour) {
      const slides = qs(".vsc", tour);
      gsap.fromTo(tour, { clipPath: "inset(14% 12% 14% 12% round 24px)" }, { clipPath: "inset(0% 0% 0% 0% round 0px)", ease: EASE.linear, immediateRender: true, scrollTrigger: scrub(tour, "top 98%", "top 26%") });
      if (slides) gsap.fromTo(slides, { scale: 1.2 }, { scale: 1, ease: EASE.linear, immediateRender: true, scrollTrigger: scrub(tour, "top 98%", "top 26%") });
    }
    qsa("#local .vbk").forEach((layer) => {
      gsap.set(layer, { scale: 1.24 });
      gsap.fromTo(layer, { yPercent: -9 * k }, { yPercent: 9 * k, ease: EASE.linear, immediateRender: false, scrollTrigger: scrub(layer.closest(".vl") || layer, "top bottom", "bottom top") });
    });
    qsa("#local .vc").forEach((img) => {
      gsap.set(img, { scale: 1.14 });
      gsap.fromTo(img, { yPercent: -5 * k }, { yPercent: 5 * k, ease: EASE.linear, immediateRender: false, scrollTrigger: scrub(img.closest(".vl") || img, "top bottom", "bottom top") });
    });
    const hints = qsa("#local .vsn li");
    if (hints.length) gsap.set(hints, { opacity: 0, x: 40, rotate: 1.5 });
    if (hints.length) once(hints[0], "top 92%", () => gsap.to(hints, { opacity: 1, x: 0, rotate: 0, duration: 1, ease: EASE.soft, stagger: 0.1, clearProps: "opacity,transform" }));

    /* EQUIPO · la foto grande se destapa desde abajo y se acerca. */
    qsa("#equipo .eqm img").forEach((img) => {
      const box = img.closest(".eqm");
      gsap.fromTo(img, { clipPath: "inset(100% 0 0 0)" }, { clipPath: "inset(0% 0 0 0)", ease: EASE.linear, immediateRender: true, scrollTrigger: scrub(box, "top 96%", "top 52%") });
      gsap.fromTo(img, { scale: 1.3 }, { scale: 1.02, ease: EASE.linear, overwrite: false, immediateRender: true, scrollTrigger: scrub(box, "top 96%", "bottom 20%") });
    });

    /* PRECIO Y PAGO · columna de texto y de tarjetas a distinta velocidad (solo desktop). */
    if (desktop) {
      const text = qs("#financiacion .pdl"), cards = qs("#financiacion .pdg");
      if (text) gsap.fromTo(text, { yPercent: 5 }, { yPercent: -5, ease: EASE.linear, immediateRender: false, scrollTrigger: scrub("#financiacion", "top bottom", "bottom top") });
      if (cards) gsap.fromTo(cards, { yPercent: -3 }, { yPercent: 3, ease: EASE.linear, immediateRender: false, scrollTrigger: scrub("#financiacion", "top bottom", "bottom top") });
    }

    /* Líneas verticales decorativas: se «dibujan» con el avance. */
    qsa(".xr").forEach((line) => {
      gsap.fromTo(line, { scaleY: 0, transformOrigin: "50% 0%" }, { scaleY: 1, ease: EASE.linear, immediateRender: true, scrollTrigger: scrub(line, "top 94%", "top 62%") });
    });

    /* Cómo comprar: los pasos se «encienden» de a uno, con lectura guiada. */
    qsa("#como-comprar .stp li, #operaciones .stp li").forEach((step) => {
      gsap.fromTo(step, { opacity: 0.2, x: desktop ? -40 : -14 }, { opacity: 1, x: 0, ease: EASE.linear, immediateRender: true, scrollTrigger: scrub(step, "top 92%", "top 58%") });
    });
  });
  return () => { undo.forEach((fn) => fn()); ctx.revert(); };
}

/* ════════════════════════════════════════════════════════════════════════════════════════
   ODÓMETRO (firma 3) · los números giran como tablero de kilometraje
   El DOM se arma al entrar y se restituye al terminar: el valor final es el texto original.
   ════════════════════════════════════════════════════════════════════════════════════════ */
function initOdometer() {
  const ctx = gsap.context(() => {
    const targets = [...qsa("#nosotros .ns b"), ...qsa("#trayectoria .ary")].filter((el) => /\d/.test(el.textContent));
    targets.forEach((el, index) => {
      once(el, "top 90%", () => {
        const text = el.textContent;
        if (!/\d/.test(text) || el.dataset.od) return;
        el.dataset.od = "1";
        const cs = getComputedStyle(el);
        const lh = parseFloat(cs.lineHeight) || parseFloat(cs.fontSize) * 1.15;
        const sr = document.createElement("span"); sr.className = "sr"; sr.textContent = text;
        const visual = document.createElement("span"); visual.setAttribute("aria-hidden", "true"); visual.style.cssText = "display:inline-flex;white-space:pre";
        const columns = [];
        [...text].forEach((ch) => {
          if (!/\d/.test(ch)) { const span = document.createElement("span"); span.textContent = ch; visual.appendChild(span); return; }
          const col = document.createElement("span");
          col.style.cssText = `display:inline-block;overflow:hidden;height:${lh}px;vertical-align:top`;
          const rail = document.createElement("span");
          rail.style.cssText = "display:block;will-change:transform";
          for (let n = 0; n < 20; n++) { const row = document.createElement("span"); row.style.cssText = `display:block;height:${lh}px;line-height:${lh}px;text-align:center`; row.textContent = String(n % 10); rail.appendChild(row); }
          col.appendChild(rail); visual.appendChild(col); columns.push({ rail, digit: +ch });
        });
        el.textContent = ""; el.append(sr, visual);
        const done = () => { el.textContent = text; delete el.dataset.od; };
        const tl = gsap.timeline({ delay: index % 4 === 3 ? 0.1 : 0, onComplete: done });
        columns.forEach(({ rail, digit }, i) => tl.fromTo(rail, { y: 0 }, { y: -(10 + digit) * lh, duration: 1.7 + i * 0.22, ease: "expo.out" }, i * 0.1));
      });
    });
  });
  return () => ctx.revert();
}

/* ════════════════════════════════════════════════════════════════════════════════════════
   MICROINTERACCIONES · botones, enlaces, tarjetas, acordeones
   Delegación de eventos (las tarjetas se repintan con los filtros). Sin cursor custom ni magnetismo.
   Touch: solo feedback de presión.
   ════════════════════════════════════════════════════════════════════════════════════════ */
const TILT = ".pdc, .rvc, .vqb";
const ICON = "header .ic";

function initInteractions({ desktop, fine }) {
  const off = [];
  const undo = [];
  const on = (target, type, fn, options) => { target.addEventListener(type, fn, options); off.push(() => target.removeEventListener(type, fn, options)); };
  const closest = (event, selector) => event.target.closest?.(selector);

  const ctx = gsap.context(() => {
    /* Presión: todos los botones, también en touch. */
    on(document, "pointerdown", (event) => {
      const button = closest(event, "button:not(:disabled), .btn");
      if (!button) return;
      gsap.to(button, { scale: 0.955, duration: 0.12, ease: "power2.out", overwrite: "auto" });
      const release = () => gsap.to(button, { scale: 1, duration: 0.8, ease: "elastic.out(1, 0.45)", overwrite: "auto" });
      ["pointerup", "pointercancel", "pointerleave"].forEach((type) => button.addEventListener(type, release, { once: true }));
    }, true);

    /* Acordeones (<details>): el contenido entra en cascada; el layout cambia → refresh agrupado. */
    let refreshTimer = 0;
    on(document, "toggle", (event) => {
      const details = event.target;
      if (!(details instanceof HTMLDetailsElement)) return;
      if (details.open) {
        const kids = [...details.children].filter((el) => el.tagName !== "SUMMARY");
        const items = kids.flatMap((el) => (el.matches("ul, ol") ? [...el.children] : [el]));
        gsap.fromTo(items, { opacity: 0, y: -14, x: -10 }, { opacity: 1, y: 0, x: 0, duration: 0.7, ease: EASE.soft, stagger: 0.045, clearProps: "opacity,transform" });
      }
      clearTimeout(refreshTimer);
      refreshTimer = setTimeout(() => ScrollTrigger.refresh(), 320);
    }, true);
    off.push(() => clearTimeout(refreshTimer));

    /* Foto de cada operación: zoom manejado por JS (el CSS lo anulamos porque el scrub controla transform). */
    on(document, "pointerover", (event) => {
      const card = closest(event, ".oc"); if (!card || card.contains(event.relatedTarget)) return;
      const img = qs(".oi img", card); if (img) gsap.to(img, { scale: 1.32, duration: 1.1, ease: EASE.soft, overwrite: "auto" });
    }, { passive: true });
    on(document, "pointerout", (event) => {
      const card = closest(event, ".oc"); if (!card || card.contains(event.relatedTarget)) return;
      const img = qs(".oi img", card); if (img) gsap.to(img, { scale: 1.22, duration: 1, ease: EASE.settle, overwrite: "auto" });
    }, { passive: true });

    /* Flechas de galería / carrusel: la flecha «empuja» hacia su sentido. */
    on(document, "pointerover", (event) => {
      const arrow = closest(event, ".g-a:not(:disabled)"); if (!arrow || arrow.contains(event.relatedTarget)) return;
      const svg = qs("svg", arrow); if (svg) gsap.to(svg, { x: arrow.classList.contains("l") ? -4 : 4, duration: 0.35, ease: EASE.soft, overwrite: "auto" });
    }, { passive: true });
    on(document, "pointerout", (event) => {
      const arrow = closest(event, ".g-a"); if (!arrow || arrow.contains(event.relatedTarget)) return;
      const svg = qs("svg", arrow); if (svg) gsap.to(svg, { x: 0, duration: 0.7, ease: "elastic.out(1, 0.5)", overwrite: "auto" });
    }, { passive: true });

    /* ROLL del menú: al apuntar, cada letra sube y es reemplazada por su copia que entra desde abajo (escalonado).
       La copia es aria-hidden y el enlace conserva su nombre accesible; al limpiar se restituye el texto original. */
    qsa("header nav a").forEach((link) => {
      const original = link.textContent;
      if (link.children.length || !original.trim()) return;
      const hadLabel = link.hasAttribute("aria-label");
      const letters = (value) => [...value].map((ch) => { const c = document.createElement("span"); c.style.cssText = "display:inline-block;will-change:transform"; c.textContent = ch === " " ? "\u00a0" : ch; return c; });
      const wrap = document.createElement("span"); wrap.style.cssText = "position:relative;display:block;overflow:hidden;white-space:pre";
      const top = document.createElement("span"); top.style.display = "block"; top.setAttribute("aria-hidden", "true");
      const bottom = document.createElement("span"); bottom.style.cssText = "position:absolute;left:0;top:0;display:block"; bottom.setAttribute("aria-hidden", "true");
      const a = letters(original.trim()), b = letters(original.trim());
      top.append(...a); bottom.append(...b); wrap.append(top, bottom);
      if (!hadLabel) link.setAttribute("aria-label", original.trim());
      link.textContent = ""; link.append(wrap);
      gsap.set(b, { yPercent: 115 });
      const roll = gsap.timeline({ paused: true, defaults: { duration: 0.5, ease: "power3.inOut" } })
        .to(a, { yPercent: -115, stagger: 0.018 }, 0)
        .to(b, { yPercent: 0, stagger: 0.018 }, 0);
      const play = () => roll.timeScale(1).play();
      const back = () => roll.timeScale(1.5).reverse();
      on(link, "pointerenter", play); on(link, "pointerleave", back);
      on(link, "focus", () => { if (link.matches(":focus-visible")) play(); }); on(link, "blur", back);
      undo.push(() => { roll.kill(); link.textContent = original; if (!hadLabel) link.removeAttribute("aria-label"); });
    });

    /* Enlaces del pie: empujan hacia la derecha y vuelven con rebote. */
    qsa("footer .fx a").forEach((link) => {
      on(link, "pointerenter", () => gsap.to(link, { x: 8, duration: 0.45, ease: EASE.soft, overwrite: "auto" }));
      on(link, "pointerleave", () => gsap.to(link, { x: 0, duration: 0.9, ease: "elastic.out(1, 0.5)", overwrite: "auto" }));
    });

    /* Iconos del header: giro corto con rebote. */
    qsa(ICON).forEach((icon) => {
      const svg = qs("svg", icon); if (!svg) return;
      on(icon, "pointerenter", () => gsap.to(svg, { scale: 1.18, rotate: -9, duration: 0.5, ease: EASE.spring, overwrite: "auto" }));
      on(icon, "pointerleave", () => gsap.to(svg, { scale: 1, rotate: 0, duration: 0.6, ease: EASE.settle, overwrite: "auto" }));
    });

  });
  return () => { off.forEach((fn) => fn()); undo.forEach((fn) => fn()); ctx.revert(); };
}

/* ════════════════════════════════════════════════════════════════════════════════════════
   ARRANQUE · gsap.matchMedia decide qué corre en cada contexto y revierte todo al cambiar
   ════════════════════════════════════════════════════════════════════════════════════════ */
/* ════════════════════════════════════════════════════════════════════════════════════════
   COREOGRAFÍA CONTINUA · una escena distinta por sección
   No dispara animaciones aisladas: cada timeline sigue el recorrido completo del scroll.
   Los targets son wrappers ya existentes para no alterar contenido ni layout.
   ════════════════════════════════════════════════════════════════════════════════════════ */
function initSceneChoreography({ desktop }) {
  const k = desktop ? 1 : 0.55;
  const ctx = gsap.context(() => {});
  const scene = (id, fn) => {
    const section = document.getElementById(id);
    if (section) fn(section);
  };
  const scrubScene = (section, start = "top bottom", end = "bottom top") => ({
    trigger: section, start, end, scrub: true, invalidateOnRefresh: true
  });
  const imgDrift = (section, selector, from, to, start = "top bottom", end = "bottom top") => {
    const items = qsa(selector, section);
    items.forEach((item) => gsap.fromTo(item, from, { ...to, ease: EASE.linear, immediateRender: false, scrollTrigger: scrubScene(section, start, end) }));
  };
  ctx.add(() => {
    /* Unidades: el stock se comporta como una cinta de contacto; cada foto respira a una velocidad. */
    scene("unidades", (s) => {
      /* v11: sin deriva ni zoom por scroll sobre las fotos de las tarjetas. */
    });
    /* Modelos: lista editorial horizontal + panel que se acerca desde otra profundidad. */
    scene("modelos", (s) => {
      const panel = qs("#mdf", s), list = qs(".mdl", s);
      /* v11: el panel de vista previa es sticky (CSS): ningún transform por scroll sobre él ni sobre la lista. */
      void panel; void list;
    });
    /* Comparador: las columnas se separan y vuelven a alinearse como una mesa óptica. */
    scene("versus", (s) => {
      const cards = qsa(".vsc, .vdc", s);
      /* v11: comparador sin transformaciones por scroll (era lo que lo hacía trabarse). */
      void cards;
    });
    /* Nosotros: máscara vertical de la fotografía + tres líneas con velocidades escalonadas. */
    scene("nosotros", (s) => {
      /* v11: la foto del local queda quieta y entera. */
      /* Las filas ya se destapan con su propio wipe (arriba); no se vuelven a recortar ni a desplazar aquí. */
    });
    /* Trayectoria: el registro se lee como una línea que avanza, no como una entrada vertical. */
    scene("trayectoria", (s) => {
      const line = qs(".arl", s), copy = qs(".arhd", s);
      if (line) gsap.fromTo(line, { xPercent: -4 * k, scaleX: .94, transformOrigin: "0 50%" }, { xPercent: 4 * k, scaleX: 1.02, ease: EASE.linear, scrollTrigger: scrubScene(s, "top bottom", "bottom top") });
      if (copy) gsap.fromTo(copy, { yPercent: 5 * k, letterSpacing: ".015em" }, { yPercent: -5 * k, letterSpacing: "0em", ease: EASE.linear, scrollTrigger: scrubScene(s, "top 86%", "bottom 20%") });
    });
    /* Contacto: el mapa abre una ventana y el panel de dirección viaja a contratiempo. */
    scene("contacto", (s) => {
      const map = qs(".mp", s), copy = qs(".lc", s);
      void map; /* sin recorte ni zoom sobre el iframe del mapa (lag) */
      if (copy) gsap.fromTo(copy, { xPercent: -7 * k }, { xPercent: 4 * k, ease: EASE.linear, scrollTrigger: scrubScene(s, "top bottom", "bottom top") });
    });
    /* Local: el recorrido visual flota detrás de los hitos, mientras las señales entran por capas. */
    scene("local", (s) => {
      imgDrift(s, ".vc, .vin video, .vin img", { scale: 1.14, yPercent: -7 * k }, { scale: 1.03, yPercent: 7 * k }, "top bottom", "bottom top");
      qsa(".vsn li, .vpn", s).forEach((item, i) => gsap.fromTo(item, { x: (i % 2 ? 1 : -1) * 22 * k }, { x: 0, ease: EASE.linear, scrollTrigger: scrubScene(s, "top 84%", "bottom 24%") }));
    });
    /* Opiniones: tarjetas en órbita leve y estrellas que recorren la lectura. */
    scene("opiniones", (s) => {
      qsa(".rvc", s).forEach((card, i) => gsap.fromTo(card, { yPercent: (i % 2 ? 2 : -2) * k, rotateZ: (i % 2 ? 1 : -1) * .8 }, { yPercent: (i % 2 ? -2 : 2) * k, rotateZ: 0, ease: EASE.linear, scrollTrigger: scrubScene(s, "top bottom", "bottom top") }));
      qsa(".rvs", s).forEach((stars) => gsap.fromTo(stars, { xPercent: -8 * k, scaleX: .92, transformOrigin: "0 50%" }, { xPercent: 8 * k, scaleX: 1.04, ease: EASE.linear, scrollTrigger: scrubScene(s, "top 84%", "bottom 20%") }));
    });
    /* Banner: una contracción y expansión tipográfica que conecta con la guía siguiente. */
    scene("bd", (s) => {
      const title = qs("h2", s), lead = qs(".bdp", s), footer = qs(".bdf", s);
      if (title) gsap.fromTo(title, { scale: .92, yPercent: 8 * k, letterSpacing: ".02em" }, { scale: 1.04, yPercent: -8 * k, letterSpacing: "-.01em", ease: EASE.linear, scrollTrigger: scrubScene(s, "top 92%", "bottom 18%") });
      if (lead) gsap.fromTo(lead, { xPercent: -5 * k }, { xPercent: 5 * k, ease: EASE.linear, scrollTrigger: scrubScene(s, "top bottom", "bottom top") });
      if (footer) gsap.fromTo(footer, { yPercent: 16 * k }, { yPercent: -12 * k, ease: EASE.linear, scrollTrigger: scrubScene(s, "top bottom", "bottom top") });
    });
    /* Financiación: profundidad de tarjetas y una declaración que se estira con el scroll. */
    scene("financiacion", (s) => {
      qsa(".pdc", s).forEach((card, i) => gsap.fromTo(card, { z: -80 * k, yPercent: (i - 1) * 3 * k, scale: .96 }, { z: 40 * k, yPercent: (1 - i) * 3 * k, scale: 1.015, ease: EASE.linear, scrollTrigger: scrubScene(s, "top bottom", "bottom top") }));
      const statement = qs(".xl", s); if (statement) gsap.fromTo(statement, { xPercent: -3 * k, scaleX: .97, transformOrigin: "0 50%" }, { xPercent: 3 * k, scaleX: 1.03, ease: EASE.linear, scrollTrigger: scrubScene(s, "top 88%", "bottom 20%") });
    });
    /* Guía: acordeones como hojas que se abren desde el centro, manteniendo lectura estable. */
    scene("guia", (s) => {
      qsa("details", s).forEach((detail, i) => gsap.fromTo(detail, { x: (i % 2 ? 1 : -1) * 14 * k, scaleX: .97, transformOrigin: i % 2 ? "100% 50%" : "0 50%" }, { x: 0, scaleX: 1.01, ease: EASE.linear, scrollTrigger: scrubScene(s, "top 90%", "bottom 28%") }));
      const intro = qs(".xl", s); if (intro) gsap.fromTo(intro, { yPercent: 5 * k, scale: .97 }, { yPercent: -5 * k, scale: 1.02, ease: EASE.linear, scrollTrigger: scrubScene(s, "top bottom", "bottom top") });
    });
    /* Equipo: la foto es la profundidad; la lista sigue una diagonal suave. */
    scene("equipo", (s) => {
      imgDrift(s, ".eqm img, .eqm video", { scale: 1.12, yPercent: -6 * k }, { scale: 1.03, yPercent: 6 * k }, "top bottom", "bottom top");
      qsa(".eqk li", s).forEach((item, i) => gsap.fromTo(item, { x: (i % 2 ? 1 : -1) * 16 * k }, { x: (i % 2 ? -1 : 1) * 6 * k, ease: EASE.linear, scrollTrigger: scrubScene(s, "top 88%", "bottom 25%") }));
    });
    /* Visita: formulario y declaración se aproximan desde lados opuestos. */
    scene("visita", (s) => {
      const form = qs("#visitaForm", s), quote = qs(".xl", s);
      if (form) gsap.fromTo(form, { yPercent: 8 * k, scale: .96, rotateZ: -.6 }, { yPercent: -8 * k, scale: 1.015, rotateZ: 0, ease: EASE.linear, scrollTrigger: scrubScene(s, "top bottom", "bottom top") });
      if (quote) gsap.fromTo(quote, { xPercent: 4 * k }, { xPercent: -4 * k, ease: EASE.linear, scrollTrigger: scrubScene(s, "top bottom", "bottom top") });
    });
    /* Preguntas: el cierre se expande en abanico, sin fade genérico. */
    scene("preguntas", (s) => {
      const form = qs("#buscoForm", s), faq = qs(".bqm", s);
      if (form) gsap.fromTo(form, { xPercent: -4 * k, scaleX: .97, transformOrigin: "0 50%" }, { xPercent: 4 * k, scaleX: 1.02, ease: EASE.linear, scrollTrigger: scrubScene(s, "top bottom", "bottom top") });
      if (faq) gsap.fromTo(faq, { xPercent: 4 * k, scaleX: .97, transformOrigin: "100% 50%" }, { xPercent: -4 * k, scaleX: 1.02, ease: EASE.linear, scrollTrigger: scrubScene(s, "top bottom", "bottom top") });
    });
  });
  return () => ctx.revert();
}

/* ════════════════════════════════════════════════════════════════════════════════════════
   SIN MOVIMIENTO ATADO AL SCROLL
   Los textos, secciones y el mapa no se desplazan, escalan, inclinan ni se recortan mientras se scrollea.
   Cada animación «scrub» se descarta y sus elementos vuelven a su estado natural (el del CSS).
   Las entradas de una sola vez (revelado al aparecer) y el scroll suave de Lenis se mantienen.
   ════════════════════════════════════════════════════════════════════════════════════════ */
function freezeScrollMotion() {
  const targets = new Set();
  const collect = (anim) => {
    if (!anim) return;
    if (typeof anim.getChildren === "function") anim.getChildren(true, true, true).forEach(collect);
    else if (typeof anim.targets === "function") anim.targets().forEach((el) => { if (el && el.nodeType === 1) targets.add(el); });
  };
  ScrollTrigger.getAll().forEach((t) => {
    if (!t.vars || !t.vars.scrub) return;
    collect(t.animation);
    if (t.animation) t.animation.kill();
    t.kill();
  });
  if (targets.size) gsap.set([...targets], { clearProps: "transform,clipPath,opacity,letterSpacing,willChange" });
}

function initMotion() {
  const mm = gsap.matchMedia();

  mm.add(MQ, (context) => {
    const { motion, desktop, fine } = context.conditions;
    if (!motion) { root.classList.remove("mh"); return undefined; }          // reduced-motion: contenido intacto
    const flags = { desktop, fine };
    const home = !!(qs(".hero") && qs("#unidades"));                         // la coreografía narrativa es de la home

    const scroll = initScroll(flags);
    const { inertia } = scroll;

    /* Orden = orden de la página (ScrollTrigger mide los pines en secuencia; el hero tiene prioridad). */
    const cleanups = [
      initNavigation(),
      home ? initHero(flags, scroll) : null,
      home ? initBanner(flags) : null,
      home ? initTypography(flags, inertia) : null,
      home ? initSeams(flags) : null,
      home ? initSectionEntrances(flags) : null,
      home ? initSceneChoreography(flags) : null,
      home ? initReveals(flags, inertia) : null,
      home ? initParallax(flags) : null,
      home ? initSectionBackdrops(flags) : null,
      home ? initMapExperience() : null,
      home ? initOdometer() : null,
      initInteractions(flags)
    ];
    ScrollTrigger.sort();
    freezeScrollMotion();
    ScrollTrigger.addEventListener("refresh", freezeScrollMotion);

    /* Layout tardío (fuentes, imágenes lazy, iframe del mapa): un refresh agrupado, no uno por evento. */
    let refreshTimer = 0;
    const refresh = () => { clearTimeout(refreshTimer); refreshTimer = setTimeout(() => ScrollTrigger.refresh(), 140); };
    document.fonts?.ready.then(refresh);
    window.addEventListener("load", refresh, { once: true });

    /* Cambios de alto del documento (acordeones, filtros, lazy): refresh solo si el alto realmente cambió. */
    const main = qs("main");
    let lastHeight = main ? main.offsetHeight : 0, resizeObserver = null;
    if (main && "ResizeObserver" in window) {
      resizeObserver = new ResizeObserver(() => {
        const height = main.offsetHeight;
        if (Math.abs(height - lastHeight) > 3) { lastHeight = height; refresh(); }
      });
      resizeObserver.observe(main);
    }

    return () => {
      clearTimeout(refreshTimer);
      ScrollTrigger.removeEventListener("refresh", freezeScrollMotion);
      window.removeEventListener("load", refresh);
      resizeObserver?.disconnect();
      cleanups.reverse().forEach((fn) => typeof fn === "function" && fn());
      scroll.dispose();
    };
  });

  /* bfcache: al volver con «atrás» se recalculan las posiciones. */
  const onShow = (event) => { if (event.persisted) ScrollTrigger.refresh(); };
  window.addEventListener("pageshow", onShow);
  return () => { window.removeEventListener("pageshow", onShow); mm.revert(); };
}

/* ── Modo de movimiento + arranque ──────────────────────────────────────────────────────── */
const syncMotionMode = () => {
  root.classList.toggle("m", !reduceMotion.matches);
  root.classList.toggle("cm-reduce", reduceMotion.matches);
  root.dataset.motion = reduceMotion.matches ? "reduced" : "full";
  if (reduceMotion.matches) root.classList.remove("mh");
};
syncMotionMode();
reduceMotion.addEventListener?.("change", syncMotionMode);

let dispose = noop;
const start = () => { dispose = initMotion(); };
/* El módulo corre antes de DOMContentLoaded: se espera un frame para que los scripts inline ya hayan armado stock, modelos y comparador. */
if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", () => requestAnimationFrame(start), { once: true });
else requestAnimationFrame(start);
window.addEventListener("pagehide", (event) => { if (!event.persisted) dispose(); }, { once: true });
