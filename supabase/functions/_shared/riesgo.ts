/**
 * TurnoSmart · Riesgo de inasistencia de una cita (lógica pura).
 *
 * La usan la Edge Function `predecir-inasistencia` y las pruebas (Jest y
 * Deno). Sin dependencias de Deno ni de Node, y sin `async`, clases ni
 * desestructuración de arrays (ver deepseek.ts).
 *
 * Factores, todos SIN datos clínicos ni identificadores del paciente:
 *   · historial: inasistencias frente a citas previas (suavizado);
 *   · antelación: días entre que se agendó la cita y la cita;
 *   · día y hora: lunes, viernes y sábado; antes de las 8:00 o desde las 16:00;
 *   · ofertas previas: ofertas de cupo que dejó vencer o rechazó.
 *
 * El puntaje (0-1) es SIEMPRE determinista. DeepSeek recibe esas señales con
 * un alias por cita y devuelve el nivel y una explicación breve (es/en); la
 * respuesta se valida estrictamente y el nivel no puede alejarse más de un
 * escalón del determinista. Ante cualquier fallo se usa el nivel y la
 * explicación deterministas («fallback»). Es una estimación para organizar
 * la agenda, no una decisión sobre el paciente.
 */
import { ConfigDeepSeek, errorIA, modeloDe, MotivoRespaldo, motivoDeError, pedirJSONDeepSeek } from "./deepseek.ts";

/** Fila de `staff_datos_riesgo(p_cita_id)`. */
export interface DatosRiesgo {
  cita_id: string;
  consultorio_id?: string;
  fecha_hora: string;
  creada_en: string;
  asistidas: number;
  inasistencias: number;
  canceladas: number;
  ofertas_aceptadas: number;
  ofertas_rechazadas: number;
  ofertas_expiradas: number;
}

export type NivelRiesgo = "bajo" | "medio" | "alto";
export const NIVELES: NivelRiesgo[] = ["bajo", "medio", "alto"];

/** Señales normalizadas 0-1 (más alto = más riesgo). */
export interface SenalesRiesgo {
  historial: number;
  antelacion: number;
  dia_hora: number;
  ofertas: number;
}
export type ClaveRiesgo = keyof SenalesRiesgo;

export const PESOS_RIESGO: Record<ClaveRiesgo, number> = { historial: 0.5, antelacion: 0.2, dia_hora: 0.1, ofertas: 0.2 };
/** Umbrales del puntaje: desde 0,45 «alto»; desde 0,25 «medio». */
export const UMBRAL_ALTO = 0.45;
export const UMBRAL_MEDIO = 0.25;

/** Sin historial se asume esta tasa de inasistencia (prior) con este peso en citas. */
const TASA_PREVIA = 0.2;
const PESO_PREVIO = 2;
/** Desde estos días de antelación la señal es máxima. */
const DIAS_ANTELACION_MAXIMA = 30;
/** Sin ofertas previas, señal neutra. */
const OFERTAS_NEUTRO = 0.3;
/** Citas por solicitud a la IA. */
export const MAXIMO_CITAS_IA = 20;
/** Largo máximo de cada explicación (la base admite 300). */
export const LARGO_EXPLICACION = 220;

const DESPLAZAMIENTO_COLOMBIA_H = -5;
const DIA_MS = 86_400_000;
const DIAS_ES = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];
const DIAS_EN = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

const redondear = (n: number) => Math.round(n * 1000) / 1000;
const acotar = (n: number) => Math.min(1, Math.max(0, n));
const entero = (n: unknown) => (typeof n === "number" && Number.isFinite(n) && n > 0 ? Math.floor(n) : 0);

/** Día de la semana (0 = domingo) y hora (0-23) en Colombia (UTC-5, sin horario de verano). */
export function diaYHoraColombia(fechaHoraISO: string): { dia: number; hora: number } {
  const local = new Date(new Date(fechaHoraISO).getTime() + DESPLAZAMIENTO_COLOMBIA_H * 3_600_000);
  return { dia: local.getUTCDay(), hora: local.getUTCHours() };
}

export function diasAntelacion(d: Pick<DatosRiesgo, "fecha_hora" | "creada_en">): number {
  const dias = (new Date(d.fecha_hora).getTime() - new Date(d.creada_en).getTime()) / DIA_MS;
  return Number.isFinite(dias) ? Math.max(0, Math.round(dias)) : 0;
}

export function senalesRiesgo(d: DatosRiesgo): SenalesRiesgo {
  const asistidas = entero(d.asistidas);
  const inasistencias = entero(d.inasistencias);
  const aceptadas = entero(d.ofertas_aceptadas);
  const rechazadas = entero(d.ofertas_rechazadas);
  const expiradas = entero(d.ofertas_expiradas);
  const { dia, hora } = diaYHoraColombia(d.fecha_hora);
  const ofertas = aceptadas + rechazadas + expiradas;
  return {
    historial: redondear((inasistencias + TASA_PREVIA * PESO_PREVIO) / (asistidas + inasistencias + PESO_PREVIO)),
    antelacion: redondear(acotar(diasAntelacion(d) / DIAS_ANTELACION_MAXIMA)),
    dia_hora: (dia === 1 || dia === 5 || dia === 6 ? 0.5 : 0) + (hora < 8 || hora >= 16 ? 0.5 : 0),
    // Una oferta vencida sin respuesta pesa el doble que un rechazo explícito.
    ofertas: ofertas === 0 ? OFERTAS_NEUTRO : redondear((expiradas + 0.5 * rechazadas + OFERTAS_NEUTRO) / (ofertas + 1)),
  };
}

export function puntajeRiesgo(s: SenalesRiesgo): number {
  return redondear(
    acotar(
      PESOS_RIESGO.historial * s.historial +
        PESOS_RIESGO.antelacion * s.antelacion +
        PESOS_RIESGO.dia_hora * s.dia_hora +
        PESOS_RIESGO.ofertas * s.ofertas
    )
  );
}

export function nivelDePuntaje(puntaje: number): NivelRiesgo {
  return puntaje >= UMBRAL_ALTO ? "alto" : puntaje >= UMBRAL_MEDIO ? "medio" : "bajo";
}

/** Lo que se guarda en `riesgo_inasistencia.factores`: datos reales, sin identificadores. */
export function factoresRiesgo(d: DatosRiesgo) {
  const { dia, hora } = diaYHoraColombia(d.fecha_hora);
  return {
    senales: senalesRiesgo(d),
    citas_previas: { asistidas: entero(d.asistidas), inasistencias: entero(d.inasistencias), canceladas: entero(d.canceladas) },
    dias_antelacion: diasAntelacion(d),
    dia_semana: dia,
    hora,
    ofertas_previas: {
      aceptadas: entero(d.ofertas_aceptadas),
      rechazadas: entero(d.ofertas_rechazadas),
      expiradas: entero(d.ofertas_expiradas),
    },
  };
}

const NIVEL_EN: Record<NivelRiesgo, string> = { bajo: "Low", medio: "Medium", alto: "High" };

/** Frases deterministas de cada factor (es/en), con datos reales. */
function frase(clave: ClaveRiesgo, d: DatosRiesgo): { es: string; en: string } {
  const f = factoresRiesgo(d);
  const previas = f.citas_previas.asistidas + f.citas_previas.inasistencias;
  switch (clave) {
    case "historial":
      return previas === 0
        ? { es: "sin historial de citas previas", en: "no previous appointments" }
        : {
            es: `${f.citas_previas.inasistencias} inasistencia(s) en ${previas} citas previas`,
            en: `${f.citas_previas.inasistencias} no-show(s) in ${previas} previous appointments`,
          };
    case "antelacion":
      return {
        es: `agendada con ${f.dias_antelacion} días de antelación`,
        en: `booked ${f.dias_antelacion} days in advance`,
      };
    case "dia_hora":
      return {
        es: `${DIAS_ES[f.dia_semana]} a las ${f.hora}:00`,
        en: `${DIAS_EN[f.dia_semana]} at ${f.hora}:00`,
      };
    case "ofertas":
      return {
        es: `${f.ofertas_previas.expiradas} oferta(s) vencida(s) y ${f.ofertas_previas.rechazadas} rechazada(s)`,
        en: `${f.ofertas_previas.expiradas} expired and ${f.ofertas_previas.rechazadas} declined offer(s)`,
      };
  }
}

/** Explicación determinista: el nivel y los dos factores que más suman. */
export function explicacionDeterminista(d: DatosRiesgo, nivel: NivelRiesgo): { es: string; en: string } {
  const s = senalesRiesgo(d);
  const claves = (Object.keys(PESOS_RIESGO) as ClaveRiesgo[])
    .map((clave) => ({ clave, aporte: PESOS_RIESGO[clave] * s[clave] }))
    .filter((x) => x.aporte > 0)
    .sort((a, b) => b.aporte - a.aporte)
    .slice(0, 2)
    .map((x) => frase(x.clave, d));
  const es = claves.map((c) => c.es).join("; ");
  const en = claves.map((c) => c.en).join("; ");
  return {
    es: `Riesgo ${nivel}: ${es || "sin factores destacados"}.`,
    en: `${NIVEL_EN[nivel]} risk: ${en || "no notable factors"}.`,
  };
}

/** Resultado por cita, tal como se guarda con `guardar_riesgo_inasistencia`. */
export interface ResultadoRiesgo {
  cita_id: string;
  puntaje: number;
  nivel: NivelRiesgo;
  estrategia: "ai" | "fallback";
  motivo_fallback: MotivoRespaldo | null;
  modelo: string | null;
  explicacion_es: string;
  explicacion_en: string;
  factores: ReturnType<typeof factoresRiesgo>;
}

export function riesgoDeterminista(d: DatosRiesgo, motivo: MotivoRespaldo): ResultadoRiesgo {
  const puntaje = puntajeRiesgo(senalesRiesgo(d));
  const nivel = nivelDePuntaje(puntaje);
  const explicacion = explicacionDeterminista(d, nivel);
  return {
    cita_id: d.cita_id,
    puntaje,
    nivel,
    estrategia: "fallback",
    motivo_fallback: motivo,
    modelo: null,
    explicacion_es: explicacion.es,
    explicacion_en: explicacion.en,
    factores: factoresRiesgo(d),
  };
}

// ---------------------------------------------------------------------------
// IA (DeepSeek)
// ---------------------------------------------------------------------------

/** Lo único que viaja a la IA por cita: un alias y las señales (sin ids, nombres ni datos clínicos). */
export function datosParaIA(citas: DatosRiesgo[]) {
  return {
    citas: citas.map((d, i) => {
      const f = factoresRiesgo(d);
      const puntaje = puntajeRiesgo(f.senales);
      return {
        cita: `a${i + 1}`,
        citas_previas: f.citas_previas,
        dias_antelacion: f.dias_antelacion,
        dia_semana: DIAS_ES[f.dia_semana],
        hora: f.hora,
        ofertas_previas: f.ofertas_previas,
        puntaje_base: puntaje,
        nivel_base: nivelDePuntaje(puntaje),
      };
    }),
  };
}

export const INSTRUCCIONES_RIESGO = `Eres el componente de riesgo de inasistencia de TurnoSmart, una app de citas médicas en Colombia. Ayudas al personal del consultorio a organizar la agenda: estimas si un paciente podría no asistir a su cita.
No es una decisión médica ni un juicio sobre la persona: no diagnosticas, no recomiendas tratamientos y no supones nada sobre su salud. Cada cita es un alias anónimo.
Usa exclusivamente los datos recibidos, sin inventar nada:
- citas_previas: asistidas, inasistencias y canceladas.
- dias_antelacion: días entre que se agendó y la cita (más días, más olvido).
- dia_semana y hora (hora de Colombia, 0-23).
- ofertas_previas: ofertas de cupo aceptadas, rechazadas y expiradas (sin respuesta).
- puntaje_base y nivel_base: cálculo determinista de referencia.
Para cada cita devuelve un nivel ("bajo", "medio" o "alto"), que puede diferir del nivel_base como máximo en un escalón, y una explicación breve (máximo 200 caracteres) en español y en inglés que mencione los factores que más pesan. Tono neutral y respetuoso.
Responde solo con json válido, incluyendo todas las citas, con este formato exacto:
{"evaluaciones":[{"cita":"a1","nivel":"medio","explicacion_es":"Dos inasistencias en cinco citas previas y cita agendada con 25 días de antelación.","explicacion_en":"Two no-shows in five previous appointments and booked 25 days in advance."}]}`;

const URL_O_CORREO = /https?:\/\/|www\.|@/i;

function explicacionValida(texto: unknown): string {
  if (typeof texto !== "string") throw errorIA("explicacion_invalida");
  const limpio = texto.replace(/\s+/g, " ").trim();
  if (limpio.length < 10 || limpio.length > LARGO_EXPLICACION || URL_O_CORREO.test(limpio)) {
    throw errorIA("explicacion_invalida");
  }
  return limpio;
}

/**
 * Valida estrictamente la respuesta de la IA para un lote de citas: JSON con
 * TODAS las citas (alias conocidos y sin repetir), un nivel válido a lo sumo
 * a un escalón del determinista y explicaciones breves en es/en sin enlaces
 * ni correos. Cualquier dato inválido descarta todo el lote (lanza un error
 * con su motivo). El puntaje y los factores los pone siempre el servidor.
 */
export function aplicarRespuestaRiesgo(citas: DatosRiesgo[], contenido: unknown, modelo: string): ResultadoRiesgo[] {
  if (typeof contenido !== "string" || contenido.trim() === "") throw errorIA("respuesta_vacia");
  let datos: unknown;
  try {
    datos = JSON.parse(contenido);
  } catch (_error) {
    throw errorIA("json_invalido");
  }
  const evaluaciones = (datos as { evaluaciones?: unknown } | null)?.evaluaciones;
  if (!Array.isArray(evaluaciones) || evaluaciones.length === 0) throw errorIA("formato_invalido");

  const alias = new Map<string, DatosRiesgo>(citas.map((d, i) => [`a${i + 1}`, d]));
  const porAlias = new Map<string, ResultadoRiesgo>();
  evaluaciones.forEach((item) => {
    const { cita, nivel, explicacion_es, explicacion_en } = (item ?? {}) as Record<string, unknown>;
    const d = typeof cita === "string" ? alias.get(cita) : undefined;
    if (!d) throw errorIA("cita_desconocida");
    if (porAlias.has(cita as string)) throw errorIA("cita_repetida");
    if (typeof nivel !== "string" || !NIVELES.includes(nivel as NivelRiesgo)) throw errorIA("nivel_invalido");
    const base = riesgoDeterminista(d, "ia_no_configurada");
    if (Math.abs(NIVELES.indexOf(nivel as NivelRiesgo) - NIVELES.indexOf(base.nivel)) > 1) {
      throw errorIA("nivel_incoherente");
    }
    porAlias.set(cita as string, {
      ...base,
      nivel: nivel as NivelRiesgo,
      estrategia: "ai",
      motivo_fallback: null,
      modelo,
      explicacion_es: explicacionValida(explicacion_es),
      explicacion_en: explicacionValida(explicacion_en),
    });
  });
  if (porAlias.size !== citas.length) throw errorIA("citas_incompletas");
  return citas.map((_, i) => porAlias.get(`a${i + 1}`) as ResultadoRiesgo);
}

/** Pide a DeepSeek el nivel y la explicación de un lote (máx. MAXIMO_CITAS_IA citas). */
export function evaluarLoteConIA(citas: DatosRiesgo[], config: ConfigDeepSeek): Promise<ResultadoRiesgo[]> {
  return pedirJSONDeepSeek(config, {
    instrucciones: INSTRUCCIONES_RIESGO,
    datos: datosParaIA(citas),
    maxTokens: Math.min(6000, 200 + 160 * citas.length),
  }).then((contenido) => aplicarRespuestaRiesgo(citas, contenido, modeloDe(config)));
}

/** Divide en lotes de `tamano`. */
export function enLotes<T>(items: T[], tamano = MAXIMO_CITAS_IA): T[][] {
  const lotes: T[][] = [];
  for (let i = 0; i < items.length; i += tamano) lotes.push(items.slice(i, i + tamano));
  return lotes;
}

/**
 * Calcula el riesgo de todas las citas: con la IA si está configurada (un
 * pedido por lote) y, si un lote falla, ese lote con la estrategia
 * determinista. Nunca rechaza.
 */
export function predecirConRespaldo(citas: DatosRiesgo[], ia: ConfigDeepSeek | null): Promise<ResultadoRiesgo[]> {
  if (!ia) return Promise.resolve(citas.map((d) => riesgoDeterminista(d, "ia_no_configurada")));
  return Promise.all(
    enLotes(citas).map((lote) =>
      Promise.resolve()
        .then(() => evaluarLoteConIA(lote, ia))
        .catch((error) => {
          const motivo = motivoDeError(error);
          return lote.map((d) => riesgoDeterminista(d, motivo));
        })
    )
  ).then((lotes) => lotes.reduce<ResultadoRiesgo[]>((todos, lote) => todos.concat(lote), []));
}
