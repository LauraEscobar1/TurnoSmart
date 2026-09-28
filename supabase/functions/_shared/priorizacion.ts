/**
 * TurnoSmart · Priorización de candidatos para un cupo (lógica pura).
 *
 * La usan:
 *   · la Edge Function `priorizar-cupo`,
 *   · las pruebas de la app (el Supabase falso), para verificar exactamente
 *     la misma lógica que corre en el servidor.
 * Sin dependencias de Deno ni de Node ni llamadas externas: solo TypeScript.
 *
 * Hoy la priorización es determinista. Una estrategia futura (por ejemplo,
 * con un proveedor de IA) debe implementar `EstrategiaPriorizacion`: recibe
 * los candidatos y devuelve el orden con su explicación, sin tocar cómo se
 * obtienen los candidatos ni cómo se crea la oferta.
 */

/** Fila de `candidatos_cupo(p_cupo_id)`. */
export interface Candidato {
  paciente_id: string;
  especialidad: string;
  solicitud_creada_en: string;
  dias_espera: number;
  puesto: number;
  franja_preferida: string;
  notificaciones_activas: boolean;
  distancia_max_km: number | null;
  cupo_fecha_hora: string;
}

/** Claves que admite `ofertas_factores` (la base también acepta «compatibilidad» para estrategias futuras). */
export type ClaveFactor = "tiempo-espera" | "especialidad" | "horario" | "distancia" | "disponibilidad" | "compatibilidad";

/** Factor de la explicación, tal como se guarda en `ofertas_factores`. */
export interface Factor {
  clave: ClaveFactor;
  /** Etiqueta canónica (en español); la app la traduce al mostrarla. */
  etiqueta: string;
  valor: string;
  valor_numerico: number | null;
  /** 0-1: solo dibuja la barra, nunca se muestra como número. */
  peso: number;
}

export interface CandidatoPriorizado extends Candidato {
  /** 0-1, interno. Nunca se muestra al paciente. */
  score: number;
  factores: Factor[];
}

/** Colombia no tiene horario de verano: UTC-5 todo el año. */
const DESPLAZAMIENTO_COLOMBIA_H = -5;
/** A partir de estos días en espera la señal de tiempo es máxima. */
const DIAS_TIEMPO_MAXIMO = 60;

const redondear = (n: number) => Math.round(n * 100) / 100;

/** Franja del cupo según su hora en Colombia: antes de las 12, «Mañana». */
export function franjaDelCupo(fechaHoraISO: string): "Mañana" | "Tarde" {
  const d = new Date(fechaHoraISO);
  const hora = (d.getUTCHours() + 24 + DESPLAZAMIENTO_COLOMBIA_H) % 24;
  return hora < 12 ? "Mañana" : "Tarde";
}

/** Señales normalizadas 0-1 de un candidato para un cupo. */
export function senales(c: Candidato) {
  const franjaCupo = franjaDelCupo(c.cupo_fecha_hora);
  return {
    tiempo: Math.min(1, Math.max(0, c.dias_espera) / DIAS_TIEMPO_MAXIMO),
    puesto: 1 / Math.max(1, c.puesto),
    horario: c.franja_preferida === franjaCupo ? 1 : c.franja_preferida === "Indistinto" ? 0.7 : 0.3,
    // Las ofertas duran minutos: con las alertas activas puede responder a tiempo.
    disponibilidad: c.notificaciones_activas ? 1 : 0.4,
  };
}

/** Score determinista: prioriza el tiempo de espera, luego el orden de llegada, el horario y la disponibilidad. */
export function scoreDeterminista(c: Candidato): number {
  const s = senales(c);
  return redondear(0.45 * s.tiempo + 0.2 * s.puesto + 0.2 * s.horario + 0.15 * s.disponibilidad);
}

/**
 * Explicación de la oferta con datos reales: máximo 4 factores, del más al
 * menos importante (siempre incluye la especialidad y el tiempo en espera). La distancia solo se explicaría con ubicaciones reales
 * (hoy no hay coordenadas del paciente), así que no se inventa.
 */
export function factoresExplicacion(c: Candidato): Factor[] {
  const s = senales(c);
  const factores: Factor[] = [
    { clave: "especialidad", etiqueta: "Tu especialidad", valor: c.especialidad, valor_numerico: null, peso: 1 },
    {
      clave: "tiempo-espera",
      etiqueta: "Tiempo en espera",
      valor: c.dias_espera === 1 ? "1 día" : `${c.dias_espera} días`,
      valor_numerico: c.dias_espera,
      peso: redondear(Math.max(0.05, s.tiempo)),
    },
    {
      clave: "horario",
      etiqueta: "Horario preferido",
      valor: c.franja_preferida,
      valor_numerico: null,
      peso: redondear(s.horario),
    },
  ];
  if (c.notificaciones_activas) {
    factores.push({
      clave: "disponibilidad",
      etiqueta: "Disponibilidad",
      valor: "Alertas activas",
      valor_numerico: null,
      peso: redondear(s.disponibilidad * 0.8),
    });
  }
  // La especialidad y el tiempo en espera explican siempre la oferta; se
  // completan con los dos factores de más peso. Se muestran por peso.
  const fijos = factores.filter((f) => f.clave === "especialidad" || f.clave === "tiempo-espera");
  const resto = factores.filter((f) => !fijos.includes(f)).sort((a, b) => b.peso - a.peso);
  return [...fijos, ...resto.slice(0, 4 - fijos.length)].sort((a, b) => b.peso - a.peso);
}

/** Estrategia determinista: ordena por score (desempate: puesto en la lista). */
export function priorizarDeterminista(candidatos: Candidato[]): CandidatoPriorizado[] {
  return candidatos
    .map((c) => ({ ...c, score: scoreDeterminista(c), factores: factoresExplicacion(c) }))
    .sort((a, b) => b.score - a.score || a.puesto - b.puesto);
}

/**
 * Estrategia de priorización: ordena a los candidatos de un cupo (el
 * primero recibe la oferta) y explica cada elección con sus factores.
 * La Edge Function solo depende de esta interfaz.
 */
export interface EstrategiaPriorizacion {
  nombre: string;
  priorizar(candidatos: Candidato[]): Promise<CandidatoPriorizado[]>;
}

/** La estrategia actual: determinista, sin servicios externos. */
export const estrategiaDeterminista: EstrategiaPriorizacion = {
  nombre: "determinista",
  // Sin `async`: el módulo se comparte con las pruebas de la app y no debe
  // requerir helpers de compilación.
  priorizar: (candidatos) => Promise.resolve(priorizarDeterminista(candidatos)),
};
