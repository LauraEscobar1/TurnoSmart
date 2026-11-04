/**
 * TurnoSmart · Llamada a DeepSeek compartida por las Edge Functions.
 *
 * La usan `priorizacion.ts` (priorizar-cupo) y `riesgo.ts`
 * (predecir-inasistencia). Hace UNA solicitud en modo JSON, sin
 * razonamiento y con temperatura 0, con un tiempo máximo; devuelve el texto
 * que respondió el modelo y cada módulo lo valida estrictamente. Cualquier
 * problema (sin clave, caída, demora, respuesta cortada) es un error con un
 * motivo, y quien llama usa su estrategia determinista de respaldo.
 *
 * Sin dependencias de Deno ni de Node, y sin `async`, clases ni
 * desestructuración de arrays: el módulo también lo cargan las pruebas de la
 * app (Jest) desde fuera de su carpeta, donde no hay helpers de Babel.
 */

/** API oficial de DeepSeek (formato OpenAI), api-docs.deepseek.com. */
export const DEEPSEEK_URL = "https://api.deepseek.com/chat/completions";
/**
 * El modelo más económico; se usa en modo sin razonamiento y con temperatura 0.
 * Nombre vigente según api-docs.deepseek.com (verificado el 2026-11-02);
 * se puede cambiar sin tocar el código con el secret DEEPSEEK_MODEL.
 */
export const DEEPSEEK_MODELO = "deepseek-flash";
export const DEEPSEEK_TIMEOUT_MS = 8000;

/** Por qué no se usó la respuesta de la IA (solo para los logs y la columna motivo_fallback). */
export type MotivoRespaldo =
  | "ia_no_configurada"
  | "timeout"
  | "error_red"
  | `http_${number}`
  | "respuesta_incompleta"
  | "respuesta_vacia"
  | "json_invalido"
  | "formato_invalido"
  // priorizar-cupo
  | "candidato_desconocido"
  | "candidato_repetido"
  | "score_invalido"
  | "factores_invalidos"
  // predecir-inasistencia
  | "cita_desconocida"
  | "cita_repetida"
  | "citas_incompletas"
  | "nivel_invalido"
  | "nivel_incoherente"
  | "explicacion_invalida"
  | "error_inesperado";

// Errores como objetos Error con un motivo (sin clases: ver la nota de arriba).
export function errorIA(motivo: MotivoRespaldo): Error {
  return Object.assign(new Error(`ia: ${motivo}`), { motivoIA: motivo });
}

export function motivoDeError(error: unknown): MotivoRespaldo {
  return (error as { motivoIA?: MotivoRespaldo } | null)?.motivoIA ?? "error_inesperado";
}

export interface ConfigDeepSeek {
  apiKey: string;
  modelo?: string;
  timeoutMs?: number;
  /** Inyectable para las pruebas; por defecto, el fetch global. */
  fetch?: typeof fetch;
}

export interface SolicitudJSON {
  /** Mensaje de sistema: debe incluir la palabra «json» y un ejemplo (modo JSON de DeepSeek). */
  instrucciones: string;
  /** Datos del usuario; se envían como JSON. */
  datos: unknown;
  maxTokens: number;
}

/** Modelo efectivo de una configuración (para registrar cuál respondió). */
export function modeloDe(config: ConfigDeepSeek): string {
  return config.modelo || DEEPSEEK_MODELO;
}

/**
 * Pide a DeepSeek una respuesta JSON y devuelve el contenido (texto) del
 * mensaje. Rechaza con un error con motivo si no hay una respuesta completa
 * a tiempo; NO valida el contenido (eso lo hace cada módulo).
 */
export function pedirJSONDeepSeek(config: ConfigDeepSeek, solicitud: SolicitudJSON): Promise<unknown> {
  const pedir = config.fetch ?? fetch;
  const timeoutMs = config.timeoutMs && config.timeoutMs > 0 ? config.timeoutMs : DEEPSEEK_TIMEOUT_MS;
  const control = new AbortController();
  let temporizador: ReturnType<typeof setTimeout> | undefined;
  const limite = new Promise<never>((_, rechazar) => {
    temporizador = setTimeout(() => {
      control.abort();
      rechazar(errorIA("timeout"));
    }, timeoutMs);
  });
  const llamada = Promise.resolve()
    .then(() =>
      pedir(DEEPSEEK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${config.apiKey}` },
        body: JSON.stringify({
          model: modeloDe(config),
          thinking: { type: "disabled" },
          temperature: 0,
          response_format: { type: "json_object" },
          max_tokens: solicitud.maxTokens,
          stream: false,
          messages: [
            { role: "system", content: solicitud.instrucciones },
            { role: "user", content: JSON.stringify(solicitud.datos) },
          ],
        }),
        signal: control.signal,
      })
    )
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
      return opcion.message?.content;
    });
  return Promise.race([llamada, limite]).finally(() => clearTimeout(temporizador));
}
