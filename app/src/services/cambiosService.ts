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
 * Cada suscripción usa un canal propio. supabase-js reutiliza el canal si
 * el tema ya existe y `removeChannel` es asíncrono (espera la respuesta del
 * servidor): con un nombre fijo, un segundo montaje (otro TabNavigator en la
 * pila, el doble montaje de StrictMode o un cambio de dependencias) recibía
 * el canal ya suscrito y `.on()` lanzaba «cannot add postgres_changes
 * callbacks ... after subscribe()».
 */
let secuenciaCanal = 0;

/**
 * Escucha los cambios del paciente con sesión mientras la app está abierta.
 * Devuelve la función que deja de escuchar (al cerrar sesión o desmontar);
 * llamarla más de una vez no hace nada.
 */
export function escucharCambios(
  pacienteId: string,
  alInsertar?: (fila: FilaNotificacionRealtime) => void
): () => void {
  const supabase = getSupabase();
  let activo = true;
  secuenciaCanal += 1;
  // Todos los .on() van antes de subscribe(): después, Realtime los rechaza.
  const canal = supabase
    .channel(`notificaciones-${pacienteId}-${secuenciaCanal}`)
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "notificaciones", filter: `paciente_id=eq.${pacienteId}` },
      (cambio?: { eventType?: string; new?: unknown }) => {
        // Un evento puede llegar mientras el canal se cierra: ya no es de nadie.
        if (!activo) return;
        avisar();
        const fila = cambio?.new as FilaNotificacionRealtime | undefined;
        if (alInsertar && cambio?.eventType === "INSERT" && fila?.id) alInsertar(fila);
      }
    )
    .subscribe();
  const primerPlano = AppState.addEventListener("change", (estado) => {
    if (activo && estado === "active") avisar();
  });
  return () => {
    if (!activo) return;
    activo = false;
    primerPlano.remove();
    void Promise.resolve(supabase.removeChannel(canal)).catch(() => {});
  };
}
