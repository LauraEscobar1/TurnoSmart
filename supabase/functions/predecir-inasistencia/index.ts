/**
 * TurnoSmart · Edge Function `predecir-inasistencia`
 *
 * La llama el panel del staff («Calcular riesgo»), con la sesión del staff:
 *   POST {}                 → toda la agenda (citas confirmadas de los próximos 14 días)
 *   POST { "cita_id": … }   → una sola cita
 *
 *   1. `staff_datos_riesgo` (RPC con el JWT del usuario): valida que sea staff
 *      y devuelve solo citas de SUS consultorios, con conteos sin datos
 *      clínicos ni identificadores (historial, antelación, día/hora, ofertas).
 *   2. Puntaje determinista + DeepSeek (nivel y explicación breve es/en), con
 *      validación estricta y respaldo determinista (_shared/riesgo.ts y
 *      _shared/deepseek.ts).
 *   3. `guardar_riesgo_inasistencia` (RPC solo service_role) guarda el
 *      resultado en `riesgo_inasistencia` con la estrategia usada.
 *
 * Secrets: DEEPSEEK_API_KEY (opcional; sin ella, todo es «fallback»),
 * DEEPSEEK_MODEL y DEEPSEEK_TIMEOUT_MS (opcionales). SUPABASE_URL,
 * SUPABASE_ANON_KEY y SUPABASE_SERVICE_ROLE_KEY los inyecta Supabase.
 * Se despliega con --no-verify-jwt y valida el token aquí (getUser), porque
 * la verificación del gateway no admite las claves de firma asimétricas.
 */
import { createClient } from "npm:@supabase/supabase-js@2";
import { ConfigDeepSeek } from "../_shared/deepseek.ts";
import { DatosRiesgo, predecirConRespaldo } from "../_shared/riesgo.ts";

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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return responder({ error: "metodo_no_permitido" }, 405);

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

  const url = Deno.env.get("SUPABASE_URL")!;
  const usuario = createClient(url, Deno.env.get("SUPABASE_ANON_KEY")!, {
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
  const citas = (data ?? []) as DatosRiesgo[];
  if (citas.length === 0) return responder({ calculadas: 0, ai: 0, fallback: 0, resultados: [] });

  const inicio = Date.now();
  const resultados = await predecirConRespaldo(citas, configIA());
  const ai = resultados.filter((r) => r.estrategia === "ai").length;
  const motivos = [...new Set(resultados.map((r) => r.motivo_fallback).filter(Boolean))];
  // Registro de cada cálculo (sin datos de pacientes).
  console.log(
    JSON.stringify({
      evento: "riesgo_inasistencia",
      citas: citas.length,
      ai,
      fallback: resultados.length - ai,
      motivos,
      ms: Date.now() - inicio,
    })
  );

  const admin = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
  const { error: errorGuardar } = await admin.rpc("guardar_riesgo_inasistencia", { p_resultados: resultados });
  if (errorGuardar) {
    console.error(`[predecir-inasistencia] guardar_riesgo_inasistencia: ${errorGuardar.code} ${errorGuardar.message}`);
    return responder({ error: "no_se_pudo_guardar" }, 500);
  }

  return responder({
    calculadas: resultados.length,
    ai,
    fallback: resultados.length - ai,
    resultados: resultados.map((r) => ({ cita_id: r.cita_id, nivel: r.nivel, estrategia: r.estrategia })),
  });
});
