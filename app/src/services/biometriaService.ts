import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";
import { isRunningInExpoGo } from "expo";
import * as LocalAuthentication from "expo-local-authentication";
import * as SecureStore from "expo-secure-store";
import { isAuthRetryableFetchError } from "@supabase/supabase-js";
import type { User } from "@supabase/supabase-js";
import { Clave, tr } from "@/i18n";
import { getSupabase } from "@/services/supabaseClient";

/**
 * Ingreso con biometría (Face ID, Touch ID, huella o, si no hay, el código
 * del teléfono).
 *
 * - Al activarlo se guarda en el llavero del teléfono (SecureStore, solo
 *   este dispositivo y con el teléfono desbloqueado) el refresh token de la
 *   sesión de Supabase y el correo de la cuenta. Nunca la contraseña.
 * - Supabase rota el refresh token cada vez que renueva la sesión (y el
 *   anterior deja de servir): la app vuelve a guardarlo en cada renovación
 *   (`sincronizar`, desde el AuthProvider).
 * - Con el ingreso activado, la app no entra sola al abrirse: pide la
 *   biometría en Iniciar sesión y recién ahí renueva la sesión con el token.
 * - Si el token venció o fue revocado, se borra y hay que ingresar con
 *   correo y contraseña. Al cerrar sesión también se borra.
 */

export type MetodoBiometria = "faceId" | "touchId" | "huella" | "codigo";

/** Claves de SecureStore (solo letras, números, «.», «-» y «_»). */
const CLAVE_TOKEN = "ts.biometria.refreshToken";
const CLAVE_CORREO = "ts.biometria.correo";
/** La pregunta tras el primer ingreso se hace una sola vez por dispositivo. */
const KEY_PREGUNTADO = "ts.biometria.preguntado";

const LLAVERO: SecureStore.SecureStoreOptions = { keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY };

/** Etiqueta del botón y del interruptor de Perfil según el método. */
export const ETIQUETA_METODO: Record<MetodoBiometria, Clave> = {
  faceId: "biometria.conFaceId",
  touchId: "biometria.conTouchId",
  huella: "biometria.conHuella",
  codigo: "biometria.conCodigo",
};

/** Nombre del método dentro de una frase («¿Quieres ingresar con Face ID…?»). */
export const NOMBRE_METODO: Record<MetodoBiometria, Clave> = {
  faceId: "biometria.faceId",
  touchId: "biometria.touchId",
  huella: "biometria.huella",
  codigo: "biometria.codigo",
};

/** El usuario canceló la biometría: no es un error que mostrar. */
export class BiometriaCancelada extends Error {}

/** No se pudo ingresar con biometría; `message` explica qué hacer. */
export class BiometriaError extends Error {}

/**
 * Cómo se va a autenticar el usuario en este teléfono, o null si no tiene
 * biometría ni código configurados. En Expo Go (iOS) el sistema no ofrece
 * Face ID a la app y pide el código del teléfono: se rotula así.
 */
export async function metodoDisponible(): Promise<MetodoBiometria | null> {
  try {
    const [hardware, inscrita] = await Promise.all([
      LocalAuthentication.hasHardwareAsync(),
      LocalAuthentication.isEnrolledAsync(),
    ]);
    if (hardware && inscrita) {
      if (Platform.OS === "ios" && isRunningInExpoGo()) return "codigo";
      const tipos = await LocalAuthentication.supportedAuthenticationTypesAsync();
      if (tipos.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) return "faceId";
      if (tipos.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
        return Platform.OS === "ios" ? "touchId" : "huella";
      }
    }
    const nivel = await LocalAuthentication.getEnrolledLevelAsync();
    return nivel >= LocalAuthentication.SecurityLevel.SECRET ? "codigo" : null;
  } catch {
    return null;
  }
}

async function leer(clave: string): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(clave, LLAVERO);
  } catch {
    return null;
  }
}

/** Correo de la cuenta con el ingreso biométrico activado, o null. */
export async function correoActivado(): Promise<string | null> {
  return (await leer(CLAVE_TOKEN)) ? leer(CLAVE_CORREO) : null;
}

export async function estaActivada(): Promise<boolean> {
  return (await correoActivado()) !== null;
}

interface SesionConToken {
  refresh_token: string;
  user: Pick<User, "email">;
}

async function guardar(sesion: SesionConToken): Promise<void> {
  if (!sesion.user.email || !sesion.refresh_token) return;
  await SecureStore.setItemAsync(CLAVE_TOKEN, sesion.refresh_token, LLAVERO);
  await SecureStore.setItemAsync(CLAVE_CORREO, sesion.user.email, LLAVERO);
}

/** Borra el token y el correo guardados. */
export async function desactivar(): Promise<void> {
  await Promise.all([SecureStore.deleteItemAsync(CLAVE_TOKEN, LLAVERO), SecureStore.deleteItemAsync(CLAVE_CORREO, LLAVERO)]);
}

/** Supabase renovó la sesión: si es de la cuenta activada, guarda el refresh token nuevo. */
export async function sincronizar(sesion: SesionConToken | null): Promise<void> {
  if (!sesion?.user.email) return;
  if ((await correoActivado()) === sesion.user.email) await guardar(sesion);
}

/** Pide la biometría (con el código del teléfono como alternativa). */
async function autenticar(mensaje: string): Promise<boolean> {
  const r = await LocalAuthentication.authenticateAsync({
    promptMessage: mensaje,
    cancelLabel: tr("comun.cancelar"),
    disableDeviceFallback: false,
  });
  return r.success;
}

/**
 * Activa el ingreso biométrico para la sesión abierta: confirma con la
 * biometría y guarda su refresh token. Devuelve false si no hay sesión o
 * el usuario canceló.
 */
export async function activar(): Promise<boolean> {
  const { data } = await getSupabase().auth.getSession();
  const sesion = data.session;
  if (!sesion?.user.email || !sesion.refresh_token) return false;
  if (!(await autenticar(tr("biometria.promptActivar")))) return false;
  await guardar(sesion);
  return true;
}

/** Tras un ingreso con correo y contraseña: ¿hay que ofrecer el ingreso biométrico? */
export async function debePreguntar(): Promise<boolean> {
  if ((await AsyncStorage.getItem(KEY_PREGUNTADO)) === "1") return false;
  if (await estaActivada()) return false;
  return (await metodoDisponible()) !== null;
}

export async function marcarPreguntado(): Promise<void> {
  await AsyncStorage.setItem(KEY_PREGUNTADO, "1");
}

/**
 * Ingresó otra cuenta con correo y contraseña: el ingreso biométrico de la
 * anterior deja de valer en este teléfono.
 */
export async function alIngresarConCorreo(email: string): Promise<void> {
  const activo = await correoActivado();
  if (activo && activo !== email) await desactivar();
}

/**
 * Cierre de sesión: borra lo guardado. Si estaba activado, la próxima vez
 * que ingrese con correo se vuelve a ofrecer (lo había aceptado).
 */
export async function alCerrarSesion(): Promise<void> {
  if (await estaActivada()) await AsyncStorage.removeItem(KEY_PREGUNTADO);
  await desactivar();
}

/**
 * Ingreso biométrico: autentica y renueva la sesión de Supabase con el
 * refresh token. Lanza BiometriaCancelada si el usuario canceló y
 * BiometriaError (con el mensaje para mostrar) si hay que ingresar con
 * correo y contraseña o no hubo conexión.
 */
export async function ingresar(): Promise<User> {
  const correo = await correoActivado();
  const guardado = await leer(CLAVE_TOKEN);
  if (!correo || !guardado) throw new BiometriaError(tr("biometria.vencido"));
  if (!(await autenticar(tr("biometria.prompt")))) throw new BiometriaCancelada();

  const supabase = getSupabase();
  // Si el teléfono conserva la sesión de esta cuenta, su token es el más reciente (Supabase lo rota al renovar).
  const { data: local } = await supabase.auth.getSession();
  const token = local.session?.user.email === correo ? local.session.refresh_token : guardado;
  const { data, error } = await supabase.auth.refreshSession({ refresh_token: token });
  if (error && isAuthRetryableFetchError(error)) throw new BiometriaError(tr("biometria.sinConexion"));
  if (error || !data.session || !data.user) {
    await desactivar();
    throw new BiometriaError(tr("biometria.vencido"));
  }
  await guardar(data.session);
  return data.user;
}
