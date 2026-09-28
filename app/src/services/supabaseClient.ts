import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient, SupabaseClient } from "@supabase/supabase-js";

/**
 * Cliente de Supabase (primer paso de la integración con el backend).
 *
 * Todavía ningún servicio lo usa: la app sigue funcionando con los datos
 * de src/data/mockData.ts. Los servicios lo irán adoptando uno por uno.
 *
 * La URL y la clave PÚBLICA (anon / publishable) vienen de variables de
 * entorno EXPO_PUBLIC_* (archivo .env en app/, ver .env.example). Esa
 * clave está pensada para ir en la app; la seguridad la dan las políticas
 * RLS de la base. Nunca poner acá la service role key ni contraseñas.
 */
const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const clavePublica = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

/** true si la URL y la clave pública están configuradas. */
export const supabaseConfigurado = Boolean(url && clavePublica);

let cliente: SupabaseClient | null = null;

/**
 * Devuelve el cliente de Supabase, creándolo la primera vez. Si faltan las
 * variables de entorno lanza un error claro (en vez de romper la app al
 * importar este archivo).
 */
export function getSupabase(): SupabaseClient {
  if (!url || !clavePublica) {
    throw new Error(
      "Supabase no está configurado: definí EXPO_PUBLIC_SUPABASE_URL y EXPO_PUBLIC_SUPABASE_ANON_KEY en app/.env"
    );
  }
  cliente ??= createClient(url, clavePublica, {
    auth: {
      // Sesión guardada en el teléfono, como el resto de las preferencias.
      storage: AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      // En una app nativa no hay URL de navegador de donde leer la sesión.
      detectSessionInUrl: false,
    },
  });
  return cliente;
}
