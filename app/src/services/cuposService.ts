import { getSupabase } from "@/services/supabaseClient";

/**
 * Cupos liberados (`public.cupos`). La app no decide a quién se ofrece un
 * cupo ni ve a los demás pacientes: solo le pide a la Edge Function
 * `priorizar-cupo` (con service_role en el servidor, y la IA si está
 * configurada) que ofrezca ese cupo al mejor candidato de la lista de espera.
 *
 * Es «mejor esfuerzo»: si la función no responde, el cupo queda abierto y
 * se puede volver a procesar (por ejemplo, desde un cron del servidor).
 */
export async function ofrecerCupo(cupoId: string | null | undefined): Promise<void> {
  if (!cupoId) return;
  try {
    const { error } = await getSupabase().functions.invoke("priorizar-cupo", { body: { cupo_id: cupoId } });
    if (error) throw error;
  } catch (e) {
    console.warn(`[cupos] No se pudo ofrecer el cupo ${cupoId}; queda abierto. ${String(e)}`);
  }
}

/** Ofrece varios cupos (p. ej. los que liberaron ofertas vencidas). */
export async function ofrecerCupos(cupoIds: string[]): Promise<void> {
  await Promise.all(cupoIds.map((id) => ofrecerCupo(id)));
}
