import AsyncStorage from "@react-native-async-storage/async-storage";
import type { User } from "@supabase/supabase-js";
import { DistanciaMaxima, FranjaHoraria, Paciente } from "@/types/domain";
import { getSupabase } from "@/services/supabaseClient";
import { actualizarPacienteRemoto, getPacienteRemoto, PacienteRemoto } from "@/services/pacientesService";
import { getResumenListaEspera, ResumenListaEspera, sincronizarListaEspera } from "@/services/solicitudesEsperaService";
import { tr } from "@/i18n";
import type { PerfilStaff } from "@/types/staff";
import { getPerfilStaff } from "@/services/staffService";
import * as biometria from "@/services/biometriaService";

/**
 * Capa de servicio de cuentas y sesión, sobre Supabase Auth.
 *
 * - Las credenciales y la sesión las maneja solo Supabase Auth (la sesión
 *   la guarda el cliente de Supabase en AsyncStorage; nunca la contraseña).
 * - El perfil del paciente se arma en capas: `user_metadata` → perfil local
 *   (`ts.perfiles`, por id de usuario, sin contraseña) → fila de
 *   `public.pacientes` (pacientesService), que gana en las columnas que
 *   tiene. La lista de espera viene de `solicitudes_espera`: especialidades
 *   activas, puesto real y días en espera (desde la solicitud más antigua).
 *   La foto sigue solo en el perfil local (Storage llegará después).
 * - La fila de `public.pacientes` la crea la base al registrarse (trigger
 *   sobre `auth.users`, supabase/migrations), con el mismo id del usuario
 *   de Auth y a partir de `options.data`. La app nunca inserta en `pacientes`.
 */

/** Perfiles locales por id de usuario de Supabase (sin credenciales). */
const KEY_PERFILES = "ts.perfiles";
/** La intro de 3 pantallas se muestra solo la primera vez. */
const KEY_INTRO = "ts.introVista";
/**
 * Claves de la versión sin backend, que guardaba las cuentas con la
 * contraseña en claro. Al abrir la app se borran y solo se rescata el
 * perfil (por correo) para el primer ingreso con Supabase.
 */
const KEY_CUENTAS_LEGADO = "ts.cuentas";
const KEY_SESION_LEGADO = "ts.sesion";
const KEY_PERFILES_LEGADO = "ts.perfilesPorCorreo";

/** Puesto inicial en la lista de espera (simulado hasta migrar las listas de espera). */
const PUESTO_INICIAL = 12;

export class AuthError extends Error {
  constructor(
    message: string,
    /** Campo del formulario al que corresponde el error, si aplica. */
    public campo?: string
  ) {
    super(message);
  }
}

/**
 * La cuenta quedó creada (usuario de Auth y, por el trigger, su fila de
 * `pacientes`), pero Supabase pide confirmar el correo antes de dar una
 * sesión. No es un fallo del registro: solo falta confirmar e iniciar
 * sesión. Es un AuthError para que la pantalla muestre el mismo mensaje
 * de siempre; quien necesite distinguirlo mira `cuentaCreada`.
 */
export class ConfirmacionCorreoPendiente extends AuthError {
  readonly cuentaCreada = true;

  constructor() {
    super(tr("errores.confirmaCorreo"));
  }
}

const normalizarEmail = (email: string) => email.trim().toLowerCase();

/**
 * Cuentas guardadas antes del cambio a cédula y EPS: `dni` pasa a `cedula`
 * y la antigua «obra social» a `eps`, para no perder lo ya cargado.
 */
type PacienteGuardado = Paciente & { dni?: string; obraSocial?: string };
function migrar({ dni, obraSocial, ...p }: PacienteGuardado): Paciente {
  return { ...p, cedula: p.cedula ?? dni ?? "", eps: p.eps ?? (obraSocial?.trim() || undefined) };
}

/** Perfiles completos guardados en el teléfono, por id de usuario o (legado) por correo. */
async function leerMapa(clave: string): Promise<Record<string, Paciente>> {
  const raw = await AsyncStorage.getItem(clave);
  return raw ? (JSON.parse(raw) as Record<string, Paciente>) : {};
}

/** Borra las cuentas locales con contraseña de la versión anterior, rescatando solo el perfil. */
async function limpiarCuentasLegado() {
  const raw = await AsyncStorage.getItem(KEY_CUENTAS_LEGADO);
  if (raw) {
    const porCorreo = await leerMapa(KEY_PERFILES_LEGADO);
    for (const { paciente } of JSON.parse(raw) as { paciente: PacienteGuardado }[]) {
      porCorreo[paciente.email] = migrar(paciente);
    }
    await AsyncStorage.setItem(KEY_PERFILES_LEGADO, JSON.stringify(porCorreo));
  }
  await AsyncStorage.multiRemove([KEY_CUENTAS_LEGADO, KEY_SESION_LEGADO]);
}

// — user_metadata: datos del registro que viajan con el usuario de Auth —

type Metadatos = Record<string, unknown>;
const texto = (m: Metadatos, k: string) => {
  const v = m[k];
  return typeof v === "string" ? v : undefined;
};
const FRANJAS: FranjaHoraria[] = ["Mañana", "Tarde", "Indistinto"];
function franja(m: Metadatos): FranjaHoraria {
  return FRANJAS.find((f) => f === m.franjaPreferida) ?? "Indistinto";
}
function distancia(m: Metadatos): DistanciaMaxima {
  const v = m.distanciaMaxKm;
  return v === 3 || v === 10 ? v : null;
}

/** Fila de `pacientes` del usuario; si falla la lectura (p. ej. sin red), sigue sin ella. */
async function leerPacienteRemoto(id: string): Promise<PacienteRemoto | null> {
  try {
    return await getPacienteRemoto(id);
  } catch (e) {
    console.warn(`[pacientes] No se pudo leer el perfil de Supabase; se usa el perfil local. ${String(e)}`);
    return null;
  }
}

/** Lista de espera del usuario; si falla la lectura (p. ej. sin red), sigue sin ella. */
async function leerListaEspera(id: string): Promise<ResumenListaEspera | null> {
  try {
    return await getResumenListaEspera(id);
  } catch (e) {
    console.warn(`[lista de espera] No se pudo leer de Supabase; se usa el perfil local. ${String(e)}`);
    return null;
  }
}

/** Campos de `Paciente` que salen de la lista de espera real. */
function camposListaEspera(lista: ResumenListaEspera | null): Partial<Paciente> {
  if (!lista) return {};
  return {
    especialidadesInteres: lista.especialidades,
    ...(lista.puesto !== null ? { puestoEspera: lista.puesto } : {}),
    ...(lista.desdeISO ? { registradoEnISO: lista.desdeISO } : {}),
  };
}

/**
 * Paciente de la app a partir del usuario de Auth: `user_metadata`, luego el
 * perfil local y, encima, la fila de `public.pacientes` y la lista de espera
 * de `solicitudes_espera` si se pudieron leer.
 */
async function pacienteDeUsuario(user: User): Promise<Paciente> {
  const m: Metadatos = user.user_metadata ?? {};
  const email = user.email ?? "";
  const perfiles = await leerMapa(KEY_PERFILES);
  // Primer ingreso con Supabase: se rescata el perfil de la versión local, si había.
  const local: Partial<Paciente> = perfiles[user.id] ?? (await leerMapa(KEY_PERFILES_LEGADO))[email] ?? {};
  const [remoto, lista] = await Promise.all([leerPacienteRemoto(user.id), leerListaEspera(user.id)]);
  const especialidades = m.especialidadesInteres;
  const paciente: Paciente = {
    nombre: texto(m, "nombre") ?? "",
    apellido: texto(m, "apellido") ?? "",
    cedula: texto(m, "cedula") ?? "",
    telefono: texto(m, "telefono") ?? "",
    especialidadesInteres: Array.isArray(especialidades)
      ? especialidades.filter((e): e is string => typeof e === "string")
      : [],
    franjaPreferida: franja(m),
    distanciaMaxKm: distancia(m),
    notificacionesActivas: m.notificacionesActivas === true,
    registradoEnISO: texto(m, "registradoEnISO") ?? user.created_at,
    puestoEspera: typeof m.puestoEspera === "number" ? m.puestoEspera : PUESTO_INICIAL,
    fechaNacimiento: texto(m, "fechaNacimiento"),
    ciudad: texto(m, "ciudad"),
    eps: texto(m, "eps"),
    ...local,
    // La base gana en las columnas que tiene (un NULL borra el valor local).
    ...remoto,
    ...camposListaEspera(lista),
    id: user.id,
    email,
  };
  await guardarPerfil(paciente);
  return paciente;
}

async function guardarPerfil(paciente: Paciente) {
  const perfiles = await leerMapa(KEY_PERFILES);
  perfiles[paciente.id] = paciente;
  await AsyncStorage.setItem(KEY_PERFILES, JSON.stringify(perfiles));
}

// — Rol: paciente o staff del consultorio —

/**
 * El rol lo asigna el servidor en `app_metadata.rol` (la app no puede
 * escribirlo). Solo decide qué navegación se muestra: los permisos reales
 * los imponen RLS y las RPC del staff.
 */
export function esUsuarioStaff(user: Pick<User, "app_metadata"> | null | undefined): boolean {
  return user?.app_metadata?.rol === "staff";
}

/** Sesión abierta: un paciente o un miembro del staff, nunca ambos. */
export type SesionApp = { paciente: Paciente; staff: null } | { paciente: null; staff: PerfilStaff };

async function perfilStaffDe(user: User): Promise<PerfilStaff> {
  const email = user.email ?? "";
  try {
    return (await getPerfilStaff(email)) ?? { nombre: "", email, consultorios: [] };
  } catch (e) {
    // Sin red: el panel se abre igual y muestra su propio estado de error al cargar.
    console.warn(`[staff] No se pudo leer el perfil del staff. ${String(e)}`);
    return { nombre: "", email, consultorios: [] };
  }
}

async function sesionDeUsuario(user: User): Promise<SesionApp> {
  if (esUsuarioStaff(user)) return { paciente: null, staff: await perfilStaffDe(user) };
  return { paciente: await pacienteDeUsuario(user), staff: null };
}

/** Usuario de la sesión de Supabase guardada en el teléfono, o null. */
async function usuarioGuardado(): Promise<User | null> {
  await limpiarCuentasLegado();
  try {
    const { data, error } = await getSupabase().auth.getSession();
    if (error || !data.session) return null;
    return data.session.user;
  } catch {
    // Sin conexión o sin configurar Supabase: se muestra el acceso.
    return null;
  }
}

/** Paciente con sesión abierta en este dispositivo (sesión de Supabase restaurada), o null. */
export async function getSesion(): Promise<Paciente | null> {
  const user = await usuarioGuardado();
  return user && !esUsuarioStaff(user) ? pacienteDeUsuario(user) : null;
}

/** Sesión restaurada con su rol (paciente o staff), o null. */
export async function getSesionApp(): Promise<SesionApp | null> {
  const user = await usuarioGuardado();
  return user ? sesionDeUsuario(user) : null;
}

async function ingresar(email: string, password: string): Promise<User> {
  if (!email.trim()) throw new AuthError(tr("errores.ingresaCorreo"), "email");
  if (!password) throw new AuthError(tr("errores.ingresaPassword"), "password");
  const { data, error } = await getSupabase().auth.signInWithPassword({ email: normalizarEmail(email), password });
  if (error || !data.user) {
    if (error?.code === "email_not_confirmed") throw new AuthError(tr("errores.correoSinConfirmar"), "email");
    if (error && error.code !== "invalid_credentials") throw new AuthError(tr("login.error"));
    throw new AuthError(tr("errores.credenciales"), "password");
  }
  await biometria.alIngresarConCorreo(data.user.email ?? normalizarEmail(email));
  return data.user;
}

export async function iniciarSesion(email: string, password: string): Promise<Paciente> {
  return pacienteDeUsuario(await ingresar(email, password));
}

/** Inicia sesión y devuelve el rol: la app abre la app del paciente o el panel del staff. */
export async function iniciarSesionApp(email: string, password: string): Promise<SesionApp> {
  return sesionDeUsuario(await ingresar(email, password));
}

/**
 * Ingreso con biometría: renueva la sesión de Supabase con el refresh
 * token guardado (biometriaService). La app nunca guarda la contraseña.
 */
export async function iniciarSesionBiometricaApp(): Promise<SesionApp> {
  return sesionDeUsuario(await biometria.ingresar());
}

/** Cierra la sesión en Supabase y borra el ingreso biométrico guardado. */
export async function cerrarSesion(): Promise<void> {
  await biometria.alCerrarSesion();
  await getSupabase().auth.signOut();
}

export async function introVista(): Promise<boolean> {
  return (await AsyncStorage.getItem(KEY_INTRO)) === "1";
}

export async function marcarIntroVista(): Promise<void> {
  await AsyncStorage.setItem(KEY_INTRO, "1");
}

// — Restablecer contraseña —

/**
 * «¿Olvidaste tu contraseña?»: Supabase Auth envía un código de 6 dígitos
 * al correo. Por privacidad responde igual exista o no la cuenta. El código
 * no se conoce en la app: devuelve "" (no hay código de prueba que mostrar).
 */
export async function solicitarRestablecimiento(email: string): Promise<string> {
  if (!validarEmail(email)) throw new AuthError(tr("errores.correoValido"), "email");
  await getSupabase().auth.resetPasswordForEmail(normalizarEmail(email));
  return "";
}

/**
 * Verifica el código del correo y cambia la contraseña en Supabase Auth.
 * Después cierra esa sesión de recuperación, así el paciente vuelve al
 * inicio de sesión con su contraseña nueva, como hasta ahora.
 */
export async function restablecerPassword(email: string, codigo: string, nueva: string): Promise<void> {
  const errorPassword = validarPassword(nueva);
  if (errorPassword) throw new AuthError(errorPassword, "password");
  const supabase = getSupabase();
  const { error } = await supabase.auth.verifyOtp({ email: normalizarEmail(email), token: codigo, type: "recovery" });
  if (error) throw new AuthError(tr("errores.codigo"), "codigo");
  const cambio = await supabase.auth.updateUser({ password: nueva });
  await supabase.auth.signOut();
  if (cambio.error) throw new AuthError(tr("errores.passwordMinimo"), "password");
}

// — Registro —

export interface DatosCuenta {
  nombre: string;
  apellido: string;
  cedula: string;
  email: string;
  telefono: string;
  password: string;
}

export interface PreferenciasCupo {
  especialidadesInteres: string[];
  franjaPreferida: FranjaHoraria;
  distanciaMaxKm: DistanciaMaxima;
}

export function validarEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

/** Mismo criterio en el registro y al restablecer la contraseña. */
export function validarPassword(password: string): string | undefined {
  if (password.length < 8 || !/\d/.test(password)) return tr("errores.passwordMinimo");
}

/**
 * Formato con que la base guarda la cédula: el CHECK `pacientes_cedula_check`
 * del proyecto exige `^[0-9]{6,10}$`. Si la cédula no lo cumple, el trigger de
 * registro falla y Supabase no crea la cuenta.
 */
export const FORMATO_CEDULA_BASE = /^[0-9]{6,10}$/;

/** Solo los dígitos de la cédula (la misma normalización que hace el trigger de registro). */
export function normalizarCedula(cedula: string): string {
  return cedula.replace(/[^0-9]/g, "");
}

/** Cédula escrita con dígitos y, opcionalmente, puntos o espacios, que queda en 6 a 10 dígitos. */
export function cedulaValida(cedula: string): boolean {
  return !/[^0-9.\s]/.test(cedula) && FORMATO_CEDULA_BASE.test(normalizarCedula(cedula));
}

/** Validación del paso 1. Devuelve un mensaje por campo con error. */
export function validarDatosCuenta(d: DatosCuenta): Partial<Record<keyof DatosCuenta, string>> {
  const errores: Partial<Record<keyof DatosCuenta, string>> = {};
  if (!d.nombre.trim()) errores.nombre = tr("errores.nombre");
  if (!d.apellido.trim()) errores.apellido = tr("errores.apellido");
  if (!cedulaValida(d.cedula)) errores.cedula = tr("errores.cedula");
  if (!validarEmail(d.email)) errores.email = tr("errores.revisaCorreo");
  if (d.telefono.replace(/\D/g, "").length < 8) errores.telefono = tr("errores.telefono");
  const errorPassword = validarPassword(d.password);
  if (errorPassword) errores.password = errorPassword;
  return errores;
}

/**
 * Comprobación previa (paso 1) de que el correo y la cédula no estén
 * registrados. Con Supabase no se puede consultar desde la app sin exponer
 * datos de otros pacientes: necesita una función RPC segura en la base
 * (pendiente). Mientras tanto, los duplicados se detectan al crear la cuenta
 * (`crearCuenta`: correo por Supabase Auth, cédula por la restricción única
 * de `pacientes`).
 */
export async function verificarDisponibilidad(_d: Pick<DatosCuenta, "email" | "cedula">): Promise<void> {}

let codigoPendiente: { telefono: string; codigo: string } | null = null;

/**
 * Envía el código de verificación por SMS. Simulado: se genera acá y se
 * devuelve para poder mostrarlo en desarrollo; la API real solo lo enviaría.
 */
export async function enviarCodigo(telefono: string): Promise<string> {
  const codigo = String(Math.floor(100000 + Math.random() * 900000));
  codigoPendiente = { telefono, codigo };
  return codigo;
}

export async function crearCuenta(
  datos: DatosCuenta,
  preferencias: PreferenciasCupo,
  opciones: { codigo: string; notificacionesActivas: boolean }
): Promise<Paciente> {
  if (!codigoPendiente || codigoPendiente.telefono !== datos.telefono || codigoPendiente.codigo !== opciones.codigo) {
    throw new AuthError(tr("errores.codigo"), "codigo");
  }
  // Nunca se llama a signUp con datos sin validar: aunque el paso 1 ya los
  // validó, un borrador incompleto o desactualizado mandaría al trigger una
  // cédula que la base rechaza (pacientes_cedula_check) y la cuenta no se crea.
  const errores = validarDatosCuenta(datos);
  const campoConError = (Object.keys(errores) as (keyof DatosCuenta)[])[0];
  if (campoConError) throw new AuthError(errores[campoConError]!, campoConError);
  const supabase = getSupabase();
  const ahora = new Date().toISOString();
  const cedula = normalizarCedula(datos.cedula);
  const { data, error } = await supabase.auth.signUp({
    email: normalizarEmail(datos.email),
    password: datos.password,
    options: {
      // Datos del registro (nunca la contraseña): los usa la app y el trigger
      // que crea la fila de `pacientes`. Ese trigger ignora puestoEspera,
      // registradoEnISO y aceptoTerminosEn y usa valores del servidor.
      data: {
        nombre: datos.nombre.trim(),
        apellido: datos.apellido.trim(),
        cedula,
        telefono: datos.telefono.trim(),
        ...preferencias,
        notificacionesActivas: opciones.notificacionesActivas,
        registradoEnISO: ahora,
        aceptoTerminosEn: ahora,
        puestoEspera: PUESTO_INICIAL,
      },
    },
  });
  if (error) {
    if (error.code === "user_already_exists" || error.code === "email_exists") {
      throw new AuthError(tr("errores.correoExiste"), "email");
    }
    if (error.code === "weak_password") throw new AuthError(tr("errores.passwordMinimo"), "password");
    // El trigger crea `pacientes` en la misma transacción que el usuario: si
    // lo rechaza, Supabase no crea la cuenta y responde con este error
    // genérico. Los demás datos ya se validaron en el paso 1, así que la
    // causa esperable es la cédula repetida (restricción única). Provisorio
    // hasta tener la RPC `cedula_disponible`.
    if (/database error saving new user/i.test(error.message)) {
      throw new AuthError(tr("errores.cedulaExiste"), "cedula");
    }
    throw new AuthError(tr("registro.error"));
  }
  // Con confirmación de correo activa, un correo ya registrado vuelve sin identidades.
  if (data.user && data.user.identities?.length === 0) throw new AuthError(tr("errores.correoExiste"), "email");
  if (!data.user) throw new AuthError(tr("registro.error"));
  codigoPendiente = null;
  // Cuenta creada (y su paciente, por el trigger). Sin sesión, el proyecto
  // pide confirmar el correo antes del primer ingreso.
  if (!data.session) throw new ConfirmacionCorreoPendiente();

  return pacienteDeUsuario(data.user);
}

/**
 * Actualiza preferencias u otros datos del paciente con sesión abierta. Las
 * columnas de `public.pacientes` se guardan en Supabase y las especialidades
 * se sincronizan con la lista de espera (`solicitudes_espera`); el perfil
 * local se guarda siempre (tiene además la foto). Si Supabase falla (p. ej.
 * sin red), el cambio queda en el teléfono.
 */
export async function actualizarPaciente(email: string, cambios: Partial<Paciente>): Promise<Paciente> {
  const perfiles = await leerMapa(KEY_PERFILES);
  const actual = Object.values(perfiles).find((p) => p.email === email);
  if (!actual) throw new AuthError(tr("errores.sinCuenta"));
  try {
    await actualizarPacienteRemoto(actual.id, cambios);
  } catch (e) {
    console.warn(`[pacientes] No se pudo guardar el perfil en Supabase; queda en el teléfono. ${String(e)}`);
  }
  let lista: ResumenListaEspera | null = null;
  if (cambios.especialidadesInteres) {
    try {
      await sincronizarListaEspera(cambios.especialidadesInteres);
      lista = await getResumenListaEspera(actual.id);
    } catch (e) {
      console.warn(`[lista de espera] No se pudo actualizar en Supabase; queda en el teléfono. ${String(e)}`);
    }
  }
  const paciente: Paciente = { ...actual, ...cambios, ...camposListaEspera(lista), email: actual.email, id: actual.id };
  await guardarPerfil(paciente);
  return paciente;
}
