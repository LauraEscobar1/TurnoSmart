import { Linking, Platform } from "react-native";
import { isRunningInExpoGo } from "expo";

type ModuloNotificaciones = typeof import("expo-notifications");

/**
 * expo-notifications se carga recién al usarlo: en Android, dentro de Expo
 * Go (SDK 53+), el módulo lanza un error apenas se importa porque Expo Go
 * ya no soporta push remotas. Ahí no se carga y el permiso queda en «no».
 * En un development build o en la app publicada funciona normal.
 */
function cargarNotificaciones(): ModuloNotificaciones | null {
  if (Platform.OS === "android" && isRunningInExpoGo()) return null;
  return require("expo-notifications") as ModuloNotificaciones;
}

/**
 * Permiso de notificaciones push. Sin push no existe la ruta crítica de
 * 2 toques, por eso se pide al crear la cuenta (paso 3 del registro).
 */
export async function pedirPermisoNotificaciones(): Promise<boolean> {
  try {
    const Notifications = cargarNotificaciones();
    if (!Notifications) return false;
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
