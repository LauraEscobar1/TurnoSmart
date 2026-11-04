import { getSupabase } from "@/services/supabaseClient";
import { DatosError } from "@/services/catalogoService";
import {
  CitaAgenda,
  CupoStaff,
  EstadoCupo,
  EstadoOfertaCupo,
  MetricasStaff,
  NivelRiesgo,
  PerfilStaff,
  ResultadoCalculoRiesgo,
} from "@/types/staff";

/**
 * Panel del staff (supabase/migrations/20261102120000). Todo pasa por RPC
 * `security definer` que validan que la cita o el cupo sea de un consultorio
 * del staff; el staff no lee `pacientes`, `citas` ni `ofertas` directamente,
 * y los pacientes llegan solo con iniciales y código. El riesgo lo calcula la
 * Edge Function `predecir-inasistencia`: sola, cada 30 minutos (pg_cron), y
 * cuando el staff pide «Actualizar riesgo» (con su sesión).
 *
 * A diferencia de los servicios del paciente, aquí los errores se lanzan
 * (DatosError) para que el panel muestre su estado de error.
 */

function fallo(error: { message: string; code?: string }): never {
  throw new DatosError(error.message, error.code);
}

/** Perfil del staff autenticado; null si no tiene consultorios asignados. */
export async function getPerfilStaff(email: string): Promise<PerfilStaff | null> {
  const { data, error } = await getSupabase().rpc("mi_perfil_staff");
  if (error) fallo(error);
  if (!data) return null;
  const perfil = data as { nombre?: string; consultorios?: { id: string; nombre: string }[] };
  return { nombre: perfil.nombre ?? "", email, consultorios: perfil.consultorios ?? [] };
}

interface FilaMetricas {
  dias: number;
  cancelaciones: number;
  inasistencias: number;
  cupos_liberados: number;
  cupos_recuperados: number;
  tasa_recuperacion: number | string | null;
}

export async function getMetricas(dias = 30): Promise<MetricasStaff> {
  const { data, error } = await getSupabase().rpc("staff_metricas", { p_dias: dias });
  if (error) fallo(error);
  const m = (data ?? {}) as Partial<FilaMetricas>;
  return {
    dias: Number(m.dias ?? dias),
    cancelaciones: Number(m.cancelaciones ?? 0),
    inasistencias: Number(m.inasistencias ?? 0),
    cuposLiberados: Number(m.cupos_liberados ?? 0),
    cuposRecuperados: Number(m.cupos_recuperados ?? 0),
    tasaRecuperacion: m.tasa_recuperacion === null || m.tasa_recuperacion === undefined ? null : Number(m.tasa_recuperacion),
  };
}

interface FilaAgenda {
  cita_id: string;
  fecha_hora: string;
  especialidad: string | null;
  profesional: string | null;
  consultorio: string | null;
  origen: CitaAgenda["origen"];
  paciente_iniciales: string | null;
  paciente_codigo: string;
  riesgo_nivel: NivelRiesgo | null;
  riesgo_puntaje: number | string | null;
  riesgo_estrategia: "ai" | "fallback" | null;
  riesgo_explicacion_es: string | null;
  riesgo_explicacion_en: string | null;
  riesgo_calculado_en: string | null;
  asistencia_confirmada_en?: string | null;
}

export async function getAgenda(dias = 14): Promise<CitaAgenda[]> {
  const { data, error } = await getSupabase().rpc("staff_agenda", { p_dias: dias });
  if (error) fallo(error);
  return ((data ?? []) as FilaAgenda[]).map((f) => ({
    id: f.cita_id,
    fechaHoraISO: new Date(f.fecha_hora).toISOString(),
    especialidad: f.especialidad ?? "",
    profesional: f.profesional ?? "",
    consultorio: f.consultorio ?? "",
    origen: f.origen,
    paciente: { iniciales: f.paciente_iniciales || "—", codigo: f.paciente_codigo },
    riesgo:
      f.riesgo_nivel && f.riesgo_estrategia
        ? {
            nivel: f.riesgo_nivel,
            puntaje: Number(f.riesgo_puntaje ?? 0),
            estrategia: f.riesgo_estrategia,
            explicacion: { es: f.riesgo_explicacion_es ?? "", en: f.riesgo_explicacion_en ?? "" },
            calculadoEnISO: f.riesgo_calculado_en ?? "",
          }
        : null,
    asistenciaConfirmadaISO: f.asistencia_confirmada_en ? new Date(f.asistencia_confirmada_en).toISOString() : null,
  }));
}

interface FilaCupo {
  cupo_id: string;
  fecha_hora: string;
  especialidad: string | null;
  profesional: string | null;
  motivo: CupoStaff["motivo"];
  estado: EstadoCupo;
  ofertas: { estado: EstadoOfertaCupo; creada_en: string; paciente_iniciales: string | null; paciente_codigo: string }[] | null;
}

export async function getCupos(limite = 30): Promise<CupoStaff[]> {
  const { data, error } = await getSupabase().rpc("staff_cupos", { p_limite: limite });
  if (error) fallo(error);
  return ((data ?? []) as FilaCupo[]).map((f) => ({
    id: f.cupo_id,
    fechaHoraISO: new Date(f.fecha_hora).toISOString(),
    especialidad: f.especialidad ?? "",
    profesional: f.profesional ?? "",
    motivo: f.motivo,
    estado: f.estado,
    ofertas: (f.ofertas ?? []).map((o) => ({
      estado: o.estado,
      creadaEnISO: o.creada_en,
      paciente: { iniciales: o.paciente_iniciales || "—", codigo: o.paciente_codigo },
    })),
  }));
}

/**
 * Registra la cancelación que el paciente avisó por teléfono o en recepción:
 * cancela la cita y libera el cupo, que la base ofrece a la lista de espera
 * (trigger → priorizar-cupo, con IA). Devuelve el id del cupo liberado.
 */
export async function cancelarCitaStaff(citaId: string): Promise<string | null> {
  const { data, error } = await getSupabase().rpc("cancelar_cita_staff", { p_cita_id: citaId });
  if (error) fallo(error);
  return typeof data === "string" ? data : null;
}

/** Marca como inasistencia una cita cuya hora ya pasó. */
export async function registrarInasistencia(citaId: string): Promise<void> {
  const { error } = await getSupabase().rpc("registrar_inasistencia", { p_cita_id: citaId });
  if (error) fallo(error);
}

/** Calcula el riesgo de una cita, o de toda la agenda sin `citaId`. */
export async function calcularRiesgo(citaId?: string): Promise<ResultadoCalculoRiesgo> {
  const { data, error } = await getSupabase().functions.invoke("predecir-inasistencia", {
    body: citaId ? { cita_id: citaId } : {},
  });
  if (error) throw new DatosError(String(error.message ?? error));
  const r = (data ?? {}) as Partial<ResultadoCalculoRiesgo>;
  return { calculadas: Number(r.calculadas ?? 0), ai: Number(r.ai ?? 0), fallback: Number(r.fallback ?? 0) };
}
