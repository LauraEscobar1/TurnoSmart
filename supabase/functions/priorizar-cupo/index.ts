/**
 * TurnoSmart · Edge Function `priorizar-cupo`
 *
 * Ofrece un cupo abierto al mejor candidato de la lista de espera:
 *   1. obtenerCandidatos: `candidatos_cupo` (RPC, solo service_role) →
 *      pacientes con solicitud activa en esa especialidad y sus señales.
 *   2. priorizar: DeepSeek pondera disponibilidad, especialidad, horario y
 *      tiempo de espera con datos anónimos (una sola solicitud por cupo);
 *      la respuesta se valida y, si falta la clave o la IA falla, se usa la
 *      estrategia determinista. Cada priorización queda en los logs como
 *      "ai" o "fallback".
 *   3. crearOferta: `ofrecer_cupo` (RPC, solo service_role) crea en una
 *      transacción la oferta, sus factores (máx. 4), el evento «enviada» y
 *      la notificación, y vuelve a validar al candidato y el cupo.
 *
 * Quién la llama: SOLO la base de datos. El trigger
 * `cupos_solicitar_priorizacion` (migración 20260927140000) la invoca con
 * pg_net cuando un cupo queda «abierto», con el secreto compartido en el
 * encabezado `x-priorizar-secreto`. La app nunca la invoca: un paciente no
 * puede forzar ofertas para un cupo ni provocar llamadas repetidas.
 *
 * Secrets de la función:
 *   PRIORIZAR_CUPO_SECRETO  (obligatorio) el mismo valor guardado en Vault.
 *   MINUTOS_OFERTA          (opcional) duración de cada oferta; 10 por defecto.
 *   DEEPSEEK_API_KEY        (opcional) activa la priorización con IA.
 *   DEEPSEEK_MODEL          (opcional) modelo; "deepseek-flash" por defecto.
 *   DEEPSEEK_TIMEOUT_MS     (opcional) espera máxima de la IA; 8000 por defecto.
 * SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY los inyecta Supabase.
 * Desplegar con --no-verify-jwt: la autenticación es el secreto compartido.
 */
import { createClient, SupabaseClient } from "npm:@supabase/supabase-js@2";
import {
  Candidato,
  CandidatoPriorizado,
  crearEstrategiaDeepSeek,
  EstrategiaPriorizacion,
  priorizarConRespaldo,
} from "../_shared/priorizacion.ts";

/**
 * Estrategia con IA (DeepSeek) si está el secret DEEPSEEK_API_KEY; sin él, o
 * si la IA falla, `priorizarConRespaldo` usa la determinista. La clave solo
 * vive en los secrets de la función: nunca llega a la app ni a las respuestas.
 */
function estrategiaIA(): EstrategiaPriorizacion | null {
  const apiKey = Deno.env.get("DEEPSEEK_API_KEY");
  if (!apiKey) return null;
  return crearEstrategiaDeepSeek({
    apiKey,
    modelo: Deno.env.get("DEEPSEEK_MODEL") || undefined,
    timeoutMs: Number(Deno.env.get("DEEPSEEK_TIMEOUT_MS")) || undefined,
  });
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Respuestas controladas: nunca incluyen detalles internos de Postgres. */
function responder(cuerpo: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(cuerpo), { status, headers: { "Content-Type": "application/json" } });
}

/** Compara el secreto sin cortar en la primera diferencia (tiempo constante). */
function mismoSecreto(recibido: string | null, esperado: string): boolean {
  if (!recibido) return false;
  const a = new TextEncoder().encode(recibido);
  const b = new TextEncoder().encode(esperado);
  let diferencia = a.length ^ b.length;
  for (let i = 0; i < Math.max(a.length, b.length); i++) diferencia |= (a[i] ?? 0) ^ (b[i] ?? 0);
  return diferencia === 0;
}

async function obtenerCandidatos(supabase: SupabaseClient, cupoId: string): Promise<Candidato[]> {
  const { data, error } = await supabase.rpc("candidatos_cupo", { p_cupo_id: cupoId });
  if (error) throw new Error(`candidatos_cupo: ${error.code} ${error.message}`);
  return (data ?? []) as Candidato[];
}

async function crearOferta(supabase: SupabaseClient, cupoId: string, elegido: CandidatoPriorizado): Promise<string> {
  const minutos = Number(Deno.env.get("MINUTOS_OFERTA") ?? "10");
  const { data, error } = await supabase.rpc("ofrecer_cupo", {
    p_cupo_id: cupoId,
    p_paciente_id: elegido.paciente_id,
    p_score: elegido.score,
    p_factores: elegido.factores,
    p_minutos: Number.isFinite(minutos) ? minutos : 10,
  });
  if (error) throw new Error(`ofrecer_cupo: ${error.code} ${error.message}`);
  return data as string;
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return responder({ error: "metodo_no_permitido" }, 405);

  const secreto = Deno.env.get("PRIORIZAR_CUPO_SECRETO");
  if (!secreto) {
    console.error("[priorizar-cupo] Falta el secret PRIORIZAR_CUPO_SECRETO.");
    return responder({ error: "no_disponible" }, 503);
  }
  if (!mismoSecreto(req.headers.get("x-priorizar-secreto"), secreto)) {
    return responder({ error: "no_autorizado" }, 401);
  }

  let cupoId: unknown;
  try {
    cupoId = (await req.json())?.cupo_id;
  } catch {
    return responder({ error: "solicitud_invalida" }, 400);
  }
  if (typeof cupoId !== "string" || !UUID.test(cupoId)) return responder({ error: "solicitud_invalida" }, 400);

  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
    auth: { persistSession: false },
  });

  try {
    const candidatos = await obtenerCandidatos(supabase, cupoId);
    // Un cupo cuya hora ya pasó se cierra sin consultar a la IA (ofrecer_cupo también lo impide).
    const vencido = candidatos.length > 0 && new Date(candidatos[0].cupo_fecha_hora).getTime() <= Date.now();
    if (candidatos.length === 0 || vencido) {
      const { error } = await supabase.rpc("cerrar_cupo", { p_cupo_id: cupoId });
      if (error) throw new Error(`cerrar_cupo: ${error.code} ${error.message}`);
      return responder({ oferta_id: null, motivo: vencido ? "cupo_vencido" : "sin_candidatos" });
    }
    const inicio = Date.now();
    const { priorizados, estrategia, motivo } = await priorizarConRespaldo(candidatos, estrategiaIA());
    // Registro de cada priorización: "ai" o "fallback" y por qué (sin datos de pacientes).
    console.log(
      JSON.stringify({
        evento: "priorizacion",
        cupo_id: cupoId,
        estrategia,
        motivo,
        candidatos: candidatos.length,
        ms: Date.now() - inicio,
      })
    );
    const ofertaId = await crearOferta(supabase, cupoId, priorizados[0]);
    return responder({ oferta_id: ofertaId, estrategia });
  } catch (error) {
    // El detalle técnico queda solo en los logs del servidor.
    console.error(`[priorizar-cupo] cupo ${cupoId}: ${String(error)}`);
    return responder({ error: "no_se_pudo_priorizar" }, 500);
  }
});
