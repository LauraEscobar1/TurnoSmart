import AsyncStorage from "@react-native-async-storage/async-storage";

/**
 * Ajustes de la app en este teléfono (menú ☰ de Inicio). Por ahora solo
 * se guardan: aplicar el modo oscuro y traducir la app son los siguientes
 * pasos, y leerán de acá.
 */
export type Idioma = "es" | "en";

export interface Ajustes {
  modoOscuro: boolean;
  idioma: Idioma;
}

const KEY_AJUSTES = "ts.ajustes";
const POR_DEFECTO: Ajustes = { modoOscuro: false, idioma: "es" };

export async function getAjustes(): Promise<Ajustes> {
  const raw = await AsyncStorage.getItem(KEY_AJUSTES);
  return raw ? { ...POR_DEFECTO, ...JSON.parse(raw) } : POR_DEFECTO;
}

export async function guardarAjustes(ajustes: Ajustes): Promise<void> {
  await AsyncStorage.setItem(KEY_AJUSTES, JSON.stringify(ajustes));
}
