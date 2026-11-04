/**
 * TurnoSmart · Edge Function `predecir-inasistencia`
 *
 * Dos formas de llamarla:
 *   · Programada (pg_cron, migración 20261104120000): cada 30 minutos la base
 *     la llama con pg_net y el secreto compartido en `x-servidor-secreto` (el
 *     mismo valor que PRIORIZAR_CUPO_SECRETO). Calcula las citas confirmadas
 *     de los próximos 3 días sin riesgo reciente (`datos_riesgo_programado`,
 *     solo service_role).
 *   · Desde el panel del staff («Actualizar riesgo»), con la sesión del staff:
 *       POST {}                 → toda la agenda (próximos 14 días)
 *       POST { "cita_id": … }   → una sola cita
 *     `staff_datos_riesgo` (RPC con el JWT del usuario) valida que sea staff
 *     y devuelve solo citas de SUS consultorios.
 *
 * En ambos casos: señales sin datos clínicos ni identificadores (historial,
 * antelación, día/hora, ofertas) → puntaje determinista + DeepSeek (nivel y
 * explicación breve es/en) con validación estricta y respaldo determinista
 * (_shared/riesgo.ts y _shared/deepseek.ts) → `guardar_riesgo_inasistencia`
 * (solo service_role) con la estrategia usada. Si el riesgo queda «alto», la
 * base avisa al paciente «Confirma tu asistencia» (trigger de la migración).
 *
 * Secrets: PRIORIZAR_CUPO_SECRETO (modo programado), DEEPSEEK_API_KEY
 * (opcional; sin ella, todo es «fallback»), DEEPSEEK_MODEL y
 * DEEPSEEK_TIMEOUT_MS (opcionales). SUPABASE_URL, SUPABASE_ANON_KEY y
 * SUPABASE_SERVICE_ROLE_KEY los inyecta Supabase.
 * Se despliega con --no-verify-jwt y valida el token aquí (getUser), porque
 * la verificación del gateway no admite las claves de firma asimétricas.
 */
import { createClient, SupabaseClient } from "npm:@supabase/supabase-js@2";
import { ConfigDeepSeek } from "../_shared/deepseek.ts";
import { DatosRiesgo, predecirConRespaldo } from "../_shared/riesgo.ts";
import { mismoSecreto } from "../_shared/secreto.ts";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

/** Respuestas controladas: nunca incluyen detalles internos. */
function responder(cuerpo: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(cuerpo), { status, headers: { ...CORS, "Content-Type": "application/json" } });
}

function configIA(): ConfigDeepSeek | null {
  const apiKey = Deno.env.get("DEEPSEEK_API_KEY");
  if (!apiKey) return null;
  return {
    apiKey,
    modelo: Deno.env.get("DEEPSEEK_MODEL") || undefined,
    timeoutMs: Number(Deno.env.get("DEEPSEEK_TIMEOUT_MS")) || undefined,
  };
}

const clienteAdmin = () =>
  createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });

/** Calcula el riesgo de las citas, lo registra en los logs y lo guarda. */
async function calcularYGuardar(citas: DatosRiesgo[], origen: "panel" | "programado", admin: SupabaseClient) {
  if (citas.length === 0) return responder({ calculadas: 0, ai: 0, fallback: 0, resultados: [] });

  const inicio = Date.now();
  const resultados = await predecirConRespaldo(citas, configIA());
  const ai = resultados.filter((r) => r.estrategia === "ai").length;
  const motivos = [...new Set(resultados.map((r) => r.motivo_fallback).filter(Boolean))];
  // Registro de cada cálculo (sin datos de pacientes).
  console.log(
    JSON.stringify({
      evento: "riesgo_inasistencia",
      origen,
      citas: citas.length,
      ai,
      fallback: resultados.length - ai,
      motivos,
      ms: Date.now() - inicio,
    })
  );

  const { error } = await admin.rpc("guardar_riesgo_inasistencia", { p_resultados: resultados });
  if (error) {
    console.error(`[predecir-inasistencia] guardar_riesgo_inasistencia: ${error.code} ${error.message}`);
    return responder({ error: "no_se_pudo_guardar" }, 500);
  }

  return responder({
    calculadas: resultados.length,
    ai,
    fallback: resultados.length - ai,
    resultados: resultados.map((r) => ({ cita_id: r.cita_id, nivel: r.nivel, estrategia: r.estrategia })),
  });
}

/** Modo programado: lo invoca solo la base (pg_cron + pg_net) con el secreto compartido. */
async function programado(req: Request, secretoRecibido: string) {
  const secreto = Deno.env.get("PRIORIZAR_CUPO_SECRETO");
  if (!secreto) {
    console.error("[predecir-inasistencia] Falta el secret PRIORIZAR_CUPO_SECRETO.");
    return responder({ error: "no_disponible" }, 503);
  }
  if (!mismoSecreto(secretoRecibido, secreto)) return responder({ error: "no_autorizado" }, 401);

  let dias = 3;
  try {
    const texto = await req.text();
    const pedido = texto ? Number(JSON.parse(texto)?.dias) : NaN;
    if (Number.isInteger(pedido) && pedido >= 1 && pedido <= 14) dias = pedido;
  } catch {
    return responder({ error: "solicitud_invalida" }, 400);
  }

  const admin = clienteAdmin();
  const { data, error } = await admin.rpc("datos_riesgo_programado", { p_dias: dias });
  if (error) {
    console.error(`[predecir-inasistencia] datos_riesgo_programado: ${error.code} ${error.message}`);
    return responder({ error: "no_se_pudo_calcular" }, 500);
  }
  return calcularYGuardar((data ?? []) as DatosRiesgo[], "programado", admin);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return responder({ error: "metodo_no_permitido" }, 405);

  const secretoServidor = req.headers.get("x-servidor-secreto");
  if (secretoServidor !== null) return programado(req, secretoServidor);

  const autorizacion = req.headers.get("Authorization");
  if (!autorizacion?.startsWith("Bearer ")) return responder({ error: "no_autenticado" }, 401);

  let citaId: unknown = null;
  try {
    const texto = await req.text();
    citaId = texto ? (JSON.parse(texto)?.cita_id ?? null) : null;
  } catch {
    return responder({ error: "solicitud_invalida" }, 400);
  }
  if (citaId !== null && (typeof citaId !== "string" || !UUID.test(citaId))) {
    return responder({ error: "solicitud_invalida" }, 400);
  }

  const usuario = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: autorizacion } },
    auth: { persistSession: false },
  });
  const { data: sesion, error: errorSesion } = await usuario.auth.getUser(autorizacion.slice("Bearer ".length));
  if (errorSesion || !sesion.user) return responder({ error: "no_autenticado" }, 401);

  // Con el JWT del usuario: la RPC valida que sea staff y filtra por su consultorio.
  const { data, error } = await usuario.rpc("staff_datos_riesgo", { p_cita_id: citaId });
  if (error) {
    if (error.code === "42501") return responder({ error: "no_autorizado" }, 403);
    console.error(`[predecir-inasistencia] staff_datos_riesgo: ${error.code} ${error.message}`);
    return responder({ error: "no_se_pudo_calcular" }, 500);
  }
  return calcularYGuardar((data ?? []) as DatosRiesgo[], "panel", clienteAdmin());
});
