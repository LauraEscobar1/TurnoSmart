import { getSupabase } from "@/services/supabaseClient";
import { getIdsEspecialidades } from "@/services/catalogoService";

/**
 * Lista de espera del paciente en Supabase (`public.solicitudes_espera`).
 * RLS deja a cada paciente leer únicamente sus solicitudes
 * (`paciente_id = auth.uid()`); además se filtra por `paciente_id` en la
 * consulta. La tabla no tiene INSERT/UPDATE/DELETE para el cliente: sumarse
 * o salir de una lista se hace con las RPC `sincronizar_lista_espera` y el
 * puesto con `mis_puestos_espera` (security definer, solo datos propios).
 *
 * El nombre de cada especialidad se busca aparte en `public.especialidades`
 * por los ids obtenidos, para no depender de que la relación esté
 * detectada en el esquema.
 */

/** Columna con el nombre visible en `public.especialidades` (id smallint + nombre). */
const COLUMNA_NOMBRE_ESPECIALIDAD = "nombre";

export interface SolicitudEspera {
  id: string;
  especialidadId: number;
  /** Nombre de la especialidad, tal como está en la base (p. ej. «Cardiología»). */
  especialidad: string;
  creadaEnISO: string;
}

interface FilaSolicitud {
  id: string;
  especialidad_id: number;
  creada_en: string;
}

type FilaEspecialidad = { id: number } & Record<typeof COLUMNA_NOMBRE_ESPECIALIDAD, string>;

/** Error de Supabase al leer la lista de espera (red, permisos, datos incompletos). */
export class SolicitudesEsperaError extends Error {
  constructor(
    message: string,
    public codigo?: string
  ) {
    super(message);
  }
}

/** Solicitudes activas del paciente, de la más antigua a la más reciente. */
export async function getSolicitudesActivas(pacienteId: string): Promise<SolicitudEspera[]> {
  const supabase = getSupabase();
  const solicitudes = await supabase
    .from("solicitudes_espera")
    .select("id, especialidad_id, creada_en")
    .eq("paciente_id", pacienteId)
    .eq("estado", "activa")
    .order("creada_en", { ascending: true })
    .returns<FilaSolicitud[]>();
  if (solicitudes.error) throw new SolicitudesEsperaError(solicitudes.error.message, solicitudes.error.code);
  const filas = solicitudes.data ?? [];
  if (filas.length === 0) return [];

  const ids = [...new Set(filas.map((f) => f.especialidad_id))];
  const especialidades = await supabase
    .from("especialidades")
    .select(`id, ${COLUMNA_NOMBRE_ESPECIALIDAD}`)
    .in("id", ids)
    .returns<FilaEspecialidad[]>();
  if (especialidades.error) throw new SolicitudesEsperaError(especialidades.error.message, especialidades.error.code);
  const nombres = new Map((especialidades.data ?? []).map((e) => [e.id, e[COLUMNA_NOMBRE_ESPECIALIDAD]]));

  return filas.map((f) => {
    const especialidad = nombres.get(f.especialidad_id);
    if (!especialidad) throw new SolicitudesEsperaError(`Especialidad ${f.especialidad_id} no encontrada`);
    return {
      id: f.id,
      especialidadId: f.especialidad_id,
      especialidad,
      creadaEnISO: new Date(f.creada_en).toISOString(),
    };
  });
}

/**
 * Deja activas exactamente esas especialidades (por nombre): se suma a las
 * nuevas y retira las que ya no están (quedan en el historial como
 * «retirada»). Es una sola RPC atómica; no duplica solicitudes.
 */
export async function sincronizarListaEspera(especialidades: string[]): Promise<void> {
  const ids = await getIdsEspecialidades(especialidades);
  const { error } = await getSupabase().rpc("sincronizar_lista_espera", { p_especialidades: ids });
  if (error) throw new SolicitudesEsperaError(error.message, error.code);
}

export interface PuestoEspera {
  especialidadId: number;
  /** 1 = primero en la lista de esa especialidad. */
  puesto: number;
  creadaEnISO: string;
}

/** Puesto del paciente autenticado en cada una de sus listas activas (dato real, sin ver a otros pacientes). */
export async function getMisPuestos(): Promise<PuestoEspera[]> {
  const { data, error } = await getSupabase().rpc("mis_puestos_espera");
  if (error) throw new SolicitudesEsperaError(error.message, error.code);
  const filas: { especialidad_id: number; puesto: number; creada_en: string }[] = data ?? [];
  return filas.map((f) => ({
    especialidadId: f.especialidad_id,
    puesto: f.puesto,
    creadaEnISO: new Date(f.creada_en).toISOString(),
  }));
}

/** Lo que muestra la app de la lista de espera. */
export interface ResumenListaEspera {
  /** Especialidades con solicitud activa, por antigüedad. */
  especialidades: string[];
  /** Mejor puesto entre sus listas (el más cercano a recibir un cupo); null sin listas. */
  puesto: number | null;
  /** Alta más antigua entre las solicitudes activas (de ahí salen los «días en espera»). */
  desdeISO: string | null;
}

export async function getResumenListaEspera(pacienteId: string): Promise<ResumenListaEspera> {
  const [solicitudes, puestos] = await Promise.all([getSolicitudesActivas(pacienteId), getMisPuestos()]);
  return {
    especialidades: solicitudes.map((s) => s.especialidad),
    puesto: puestos.length ? Math.min(...puestos.map((p) => p.puesto)) : null,
    desdeISO: solicitudes[0]?.creadaEnISO ?? null,
  };
}
