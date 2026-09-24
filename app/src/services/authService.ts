import AsyncStorage from "@react-native-async-storage/async-storage";
import { DistanciaMaxima, FranjaHoraria, Paciente } from "@/types/domain";
import { CUENTA_DEMO, pacienteDemo } from "@/data/mockData";

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

async function leerCuentas(): Promise<Cuenta[]> {
  const raw = await AsyncStorage.getItem(KEY_CUENTAS);
  if (raw) return JSON.parse(raw);
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
  if (!email.trim()) throw new AuthError("Ingresá tu correo electrónico.", "email");
  if (!password) throw new AuthError("Ingresá tu contraseña.", "password");
  const cuenta = (await leerCuentas()).find((c) => c.paciente.email === normalizarEmail(email));
  if (!cuenta || cuenta.password !== password) {
    throw new AuthError("El correo o la contraseña no coinciden.", "password");
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
  if (!cuenta) throw new AuthError("Ingresá una vez con tu correo para activar Face ID.");
  return abrirSesion(cuenta.paciente);
}

export async function cerrarSesion(): Promise<void> {
  await AsyncStorage.removeItem(KEY_SESION);
}

/** Correo que se usa en «¿Olvidaste tu contraseña?». */
export async function recuperarPassword(email: string): Promise<void> {
  if (!validarEmail(email)) throw new AuthError("Ingresá tu correo para recuperar la contraseña.", "email");
  // La API enviaría el enlace; por privacidad no se revela si la cuenta existe.
}

// — Registro —

export interface DatosCuenta {
  nombre: string;
  apellido: string;
  dni: string;
  email: string;
  telefono: string;
  password: string;
}

export interface PreferenciasCupo {
  especialidadesInteres: string[];
  franjaPreferida: FranjaHoraria;
  distanciaMaxKm: DistanciaMaxima;
  obraSocial: string;
}

export function validarEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

/** Validación del paso 1. Devuelve un mensaje por campo con error. */
export function validarDatosCuenta(d: DatosCuenta): Partial<Record<keyof DatosCuenta, string>> {
  const errores: Partial<Record<keyof DatosCuenta, string>> = {};
  if (!d.nombre.trim()) errores.nombre = "Ingresá tu nombre.";
  if (!d.apellido.trim()) errores.apellido = "Ingresá tu apellido.";
  if (!/^\d{7,8}$/.test(d.dni.replace(/\D/g, "")) || /[^\d.\s]/.test(d.dni)) errores.dni = "El DNI tiene 7 u 8 números.";
  if (!validarEmail(d.email)) errores.email = "Revisá el correo electrónico.";
  if (d.telefono.replace(/\D/g, "").length < 8) errores.telefono = "Ingresá un teléfono con código de área.";
  if (d.password.length < 8 || !/\d/.test(d.password)) errores.password = "Mínimo 8 caracteres, un número.";
  return errores;
}

/** Comprueba que el correo y el DNI no estén ya registrados. */
export async function verificarDisponibilidad(d: Pick<DatosCuenta, "email" | "dni">): Promise<void> {
  const cuentas = await leerCuentas();
  if (cuentas.some((c) => c.paciente.email === normalizarEmail(d.email))) {
    throw new AuthError("Ya existe una cuenta con este correo.", "email");
  }
  const dni = d.dni.replace(/\D/g, "");
  if (cuentas.some((c) => c.paciente.dni === dni)) {
    throw new AuthError("Ya existe una cuenta con este DNI.", "dni");
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
    throw new AuthError("El código no es correcto.", "codigo");
  }
  await verificarDisponibilidad(datos);
  const cuentas = await leerCuentas();
  const paciente: Paciente = {
    id: `p-${Date.now()}`,
    nombre: datos.nombre.trim(),
    apellido: datos.apellido.trim(),
    dni: datos.dni.replace(/\D/g, ""),
    email: normalizarEmail(datos.email),
    telefono: datos.telefono.trim(),
    ...preferencias,
    obraSocial: preferencias.obraSocial.trim(),
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
  if (!cuenta) throw new AuthError("No encontramos tu cuenta.");
  cuenta.paciente = { ...cuenta.paciente, ...cambios, email: cuenta.paciente.email, id: cuenta.paciente.id };
  await guardarCuentas(cuentas);
  return cuenta.paciente;
}
