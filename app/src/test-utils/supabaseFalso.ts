import { CUENTA_DEMO, pacienteDemo } from "@/data/mockData";

/**
 * Supabase falso, en memoria, para las pruebas (reemplaza a
 * src/services/supabaseClient.ts en jest.setup.js). Imita solo lo que usa
 * authService: Auth (correo + contraseña, códigos de recuperación, sesión,
 * confirmación de correo opcional) y el trigger de la base que crea la
 * fila de `pacientes` al registrarse. No toca la red.
 */
interface UsuarioFalso {
  id: string;
  email: string;
  password: string;
  created_at: string;
  user_metadata: Record<string, unknown>;
  identities: { id: string }[];
  confirmado: boolean;
}
type Evento = "SIGNED_IN" | "SIGNED_OUT" | "USER_UPDATED";
type Oyente = (evento: Evento, sesion: { user: UsuarioFalso } | null) => void;

const errorAuth = (code: string, message = code, status = 400) => ({ code, message, name: "AuthApiError", status });

let usuarios: UsuarioFalso[] = [];
let sesion: { user: UsuarioFalso } | null = null;
let oyentes: Oyente[] = [];
let codigosRecuperacion: Record<string, string> = {};
/** «Confirm email» de Supabase Auth: si está activo, signUp no devuelve sesión. */
let pedirConfirmacion = false;
/** Filas de `public.pacientes` creadas por el trigger `crear_paciente_desde_auth`. */
export let pacientesCreados: Record<string, unknown>[] = [];
/** Tablas que la app intentó usar directamente con `from(...)`. */
export let tablasConsultadas: string[] = [];

function emitir(evento: Evento) {
  oyentes.forEach((o) => o(evento, sesion));
}

/**
 * Imita el trigger sobre `auth.users`: arma la fila de `pacientes` con los
 * datos del registro y valores del servidor. Devuelve null si la cédula ya
 * existe (restricción única), y entonces no se crea el usuario.
 */
function filaPaciente(id: string, email: string, m: Record<string, unknown>) {
  if (pacientesCreados.some((p) => p.cedula === m.cedula)) return null;
  const ahora = new Date().toISOString();
  return {
    id,
    nombre: m.nombre,
    apellido: m.apellido,
    cedula: m.cedula,
    email,
    telefono: m.telefono,
    franja_preferida: m.franjaPreferida,
    distancia_max_km: m.distanciaMaxKm ?? null,
    notificaciones_activas: m.notificacionesActivas,
    registrado_en: ahora,
    acepto_terminos_en: ahora,
  };
}

function crearUsuario(
  email: string,
  password: string,
  metadata: Record<string, unknown>,
  { creado = new Date().toISOString(), confirmado = true } = {}
) {
  const id = `00000000-0000-4000-8000-${String(usuarios.length + 1).padStart(12, "0")}`;
  const paciente = filaPaciente(id, email, metadata);
  if (!paciente) return null;
  const user: UsuarioFalso = { id, email, password, created_at: creado, user_metadata: metadata, identities: [{ id }], confirmado };
  usuarios.push(user);
  pacientesCreados.push(paciente);
  return user;
}

/** Estado inicial: solo la cuenta demo, sin sesión y sin confirmación de correo. */
export function reiniciarSupabaseFalso() {
  usuarios = [];
  sesion = null;
  oyentes = [];
  codigosRecuperacion = {};
  pedirConfirmacion = false;
  pacientesCreados = [];
  tablasConsultadas = [];
  const { id: _id, email: _email, registradoEnISO, ...perfil } = pacienteDemo;
  crearUsuario(CUENTA_DEMO.email, CUENTA_DEMO.password, perfil, { creado: registradoEnISO });
}
reiniciarSupabaseFalso();

/** Activa o desactiva «Confirm email» en el proyecto falso. */
export function pedirConfirmacionDeCorreo(activo: boolean) {
  pedirConfirmacion = activo;
}

/** El paciente abre el enlace de confirmación que le llegó por correo. */
export function confirmarCorreoFalso(email: string) {
  const user = usuarios.find((u) => u.email === email);
  if (user) user.confirmado = true;
}

/** Deja abierta la sesión de un usuario, como si la hubiera restaurado Supabase. */
export function abrirSesionFalsa(email: string) {
  const user = usuarios.find((u) => u.email === email);
  sesion = user ? { user } : null;
}

/** El código que Supabase habría enviado por correo para restablecer la contraseña. */
export function codigoRecuperacionFalso(email: string) {
  return codigosRecuperacion[email] ?? "";
}

const auth = {
  async getSession() {
    return { data: { session: sesion }, error: null };
  },
  async signInWithPassword({ email, password }: { email: string; password: string }) {
    const user = usuarios.find((u) => u.email === email && u.password === password);
    if (!user) return { data: { user: null, session: null }, error: errorAuth("invalid_credentials") };
    if (!user.confirmado) return { data: { user: null, session: null }, error: errorAuth("email_not_confirmed") };
    sesion = { user };
    emitir("SIGNED_IN");
    return { data: { user, session: sesion }, error: null };
  },
  async signUp({ email, password, options }: { email: string; password: string; options?: { data?: Record<string, unknown> } }) {
    const existente = usuarios.find((u) => u.email === email);
    if (existente) {
      // Con confirmación activa, Supabase no revela el correo: devuelve un usuario sin identidades.
      if (pedirConfirmacion) return { data: { user: { ...existente, identities: [] }, session: null }, error: null };
      return { data: { user: null, session: null }, error: errorAuth("user_already_exists") };
    }
    const user = crearUsuario(email, password, options?.data ?? {}, { confirmado: !pedirConfirmacion });
    if (!user) {
      // El trigger rechazó el INSERT en `pacientes`: Supabase no crea el usuario.
      return {
        data: { user: null, session: null },
        error: errorAuth("unexpected_failure", "Database error saving new user", 500),
      };
    }
    if (pedirConfirmacion) return { data: { user, session: null }, error: null };
    sesion = { user };
    emitir("SIGNED_IN");
    return { data: { user, session: sesion }, error: null };
  },
  async signOut() {
    sesion = null;
    emitir("SIGNED_OUT");
    return { error: null };
  },
  async resetPasswordForEmail(email: string) {
    if (usuarios.some((u) => u.email === email)) {
      codigosRecuperacion[email] = String(Math.floor(100000 + Math.random() * 900000));
    }
    return { data: {}, error: null };
  },
  async verifyOtp({ email, token }: { email: string; token: string; type: string }) {
    const user = usuarios.find((u) => u.email === email);
    if (!user || codigosRecuperacion[email] !== token) return { data: { user: null, session: null }, error: errorAuth("otp_expired") };
    delete codigosRecuperacion[email];
    sesion = { user };
    emitir("SIGNED_IN");
    return { data: { user, session: sesion }, error: null };
  },
  async updateUser({ password }: { password?: string }) {
    if (!sesion) return { data: { user: null }, error: errorAuth("session_not_found") };
    if (password) sesion.user.password = password;
    emitir("USER_UPDATED");
    return { data: { user: sesion.user }, error: null };
  },
  onAuthStateChange(oyente: Oyente) {
    oyentes.push(oyente);
    return { data: { subscription: { unsubscribe: () => (oyentes = oyentes.filter((o) => o !== oyente)) } } };
  },
  startAutoRefresh() {},
  stopAutoRefresh() {},
};

/**
 * La app todavía no lee ni escribe tablas: solo se registra el intento. En
 * `pacientes` el cliente no tiene INSERT (RLS), igual que en el proyecto real.
 */
function from(tabla: string) {
  tablasConsultadas.push(tabla);
  const rechazo = { data: null, error: { code: "42501", message: "permission denied", details: null } };
  return {
    async insert(_fila: Record<string, unknown>) {
      return rechazo;
    },
  };
}

const cliente = { auth, from };

export const supabaseConfigurado = true;
export function getSupabase() {
  return cliente;
}
