import { useCallback, useContext } from "react";
import { es } from "@/i18n/es";
import { en } from "@/i18n/en";
import type { Idioma } from "@/services/ajustesService";
import { AjustesContext } from "@/ajustes/AjustesContext";

export type { Idioma };

/**
 * Internacionalización de TurnoSmart.
 *
 * - i18n/es.ts es el diccionario base (el español de la app, tal cual).
 * - i18n/en.ts tiene la misma forma: TypeScript marca cualquier clave que falte.
 * - `t("inicio.proximaCita")`; con parámetros, `t("citas.sinCitasEl", { fecha })`
 *   reemplaza `{fecha}`. Plurales: con `count === 1` se usa la clave `_one`
 *   si existe («1 cita» / «3 citas»).
 * - Las pantallas usan `useT()`; los servicios, `tr()`, que lee el idioma
 *   activo (lo fija AjustesProvider).
 */

type Hojas<T, P extends string = ""> = {
  [K in keyof T & string]: T[K] extends string ? `${P}${K}` : Hojas<T[K], `${P}${K}.`>;
}[keyof T & string];

/** Todas las claves de texto válidas. */
export type Clave = Hojas<typeof es>;

/** La forma del diccionario base, con cualquier texto en cada hoja. */
export type Diccionario<T = typeof es> = { [K in keyof T]: T[K] extends string ? string : Diccionario<T[K]> };

export type Params = Record<string, string | number>;
export type T = (clave: Clave, params?: Params) => string;

const DICCIONARIOS: Record<Idioma, Diccionario> = { es, en };

let idiomaActual: Idioma = "es";

/** Lo llama AjustesProvider al cargar y al cambiar el idioma. */
export function setIdiomaActual(idioma: Idioma) {
  idiomaActual = idioma;
}

export function getIdiomaActual(): Idioma {
  return idiomaActual;
}

function buscar(dic: Diccionario, clave: string): string | undefined {
  let v: unknown = dic;
  for (const parte of clave.split(".")) v = (v as Record<string, unknown> | undefined)?.[parte];
  return typeof v === "string" ? v : undefined;
}

export function traducir(idioma: Idioma, clave: Clave, params?: Params): string {
  const dic = DICCIONARIOS[idioma];
  const singular = params?.count === 1 ? buscar(dic, `${clave}_one`) : undefined;
  const texto = singular ?? buscar(dic, clave) ?? buscar(es, clave) ?? clave;
  return params ? texto.replace(/\{(\w+)\}/g, (m: string, k: string) => (k in params ? String(params[k]) : m)) : texto;
}

/** Traducción en el idioma activo, para código fuera de React (servicios). */
export function tr(clave: Clave, params?: Params): string {
  return traducir(idiomaActual, clave, params);
}

/** Valores que llegan como datos en español y se muestran traducidos. */
export type GrupoDato = "especialidades" | "franjas" | "estadosCita" | "factores";

export function traducirDato(idioma: Idioma, grupo: GrupoDato, valor: string): string {
  return buscar(DICCIONARIOS[idioma], `datos.${grupo}.${valor}`) ?? valor;
}

/** Traductor enlazado al idioma elegido en Ajustes; la pantalla se vuelve a dibujar al cambiarlo. */
export function useT(): T {
  const { idioma } = useContext(AjustesContext);
  return useCallback((clave: Clave, params?: Params) => traducir(idioma, clave, params), [idioma]);
}

/** `dato("especialidades", "Cardiología")` → «Cardiology» en inglés; sin traducción, el valor tal cual. */
export function useDato() {
  const { idioma } = useContext(AjustesContext);
  return useCallback((grupo: GrupoDato, valor: string) => traducirDato(idioma, grupo, valor), [idioma]);
}

/**
 * Etiquetas y valores de los factores de la IA («Tiempo en espera»,
 * «34 días», «Cardiología», «Tarde», «2,1 km»), que llegan en español.
 */
export function traducirFactor(idioma: Idioma, texto: string): string {
  if (idioma === "es") return texto;
  const dias = /^(\d+) días?$/.exec(texto);
  if (dias) return traducir(idioma, "comun.nDias", { count: Number(dias[1]) });
  const km = /^(\d+),(\d+) km$/.exec(texto);
  if (km) return `${km[1]}.${km[2]} km`;
  for (const grupo of ["factores", "especialidades", "franjas"] as const) {
    const v = buscar(DICCIONARIOS[idioma], `datos.${grupo}.${texto}`);
    if (v) return v;
  }
  return texto;
}

export function useValorFactor() {
  const { idioma } = useContext(AjustesContext);
  return useCallback((texto: string) => traducirFactor(idioma, texto), [idioma]);
}
