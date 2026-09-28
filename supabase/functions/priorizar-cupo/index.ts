/**
 * TurnoSmart · Edge Function `priorizar-cupo`
 *
 * Ofrece un cupo abierto al mejor candidato de la lista de espera:
 *   1. obtenerCandidatos: `candidatos_cupo` (RPC, solo service_role) →
 *      pacientes con solicitud activa en esa especialidad y sus señales.
 *   2. priorizar: la estrategia de priorización (hoy, determinista: tiempo
 *      en espera, puesto en la lista, franja horaria y alertas activas).
 *   3. crearOferta: `ofrecer_cupo` (RPC, solo service_role) crea en una
 *      transacción la oferta, sus factores (máx. 4), el evento «enviada» y
 *      la notificación.
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
 * SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY los inyecta Supabase.
 * Desplegar con --no-verify-jwt: la autenticación es el secreto compartido.
 */
import { createClient, SupabaseClient } from "npm:@supabase/supabase-js@2";
import { Candidato, CandidatoPriorizado, EstrategiaPriorizacion, estrategiaDeterminista } from "../_shared/priorizacion.ts";

/**
 * Estrategia activa. Para incorporar otra (por ejemplo, con un proveedor de
 * IA elegido más adelante) basta con otra implementación de
 * EstrategiaPriorizacion; obtener candidatos y crear la oferta no cambian.
 */
const estrategia: EstrategiaPriorizacion = estrategiaDeterminista;

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
    if (candidatos.length === 0) {
      const { error } = await supabase.rpc("cerrar_cupo", { p_cupo_id: cupoId });
      if (error) throw new Error(`cerrar_cupo: ${error.code} ${error.message}`);
      return responder({ oferta_id: null, motivo: "sin_candidatos" });
    }
    const [elegido] = await estrategia.priorizar(candidatos);
    const ofertaId = await crearOferta(supabase, cupoId, elegido);
    return responder({ oferta_id: ofertaId, estrategia: estrategia.nombre });
  } catch (error) {
    // El detalle técnico queda solo en los logs del servidor.
    console.error(`[priorizar-cupo] cupo ${cupoId}: ${String(error)}`);
    return responder({ error: "no_se_pudo_priorizar" }, 500);
  }
});
