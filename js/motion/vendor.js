/* Única puerta de entrada al stack de movimiento: GSAP + ScrollTrigger + Lenis.
   El bundle vive en js/vendor/gsap-stack.js (gsap 3.13.0, lenis 1.3.11), servido desde el mismo origen. */
import { gsap, ScrollTrigger, Lenis } from "../vendor/gsap-stack.js";

gsap.registerPlugin(ScrollTrigger);
gsap.defaults({ overwrite: "auto" });
ScrollTrigger.config({ ignoreMobileResize: true });

export { gsap, ScrollTrigger, Lenis };
