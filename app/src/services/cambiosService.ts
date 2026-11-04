import { AppState } from "react-native";
import { getSupabase } from "@/services/supabaseClient";
import type { FilaNotificacionRealtime } from "@/services/notificacionesLocales";

/**
 * Aviso de «cambiaron los datos del paciente en el servidor»: una oferta
 * nueva, una oferta que venció, una cita confirmada... Cada uno de esos
 * cambios crea o actualiza una fila de `notificaciones`, que Supabase
 * Realtime publica (migración 20261010220000; RLS: cada paciente recibe solo
 * las suyas). También avisa cuando la app vuelve a primer plano, porque en
 * segundo plano no recibe eventos.
 *
 * Las pantallas vuelven a leer con sus servicios, que siguen siendo la
 * única fuente (y nunca ven el score). La fila nueva solo se usa para el
 * aviso local del sistema (`alInsertar`, ver notificacionesLocales).
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
export function escucharCambios(
  pacienteId: string,
  alInsertar?: (fila: FilaNotificacionRealtime) => void
): () => void {
  const supabase = getSupabase();
  const canal = supabase
    .channel(`notificaciones-${pacienteId}`)
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "notificaciones", filter: `paciente_id=eq.${pacienteId}` },
      (cambio?: { eventType?: string; new?: unknown }) => {
        avisar();
        const fila = cambio?.new as FilaNotificacionRealtime | undefined;
        if (alInsertar && cambio?.eventType === "INSERT" && fila?.id) alInsertar(fila);
      }
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
