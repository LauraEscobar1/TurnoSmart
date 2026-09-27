import { useContext, useMemo } from "react";
import { getIdiomaActual, Idioma } from "@/i18n";
import { AjustesContext } from "@/ajustes/AjustesContext";

/**
 * Formatos de fecha y hora del sistema de diseño: 24 h, meses abreviados
 * en minúscula ("23 sep") y relativos cortos ("Hoy", "ayer", "ahora").
 * Se hace a mano para no depender del soporte de locales del motor JS.
 *
 * Cada función recibe el idioma al final (por defecto, el activo). En las
 * pantallas se usan con `useFormato()`, que las enlaza al idioma elegido y
 * vuelve a dibujar la pantalla cuando cambia.
 */
const TXT = {
  es: {
    meses: ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"],
    mesesLargos: ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"],
    diasCortos: ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"],
    diasLargos: ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"],
    hoy: "Hoy",
    manana: "Mañana",
    ahora: "ahora",
    Ahora: "Ahora",
    haceMin: (n: number) => `hace ${n} min`,
    HaceMin: (n: number) => `Hace ${n} min`,
    HaceH: (n: number) => `Hace ${n} h`,
    ayer: "ayer",
    Ayer: "Ayer",
    estaSemana: "Esta semana",
    anteriores: "Anteriores",
  },
  en: {
    meses: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
    mesesLargos: ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"],
    diasCortos: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
    diasLargos: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
    hoy: "Today",
    manana: "Tomorrow",
    ahora: "now",
    Ahora: "Now",
    haceMin: (n: number) => `${n} min ago`,
    HaceMin: (n: number) => `${n} min ago`,
    HaceH: (n: number) => `${n} h ago`,
    ayer: "yesterday",
    Ayer: "Yesterday",
    estaSemana: "This week",
    anteriores: "Earlier",
  },
};

const pad = (n: number) => String(n).padStart(2, "0");
const mayuscula = (s: string) => `${s[0].toUpperCase()}${s.slice(1)}`;

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

/** "sep" · "Sep" */
export function mes(iso: string, idioma: Idioma = getIdiomaActual()) {
  return TXT[idioma].meses[new Date(iso).getMonth()];
}

/** "23 sep" · "Sep 23" */
export function fechaCorta(iso: string, idioma: Idioma = getIdiomaActual()) {
  const d = new Date(iso);
  const m = TXT[idioma].meses[d.getMonth()];
  return idioma === "en" ? `${m} ${d.getDate()}` : `${d.getDate()} ${m}`;
}

/** "Hoy", "Mañana" o "23 sep". */
export function diaRelativo(iso: string, idioma: Idioma = getIdiomaActual()) {
  const diff = diasDesdeHoy(new Date(iso));
  if (diff === 0) return TXT[idioma].hoy;
  if (diff === 1) return TXT[idioma].manana;
  return fechaCorta(iso, idioma);
}

/** true si `diaRelativo` devolvió «Hoy» o «Mañana» (y no una fecha). */
export function esDiaCercano(iso: string) {
  const diff = diasDesdeHoy(new Date(iso));
  return diff === 0 || diff === 1;
}

/** "Hoy, 23 sep" */
export function fechaConDia(iso: string, idioma: Idioma = getIdiomaActual()) {
  return esDiaCercano(iso) ? `${diaRelativo(iso, idioma)}, ${fechaCorta(iso, idioma)}` : fechaCorta(iso, idioma);
}

/** Marca de tiempo de un aviso: "ahora", "hace 12 min", "09:41", "ayer", "18 sep". */
export function haceCuanto(iso: string, idioma: Idioma = getIdiomaActual()) {
  const t = TXT[idioma];
  const d = new Date(iso);
  const min = Math.floor((Date.now() - d.getTime()) / 60_000);
  if (min < 1) return t.ahora;
  if (min < 60) return t.haceMin(min);
  if (mismoDia(d, new Date())) return hora(iso);
  if (diasDesdeHoy(d) === -1) return t.ayer;
  return fechaCorta(iso, idioma);
}

/** Sección de la bandeja de avisos según el día: "Hoy", "Ayer", "Esta semana" o "Anteriores". */
export function grupoAviso(iso: string, idioma: Idioma = getIdiomaActual()) {
  const t = TXT[idioma];
  const diff = diasDesdeHoy(new Date(iso));
  if (diff >= 0) return t.hoy;
  if (diff === -1) return t.Ayer;
  if (diff >= -6) return t.estaSemana;
  return t.anteriores;
}

/** Marca de tiempo en la bandeja: "Ahora", "Hace 20 min", "Hace 3 h", "Ayer · 20:00", "18 sep · 10:00". */
export function marcaAviso(iso: string, idioma: Idioma = getIdiomaActual()) {
  const t = TXT[idioma];
  const min = Math.floor((Date.now() - new Date(iso).getTime()) / 60_000);
  const diff = diasDesdeHoy(new Date(iso));
  if (diff >= 0) {
    if (min < 1) return t.Ahora;
    if (min < 60) return t.HaceMin(min);
    return t.HaceH(Math.floor(min / 60));
  }
  if (diff === -1) return `${t.Ayer} · ${hora(iso)}`;
  return `${fechaCorta(iso, idioma)} · ${hora(iso)}`;
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

/** Clave estable de un día local: "2026-09-24". Sirve para agrupar citas por día. */
export function claveDia(fecha: Date | string) {
  const d = typeof fecha === "string" ? new Date(fecha) : fecha;
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** "Mié" · "Wed" */
export function diaSemanaCorto(d: Date, idioma: Idioma = getIdiomaActual()) {
  return TXT[idioma].diasCortos[d.getDay()];
}

/** "Septiembre 2026" · "September 2026" */
export function mesYAnio(d: Date, idioma: Idioma = getIdiomaActual()) {
  return `${mayuscula(TXT[idioma].mesesLargos[d.getMonth()])} ${d.getFullYear()}`;
}

/** "miércoles 24 de septiembre" · "Wednesday, September 24" */
export function fechaLarga(d: Date, idioma: Idioma = getIdiomaActual()) {
  const t = TXT[idioma];
  return idioma === "en"
    ? `${t.diasLargos[d.getDay()]}, ${t.mesesLargos[d.getMonth()]} ${d.getDate()}`
    : `${t.diasLargos[d.getDay()]} ${d.getDate()} de ${t.mesesLargos[d.getMonth()]}`;
}

/** Días consecutivos a partir de hoy + `desde` (inclusive), a medianoche local. */
export function rangoDias(desde: number, cantidad: number) {
  const hoy = new Date();
  return Array.from({ length: cantidad }, (_, i) => new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() + desde + i));
}

/** Los formatos que dependen del idioma, enlazados al idioma elegido en Ajustes. */
export function useFormato() {
  const { idioma } = useContext(AjustesContext);
  return useMemo(
    () => ({
      idioma,
      mes: (iso: string) => mes(iso, idioma),
      fechaCorta: (iso: string) => fechaCorta(iso, idioma),
      diaRelativo: (iso: string) => diaRelativo(iso, idioma),
      fechaConDia: (iso: string) => fechaConDia(iso, idioma),
      haceCuanto: (iso: string) => haceCuanto(iso, idioma),
      grupoAviso: (iso: string) => grupoAviso(iso, idioma),
      marcaAviso: (iso: string) => marcaAviso(iso, idioma),
      diaSemanaCorto: (d: Date) => diaSemanaCorto(d, idioma),
      mesYAnio: (d: Date) => mesYAnio(d, idioma),
      fechaLarga: (d: Date) => fechaLarga(d, idioma),
    }),
    [idioma]
  );
}
