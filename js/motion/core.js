/* Utilidades y tokens compartidos. Sin lógica de animación. */
export const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
export const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)");
export const qs = (selector, root = document) => root.querySelector(selector);
export const qsa = (selector, root = document) => [...root.querySelectorAll(selector)];
export const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

/* Condiciones de gsap.matchMedia(): cada contexto se revierte solo al cambiar la condición. */
export const MQ = {
  motion: "(prefers-reduced-motion: no-preference)",
  desktop: "(min-width: 900px)",
  fine: "(hover: hover) and (pointer: fine)"
};

/* Un puñado de easings con intención; cada parte del sitio elige el suyo. */
export const EASE = {
  expo: "expo.out",          // entradas editoriales (títulos, hero)
  mask: "expo.inOut",        // máscaras y cortinas
  soft: "power3.out",        // contenido secundario
  settle: "power2.out",      // microinteracciones
  spring: "back.out(1.7)",   // iconos / feedback táctil
  linear: "none"             // scrub
};
