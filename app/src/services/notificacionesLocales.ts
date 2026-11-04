import { Platform } from "react-native";
import { getIdiomaActual, tr, traducirDato } from "@/i18n";
import { fechaCorta, hora } from "@/utils/format";

/**
 * Notificaciones LOCALES (expo-notifications), compatibles con Expo Go.
 *
 * No hay push remotas: la app se entera por Supabase Realtime (fila nueva en
 * `notificaciones`, ver cambiosService) y ella misma muestra el aviso del
 * sistema. Por eso solo llegan mientras la app está abierta o recién pasada
 * a segundo plano; lo demás queda en la pestaña Notificaciones.
 *
 *   · Oferta nueva (`cupo-ultimo-minuto`): «La IA de TurnoSmart encontró
 *     un cupo para ti» si la priorizó la IA, o «¡Cita de último minuto
 *     disponible!» con el respaldo determinista → al tocarla abre la oferta.
 *   · Riesgo alto de inasistencia (`recordatorio` con
 *     `datos.accion = "confirmar-asistencia"`): «Confirma tu asistencia», con
 *     los botones Confirmar y Cancelar cita → abren la cita. El paciente
 *     nunca ve su nivel de riesgo.
 *
 * En Expo Go para Android (SDK 53+) no hay push remotas, pero las locales sí
 * (expo-notifications 58 ya no falla al importarse ahí).
 */

type ModuloNotificaciones = typeof import("expo-notifications");

/** expo-notifications se carga al usarlo; en web no se usa. */
export function cargarNotificaciones(): ModuloNotificaciones | null {
  if (Platform.OS === "web") return null;
  try {
    return require("expo-notifications") as ModuloNotificaciones;
  } catch {
    return null;
  }
}

/** Canal de Android (obligatorio desde Android 8 y necesario para pedir el permiso en Android 13+). */
export const CANAL_AVISOS = "cupos-y-citas";
/** Categoría con los botones Confirmar / Cancelar cita. */
export const CATEGORIA_CONFIRMAR = "confirmar-asistencia";
export const ACCION_CONFIRMAR = "confirmar";
export const ACCION_CANCELAR = "cancelar";

/** A dónde lleva tocar la notificación. */
export type DestinoAviso =
  | { destino: "oferta"; ofertaId: string }
  | { destino: "cita"; citaId: string; accion?: "confirmar" | "cancelar" };

/** Fila de `notificaciones` tal como la publica Realtime (solo las del paciente, por RLS). */
export interface FilaNotificacionRealtime {
  id: string;
  tipo: string;
  datos?: { accion?: string; especialidad?: string; fechaHoraISO?: string; estrategia?: string } | null;
  referencia_id?: string | null;
  oferta_id?: string | null;
  cita_id?: string | null;
  leida?: boolean;
}

let configurado = false;

/**
 * Cómo se muestran los avisos con la app abierta, el canal de Android y la
 * categoría con botones. Idempotente; los textos de los botones salen del
 * idioma activo.
 */
export async function configurarNotificaciones(): Promise<void> {
  const N = cargarNotificaciones();
  if (!N) return;
  try {
    if (!configurado) {
      N.setNotificationHandler({
        handleNotification: async () => ({
          shouldShowBanner: true,
          shouldShowList: true,
          shouldPlaySound: true,
          shouldSetBadge: false,
        }),
      });
      configurado = true;
    }
    if (Platform.OS === "android") {
      await N.setNotificationChannelAsync(CANAL_AVISOS, {
        name: tr("avisosLocales.canal"),
        importance: N.AndroidImportance.HIGH,
      });
    }
    await N.setNotificationCategoryAsync(CATEGORIA_CONFIRMAR, [
      { identifier: ACCION_CONFIRMAR, buttonTitle: tr("avisosLocales.confirmar"), options: { opensAppToForeground: true } },
      { identifier: ACCION_CANCELAR, buttonTitle: tr("avisosLocales.cancelar"), options: { opensAppToForeground: true } },
    ]);
  } catch (e) {
    console.warn(`[avisos] No se pudieron configurar las notificaciones: ${String(e)}`);
  }
}

export type EstadoPermiso = "concedido" | "preguntar" | "denegado";

/** Estado del permiso sin preguntar nada al usuario. */
export async function estadoPermisoNotificaciones(): Promise<EstadoPermiso> {
  const N = cargarNotificaciones();
  if (!N) return "denegado";
  try {
    const actual = await N.getPermissionsAsync();
    if (actual.granted) return "concedido";
    return actual.canAskAgain ? "preguntar" : "denegado";
  } catch {
    return "denegado";
  }
}

/** Ids de las filas ya avisadas (Realtime puede repetir un evento al reconectar). */
const avisadas = new Set<string>();

/** Para las pruebas. */
export function olvidarAvisadas() {
  avisadas.clear();
}

/** Contenido del aviso local de una fila nueva de `notificaciones`, o null si no corresponde avisar. */
export function avisoDeFila(fila: FilaNotificacionRealtime) {
  if (fila.leida) return null;
  const idioma = getIdiomaActual();
  const iso = fila.datos?.fechaHoraISO;
  const params = {
    especialidad: traducirDato(idioma, "especialidades", fila.datos?.especialidad ?? ""),
    fecha: iso ? fechaCorta(iso, idioma) : "",
    hora: iso ? hora(iso) : "",
  };
  const ofertaId = fila.oferta_id ?? fila.referencia_id;
  if (fila.tipo === "cupo-ultimo-minuto" && ofertaId) {
    const destino: DestinoAviso = { destino: "oferta", ofertaId };
    // Solo menciona la IA si la IA priorizó esta oferta (datos.estrategia de ofrecer_cupo).
    const title = tr(fila.datos?.estrategia === "ai" ? "avisosLocales.ofertaTituloIA" : "avisosLocales.ofertaTitulo");
    return { title, body: tr("avisosLocales.ofertaCuerpo", params), data: destino };
  }
  const citaId = fila.cita_id ?? fila.referencia_id;
  if (fila.tipo === "recordatorio" && fila.datos?.accion === "confirmar-asistencia" && citaId) {
    const destino: DestinoAviso = { destino: "cita", citaId };
    return {
      title: tr("avisosLocales.confirmarTitulo"),
      body: tr("avisosLocales.confirmarCuerpo", params),
      data: destino,
      categoryIdentifier: CATEGORIA_CONFIRMAR,
    };
  }
  return null;
}

/**
 * Muestra al instante el aviso del sistema para una fila nueva de
 * `notificaciones` (una sola vez por fila). Sin permiso no hace nada: la
 * notificación sigue en la pestaña Notificaciones.
 */
export async function avisarNotificacionNueva(fila: FilaNotificacionRealtime): Promise<boolean> {
  const contenido = avisoDeFila(fila);
  const N = cargarNotificaciones();
  if (!contenido || !N || avisadas.has(fila.id)) return false;
  avisadas.add(fila.id);
  try {
    if ((await estadoPermisoNotificaciones()) !== "concedido") return false;
    await N.scheduleNotificationAsync({
      content: { ...contenido, sound: true },
      trigger: Platform.OS === "android" ? { channelId: CANAL_AVISOS } : null,
    });
    return true;
  } catch (e) {
    console.warn(`[avisos] No se pudo mostrar el aviso: ${String(e)}`);
    return false;
  }
}

/** Destino de una respuesta a la notificación (tocarla o uno de sus botones). */
export function destinoDeRespuesta(datos: unknown, accion: string): DestinoAviso | null {
  const d = (datos ?? {}) as Partial<{ destino: string; ofertaId: string; citaId: string }>;
  if (d.destino === "oferta" && typeof d.ofertaId === "string") return { destino: "oferta", ofertaId: d.ofertaId };
  if (d.destino === "cita" && typeof d.citaId === "string") {
    if (accion === ACCION_CONFIRMAR) return { destino: "cita", citaId: d.citaId, accion: "confirmar" };
    if (accion === ACCION_CANCELAR) return { destino: "cita", citaId: d.citaId, accion: "cancelar" };
    return { destino: "cita", citaId: d.citaId };
  }
  return null;
}

/**
 * Escucha los toques en las notificaciones (y la que abrió la app, si la
 * app estaba cerrada). Devuelve la función para dejar de escuchar.
 */
export function escucharRespuestas(alAbrir: (destino: DestinoAviso) => void): () => void {
  const N = cargarNotificaciones();
  if (!N) return () => {};
  const atendidas = new Set<string>();
  const atender = (r: { actionIdentifier: string; notification: { request: { identifier: string; content: { data?: unknown } } } }) => {
    const clave = `${r.notification.request.identifier}:${r.actionIdentifier}`;
    if (atendidas.has(clave)) return;
    atendidas.add(clave);
    const destino = destinoDeRespuesta(r.notification.request.content.data, r.actionIdentifier);
    if (destino) alAbrir(destino);
  };
  let suscripcion: { remove: () => void } | null = null;
  try {
    suscripcion = N.addNotificationResponseReceivedListener(atender);
    N.getLastNotificationResponseAsync()
      .then((r) => {
        if (r) {
          atender(r);
          N.clearLastNotificationResponse();
        }
      })
      .catch(() => {});
  } catch (e) {
    console.warn(`[avisos] No se pudo escuchar las notificaciones: ${String(e)}`);
  }
  return () => suscripcion?.remove();
}
