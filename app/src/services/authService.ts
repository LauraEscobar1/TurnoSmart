import AsyncStorage from "@react-native-async-storage/async-storage";
import type { User } from "@supabase/supabase-js";
import { DistanciaMaxima, FranjaHoraria, Paciente } from "@/types/domain";
import { getSupabase } from "@/services/supabaseClient";
import { tr } from "@/i18n";

/**
 * Capa de servicio de cuentas y sesión, sobre Supabase Auth.
 *
 * - Las credenciales y la sesión las maneja solo Supabase Auth (la sesión
 *   la guarda el cliente de Supabase en AsyncStorage; nunca la contraseña).
 * - El perfil del paciente todavía vive en el teléfono (`ts.perfiles`, por
 *   id de usuario, sin contraseña) y en `user_metadata`, hasta migrar la
 *   lectura y edición de `public.pacientes` en el próximo paso.
 * - La fila de `public.pacientes` la crea la base al registrarse (trigger
 *   sobre `auth.users`, supabase/migrations), con el mismo id del usuario
 *   de Auth y a partir de `options.data`. La app nunca inserta en `pacientes`.
 */

/** Perfiles locales por id de usuario de Supabase (sin credenciales). */
const KEY_PERFILES = "ts.perfiles";
/** Último correo que inició sesión: habilita «Ingresar con Face ID». */
const KEY_ULTIMO = "ts.ultimoUsuario";
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

/** Paciente de la app a partir del usuario de Auth y su perfil local. */
async function pacienteDeUsuario(user: User): Promise<Paciente> {
  const m: Metadatos = user.user_metadata ?? {};
  const email = user.email ?? "";
  const perfiles = await leerMapa(KEY_PERFILES);
  // Primer ingreso con Supabase: se rescata el perfil de la versión local, si había.
  const local: Partial<Paciente> = perfiles[user.id] ?? (await leerMapa(KEY_PERFILES_LEGADO))[email] ?? {};
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

/** Paciente con sesión abierta en este dispositivo (sesión de Supabase restaurada), o null. */
export async function getSesion(): Promise<Paciente | null> {
  await limpiarCuentasLegado();
  try {
    const { data, error } = await getSupabase().auth.getSession();
    if (error || !data.session) return null;
    return pacienteDeUsuario(data.session.user);
  } catch {
    // Sin conexión o sin configurar Supabase: se muestra el acceso.
    return null;
  }
}

export async function iniciarSesion(email: string, password: string): Promise<Paciente> {
  if (!email.trim()) throw new AuthError(tr("errores.ingresaCorreo"), "email");
  if (!password) throw new AuthError(tr("errores.ingresaPassword"), "password");
  const { data, error } = await getSupabase().auth.signInWithPassword({ email: normalizarEmail(email), password });
  if (error || !data.user) {
    if (error?.code === "email_not_confirmed") throw new AuthError(tr("errores.correoSinConfirmar"), "email");
    if (error && error.code !== "invalid_credentials") throw new AuthError(tr("login.error"));
    throw new AuthError(tr("errores.credenciales"), "password");
  }
  await AsyncStorage.setItem(KEY_ULTIMO, data.user.email ?? normalizarEmail(email));
  return pacienteDeUsuario(data.user);
}

/** Correo del último paciente que ingresó (para ingresar con biometría). */
export async function getUltimoUsuario(): Promise<string | null> {
  return AsyncStorage.getItem(KEY_ULTIMO);
}

/**
 * Tras validar la biometría del sistema, retoma la sesión de Supabase que
 * sigue guardada en el teléfono. Sin sesión guardada (p. ej. después de
 * cerrar sesión) hay que ingresar con correo y contraseña: la app nunca
 * guarda la contraseña para reingresar sola.
 */
export async function iniciarSesionBiometrica(): Promise<Paciente> {
  const email = await getUltimoUsuario();
  const { data } = await getSupabase().auth.getSession();
  const user = data.session?.user;
  if (!email || !user || user.email !== email) throw new AuthError(tr("errores.faceIdPrimeraVez"));
  return pacienteDeUsuario(user);
}

export async function cerrarSesion(): Promise<void> {
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

/** Validación del paso 1. Devuelve un mensaje por campo con error. */
export function validarDatosCuenta(d: DatosCuenta): Partial<Record<keyof DatosCuenta, string>> {
  const errores: Partial<Record<keyof DatosCuenta, string>> = {};
  if (!d.nombre.trim()) errores.nombre = tr("errores.nombre");
  if (!d.apellido.trim()) errores.apellido = tr("errores.apellido");
  if (!/^\d{6,10}$/.test(d.cedula.replace(/\D/g, "")) || /[^\d.\s]/.test(d.cedula)) {
    errores.cedula = tr("errores.cedula");
  }
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
  const supabase = getSupabase();
  const ahora = new Date().toISOString();
  const cedula = datos.cedula.replace(/\D/g, "");
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
  // TEMPORAL (diagnóstico del registro): respuesta de signUp sin contraseñas ni tokens.
  if (error) {
    console.error("[registro] signUp error:", error);
    console.error("[registro] error.message:", error.message);
    console.error("[registro] error.name:", error.name);
    console.error("[registro] error.status:", error.status);
    console.error("[registro] error.code:", error.code);
  } else {
    console.error("[registro] signUp ok:", {
      hayUser: Boolean(data.user),
      userId: data.user?.id,
      haySession: Boolean(data.session),
      email: data.user?.email,
    });
  }
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

  await AsyncStorage.setItem(KEY_ULTIMO, data.user.email ?? normalizarEmail(datos.email));
  return pacienteDeUsuario(data.user);
}

/**
 * Actualiza preferencias u otros datos del paciente con sesión abierta.
 * Por ahora en el perfil local del teléfono; escribir en `public.pacientes`
 * es el próximo paso de la migración.
 */
export async function actualizarPaciente(email: string, cambios: Partial<Paciente>): Promise<Paciente> {
  const perfiles = await leerMapa(KEY_PERFILES);
  const actual = Object.values(perfiles).find((p) => p.email === email);
  if (!actual) throw new AuthError(tr("errores.sinCuenta"));
  const paciente: Paciente = { ...actual, ...cambios, email: actual.email, id: actual.id };
  await guardarPerfil(paciente);
  return paciente;
}
