import { Linking } from "react-native";
import * as Notifications from "expo-notifications";

/**
 * Permiso de notificaciones push. Sin push no existe la ruta crítica de
 * 2 toques, por eso se pide al crear la cuenta (paso 3 del registro).
 */
export async function pedirPermisoNotificaciones(): Promise<boolean> {
  try {
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
