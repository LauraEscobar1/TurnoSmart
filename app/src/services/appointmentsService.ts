import { Cita, EstadoCita } from "@/types/domain";
import { getSupabase } from "@/services/supabaseClient";
import { DatosError, getNombresPorId } from "@/services/catalogoService";
import { getPacienteActualId } from "@/services/sesionService";

/**
 * Citas del paciente (`public.citas`). RLS: cada paciente lee solo las
 * suyas. Cancelar y reprogramar pasan por RPC (`cancelar_cita`,
 * `reprogramar_cita`) que validan que la cita sea propia, confirmada y
 * futura. Cancelar libera un cupo (uno solo por cita); la base lo ofrece
 * sola a la lista de espera (trigger → Edge Function priorizar-cupo).
 *
 * Las firmas son las mismas que usaban las pantallas con los datos de
 * ejemplo. Si Supabase no responde, las listas vuelven vacías (con aviso
 * en consola) en lugar de romper la pantalla.
 */

interface FilaCita {
  id: string;
  especialidad_id: number | null;
  profesional_id: string | null;
  consultorio_id: string | null;
  fecha_hora: string;
  estado: EstadoCita;
  origen: Cita["origen"];
}

const COLUMNAS = "id, especialidad_id, profesional_id, consultorio_id, fecha_hora, estado, origen";

/** Filas de `citas` → `Cita` con los nombres de especialidad, profesional y consultorio. */
async function aCitas(filas: FilaCita[]): Promise<Cita[]> {
  const [especialidades, profesionales, consultorios] = await Promise.all([
    getNombresPorId("especialidades", filas.map((f) => f.especialidad_id)),
    getNombresPorId("profesionales", filas.map((f) => f.profesional_id)),
    getNombresPorId("consultorios", filas.map((f) => f.consultorio_id)),
  ]);
  return filas.map((f) => ({
    id: f.id,
    especialidad: (f.especialidad_id !== null && especialidades.get(f.especialidad_id)) || "",
    profesional: (f.profesional_id !== null && profesionales.get(f.profesional_id)) || "",
    consultorio: (f.consultorio_id !== null && consultorios.get(f.consultorio_id)) || "",
    fechaHoraISO: new Date(f.fecha_hora).toISOString(),
    estado: f.estado,
    origen: f.origen,
  }));
}

/** Todas las citas del paciente con sesión, por fecha. Lanza DatosError si Supabase falla. */
async function misCitas(): Promise<Cita[]> {
  const pacienteId = await getPacienteActualId();
  if (!pacienteId) return [];
  const { data, error } = await getSupabase()
    .from("citas")
    .select(COLUMNAS)
    .eq("paciente_id", pacienteId)
    .order("fecha_hora", { ascending: true })
    .returns<FilaCita[]>();
  if (error) throw new DatosError(error.message, error.code);
  return aCitas(data ?? []);
}

async function conRespaldo<T>(accion: () => Promise<T>, respaldo: T, contexto: string): Promise<T> {
  try {
    return await accion();
  } catch (e) {
    console.warn(`[citas] ${contexto}: ${String(e)}`);
    return respaldo;
  }
}

export async function getCitasProximas(): Promise<Cita[]> {
  return conRespaldo(
    async () => {
      const ahora = Date.now();
      return (await misCitas()).filter((c) => new Date(c.fechaHoraISO).getTime() >= ahora && c.estado === "confirmada");
    },
    [],
    "No se pudieron leer las próximas citas"
  );
}

export async function getCitasPasadas(): Promise<Cita[]> {
  return conRespaldo(
    async () => {
      const ahora = Date.now();
      return (await misCitas()).filter((c) => new Date(c.fechaHoraISO).getTime() < ahora);
    },
    [],
    "No se pudieron leer las citas pasadas"
  );
}

export async function getCitaPorId(id: string): Promise<Cita | null> {
  return conRespaldo(
    async () => {
      const { data, error } = await getSupabase().from("citas").select(COLUMNAS).eq("id", id).maybeSingle<FilaCita>();
      if (error) throw new DatosError(error.message, error.code);
      return data ? (await aCitas([data]))[0] : null;
    },
    null,
    "No se pudo leer la cita"
  );
}

/**
 * Cancela una cita propia, confirmada y futura. El cupo liberado lo ofrece
 * el servidor a la lista de espera. Devuelve la cita actualizada, o null si no se pudo.
 */
export async function cancelarCita(id: string): Promise<Cita | null> {
  const { data: cupoId, error } = await getSupabase().rpc("cancelar_cita", { p_cita_id: id });
  if (error || typeof cupoId !== "string") {
    console.warn(`[citas] No se pudo cancelar la cita: ${error?.message ?? "sin cupo"}`);
    return null;
  }
  return getCitaPorId(id);
}

const HORAS_ATENCION = [
  [9, 0],
  [11, 30],
  [16, 30],
] as const;

/**
 * Horarios para reprogramar. Todavía no hay agenda de profesionales en la
 * base: se proponen los próximos turnos del horario de atención (lun-sáb,
 * 9:00, 11:30 y 16:30). La reprogramación sí se guarda en Supabase.
 */
export async function getHorariosDisponibles(cita: Cita, cantidad = 6): Promise<string[]> {
  const actual = new Date(cita.fechaHoraISO).getTime();
  const hoy = new Date();
  const horarios: string[] = [];
  for (let d = 1; horarios.length < cantidad && d <= 21; d++) {
    const dia = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() + d);
    if (dia.getDay() === 0) continue; // domingos sin atención
    for (const [h, m] of HORAS_ATENCION) {
      const t = new Date(dia.getFullYear(), dia.getMonth(), dia.getDate(), h, m);
      if (t.getTime() !== actual && horarios.length < cantidad) horarios.push(t.toISOString());
    }
  }
  return horarios;
}

/** Cambia la fecha de una cita propia, confirmada y futura. Devuelve la cita actualizada, o null si no se pudo. */
export async function reprogramarCita(id: string, nuevaFechaISO: string): Promise<Cita | null> {
  const { error } = await getSupabase().rpc("reprogramar_cita", { p_cita_id: id, p_fecha_hora: nuevaFechaISO });
  if (error) {
    console.warn(`[citas] No se pudo reprogramar la cita: ${error.message}`);
    return null;
  }
  return getCitaPorId(id);
}
