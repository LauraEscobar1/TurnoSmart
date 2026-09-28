/**
 * TurnoSmart · Edge Function `priorizar-cupo`
 *
 * Ofrece un cupo abierto al mejor candidato de la lista de espera:
 *   1. `candidatos_cupo` (RPC, solo service_role) → pacientes con solicitud
 *      activa en esa especialidad y sus señales reales.
 *   2. Priorización determinista (tiempo en espera, orden de llegada,
 *      horario, disponibilidad) — siempre, como base y como respaldo.
 *   3. Si hay ANTHROPIC_API_KEY en los secrets de la función, Claude
 *      reordena los mejores candidatos y califica su compatibilidad. Solo
 *      recibe alias y señales (nunca nombres, cédulas ni ids).
 *   4. `ofrecer_cupo` (RPC, solo service_role) crea en una transacción la
 *      oferta, sus factores (máx. 4), el evento «enviada» y la notificación.
 *
 * La app la invoca con la sesión del paciente (JWT verificado por Supabase)
 * después de cancelar una cita o de rechazar/expirar una oferta. La app
 * nunca ve candidatos ni elige a quién se ofrece: eso pasa acá, con la
 * service_role que Supabase inyecta en el entorno de la función.
 *
 * Secrets:
 *   ANTHROPIC_API_KEY   (opcional) activa la priorización con IA.
 *   MINUTOS_OFERTA      (opcional) duración de cada oferta; 10 por defecto.
 */
import { createClient } from "npm:@supabase/supabase-js@2";
import Anthropic from "npm:@anthropic-ai/sdk";
import { zodOutputFormat } from "npm:@anthropic-ai/sdk/helpers/zod";
import { z } from "npm:zod";
import {
  aplicarRespuestaIA,
  Candidato,
  CandidatoPriorizado,
  datosParaIA,
  priorizarDeterminista,
  RespuestaIA,
} from "../_shared/priorizacion.ts";

/** Cuántos candidatos (los mejores según la estrategia determinista) evalúa la IA. */
const MAXIMO_CANDIDATOS_IA = 10;

const RespuestaIASchema = z.object({
  orden: z.array(
    z.object({
      alias: z.string(),
      compatibilidad: z.enum(["alta", "media", "baja"]),
    })
  ),
});

const SISTEMA = `Eres el motor de priorización de TurnoSmart, una app que reasigna citas médicas canceladas a pacientes en lista de espera.
Recibes un cupo liberado y candidatos anónimos (alias) que esperan esa especialidad. Ordénalos del más al menos adecuado para recibir la oferta, con criterios justos y explicables:
- Prioriza a quien lleva más tiempo esperando y a quien llegó antes a la lista.
- Favorece a quien prefiere la franja horaria del cupo (Mañana/Tarde; "Indistinto" encaja con ambas).
- La oferta dura pocos minutos: tener las alertas activas hace más probable que responda a tiempo.
- score_referencia es una puntuación determinista de referencia; puedes apartarte de ella si los criterios lo justifican.
No inventes datos. Usa solo los alias recibidos. Califica la compatibilidad de cada candidato con el cupo como "alta", "media" o "baja".`;

async function priorizarConIA(base: CandidatoPriorizado[], cupoFechaHora: string): Promise<CandidatoPriorizado[] | null> {
  const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
  if (!apiKey || base.length < 2) return null;
  const evaluados = base.slice(0, MAXIMO_CANDIDATOS_IA);
  const { alias, filas } = datosParaIA(evaluados);
  const cliente = new Anthropic({ apiKey, timeout: 20_000, maxRetries: 1 });
  try {
    const respuesta = await cliente.messages.parse({
      model: "claude-opus-5",
      max_tokens: 4000,
      output_config: { effort: "low", format: zodOutputFormat(RespuestaIASchema) },
      system: SISTEMA,
      messages: [
        {
          role: "user",
          content: JSON.stringify({ cupo: { fecha_hora: cupoFechaHora, zona_horaria: "America/Bogota" }, candidatos: filas }),
        },
      ],
    });
    if (respuesta.stop_reason === "refusal" || !respuesta.parsed_output) {
      console.warn(`[priorizar-cupo] Sin respuesta utilizable de la IA (${respuesta.stop_reason}); se usa la estrategia determinista.`);
      return null;
    }
    const ordenados = aplicarRespuestaIA(evaluados, alias, respuesta.parsed_output as RespuestaIA);
    return [...ordenados, ...base.slice(MAXIMO_CANDIDATOS_IA)];
  } catch (error) {
    if (error instanceof Anthropic.RateLimitError) {
      console.warn("[priorizar-cupo] IA con límite de uso; se usa la estrategia determinista.");
    } else if (error instanceof Anthropic.APIError) {
      console.warn(`[priorizar-cupo] Error de la IA (${error.status}); se usa la estrategia determinista.`);
    } else {
      console.warn(`[priorizar-cupo] IA no disponible (${String(error)}); se usa la estrategia determinista.`);
    }
    return null;
  }
}

function json(cuerpo: unknown, status = 200) {
  return new Response(JSON.stringify(cuerpo), { status, headers: { "Content-Type": "application/json" } });
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return json({ error: "metodo_no_permitido" }, 405);

  let cupoId: unknown;
  try {
    cupoId = (await req.json())?.cupo_id;
  } catch {
    return json({ error: "cuerpo_invalido" }, 400);
  }
  if (typeof cupoId !== "string" || !/^[0-9a-f-]{36}$/i.test(cupoId)) return json({ error: "cupo_id_invalido" }, 400);

  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
    auth: { persistSession: false },
  });

  const { data: candidatos, error } = await supabase.rpc("candidatos_cupo", { p_cupo_id: cupoId });
  if (error) return json({ error: "candidatos", detalle: error.message }, 500);
  if (!candidatos || candidatos.length === 0) {
    await supabase.rpc("cerrar_cupo", { p_cupo_id: cupoId });
    return json({ oferta_id: null, motivo: "sin_candidatos" });
  }

  const base = priorizarDeterminista(candidatos as Candidato[]);
  const conIA = await priorizarConIA(base, base[0].cupo_fecha_hora);
  const priorizados = conIA ?? base;
  const elegido = priorizados[0];

  const minutos = Number(Deno.env.get("MINUTOS_OFERTA") ?? "10");
  const { data: ofertaId, error: errorOferta } = await supabase.rpc("ofrecer_cupo", {
    p_cupo_id: cupoId,
    p_paciente_id: elegido.paciente_id,
    p_score: elegido.score,
    p_factores: elegido.factores,
    p_minutos: Number.isFinite(minutos) ? minutos : 10,
  });
  if (errorOferta) return json({ error: "ofrecer_cupo", detalle: errorOferta.message }, 409);

  return json({ oferta_id: ofertaId, estrategia: conIA ? "ia" : "determinista" });
});
