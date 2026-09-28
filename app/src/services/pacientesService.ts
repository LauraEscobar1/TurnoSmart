import { DistanciaMaxima, FranjaHoraria, Paciente } from "@/types/domain";
import { getSupabase } from "@/services/supabaseClient";

/**
 * Datos del paciente en `public.pacientes` (Supabase). RLS deja a cada
 * paciente leer y actualizar solo su propia fila (`id = auth.uid()`).
 *
 * Solo cubre las columnas que existen en la tabla. Lo que todavía no se
 * migró (especialidades en espera, puesto en la lista, foto) sigue local.
 */

/** Columnas que lee la app (sin `foto_path`: la foto sigue siendo local). */
const COLUMNAS =
  "nombre, apellido, cedula, telefono, franja_preferida, distancia_max_km, notificaciones_activas, " +
  "registrado_en, fecha_nacimiento, ciudad, eps, contacto_emergencia_nombre, contacto_emergencia_telefono";

/** Fila de `public.pacientes` con las columnas de COLUMNAS. */
export interface FilaPaciente {
  nombre: string;
  apellido: string;
  cedula: string;
  telefono: string;
  franja_preferida: string;
  distancia_max_km: number | null;
  notificaciones_activas: boolean;
  registrado_en: string;
  fecha_nacimiento: string | null;
  ciudad: string | null;
  eps: string | null;
  contacto_emergencia_nombre: string | null;
  contacto_emergencia_telefono: string | null;
}

/** Los campos de `Paciente` que viven en `public.pacientes`. */
export type PacienteRemoto = Pick<
  Paciente,
  | "nombre"
  | "apellido"
  | "cedula"
  | "telefono"
  | "franjaPreferida"
  | "distanciaMaxKm"
  | "notificacionesActivas"
  | "registradoEnISO"
  | "fechaNacimiento"
  | "ciudad"
  | "eps"
  | "contactoEmergencia"
>;

/** Error de Supabase al leer o escribir `pacientes` (red, RLS, etc.). */
export class PacientesError extends Error {
  constructor(
    message: string,
    public codigo?: string
  ) {
    super(message);
  }
}

const FRANJAS: FranjaHoraria[] = ["Mañana", "Tarde", "Indistinto"];

/** `distancia_max_km` es numeric; la app solo ofrece 3 km, 10 km o sin límite. */
function distancia(km: number | null): DistanciaMaxima {
  const n = km === null ? null : Number(km);
  return n === 3 || n === 10 ? n : null;
}

/** Fila de Supabase → campos de `Paciente` (snake_case → camelCase, NULL → undefined). */
export function pacienteDesdeFila(fila: FilaPaciente): PacienteRemoto {
  const contactoNombre = fila.contacto_emergencia_nombre ?? "";
  const contactoTelefono = fila.contacto_emergencia_telefono ?? "";
  return {
    nombre: fila.nombre,
    apellido: fila.apellido,
    cedula: fila.cedula,
    telefono: fila.telefono,
    franjaPreferida: FRANJAS.find((f) => f === fila.franja_preferida) ?? "Indistinto",
    distanciaMaxKm: distancia(fila.distancia_max_km),
    notificacionesActivas: fila.notificaciones_activas,
    registradoEnISO: new Date(fila.registrado_en).toISOString(),
    fechaNacimiento: fila.fecha_nacimiento ?? undefined,
    ciudad: fila.ciudad ?? undefined,
    eps: fila.eps ?? undefined,
    contactoEmergencia:
      contactoNombre || contactoTelefono ? { nombre: contactoNombre, telefono: contactoTelefono } : undefined,
  };
}

/** Columnas que el paciente puede actualizar desde la app. */
export interface CambiosFila {
  franja_preferida?: string;
  distancia_max_km?: number | null;
  notificaciones_activas?: boolean;
  fecha_nacimiento?: string | null;
  ciudad?: string | null;
  eps?: string | null;
  contacto_emergencia_nombre?: string | null;
  contacto_emergencia_telefono?: string | null;
}

/**
 * Cambios de `Paciente` → columnas permitidas (camelCase → snake_case).
 * Ignora todo lo demás: identidad (id, nombre, apellido, cédula, correo,
 * teléfono), fechas del servidor, foto, especialidades y puesto en la lista.
 * Un campo opcional presente pero vacío (`undefined`) se guarda como NULL.
 */
export function filaDesdeCambios(cambios: Partial<Paciente>): CambiosFila {
  const fila: CambiosFila = {};
  if (cambios.franjaPreferida !== undefined) fila.franja_preferida = cambios.franjaPreferida;
  if ("distanciaMaxKm" in cambios) fila.distancia_max_km = cambios.distanciaMaxKm ?? null;
  if (cambios.notificacionesActivas !== undefined) fila.notificaciones_activas = cambios.notificacionesActivas;
  if ("fechaNacimiento" in cambios) fila.fecha_nacimiento = cambios.fechaNacimiento ?? null;
  if ("ciudad" in cambios) fila.ciudad = cambios.ciudad ?? null;
  if ("eps" in cambios) fila.eps = cambios.eps ?? null;
  if ("contactoEmergencia" in cambios) {
    fila.contacto_emergencia_nombre = cambios.contactoEmergencia?.nombre || null;
    fila.contacto_emergencia_telefono = cambios.contactoEmergencia?.telefono || null;
  }
  return fila;
}

/** Perfil del paciente en Supabase, o null si todavía no tiene fila. Los errores se propagan. */
export async function getPacienteRemoto(id: string): Promise<PacienteRemoto | null> {
  const { data, error } = await getSupabase().from("pacientes").select(COLUMNAS).eq("id", id).maybeSingle<FilaPaciente>();
  if (error) throw new PacientesError(error.message, error.code);
  return data ? pacienteDesdeFila(data) : null;
}

/** Actualiza en Supabase solo las columnas permitidas de los cambios. Los errores se propagan. */
export async function actualizarPacienteRemoto(id: string, cambios: Partial<Paciente>): Promise<void> {
  const fila = filaDesdeCambios(cambios);
  if (Object.keys(fila).length === 0) return;
  const { error } = await getSupabase().from("pacientes").update(fila).eq("id", id);
  if (error) throw new PacientesError(error.message, error.code);
}
