import { AppState } from "react-native";
import { getSupabase } from "@/services/supabaseClient";

/**
 * Aviso de «cambiaron los datos del paciente en el servidor»: una oferta
 * nueva, una oferta que venció, una cita confirmada... Cada uno de esos
 * cambios crea o actualiza una fila de `notificaciones`, que Supabase
 * Realtime publica (migración 20261010220000; RLS: cada paciente recibe solo
 * las suyas). También avisa cuando la app vuelve a primer plano, porque en
 * segundo plano no recibe eventos.
 *
 * El evento no trae datos para mostrar: las pantallas vuelven a leer con sus
 * servicios, que siguen siendo la única fuente (y nunca ven el score).
 */
type Oyente = () => void;

const oyentes = new Set<Oyente>();

/** Suscribe una recarga a los cambios; devuelve la función para desuscribirse. */
export function alCambiarDatos(oyente: Oyente): () => void {
  oyentes.add(oyente);
  return () => {
    oyentes.delete(oyente);
  };
}

function avisar() {
  oyentes.forEach((oyente) => oyente());
}

/**
 * Escucha los cambios del paciente con sesión mientras la app está abierta.
 * Devuelve la función que deja de escuchar (al cerrar sesión o desmontar).
 */
export function escucharCambios(pacienteId: string): () => void {
  const supabase = getSupabase();
  const canal = supabase
    .channel(`notificaciones-${pacienteId}`)
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "notificaciones", filter: `paciente_id=eq.${pacienteId}` },
      avisar
    )
    .subscribe();
  const primerPlano = AppState.addEventListener("change", (estado) => {
    if (estado === "active") avisar();
  });
  return () => {
    primerPlano.remove();
    supabase.removeChannel(canal);
  };
}
