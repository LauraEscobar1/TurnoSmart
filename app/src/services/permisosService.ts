import { Linking } from "react-native";
import { cargarNotificaciones, configurarNotificaciones } from "@/services/notificacionesLocales";

/**
 * Permiso de notificaciones. Sin avisos no existe la ruta crítica de 2
 * toques (las ofertas duran minutos), por eso se pide al crear la cuenta
 * (paso 3 del registro) y, con una explicación, al entrar a la app.
 *
 * Son notificaciones LOCALES (ver notificacionesLocales): funcionan en Expo
 * Go, también en Android. En Android 13+ el sistema solo muestra la
 * pregunta si ya existe un canal, así que se configura antes de pedirlo.
 */
export async function pedirPermisoNotificaciones(): Promise<boolean> {
  try {
    const Notifications = cargarNotificaciones();
    if (!Notifications) return false;
    await configurarNotificaciones();
    const actual = await Notifications.getPermissionsAsync();
    if (actual.granted) return true;
    if (!actual.canAskAgain) return false;
    const pedido = await Notifications.requestPermissionsAsync();
    return pedido.granted;
  } catch {
    // Plataformas sin soporte (p. ej. web sin service worker).
    return false;
  }
}

/** Si el sistema ya no permite volver a preguntar, se abre Ajustes. */
export async function abrirAjustes() {
  await Linking.openSettings();
}
