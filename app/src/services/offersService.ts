import { EstadoOferta, FactorPrioridad, OfertaCupo } from "@/types/domain";
import { getSupabase } from "@/services/supabaseClient";
import { DatosError, getNombresPorId } from "@/services/catalogoService";
import { getPacienteActualId } from "@/services/sesionService";

/**
 * Ofertas de cupo del paciente (`public.ofertas` + `cupos` +
 * `ofertas_factores`). RLS: cada paciente lee solo sus ofertas, sus
 * factores y los cupos que se le ofrecieron. Responder pasa por RPC:
 *   · `aceptar_oferta`: en una transacción acepta, toma el cupo, crea la
 *     cita, marca atendida la solicitud de espera, registra el evento y
 *     notifica.
 *   · `rechazar_oferta`: rechaza y devuelve el cupo.
 *   · `expirar_mis_ofertas`: vence las pendientes cuyo plazo terminó.
 * Un cupo que vuelve a quedar abierto lo ofrece el servidor al siguiente
 * candidato (trigger → Edge Function priorizar-cupo); la app no interviene.
 * El score interno de la priorización nunca llega a la app: solo los
 * factores que la explican.
 *
 * Las firmas son las mismas que usaban las pantallas con datos de ejemplo.
 */

/** La oferta ya no se puede aceptar (venció o se resolvió mientras tanto). */
export class OfertaNoDisponibleError extends Error {
  constructor(public ofertaId: string) {
    super(`La oferta ${ofertaId} ya no está disponible`);
  }
}

/** Columnas de `ofertas` que puede leer el paciente (sin `score`). */
const COLUMNAS_OFERTA = "id, cupo_id, estado, expira_en";

interface FilaOferta {
  id: string;
  cupo_id: string;
  estado: EstadoOferta;
  expira_en: string;
}

interface FilaCupo {
  id: string;
  cita_origen_id: string | null;
  especialidad_id: number | null;
  profesional_id: string | null;
  consultorio_id: string | null;
  fecha_hora: string;
}

interface FilaFactor {
  oferta_id: string;
  etiqueta: string;
  valor: string;
  peso: number;
  orden: number;
}

/** Filas de `ofertas` → `OfertaCupo` con los datos del cupo y la explicación (máx. 4 factores). */
async function aOfertas(filas: FilaOferta[]): Promise<OfertaCupo[]> {
  if (filas.length === 0) return [];
  const supabase = getSupabase();
  const [cupos, factores] = await Promise.all([
    supabase
      .from("cupos")
      .select("id, cita_origen_id, especialidad_id, profesional_id, consultorio_id, fecha_hora")
      .in("id", filas.map((f) => f.cupo_id))
      .returns<FilaCupo[]>(),
    supabase
      .from("ofertas_factores")
      .select("oferta_id, etiqueta, valor, peso, orden")
      .in("oferta_id", filas.map((f) => f.id))
      .order("orden", { ascending: true })
      .returns<FilaFactor[]>(),
  ]);
  if (cupos.error) throw new DatosError(cupos.error.message, cupos.error.code);
  if (factores.error) throw new DatosError(factores.error.message, factores.error.code);
  const cupoPorId = new Map((cupos.data ?? []).map((c) => [c.id, c]));
  const listaCupos = cupos.data ?? [];
  const [especialidades, profesionales, consultorios] = await Promise.all([
    getNombresPorId("especialidades", listaCupos.map((c) => c.especialidad_id)),
    getNombresPorId("profesionales", listaCupos.map((c) => c.profesional_id)),
    getNombresPorId("consultorios", listaCupos.map((c) => c.consultorio_id)),
  ]);
  const nombre = (mapa: Map<string | number, string>, id: string | number | null | undefined) =>
    (id !== null && id !== undefined && mapa.get(id)) || "";

  return filas.flatMap((f) => {
    const cupo = cupoPorId.get(f.cupo_id);
    if (!cupo) return [];
    const explicacion: FactorPrioridad[] = (factores.data ?? [])
      .filter((x) => x.oferta_id === f.id)
      .slice(0, 4)
      .map((x) => ({ etiqueta: x.etiqueta, valor: x.valor, peso: Number(x.peso) }));
    return [
      {
        id: f.id,
        citaOrigenId: cupo.cita_origen_id ?? "",
        especialidad: nombre(especialidades, cupo.especialidad_id),
        profesional: nombre(profesionales, cupo.profesional_id),
        consultorio: nombre(consultorios, cupo.consultorio_id),
        fechaHoraISO: new Date(cupo.fecha_hora).toISOString(),
        estado: f.estado,
        expiraEnISO: new Date(f.expira_en).toISOString(),
        factores: explicacion,
      },
    ];
  });
}

/** Vence las ofertas propias cuyo plazo terminó (el servidor reofrece esos cupos). */
async function expirarVencidas() {
  const { error } = await getSupabase().rpc("expirar_mis_ofertas");
  if (error) console.warn(`[ofertas] No se pudieron expirar las ofertas vencidas: ${error.message}`);
}

/** Todas las ofertas del paciente con sesión. Si Supabase falla, lista vacía (con aviso). */
async function misOfertas(): Promise<OfertaCupo[]> {
  try {
    const pacienteId = await getPacienteActualId();
    if (!pacienteId) return [];
    await expirarVencidas();
    const { data, error } = await getSupabase()
      .from("ofertas")
      .select(COLUMNAS_OFERTA)
      .eq("paciente_id", pacienteId)
      .returns<FilaOferta[]>();
    if (error) throw new DatosError(error.message, error.code);
    return aOfertas(data ?? []);
  } catch (e) {
    console.warn(`[ofertas] No se pudieron leer las ofertas: ${String(e)}`);
    return [];
  }
}

/** Ofertas que esperan respuesta y siguen vigentes, la que vence primero arriba. */
export async function getOfertasPendientes(): Promise<OfertaCupo[]> {
  const ahora = Date.now();
  return (await misOfertas())
    .filter((o) => o.estado === "pendiente" && new Date(o.expiraEnISO).getTime() > ahora)
    .sort((a, b) => new Date(a.expiraEnISO).getTime() - new Date(b.expiraEnISO).getTime());
}

/** La oferta pendiente más urgente (Inicio). */
export async function getOfertaPendiente(): Promise<OfertaCupo | null> {
  return (await getOfertasPendientes())[0] ?? null;
}

/** Una oferta propia por id. Si está pendiente, registra que el paciente la vio (una sola vez). */
export async function getOfertaPorId(ofertaId: string): Promise<OfertaCupo | null> {
  try {
    const { data, error } = await getSupabase()
      .from("ofertas")
      .select(COLUMNAS_OFERTA)
      .eq("id", ofertaId)
      .maybeSingle<FilaOferta>();
    if (error) throw new DatosError(error.message, error.code);
    if (!data) return null;
    if (data.estado === "pendiente") {
      const { error: errorVista } = await getSupabase().rpc("marcar_oferta_vista", { p_oferta_id: ofertaId });
      if (errorVista) console.warn(`[ofertas] No se pudo registrar la vista: ${errorVista.message}`);
    }
    return (await aOfertas([data]))[0] ?? null;
  } catch (e) {
    console.warn(`[ofertas] No se pudo leer la oferta: ${String(e)}`);
    return null;
  }
}

/** Ofertas ya resueltas, de la más reciente a la más antigua. */
export async function getHistorialOfertas(): Promise<OfertaCupo[]> {
  return (await misOfertas())
    .filter((o) => o.estado !== "pendiente")
    .sort((a, b) => new Date(b.fechaHoraISO).getTime() - new Date(a.fechaHoraISO).getTime());
}

/**
 * Acepta la oferta: todo el cambio (cita, cupo, lista de espera, evento y
 * notificación) lo hace la RPC en una transacción. Si la oferta venció o ya
 * no está disponible, lanza OfertaNoDisponibleError.
 */
export async function aceptarOferta(ofertaId: string): Promise<void> {
  const { data: citaId, error } = await getSupabase().rpc("aceptar_oferta", { p_oferta_id: ofertaId });
  if (error || !citaId) throw new OfertaNoDisponibleError(ofertaId);
}

/** Rechaza la oferta; el servidor ofrece el cupo al siguiente candidato de la lista. */
export async function rechazarOferta(ofertaId: string): Promise<void> {
  const { error } = await getSupabase().rpc("rechazar_oferta", { p_oferta_id: ofertaId });
  if (error) console.warn(`[ofertas] No se pudo rechazar la oferta: ${error.message}`);
}

/** Ofertas pendientes de respuesta y aún vigentes — alimenta el badge de Ofertas. */
export function contarOfertasPendientes(ofertas: OfertaCupo[]): number {
  const ahora = Date.now();
  return ofertas.filter((o) => o.estado === "pendiente" && new Date(o.expiraEnISO).getTime() > ahora).length;
}

/** Cantidad de ofertas pendientes vigentes del paciente con sesión (badge). */
export async function getConteoOfertasPendientes(): Promise<number> {
  return contarOfertasPendientes(await getOfertasPendientes());
}
