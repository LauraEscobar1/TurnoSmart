import { Notificacion, TipoNotificacion } from "@/types/domain";
import { Clave, getIdiomaActual, Idioma, traducir, traducirDato } from "@/i18n";
import { fechaCorta, fechaLarga, hora } from "@/utils/format";
import { getSupabase } from "@/services/supabaseClient";
import { DatosError } from "@/services/catalogoService";
import { getPacienteActualId } from "@/services/sesionService";

/**
 * Notificaciones del paciente en Supabase (`public.notificaciones`). La base
 * guarda qué se envió y con qué datos (tipo + `datos`); el texto se redacta
 * en la app, en el idioma del paciente. RLS: cada paciente lee solo las
 * suyas; marcar como leídas pasa por RPC (`marcar_notificacion_leida`,
 * `marcar_todas_notificaciones_leidas`).
 */

/** Notificación tal como la guarda el sistema: tipo y datos, sin texto. */
export interface NotificacionGuardada extends Omit<Notificacion, "titulo" | "cuerpo"> {
  datos: { especialidad: string; profesional?: string; consultorio?: string; fechaHoraISO?: string };
}

interface FilaNotificacion {
  id: string;
  tipo: TipoNotificacion;
  datos: Partial<NotificacionGuardada["datos"]> | null;
  referencia_id: string | null;
  leida: boolean;
  creada_en: string;
}

function guardadaDesdeFila(f: FilaNotificacion): NotificacionGuardada {
  return {
    id: f.id,
    tipo: f.tipo,
    datos: { ...f.datos, especialidad: f.datos?.especialidad ?? "" },
    fechaISO: new Date(f.creada_en).toISOString(),
    leida: f.leida,
    referenciaId: f.referencia_id ?? undefined,
  };
}

/** Redacta el título y el mensaje de una notificación en el idioma del paciente. */
function redactar(n: NotificacionGuardada, nombre: string, idioma: Idioma): Notificacion {
  const { datos, ...resto } = n;
  const cuando = datos.fechaHoraISO;
  const profesional = datos.profesional ?? "";
  const params = {
    nombre,
    especialidad: traducirDato(idioma, "especialidades", datos.especialidad),
    // «el Dr. J. Peralta» / «la Dra. Elena Ruiz»; en inglés, el nombre tal cual.
    profesional: idioma === "es" ? `${/^Dra\./.test(profesional) ? "la" : "el"} ${profesional}` : profesional,
    // «Cons. 1C» / «Consultorio 1C» → «1C».
    consultorio: (datos.consultorio ?? "").replace(/^(Cons\.|Consultorio)\s*/i, ""),
    fechaLarga: cuando ? fechaLarga(new Date(cuando), idioma) : "",
    fechaCorta: cuando ? fechaCorta(cuando, idioma) : "",
    hora: cuando ? hora(cuando) : "",
  };
  const base = `notificaciones.mensajes.${n.tipo}`;
  return {
    ...resto,
    titulo: traducir(idioma, `${base}.titulo` as Clave),
    cuerpo: traducir(idioma, `${base}.cuerpo` as Clave, params),
  };
}

/**
 * Notificaciones del paciente, de la más reciente a la más antigua, en su
 * idioma y con el saludo personalizado («Hola, Laura.») por su nombre de pila.
 * Si Supabase falla, lista vacía (con aviso en consola).
 */
export async function getNotificaciones(nombre: string, idioma: Idioma = getIdiomaActual()): Promise<Notificacion[]> {
  const pila = nombre.trim().split(/\s+/)[0] ?? "";
  try {
    const pacienteId = await getPacienteActualId();
    if (!pacienteId) return [];
    const { data, error } = await getSupabase()
      .from("notificaciones")
      .select("id, tipo, datos, referencia_id, leida, creada_en")
      .eq("paciente_id", pacienteId)
      .order("creada_en", { ascending: false })
      .returns<FilaNotificacion[]>();
    if (error) throw new DatosError(error.message, error.code);
    return (data ?? []).map((f) => redactar(guardadaDesdeFila(f), pila, idioma));
  } catch (e) {
    console.warn(`[notificaciones] No se pudieron leer: ${String(e)}`);
    return [];
  }
}

export async function marcarComoLeida(id: string): Promise<void> {
  const { error } = await getSupabase().rpc("marcar_notificacion_leida", { p_notificacion_id: id });
  if (error) console.warn(`[notificaciones] No se pudo marcar como leída: ${error.message}`);
}

export function contarNoLeidas(notificaciones: Pick<Notificacion, "leida">[]): number {
  return notificaciones.filter((n) => !n.leida).length;
}

/** Cantidad de notificaciones sin leer del paciente con sesión (badge). */
export async function getConteoNoLeidas(): Promise<number> {
  return contarNoLeidas(await getNotificaciones(""));
}

export async function marcarTodasComoLeidas(): Promise<void> {
  const { error } = await getSupabase().rpc("marcar_todas_notificaciones_leidas");
  if (error) console.warn(`[notificaciones] No se pudieron marcar como leídas: ${error.message}`);
}
