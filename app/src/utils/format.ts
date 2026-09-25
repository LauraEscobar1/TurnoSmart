/**
 * Formatos de fecha y hora del sistema de diseño: 24 h, meses abreviados
 * en minúscula ("23 sep") y relativos cortos ("Hoy", "ayer", "ahora").
 * Se hace a mano para no depender del soporte de locales del motor JS.
 */
const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

const pad = (n: number) => String(n).padStart(2, "0");

function mismoDia(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function diasDesdeHoy(fecha: Date) {
  const hoy = new Date();
  const a = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate()).getTime();
  const b = new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate()).getTime();
  return Math.round((b - a) / 86_400_000);
}

/** "15:40" */
export function hora(iso: string) {
  const d = new Date(iso);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** "23" — ancla visual de la tarjeta de cita. */
export function dia(iso: string) {
  return pad(new Date(iso).getDate());
}

/** "sep" */
export function mes(iso: string) {
  return MESES[new Date(iso).getMonth()];
}

/** "23 sep" */
export function fechaCorta(iso: string) {
  const d = new Date(iso);
  return `${d.getDate()} ${MESES[d.getMonth()]}`;
}

/** "Hoy", "Mañana" o "23 sep". */
export function diaRelativo(iso: string) {
  const diff = diasDesdeHoy(new Date(iso));
  if (diff === 0) return "Hoy";
  if (diff === 1) return "Mañana";
  return fechaCorta(iso);
}

/** "Hoy, 23 sep" */
export function fechaConDia(iso: string) {
  const rel = diaRelativo(iso);
  return rel === "Hoy" || rel === "Mañana" ? `${rel}, ${fechaCorta(iso)}` : fechaCorta(iso);
}

/** Marca de tiempo de un aviso: "ahora", "hace 12 min", "09:41", "ayer", "18 sep". */
export function haceCuanto(iso: string) {
  const d = new Date(iso);
  const min = Math.floor((Date.now() - d.getTime()) / 60_000);
  if (min < 1) return "ahora";
  if (min < 60) return `hace ${min} min`;
  if (mismoDia(d, new Date())) return hora(iso);
  if (diasDesdeHoy(d) === -1) return "ayer";
  return fechaCorta(iso);
}

/** "07:39" */
export function mmss(segundos: number) {
  const s = Math.max(0, Math.floor(segundos));
  return `${pad(Math.floor(s / 60))}:${pad(s % 60)}`;
}

/** Días completos desde el alta en la lista de espera. */
export function diasEnEspera(desdeISO: string) {
  return Math.max(0, Math.floor((Date.now() - new Date(desdeISO).getTime()) / 86_400_000));
}

const DIAS_CORTOS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
const DIAS_LARGOS = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];
const MESES_LARGOS = [
  "enero",
  "febrero",
  "marzo",
  "abril",
  "mayo",
  "junio",
  "julio",
  "agosto",
  "septiembre",
  "octubre",
  "noviembre",
  "diciembre",
];

/** Clave estable de un día local: "2026-09-24". Sirve para agrupar citas por día. */
export function claveDia(fecha: Date | string) {
  const d = typeof fecha === "string" ? new Date(fecha) : fecha;
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** "Mié" */
export function diaSemanaCorto(d: Date) {
  return DIAS_CORTOS[d.getDay()];
}

/** "Septiembre 2026" */
export function mesYAnio(d: Date) {
  const m = MESES_LARGOS[d.getMonth()];
  return `${m[0].toUpperCase()}${m.slice(1)} ${d.getFullYear()}`;
}

/** "miércoles 24 de septiembre" */
export function fechaLarga(d: Date) {
  return `${DIAS_LARGOS[d.getDay()]} ${d.getDate()} de ${MESES_LARGOS[d.getMonth()]}`;
}

/** Días consecutivos a partir de hoy + `desde` (inclusive), a medianoche local. */
export function rangoDias(desde: number, cantidad: number) {
  const hoy = new Date();
  return Array.from({ length: cantidad }, (_, i) => new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() + desde + i));
}
