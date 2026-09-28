import { CUENTA_DEMO, pacienteDemo } from "@/data/mockData";

/**
 * Supabase falso, en memoria, para las pruebas (reemplaza a
 * src/services/supabaseClient.ts en jest.setup.js). Imita solo lo que usa
 * la app: Auth (correo + contraseña, códigos de recuperación, sesión,
 * confirmación de correo opcional), el trigger de la base que crea la fila
 * de `pacientes` al registrarse, y la lectura/actualización de esa fila con
 * las mismas reglas que RLS (cada paciente, solo la suya). No toca la red.
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
/** Tablas en las que la app intentó un INSERT (en `pacientes` lo hace solo el trigger). */
export let insertsIntentados: string[] = [];
/** Simula que Supabase no responde (p. ej. sin red) al leer o escribir `pacientes`. */
let pacientesCaido = false;

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
  insertsIntentados = [];
  pacientesCaido = false;
  const { id: _id, email: _email, registradoEnISO, ...perfil } = pacienteDemo;
  const demo = crearUsuario(CUENTA_DEMO.email, CUENTA_DEMO.password, perfil, { creado: registradoEnISO });
  // La cuenta demo ya completó ciudad y EPS en su perfil de la base.
  const fila = demo && filaPacienteFalsa(demo.id);
  if (fila) Object.assign(fila, { registrado_en: registradoEnISO, ciudad: pacienteDemo.ciudad, eps: pacienteDemo.eps });
}
reiniciarSupabaseFalso();

/** La fila de `pacientes` de un usuario, tal como está en la base falsa (para preparar o revisar datos). */
export function filaPacienteFalsa(id: string): Record<string, unknown> | undefined {
  return pacientesCreados.find((p) => p.id === id);
}

/** Id del usuario de Auth con ese correo. */
export function idUsuarioFalso(email: string): string | undefined {
  return usuarios.find((u) => u.email === email)?.id;
}

/** Crea un usuario confirmado (y su fila de `pacientes`, como el trigger), sin abrir sesión. */
export function registrarUsuarioFalso(email: string, password: string, metadata: Record<string, unknown>) {
  return crearUsuario(email, password, metadata)?.id;
}

/** Hace que las lecturas y escrituras de `pacientes` fallen como sin conexión. */
export function simularPacientesCaido(activo: boolean) {
  pacientesCaido = activo;
}

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

const errorRed = { code: "", message: "TypeError: Network request failed", details: null };

/**
 * `pacientes` con las reglas de RLS del proyecto real: SELECT y UPDATE solo
 * de la fila propia (`id = auth.uid()`); sin INSERT desde el cliente (lo
 * hace el trigger). Con RLS, una fila ajena no da error: simplemente no
 * aparece (SELECT) o no cambia (UPDATE).
 */
function from(tabla: string) {
  tablasConsultadas.push(tabla);
  const propia = (columna: string, valor: unknown) =>
    tabla === "pacientes" && columna === "id" && sesion !== null && valor === sesion.user.id
      ? filaPacienteFalsa(sesion.user.id)
      : undefined;
  return {
    async insert(_fila: Record<string, unknown>) {
      insertsIntentados.push(tabla);
      return { data: null, error: { code: "42501", message: "permission denied", details: null } };
    },
    select(columnas: string) {
      return {
        eq(columna: string, valor: unknown) {
          return {
            async maybeSingle() {
              if (pacientesCaido) return { data: null, error: errorRed };
              const fila = propia(columna, valor);
              if (!fila) return { data: null, error: null };
              const lista = columnas.split(",").map((c) => c.trim());
              return { data: Object.fromEntries(lista.map((c) => [c, fila[c] ?? null])), error: null };
            },
          };
        },
      };
    },
    update(cambios: Record<string, unknown>) {
      return {
        async eq(columna: string, valor: unknown) {
          if (pacientesCaido) return { data: null, error: errorRed };
          const fila = propia(columna, valor);
          if (fila) Object.assign(fila, cambios);
          return { data: null, error: null };
        },
      };
    },
  };
}

const cliente = { auth, from };

export const supabaseConfigurado = true;
export function getSupabase() {
  return cliente;
}
