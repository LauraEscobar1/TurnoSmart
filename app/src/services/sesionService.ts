import { getSupabase } from "@/services/supabaseClient";

/**
 * Id del paciente con sesión abierta en Supabase (el mismo de `pacientes`),
 * o null sin sesión. Los servicios lo usan para filtrar sus consultas; la
 * seguridad real la dan RLS y las RPC (que usan auth.uid()).
 */
export async function getPacienteActualId(): Promise<string | null> {
  const { data } = await getSupabase().auth.getSession();
  return data.session?.user.id ?? null;
}
