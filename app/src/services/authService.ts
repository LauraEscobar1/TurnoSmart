import AsyncStorage from "@react-native-async-storage/async-storage";
import { DistanciaMaxima, FranjaHoraria, Paciente } from "@/types/domain";
import { CUENTA_DEMO, pacienteDemo } from "@/data/mockData";
import { tr } from "@/i18n";

/**
 * Capa de servicio de cuentas y sesión.
 *
 * Hoy simula la API guardando las cuentas en AsyncStorage del dispositivo
 * (incluida la contraseña, en claro): es SOLO un reemplazo de desarrollo.
 * Cuando exista el backend, estas funciones pasan a llamar a la API y la
 * contraseña nunca se guarda en el teléfono; las firmas no cambian.
 */

const KEY_CUENTAS = "ts.cuentas";
const KEY_SESION = "ts.sesion";
/** Último correo que inició sesión: habilita «Ingresar con Face ID». */
const KEY_ULTIMO = "ts.ultimoUsuario";
/** La intro de 3 pantallas se muestra solo la primera vez. */
const KEY_INTRO = "ts.introVista";

interface Cuenta {
  paciente: Paciente;
  password: string;
}

export class AuthError extends Error {
  constructor(
    message: string,
    /** Campo del formulario al que corresponde el error, si aplica. */
    public campo?: string
  ) {
    super(message);
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

async function leerCuentas(): Promise<Cuenta[]> {
  const raw = await AsyncStorage.getItem(KEY_CUENTAS);
  if (raw) return (JSON.parse(raw) as Cuenta[]).map((c) => ({ ...c, paciente: migrar(c.paciente) }));
  const semilla = [{ paciente: pacienteDemo, password: CUENTA_DEMO.password }];
  await AsyncStorage.setItem(KEY_CUENTAS, JSON.stringify(semilla));
  return semilla;
}

async function guardarCuentas(cuentas: Cuenta[]) {
  await AsyncStorage.setItem(KEY_CUENTAS, JSON.stringify(cuentas));
}

async function abrirSesion(paciente: Paciente) {
  await AsyncStorage.multiSet([
    [KEY_SESION, paciente.email],
    [KEY_ULTIMO, paciente.email],
  ]);
  return paciente;
}

/** Paciente con sesión abierta en este dispositivo, o null. */
export async function getSesion(): Promise<Paciente | null> {
  const email = await AsyncStorage.getItem(KEY_SESION);
  if (!email) return null;
  const cuenta = (await leerCuentas()).find((c) => c.paciente.email === email);
  return cuenta?.paciente ?? null;
}

export async function iniciarSesion(email: string, password: string): Promise<Paciente> {
  if (!email.trim()) throw new AuthError(tr("errores.ingresaCorreo"), "email");
  if (!password) throw new AuthError(tr("errores.ingresaPassword"), "password");
  const cuenta = (await leerCuentas()).find((c) => c.paciente.email === normalizarEmail(email));
  if (!cuenta || cuenta.password !== password) {
    throw new AuthError(tr("errores.credenciales"), "password");
  }
  return abrirSesion(cuenta.paciente);
}

/** Correo del último paciente que ingresó (para ingresar con biometría). */
export async function getUltimoUsuario(): Promise<string | null> {
  return AsyncStorage.getItem(KEY_ULTIMO);
}

/** Abre sesión sin contraseña, una vez que la biometría del sistema ya validó. */
export async function iniciarSesionBiometrica(): Promise<Paciente> {
  const email = await getUltimoUsuario();
  const cuenta = email ? (await leerCuentas()).find((c) => c.paciente.email === email) : undefined;
  if (!cuenta) throw new AuthError(tr("errores.faceIdPrimeraVez"));
  return abrirSesion(cuenta.paciente);
}

export async function cerrarSesion(): Promise<void> {
  await AsyncStorage.removeItem(KEY_SESION);
}

export async function introVista(): Promise<boolean> {
  return (await AsyncStorage.getItem(KEY_INTRO)) === "1";
}

export async function marcarIntroVista(): Promise<void> {
  await AsyncStorage.setItem(KEY_INTRO, "1");
}

// — Restablecer contraseña —

let resetPendiente: { email: string; codigo: string } | null = null;

/**
 * «¿Olvidaste tu contraseña?»: envía un código al correo. Por privacidad
 * responde igual exista o no la cuenta. Simulado como `enviarCodigo`.
 */
export async function solicitarRestablecimiento(email: string): Promise<string> {
  if (!validarEmail(email)) throw new AuthError(tr("errores.correoValido"), "email");
  const codigo = String(Math.floor(100000 + Math.random() * 900000));
  resetPendiente = { email: normalizarEmail(email), codigo };
  return codigo;
}

export async function restablecerPassword(email: string, codigo: string, nueva: string): Promise<void> {
  const errorPassword = validarPassword(nueva);
  if (errorPassword) throw new AuthError(errorPassword, "password");
  const destino = normalizarEmail(email);
  const cuentas = await leerCuentas();
  const cuenta = cuentas.find((c) => c.paciente.email === destino);
  if (!resetPendiente || resetPendiente.email !== destino || resetPendiente.codigo !== codigo || !cuenta) {
    throw new AuthError(tr("errores.codigo"), "codigo");
  }
  cuenta.password = nueva;
  await guardarCuentas(cuentas);
  resetPendiente = null;
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

/** Comprueba que el correo y la cédula no estén ya registrados. */
export async function verificarDisponibilidad(d: Pick<DatosCuenta, "email" | "cedula">): Promise<void> {
  const cuentas = await leerCuentas();
  if (cuentas.some((c) => c.paciente.email === normalizarEmail(d.email))) {
    throw new AuthError(tr("errores.correoExiste"), "email");
  }
  const cedula = d.cedula.replace(/\D/g, "");
  if (cuentas.some((c) => c.paciente.cedula === cedula)) {
    throw new AuthError(tr("errores.cedulaExiste"), "cedula");
  }
}

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
  await verificarDisponibilidad(datos);
  const cuentas = await leerCuentas();
  const paciente: Paciente = {
    id: `p-${Date.now()}`,
    nombre: datos.nombre.trim(),
    apellido: datos.apellido.trim(),
    cedula: datos.cedula.replace(/\D/g, ""),
    email: normalizarEmail(datos.email),
    telefono: datos.telefono.trim(),
    ...preferencias,
    notificacionesActivas: opciones.notificacionesActivas,
    registradoEnISO: new Date().toISOString(),
    puestoEspera: cuentas.length + 11,
  };
  await guardarCuentas([...cuentas, { paciente, password: datos.password }]);
  codigoPendiente = null;
  return abrirSesion(paciente);
}

/** Actualiza preferencias u otros datos del paciente con sesión abierta. */
export async function actualizarPaciente(email: string, cambios: Partial<Paciente>): Promise<Paciente> {
  const cuentas = await leerCuentas();
  const cuenta = cuentas.find((c) => c.paciente.email === email);
  if (!cuenta) throw new AuthError(tr("errores.sinCuenta"));
  cuenta.paciente = { ...cuenta.paciente, ...cambios, email: cuenta.paciente.email, id: cuenta.paciente.id };
  await guardarCuentas(cuentas);
  return cuenta.paciente;
}
