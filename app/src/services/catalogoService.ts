import { getSupabase } from "@/services/supabaseClient";

/**
 * Catálogos de Supabase (`especialidades`, `profesionales`, `consultorios`),
 * legibles para cualquier paciente autenticado. Convierten ids en los
 * nombres que muestra la app, y nombres de especialidad en ids.
 */

export type TablaCatalogo = "especialidades" | "profesionales" | "consultorios";

/** Error de Supabase al leer datos (red, permisos, datos incompletos). */
export class DatosError extends Error {
  constructor(
    message: string,
    public codigo?: string
  ) {
    super(message);
  }
}

interface FilaCatalogo {
  id: string | number;
  nombre: string;
}

/** Nombre de cada id pedido (los ids nulos o repetidos se ignoran). */
export async function getNombresPorId(
  tabla: TablaCatalogo,
  ids: (string | number | null | undefined)[]
): Promise<Map<string | number, string>> {
  const unicos = [...new Set(ids.filter((id): id is string | number => id !== null && id !== undefined))];
  if (unicos.length === 0) return new Map();
  const { data, error } = await getSupabase().from(tabla).select("id, nombre").in("id", unicos).returns<FilaCatalogo[]>();
  if (error) throw new DatosError(error.message, error.code);
  return new Map((data ?? []).map((f) => [f.id, f.nombre]));
}

/** Ids de las especialidades con esos nombres (los nombres desconocidos se ignoran). */
export async function getIdsEspecialidades(nombres: string[]): Promise<number[]> {
  if (nombres.length === 0) return [];
  const { data, error } = await getSupabase()
    .from("especialidades")
    .select("id, nombre")
    .in("nombre", nombres)
    .returns<{ id: number; nombre: string }[]>();
  if (error) throw new DatosError(error.message, error.code);
  return (data ?? []).map((f) => f.id);
}
