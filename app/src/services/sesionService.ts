import { getSupabase } from "@/services/supabaseClient";

/**
 * Id del paciente con sesión abierta en Supabase (el mismo de `pacientes`),
 * o null sin sesión. Los servicios lo usan para filtrar sus consultas; la
 * seguridad real la dan RLS y las RPC (que usan auth.uid()).
 *
 * Con una sesión de staff (app_metadata.rol = "staff", lo asigna el
 * servidor) también es null: el staff no es paciente, así que los servicios
 * del paciente no llaman a sus RPC (p. ej. `expirar_mis_ofertas`, que
 * respondería «paciente_inexistente»).
 */
export async function getPacienteActualId(): Promise<string | null> {
  const { data } = await getSupabase().auth.getSession();
  const user = data.session?.user;
  if (!user || user.app_metadata?.rol === "staff") return null;
  return user.id;
}
