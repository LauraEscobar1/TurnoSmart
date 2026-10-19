/**
 * TurnoSmart · Priorización de candidatos para un cupo (lógica pura).
 *
 * La usan:
 *   · la Edge Function `priorizar-cupo`,
 *   · las pruebas de la app (el Supabase falso), para verificar exactamente
 *     la misma lógica que corre en el servidor.
 * Sin dependencias de Deno ni de Node: solo TypeScript (la única llamada
 * externa, a DeepSeek, usa el `fetch` que recibe).
 *
 * Dos estrategias implementan `EstrategiaPriorizacion` (reciben los
 * candidatos y devuelven el orden con su explicación, sin tocar cómo se
 * obtienen los candidatos ni cómo se crea la oferta):
 *   · determinista: tiempo en espera, puesto, franja horaria y alertas;
 *   · DeepSeek (crearEstrategiaDeepSeek): la IA pondera los mismos cuatro
 *     factores; `priorizarConRespaldo` vuelve a la determinista si falla.
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
 * Con `pesos` (los de la IA, ya validados) cambia solo el peso de cada
 * factor: etiquetas y valores salen siempre de los datos del candidato.
 */
export function factoresExplicacion(c: Candidato, pesos?: Partial<Record<ClaveFactor, number>>): Factor[] {
  const s = senales(c);
  const peso = (clave: ClaveFactor, deterministico: number) => redondear(pesos?.[clave] ?? deterministico);
  const factores: Factor[] = [
    { clave: "especialidad", etiqueta: "Tu especialidad", valor: c.especialidad, valor_numerico: null, peso: peso("especialidad", 1) },
    {
      clave: "tiempo-espera",
      etiqueta: "Tiempo en espera",
      valor: c.dias_espera === 1 ? "1 día" : `${c.dias_espera} días`,
      valor_numerico: c.dias_espera,
      peso: peso("tiempo-espera", Math.max(0.05, s.tiempo)),
    },
    {
      clave: "horario",
      etiqueta: "Horario preferido",
      valor: c.franja_preferida,
      valor_numerico: null,
      peso: peso("horario", s.horario),
    },
  ];
  if (c.notificaciones_activas) {
    factores.push({
      clave: "disponibilidad",
      etiqueta: "Disponibilidad",
      valor: "Alertas activas",
      valor_numerico: null,
      peso: peso("disponibilidad", s.disponibilidad * 0.8),
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

/** Estrategia determinista, sin servicios externos: también es el respaldo de la IA. */
export const estrategiaDeterminista: EstrategiaPriorizacion = {
  nombre: "determinista",
  // Sin `async`: el módulo se comparte con las pruebas de la app y no debe
  // requerir helpers de compilación.
  priorizar: (candidatos) => Promise.resolve(priorizarDeterminista(candidatos)),
};

// ---------------------------------------------------------------------------
// Estrategia con IA (DeepSeek), con respaldo determinista
// ---------------------------------------------------------------------------
//
// La IA solo ordena: recibe alias anónimos y las señales de los cuatro
// factores, y devuelve un score y un peso por factor para cada alias. No
// ejecuta nada ni ve la base: la Edge Function valida la respuesta, elige al
// candidato y crea la oferta con `ofrecer_cupo`, que vuelve a validar las
// reglas de negocio (candidato vigente, cupo abierto y futuro, sin
// duplicados). Etiquetas y valores de la explicación los arma el servidor
// con datos reales, así la IA no puede inventar información del paciente.
// Ante cualquier problema (sin clave, caída, demora, JSON inválido, alias
// desconocido, score o pesos fuera de rango) se usa la estrategia
// determinista y la oferta se crea igual.

/** Los cuatro factores funcionales que pondera la IA. */
export const CLAVES_IA: ClaveFactor[] = ["especialidad", "horario", "tiempo-espera", "disponibilidad"];

/** Candidatos por solicitud (los primeros según la estrategia determinista): acota costo y tamaño. */
export const MAXIMO_CANDIDATOS_IA = 20;

/** API oficial de DeepSeek (formato OpenAI), api-docs.deepseek.com. */
export const DEEPSEEK_URL = "https://api.deepseek.com/chat/completions";
/** El modelo más económico; se usa en modo sin razonamiento y con temperatura 0. */
export const DEEPSEEK_MODELO = "deepseek-flash";
export const DEEPSEEK_TIMEOUT_MS = 8000;

/** Por qué no se usó la respuesta de la IA (solo para los logs del servidor). */
export type MotivoRespaldo =
  | "ia_no_configurada"
  | "timeout"
  | "error_red"
  | `http_${number}`
  | "respuesta_incompleta"
  | "respuesta_vacia"
  | "json_invalido"
  | "formato_invalido"
  | "candidato_desconocido"
  | "candidato_repetido"
  | "score_invalido"
  | "factores_invalidos"
  | "error_inesperado";

// Errores como objetos Error con un motivo (sin clases: ver la nota de estrategiaDeterminista).
function errorIA(motivo: MotivoRespaldo): Error {
  return Object.assign(new Error(`priorizacion_ia: ${motivo}`), { motivoIA: motivo });
}

export function motivoDeError(error: unknown): MotivoRespaldo {
  return (error as { motivoIA?: MotivoRespaldo } | null)?.motivoIA ?? "error_inesperado";
}

/** Lo único que viaja a la IA por candidato: un alias y las señales de los cuatro factores. */
export interface CandidatoParaIA {
  candidato: string;
  dias_espera: number;
  puesto_en_lista: number;
  franja_preferida: string;
  alertas_activas: boolean;
}

/**
 * Candidatos que evalúa la IA: los primeros MAXIMO_CANDIDATOS_IA según la
 * estrategia determinista, con alias c1..cN en ese orden. El resto queda
 * detrás, en orden determinista.
 */
export function seleccionParaIA(candidatos: Candidato[]) {
  const base = priorizarDeterminista(candidatos);
  const evaluados = base.slice(0, MAXIMO_CANDIDATOS_IA);
  const alias = new Map<string, CandidatoPriorizado>(evaluados.map((c, i) => [`c${i + 1}`, c]));
  return { evaluados, alias, resto: base.slice(MAXIMO_CANDIDATOS_IA) };
}

/**
 * Datos que se envían a la IA: la franja del cupo y, por candidato, solo el
 * alias y las señales. Sin ids, nombres, cédulas, contacto, especialidad,
 * ubicación ni datos clínicos.
 */
export function datosParaIA(candidatos: Candidato[]) {
  const { alias } = seleccionParaIA(candidatos);
  return {
    cupo: { franja: franjaDelCupo(candidatos[0].cupo_fecha_hora), todos_esperan_esta_especialidad: true },
    // Sin desestructurar arrays: el módulo se comparte con Jest y no debe requerir helpers de Babel.
    candidatos: Array.from(alias.keys()).map((candidato): CandidatoParaIA => {
      const c = alias.get(candidato)!;
      return {
        candidato,
        dias_espera: c.dias_espera,
        puesto_en_lista: c.puesto,
        franja_preferida: c.franja_preferida,
        alertas_activas: c.notificaciones_activas,
      };
    }),
  };
}

/** Instrucciones para la IA (el modo JSON de DeepSeek exige la palabra «json» y un ejemplo). */
export const INSTRUCCIONES_IA = `Eres el componente de priorización de TurnoSmart. Cuando se libera un cupo de cita médica, ordenas a los candidatos de la lista de espera según su compatibilidad con ese cupo, para decidir a quién se le ofrece primero.
No es una decisión médica: no diagnosticas ni recomiendas tratamientos. Solo priorizas quién recibe primero la oferta.
Usa exclusivamente los datos recibidos; no supongas ni inventes nada. Cada candidato es un alias anónimo.
Evalúa cuatro factores, cada uno con un peso entre 0 y 1:
- "especialidad": todos los candidatos esperan la especialidad del cupo.
- "horario": compatibilidad entre franja_preferida y la franja del cupo ("Indistinto" es compatible con ambas).
- "tiempo-espera": más días en espera y un mejor puesto en la lista (1 = primero) pesan más.
- "disponibilidad": con alertas_activas puede responder a tiempo (la oferta dura pocos minutos).
Da a cada candidato un score entre 0 y 1 (más alto = se le ofrece antes). Es una priorización heurística, no una predicción.
Responde solo con json válido, incluyendo a todos los candidatos, con este formato exacto:
{"ranking":[{"candidato":"c1","score":0.82,"factores":[{"clave":"especialidad","peso":1},{"clave":"horario","peso":0.9},{"clave":"tiempo-espera","peso":0.6},{"clave":"disponibilidad","peso":1}]}]}`;

const enRango = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v) && v >= 0 && v <= 1;

/** Pesos de un candidato: exactamente los cuatro factores, cada uno una vez y entre 0 y 1. */
function pesosDeIA(factores: unknown): Record<string, number> {
  if (!Array.isArray(factores) || factores.length !== CLAVES_IA.length) throw errorIA("factores_invalidos");
  const pesos: Record<string, number> = {};
  factores.forEach((f) => {
    const { clave, peso } = (f ?? {}) as { clave?: unknown; peso?: unknown };
    if (typeof clave !== "string" || !CLAVES_IA.includes(clave as ClaveFactor) || clave in pesos || !enRango(peso)) {
      throw errorIA("factores_invalidos");
    }
    pesos[clave] = peso;
  });
  return pesos;
}

/**
 * Valida estrictamente el contenido que devolvió la IA y lo convierte en el
 * orden de candidatos. Cualquier dato inválido descarta TODA la respuesta
 * (lanza un error con su motivo) y se usa la estrategia determinista.
 * Los candidatos que la IA no ordenó quedan detrás, en orden determinista.
 */
export function aplicarRespuestaIA(candidatos: Candidato[], contenido: unknown): CandidatoPriorizado[] {
  if (typeof contenido !== "string" || contenido.trim() === "") throw errorIA("respuesta_vacia");
  let datos: unknown;
  try {
    datos = JSON.parse(contenido);
  } catch (_error) {
    throw errorIA("json_invalido");
  }
  const ranking = (datos as { ranking?: unknown } | null)?.ranking;
  if (!Array.isArray(ranking) || ranking.length === 0) throw errorIA("formato_invalido");

  const { evaluados, alias, resto } = seleccionParaIA(candidatos);
  const vistos = new Set<string>();
  const ordenados = ranking
    .map((item, orden) => {
      const { candidato, score, factores } = (item ?? {}) as { candidato?: unknown; score?: unknown; factores?: unknown };
      const c = typeof candidato === "string" ? alias.get(candidato) : undefined;
      if (!c) throw errorIA("candidato_desconocido");
      if (vistos.has(candidato as string)) throw errorIA("candidato_repetido");
      vistos.add(candidato as string);
      if (!enRango(score)) throw errorIA("score_invalido");
      const priorizado: CandidatoPriorizado = { ...c, score: redondear(score), factores: factoresExplicacion(c, pesosDeIA(factores)) };
      return { orden, priorizado };
    })
    .sort((a, b) => b.priorizado.score - a.priorizado.score || a.orden - b.orden)
    .map((x) => x.priorizado);
  const sinOrdenar = evaluados.filter((_, i) => !vistos.has(`c${i + 1}`));
  return [...ordenados, ...sinOrdenar, ...resto];
}

export interface ConfigDeepSeek {
  apiKey: string;
  modelo?: string;
  timeoutMs?: number;
  /** Inyectable para las pruebas; por defecto, el fetch global. */
  fetch?: typeof fetch;
}

/**
 * Estrategia DeepSeek: UNA solicitud por cupo con todos los candidatos
 * evaluados, modo JSON, sin razonamiento y temperatura 0 (estable).
 * Lanza un error con su motivo si no hay una respuesta válida a tiempo.
 */
export function crearEstrategiaDeepSeek(config: ConfigDeepSeek): EstrategiaPriorizacion {
  const pedir = config.fetch ?? fetch;
  const timeoutMs = config.timeoutMs && config.timeoutMs > 0 ? config.timeoutMs : DEEPSEEK_TIMEOUT_MS;
  return {
    nombre: "deepseek",
    priorizar: (candidatos) => {
      const datos = datosParaIA(candidatos);
      const control = new AbortController();
      let temporizador: ReturnType<typeof setTimeout> | undefined;
      const limite = new Promise<never>((_, rechazar) => {
        temporizador = setTimeout(() => {
          control.abort();
          rechazar(errorIA("timeout"));
        }, timeoutMs);
      });
      const llamada = pedir(DEEPSEEK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${config.apiKey}` },
        body: JSON.stringify({
          model: config.modelo || DEEPSEEK_MODELO,
          thinking: { type: "disabled" },
          temperature: 0,
          response_format: { type: "json_object" },
          max_tokens: Math.min(4000, 200 + 120 * datos.candidatos.length),
          stream: false,
          messages: [
            { role: "system", content: INSTRUCCIONES_IA },
            { role: "user", content: JSON.stringify(datos) },
          ],
        }),
        signal: control.signal,
      })
        .then(
          (respuesta) => {
            if (!respuesta.ok) throw errorIA(`http_${respuesta.status}`);
            return respuesta.json().catch(() => {
              throw errorIA("json_invalido");
            });
          },
          () => {
            throw errorIA("error_red");
          }
        )
        .then((cuerpo: { choices?: { finish_reason?: string; message?: { content?: unknown } }[] }) => {
          const opcion = cuerpo?.choices?.[0];
          // "length" (cortada), "content_filter", etc.: la respuesta no está completa.
          if (opcion?.finish_reason !== "stop") throw errorIA("respuesta_incompleta");
          return aplicarRespuestaIA(candidatos, opcion.message?.content);
        });
      return Promise.race([llamada, limite]).finally(() => clearTimeout(temporizador));
    },
  };
}

/** Resultado de priorizar un cupo: el orden y qué estrategia lo produjo. */
export interface ResultadoPriorizacion {
  priorizados: CandidatoPriorizado[];
  /** "ai": orden de la IA, ya validado; "fallback": estrategia determinista. */
  estrategia: "ai" | "fallback";
  motivo: MotivoRespaldo | null;
}

/**
 * Prioriza con la IA si está configurada y, ante cualquier fallo, con la
 * estrategia determinista. Nunca rechaza: siempre devuelve un orden con el
 * que ofrecer el cupo.
 */
export function priorizarConRespaldo(candidatos: Candidato[], ia: EstrategiaPriorizacion | null): Promise<ResultadoPriorizacion> {
  const respaldo = (motivo: MotivoRespaldo): ResultadoPriorizacion => ({
    priorizados: priorizarDeterminista(candidatos),
    estrategia: "fallback",
    motivo,
  });
  if (!ia) return Promise.resolve(respaldo("ia_no_configurada"));
  return Promise.resolve()
    .then(() => ia.priorizar(candidatos))
    .then(
      (priorizados): ResultadoPriorizacion =>
        priorizados.length > 0 && candidatos.some((c) => c.paciente_id === priorizados[0].paciente_id)
          ? { priorizados, estrategia: "ai", motivo: null }
          : respaldo("formato_invalido"),
      (error) => respaldo(motivoDeError(error))
    );
}
