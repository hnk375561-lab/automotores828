import { gsap } from "./motion/vendor.js";
import { reduceMotion } from "./motion/core.js";

const CONFIG = { slots: ["Mañana", "Tarde"], slotsNote: "Es una consulta, no un turno." };
const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const months = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
const state = { month: new Date(new Date().getFullYear(), new Date().getMonth(), 1), day: null, slot: null, step: "month", control: null };
const live = $("#live");
const EMBED = new URLSearchParams(location.search).get("embed") === "1";
const cerrarEmbed = () => { try { window.parent.postMessage({ hz: "cerrar-reserva" }, location.origin); } catch (e) {} };
const startOfToday = () => { const t = new Date(); return new Date(t.getFullYear(), t.getMonth(), t.getDate()); };
const esDiaElegible = (date) => date >= startOfToday() && date.getDay() !== 0;
const announce = (text) => { if (live) live.textContent = text; };
const monthTitle = (date) => `${months[date.getMonth()]} ${date.getFullYear()}`;
const formatDate = (date) => date.toLocaleDateString("es-AR", { weekday: "long", day: "numeric", month: "long" });
const daysInMonth = (date) => new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
const firstDay = (date) => (new Date(date.getFullYear(), date.getMonth(), 1).getDay() + 6) % 7;

function renderCalendar() {
  const calendar = $("#calendar"); if (!calendar) return; calendar.textContent = ""; $("#month-label").textContent = monthTitle(state.month); $("#month-status").textContent = CONFIG.slotsNote;
  for (let i = 0; i < firstDay(state.month); i += 1) { const empty = document.createElement("span"); empty.className = "day-cell day-cell--empty"; empty.setAttribute("aria-hidden", "true"); calendar.appendChild(empty); }
  for (let day = 1; day <= daysInMonth(state.month); day += 1) {
    const date = new Date(state.month.getFullYear(), state.month.getMonth(), day), enabled = esDiaElegible(date), button = document.createElement("button");
    button.className = "day-cell"; button.type = "button"; button.dataset.day = day; button.disabled = !enabled; button.setAttribute("aria-disabled", String(!enabled)); button.setAttribute("aria-pressed", String(state.day?.getTime() === date.getTime())); if (state.day?.getTime() === date.getTime()) button.setAttribute("aria-current", "true");
    button.innerHTML = `<span>${String(day).padStart(2, "0")}</span><small>${date.getTime() === startOfToday().getTime() ? "hoy" : ""}</small>`; calendar.appendChild(button);
  }
}

function animateScene(show) {
  const current = $(".scene:not([hidden])"), next = $(`.scene--${show}`); if (!next || current === next) return;
  state.step = show; $("#booking").dataset.step = show; $("#back").hidden = show === "month"; next.hidden = false;
  if (reduceMotion.matches) { if (current) current.hidden = true; return; }
  state.control?.kill();
  const tl = gsap.timeline();
  tl.fromTo(next, { opacity: 0, yPercent: 5 }, { opacity: 1, yPercent: 0, duration: 0.6, ease: "power3.out", clearProps: "opacity,transform" }, 0);
  if (current) tl.to(current, { opacity: 0, yPercent: -3, duration: 0.25, ease: "power2.in", onComplete: () => { current.hidden = true; gsap.set(current, { clearProps: "opacity,transform" }); } }, 0);
  const wipe = $(".diagonal-wipe");
  if (wipe) { if (show === "confirm") { gsap.set(wipe, { autoAlpha: 1 }); tl.fromTo(wipe, { xPercent: -100 }, { xPercent: 100, duration: 0.8, ease: "expo.inOut", onComplete: () => gsap.set(wipe, { autoAlpha: 0 }) }, 0); } else gsap.set(wipe, { autoAlpha: 0 }); }
  state.control = tl;
}
function selectDay(day) { const date = new Date(state.month.getFullYear(), state.month.getMonth(), day); if (!esDiaElegible(date)) return; state.day = date; state.slot = null; $("#day-number").textContent = String(day).padStart(2, "0"); $("#day-month").textContent = `${months[date.getMonth()]} ${date.getFullYear()}`; $("#day-weekday").textContent = date.toLocaleDateString("es-AR", { weekday: "long" }); $("#day-status").textContent = formatDate(date); $("#to-time").disabled = false; renderCalendar(); announce(`Día seleccionado: ${formatDate(date)}`); animateScene("day"); }
function renderSlots() { const box = $("#slots"); box.textContent = ""; CONFIG.slots.forEach((slot) => { const button = document.createElement("button"); button.type = "button"; button.className = "slot"; button.dataset.slot = slot; button.setAttribute("role", "option"); button.setAttribute("aria-selected", String(state.slot === slot)); button.innerHTML = `<b>${slot}</b><small>a coordinar</small>`; box.appendChild(button); }); }
function selectSlot(slot) { state.slot = slot; $$(".slot").forEach((button) => button.setAttribute("aria-selected", String(button.dataset.slot === slot))); $("#time-status").textContent = slot; $("#to-confirm").disabled = false; announce(`Franja seleccionada: ${slot}`); }
function waNumber() { const b = $("#whatsapp"); return b ? (b.dataset.wa || "") : ""; }
function sendState(sent) { const el = $("#send-state"); if (!el) return; const wa = waNumber(); el.dataset.state = sent ? "pending" : "ready"; el.textContent = sent ? (wa ? "Consulta abierta en WhatsApp · la respuesta llega por ahí" : "Mensaje copiado · pegalo en Facebook o Instagram") : (wa ? "Listo para enviar · lo mandás vos por WhatsApp" : "Listo para copiar · lo mandás vos por Facebook o Instagram"); }
function showConfirm() { if (!state.day || !state.slot) return; sendState(false); $("#summary-day").textContent = `${state.day.getDate()} ${months[state.day.getMonth()]}`; $("#summary-time").textContent = state.slot; { const btn = $("#whatsapp"); if (btn) { const msg = `Hola! Quiero coordinar una visita el ${formatDate(state.day)}, por la ${state.slot.toLowerCase()}. ¿Me confirman disponibilidad y horario?`; btn.dataset.msg = msg; if (btn.dataset.wa) btn.href = `https://wa.me/${btn.dataset.wa}?text=${encodeURIComponent(msg)}`; } }
  announce(`Resumen listo: ${formatDate(state.day)}, por la ${state.slot.toLowerCase()}`); animateScene("confirm"); }
function goBack() { if (state.step === "confirm") animateScene("time"); else if (state.step === "time") animateScene("day"); else if (state.step === "day") animateScene("month"); }
function reset() { state.day = null; state.slot = null; state.step = "month"; $("#to-time").disabled = true; $("#to-confirm").disabled = true; renderCalendar(); renderSlots(); $$(".scene").forEach((scene) => { scene.hidden = !scene.classList.contains("scene--month"); scene.style.removeProperty("opacity"); scene.style.removeProperty("transform"); }); $("#back").hidden = true; $("#booking").dataset.step = "month"; window.scrollTo({ top: 0, behavior: "auto" }); announce("Calendario reiniciado"); }

if ($("#booking")) {
  $("#calendar").addEventListener("click", (event) => { const button = event.target.closest("button[data-day]"); if (button && !button.disabled) selectDay(+button.dataset.day); });
  $("#slots").addEventListener("click", (event) => { const button = event.target.closest("button[data-slot]"); if (button) selectSlot(button.dataset.slot); });
  $("#prev-month").addEventListener("click", () => { state.month.setMonth(state.month.getMonth() - 1); renderCalendar(); announce(`Mes anterior: ${monthTitle(state.month)}`); });
  $("#next-month").addEventListener("click", () => { state.month.setMonth(state.month.getMonth() + 1); renderCalendar(); announce(`Mes siguiente: ${monthTitle(state.month)}`); });
  $("#to-time").addEventListener("click", () => { renderSlots(); animateScene("time"); }); $("#to-confirm").addEventListener("click", showConfirm); $("#whatsapp").addEventListener("click", (e) => { const btn = e.currentTarget; if (btn.dataset.wa) { sendState(true); return; } const msg = btn.dataset.msg || ""; const show = () => { const el = $("#send-state"); if (el) { el.dataset.state = "ready"; el.textContent = msg; } }; if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(msg).then(() => sendState(true), show); else show(); }); $("#back").addEventListener("click", goBack); $("#restart").addEventListener("click", reset);
  document.addEventListener("keydown", (event) => { const active = document.activeElement; if (state.step === "month" && active?.matches(".day-cell")) { const days = $$("#calendar button.day-cell"), pos = days.indexOf(active), step = event.key === "ArrowRight" ? 1 : event.key === "ArrowLeft" ? -1 : event.key === "ArrowDown" ? 7 : event.key === "ArrowUp" ? -7 : 0; if (step) { let i = pos + step; while (days[i] && days[i].disabled) i += step > 0 ? (Math.abs(step) === 7 ? 7 : 1) : (Math.abs(step) === 7 ? -7 : -1); const target = days[i]; if (target) { event.preventDefault(); target.focus(); } } } if (event.key === "Escape") { if (EMBED && state.step === "month") cerrarEmbed(); else goBack(); } });
  $("#close-embed")?.addEventListener("click", cerrarEmbed);
  if (EMBED) {
    $(".brand")?.addEventListener("click", (e) => { e.preventDefault(); cerrarEmbed(); });
    window.addEventListener("message", (e) => { if (e.origin === location.origin && e.data && e.data.hz === "reiniciar-reserva") reset(); });
  }
  renderCalendar(); renderSlots();
}
