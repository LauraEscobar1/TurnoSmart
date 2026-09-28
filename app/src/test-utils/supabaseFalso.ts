import { CATALOGO_ESPECIALIDADES, citasMock, CUENTA_DEMO, notificacionesMock, ofertasMock, pacienteDemo } from "@/data/mockData";
import { Candidato, Factor, priorizarDeterminista } from "../../../supabase/functions/_shared/priorizacion";

/**
 * Supabase falso, en memoria, para las pruebas (reemplaza a
 * src/services/supabaseClient.ts en jest.setup.js). Representa el backend
 * de supabase/migrations y supabase/functions sin tocar la red:
 *   · Auth (correo + contraseña, recuperación, sesión, confirmación de correo).
 *   · El trigger de registro: crea `pacientes` y las solicitudes de espera.
 *   · Las 11 tablas con las mismas reglas de RLS (cada paciente, solo lo suyo;
 *     catálogos para cualquier paciente autenticado; sin INSERT desde el cliente).
 *   · Las RPC de la app, con la misma semántica que el SQL.
 *   · El trigger `cupos_solicitar_priorizacion` + la Edge Function
 *     `priorizar-cupo`: cuando un cupo queda abierto, el «servidor» lo ofrece
 *     con la MISMA lógica de priorización (supabase/functions/_shared).
 *     Desde la app la función responde 401 (no tiene el secreto).
 *   · `ofertas.score` no se puede leer desde la app (privilegio por columna).
 * La semilla reproduce los datos de ejemplo de la app (src/data/mockData.ts)
 * para la cuenta demo, más tres pacientes que esperan antes que ella.
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
type Fila = Record<string, unknown>;
type ErrorFalso = { code: string; message: string; details: null };
type Resultado<T> = { data: T; error: null } | { data: null; error: ErrorFalso };

const errorAuth = (code: string, message = code, status = 400) => ({ code, message, name: "AuthApiError", status });
const errorRed: ErrorFalso = { code: "", message: "TypeError: Network request failed", details: null };
const errorPg = (code: string, message: string): ErrorFalso => ({ code, message, details: null });
const DIA = 86_400_000;
const hace = (dias: number) => new Date(Date.now() - dias * DIA).toISOString();

let usuarios: UsuarioFalso[] = [];
let sesion: { user: UsuarioFalso } | null = null;
let oyentes: Oyente[] = [];
let codigosRecuperacion: Record<string, string> = {};
/** «Confirm email» de Supabase Auth: si está activo, signUp no devuelve sesión. */
let pedirConfirmacion = false;
/** Filas de `public.pacientes` (las crea el trigger `crear_paciente_desde_auth`). */
export let pacientesCreados: Fila[] = [];
/** Tablas que la app intentó usar directamente con `from(...)`. */
export let tablasConsultadas: string[] = [];
/** Tablas en las que la app intentó un INSERT (el cliente no tiene INSERT en ninguna). */
export let insertsIntentados: string[] = [];
/** RPC llamadas desde la app, en orden. */
export let rpcLlamadas: string[] = [];
let pacientesCaido = false;
let solicitudesCaido = false;
let sinConexion = false;
let secuencia = 0;
const nuevoId = (prefijo: string) => `${prefijo}-${String(++secuencia).padStart(4, "0")}`;

/** Catálogo de `public.especialidades` (id smallint + nombre). */
const especialidadesBase: Fila[] = CATALOGO_ESPECIALIDADES.map((nombre, i) => ({ id: i + 1, nombre }));
let profesionales: Fila[] = [];
let consultorios: Fila[] = [];
let solicitudesEspera: Fila[] = [];
let citas: Fila[] = [];
let cupos: Fila[] = [];
let ofertas: Fila[] = [];
let ofertasFactores: Fila[] = [];
let ofertasEventos: Fila[] = [];
let notificaciones: Fila[] = [];

function emitir(evento: Evento) {
  oyentes.forEach((o) => o(evento, sesion));
}

// ---------------------------------------------------------------------------
// Catálogos
// ---------------------------------------------------------------------------

/** Id de una especialidad del catálogo falso por su nombre. */
export function idEspecialidadFalsa(nombre: string): number {
  const e = especialidadesBase.find((x) => x.nombre === nombre);
  if (!e) throw new Error(`Especialidad desconocida en el fake: ${nombre}`);
  return Number(e.id);
}
const nombreEspecialidad = (id: unknown) => especialidadesBase.find((e) => e.id === id)?.nombre;

function idCatalogo(tabla: Fila[], prefijo: string, nombre: string): string {
  const existente = tabla.find((f) => f.nombre === nombre);
  if (existente) return String(existente.id);
  const id = nuevoId(prefijo);
  tabla.push({ id, nombre });
  return id;
}
const nombreDe = (tabla: Fila[], id: unknown) => tabla.find((f) => f.id === id)?.nombre;

// ---------------------------------------------------------------------------
// Registro (trigger sobre auth.users)
// ---------------------------------------------------------------------------

/**
 * Imita `crear_paciente_desde_auth`: fila de `pacientes` + solicitudes de
 * espera de las especialidades elegidas. Null si la cédula ya existe
 * (uq_pacientes_cedula): entonces no se crea el usuario.
 */
function trigger(id: string, email: string, m: Fila): boolean {
  const cedula = String(m.cedula ?? "").replace(/\D/g, "");
  if (pacientesCreados.some((p) => p.cedula === cedula)) return false;
  const ahora = new Date().toISOString();
  const franja = ["Mañana", "Tarde", "Indistinto"].includes(String(m.franjaPreferida)) ? m.franjaPreferida : "Indistinto";
  pacientesCreados.push({
    id,
    nombre: m.nombre ?? "",
    apellido: m.apellido ?? "",
    cedula,
    email,
    telefono: m.telefono ?? "",
    franja_preferida: franja,
    distancia_max_km: m.distanciaMaxKm === 3 || m.distanciaMaxKm === 10 ? m.distanciaMaxKm : null,
    notificaciones_activas: m.notificacionesActivas === true,
    registrado_en: ahora,
    acepto_terminos_en: ahora,
  });
  const elegidas = Array.isArray(m.especialidadesInteres) ? m.especialidadesInteres : [];
  for (const nombre of elegidas) {
    const e = especialidadesBase.find((x) => x.nombre === nombre);
    if (e) insertarSolicitud(id, Number(e.id), ahora);
  }
  return true;
}

function crearUsuario(
  email: string,
  password: string,
  metadata: Fila,
  { creado = new Date().toISOString(), confirmado = true } = {}
): UsuarioFalso | null {
  const id = `00000000-0000-4000-8000-${String(usuarios.length + 1).padStart(12, "0")}`;
  if (!trigger(id, email, metadata)) return null;
  const user: UsuarioFalso = { id, email, password, created_at: creado, user_metadata: metadata, identities: [{ id }], confirmado };
  usuarios.push(user);
  return user;
}

// ---------------------------------------------------------------------------
// Semilla: la cuenta demo con los datos de ejemplo de la app
// ---------------------------------------------------------------------------

const CLAVES_FACTOR: Record<string, string> = {
  "Tiempo en espera": "tiempo-espera",
  "Tu especialidad": "especialidad",
  "Horario preferido": "horario",
  "Distancia al consultorio": "distancia",
};

function sembrarDemo() {
  const { id: _id, email: _email, registradoEnISO, ...perfil } = pacienteDemo;
  const demo = crearUsuario(CUENTA_DEMO.email, CUENTA_DEMO.password, perfil, { creado: registradoEnISO })!;
  Object.assign(filaPacienteFalsa(demo.id)!, { registrado_en: registradoEnISO, ciudad: pacienteDemo.ciudad, eps: pacienteDemo.eps });
  // Sus solicitudes datan de su alta (34 días).
  solicitudesEspera.filter((s) => s.paciente_id === demo.id).forEach((s) => (s.creada_en = registradoEnISO));

  // Tres pacientes que esperan desde antes: la demo queda 3.ª en Cardiología y 4.ª en Dermatología.
  const esperan = [
    { email: "espera1@correo.com", cedula: "900000001", listas: { Cardiología: 40, Dermatología: 45 } },
    { email: "espera2@correo.com", cedula: "900000002", listas: { Cardiología: 36, Dermatología: 38 } },
    { email: "espera3@correo.com", cedula: "900000003", listas: { Dermatología: 35 } },
  ];
  for (const p of esperan) {
    const u = crearUsuario(p.email, "segura123", {
      nombre: "Paciente",
      apellido: "En espera",
      cedula: p.cedula,
      telefono: "+57 300 000 0000",
      franjaPreferida: "Tarde",
      notificacionesActivas: true,
    })!;
    for (const [especialidad, dias] of Object.entries(p.listas)) {
      insertarSolicitud(u.id, idEspecialidadFalsa(especialidad), hace(dias));
    }
  }

  for (const c of citasMock) {
    citas.push({
      id: c.id,
      paciente_id: demo.id,
      especialidad_id: idEspecialidadFalsa(c.especialidad),
      profesional_id: idCatalogo(profesionales, "prof", c.profesional),
      consultorio_id: idCatalogo(consultorios, "cons", c.consultorio),
      fecha_hora: c.fechaHoraISO,
      estado: c.estado,
      origen: c.origen,
      oferta_id: null,
    });
  }

  for (const o of ofertasMock) {
    const cupoId = `cupo-${o.id}`;
    cupos.push({
      id: cupoId,
      cita_origen_id: o.citaOrigenId,
      especialidad_id: idEspecialidadFalsa(o.especialidad),
      profesional_id: idCatalogo(profesionales, "prof", o.profesional),
      consultorio_id: idCatalogo(consultorios, "cons", o.consultorio),
      fecha_hora: o.fechaHoraISO,
      motivo: "cancelacion",
      estado: o.estado === "pendiente" ? "ofrecido" : o.estado === "aceptada" ? "tomado" : "expirado",
    });
    ofertas.push({
      id: o.id,
      cupo_id: cupoId,
      paciente_id: demo.id,
      estado: o.estado,
      score: 0.8, // interno: nunca llega a la app
      expira_en: o.expiraEnISO,
      creada_en: o.expiraEnISO,
    });
    o.factores.forEach((f, i) =>
      ofertasFactores.push({
        id: nuevoId("fac"),
        oferta_id: o.id,
        clave: CLAVES_FACTOR[f.etiqueta] ?? "compatibilidad",
        etiqueta: f.etiqueta,
        valor: f.valor,
        valor_numerico: null,
        peso: f.peso,
        orden: i + 1,
      })
    );
    evento(o.id, "enviada");
  }

  for (const n of notificacionesMock) {
    notificaciones.push({
      id: n.id,
      paciente_id: demo.id,
      tipo: n.tipo,
      datos: n.datos,
      referencia_id: n.referenciaId ?? null,
      leida: n.leida,
      creada_en: n.fechaISO,
    });
  }
}

/** Estado inicial: la cuenta demo y su entorno, sin sesión, con conexión y sin confirmación de correo. */
export function reiniciarSupabaseFalso() {
  usuarios = [];
  sesion = null;
  oyentes = [];
  codigosRecuperacion = {};
  pedirConfirmacion = false;
  pacientesCreados = [];
  tablasConsultadas = [];
  insertsIntentados = [];
  rpcLlamadas = [];
  cuposPriorizados = [];
  cuposPorPriorizar = [];
  invocacionesDesdeApp = [];
  pacientesCaido = false;
  solicitudesCaido = false;
  sinConexion = false;
  secuencia = 0;
  profesionales = [];
  consultorios = [];
  solicitudesEspera = [];
  citas = [];
  cupos = [];
  ofertas = [];
  ofertasFactores = [];
  ofertasEventos = [];
  notificaciones = [];
  sembrarDemo();
}
reiniciarSupabaseFalso();

// ---------------------------------------------------------------------------
// Helpers para las pruebas
// ---------------------------------------------------------------------------

/** La fila de `pacientes` de un usuario, tal como está en la base falsa. */
export function filaPacienteFalsa(id: string): Fila | undefined {
  return pacientesCreados.find((p) => p.id === id);
}

/** Id del usuario de Auth con ese correo. */
export function idUsuarioFalso(email: string): string | undefined {
  return usuarios.find((u) => u.email === email)?.id;
}

/** Crea un usuario confirmado (y su fila de `pacientes`, como el trigger), sin abrir sesión. */
export function registrarUsuarioFalso(email: string, password: string, metadata: Fila) {
  return crearUsuario(email, password, metadata)?.id;
}

/** Hace que las lecturas y escrituras de `pacientes` fallen como sin conexión. */
export function simularPacientesCaido(activo: boolean) {
  pacientesCaido = activo;
}

/** Hace que leer la lista de espera falle como sin conexión. */
export function simularSolicitudesCaido(activo: boolean) {
  solicitudesCaido = activo;
}

/** Sin conexión: fallan todas las consultas, RPC y funciones (Auth sigue respondiendo). */
export function simularSinConexion(activo: boolean) {
  sinConexion = activo;
}

/** Deja la lista de espera sin solicitudes (para pruebas que parten de cero). */
export function vaciarListasEspera() {
  solicitudesEspera = [];
}

function insertarSolicitud(pacienteId: string, especialidadId: number, creadaEn = new Date().toISOString()): boolean {
  const repetida = solicitudesEspera.some(
    (s) => s.paciente_id === pacienteId && s.especialidad_id === especialidadId && s.estado === "activa"
  );
  if (repetida) return false; // uq_solicitud_espera_activa
  solicitudesEspera.push({
    id: nuevoId("sol"),
    paciente_id: pacienteId,
    especialidad_id: especialidadId,
    estado: "activa",
    creada_en: creadaEn,
    finalizada_en: null,
  });
  return true;
}

/**
 * Agrega una fila a `solicitudes_espera` (como lo haría el backend). Respeta
 * `uq_solicitud_espera_activa`: una sola solicitud activa por paciente y especialidad.
 */
export function agregarSolicitudFalsa({
  pacienteId,
  especialidad,
  estado = "activa",
  creadaEn = new Date().toISOString(),
}: {
  pacienteId: string;
  especialidad: string;
  estado?: string;
  creadaEn?: string;
}): string {
  const especialidadId = idEspecialidadFalsa(especialidad);
  if (estado === "activa") {
    if (!insertarSolicitud(pacienteId, especialidadId, creadaEn)) throw new Error("uq_solicitud_espera_activa");
    return String(solicitudesEspera[solicitudesEspera.length - 1].id);
  }
  const id = nuevoId("sol");
  solicitudesEspera.push({
    id,
    paciente_id: pacienteId,
    especialidad_id: especialidadId,
    estado,
    creada_en: creadaEn,
    finalizada_en: new Date().toISOString(),
  });
  return id;
}

/** Filas de una tabla tal como están en la base (sin RLS), para revisar resultados. */
export function tablaFalsa(tabla: string): Fila[] {
  const t = tablas()[tabla];
  if (!t) throw new Error(`Tabla desconocida en el fake: ${tabla}`);
  return t;
}

/** Crea una cita confirmada para un paciente (como si la hubiera reservado). */
export function crearCitaFalsa(pacienteId: string, especialidad: string, fechaHoraISO: string): string {
  const id = nuevoId("cita");
  citas.push({
    id,
    paciente_id: pacienteId,
    especialidad_id: idEspecialidadFalsa(especialidad),
    profesional_id: idCatalogo(profesionales, "prof", "Dr. J. Peralta"),
    consultorio_id: idCatalogo(consultorios, "cons", "Consultorio 1C"),
    fecha_hora: fechaHoraISO,
    estado: "confirmada",
    origen: "reserva-directa",
    oferta_id: null,
  });
  return id;
}

/** Vence una oferta ya (como si hubiera pasado su plazo). */
export function vencerOfertaFalsa(ofertaId: string) {
  const o = ofertas.find((x) => x.id === ofertaId);
  if (o) o.expira_en = new Date(Date.now() - 1000).toISOString();
}

/** Deja abierta la sesión de un usuario, como si la hubiera restaurado Supabase. */
export function abrirSesionFalsa(email: string) {
  const user = usuarios.find((u) => u.email === email);
  sesion = user ? { user } : null;
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

/** El código que Supabase habría enviado por correo para restablecer la contraseña. */
export function codigoRecuperacionFalso(email: string) {
  return codigosRecuperacion[email] ?? "";
}

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------

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
  async signUp({ email, password, options }: { email: string; password: string; options?: { data?: Fila } }) {
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

// ---------------------------------------------------------------------------
// Tablas con RLS
// ---------------------------------------------------------------------------

function tablas(): Record<string, Fila[]> {
  return {
    especialidades: especialidadesBase,
    profesionales,
    consultorios,
    pacientes: pacientesCreados,
    solicitudes_espera: solicitudesEspera,
    citas,
    cupos,
    ofertas,
    ofertas_factores: ofertasFactores,
    ofertas_eventos: ofertasEventos,
    notificaciones,
  };
}

const ofertaPropia = (ofertaId: unknown, uid: string) => ofertas.some((o) => o.id === ofertaId && o.paciente_id === uid);

/** Filas que RLS deja ver al paciente con sesión (sin sesión: nada, como `anon`). */
function filasVisibles(tabla: string): Fila[] {
  const uid = sesion?.user.id;
  if (!uid) return [];
  switch (tabla) {
    case "especialidades":
    case "profesionales":
    case "consultorios":
      return tablas()[tabla];
    case "pacientes":
      return pacientesCreados.filter((p) => p.id === uid);
    case "solicitudes_espera":
    case "citas":
    case "ofertas":
    case "notificaciones":
      return tablas()[tabla].filter((f) => f.paciente_id === uid);
    case "cupos":
      return cupos.filter(
        (c) =>
          ofertas.some((o) => o.cupo_id === c.id && o.paciente_id === uid) ||
          citas.some((ci) => ci.id === c.cita_origen_id && ci.paciente_id === uid)
      );
    case "ofertas_factores":
    case "ofertas_eventos":
      return tablas()[tabla].filter((f) => ofertaPropia(f.oferta_id, uid));
    default:
      return [];
  }
}

function tablaCaida(tabla: string) {
  if (sinConexion) return true;
  if (tabla === "pacientes") return pacientesCaido;
  return solicitudesCaido && (tabla === "solicitudes_espera" || tabla === "especialidades");
}

/** Columnas sin privilegio SELECT para `authenticated` (migración 20260927140000). */
const COLUMNAS_PRIVADAS: Record<string, string[]> = { ofertas: ["score"] };

/** SELECT encadenable: `.eq()`, `.in()`, `.order()`, `.maybeSingle()` o `await` directo. */
function consulta(tabla: string, columnas: string) {
  const filtros: ((f: Fila) => boolean)[] = [];
  const ordenes: { columna: string; ascendente: boolean }[] = [];
  const lista = columnas.split(",").map((c) => c.trim());
  const resultado = (): Resultado<Fila[]> => {
    if (tablaCaida(tabla)) return { data: null, error: errorRed };
    const privadas = COLUMNAS_PRIVADAS[tabla] ?? [];
    if (lista.some((c) => c === "*" || privadas.includes(c))) {
      return { data: null, error: errorPg("42501", `permission denied for table ${tabla}`) };
    }
    const filas = filasVisibles(tabla).filter((f) => filtros.every((p) => p(f)));
    for (const { columna, ascendente } of [...ordenes].reverse()) {
      filas.sort((a, b) => (String(a[columna]) < String(b[columna]) ? -1 : String(a[columna]) > String(b[columna]) ? 1 : 0) * (ascendente ? 1 : -1));
    }
    return { data: filas.map((f) => Object.fromEntries(lista.map((c) => [c, f[c] ?? null]))), error: null };
  };
  const builder = {
    eq(columna: string, valor: unknown) {
      filtros.push((f) => f[columna] === valor);
      return builder;
    },
    in(columna: string, valores: unknown[]) {
      filtros.push((f) => valores.includes(f[columna]));
      return builder;
    },
    order(columna: string, { ascending = true }: { ascending?: boolean } = {}) {
      ordenes.push({ columna, ascendente: ascending });
      return builder;
    },
    returns() {
      return builder;
    },
    async maybeSingle(): Promise<Resultado<Fila | null>> {
      const r = resultado();
      return r.error ? r : { data: r.data[0] ?? null, error: null };
    },
    then<A, B = never>(
      alResolver?: (r: Resultado<Fila[]>) => A | PromiseLike<A>,
      alRechazar?: (e: unknown) => B | PromiseLike<B>
    ): Promise<A | B> {
      return Promise.resolve(resultado()).then(alResolver, alRechazar);
    },
  };
  return builder;
}

/**
 * Sin INSERT/DELETE desde el cliente. UPDATE solo en la fila propia de
 * `pacientes` (el resto se modifica con RPC).
 */
function from(tabla: string) {
  tablasConsultadas.push(tabla);
  return {
    async insert(_fila: Fila) {
      insertsIntentados.push(tabla);
      return { data: null, error: errorPg("42501", "permission denied") };
    },
    select(columnas: string) {
      return consulta(tabla, columnas);
    },
    update(cambios: Fila) {
      return {
        async eq(columna: string, valor: unknown) {
          if (tablaCaida(tabla)) return { data: null, error: errorRed };
          if (tabla === "pacientes") {
            filasVisibles(tabla)
              .filter((f) => f[columna] === valor)
              .forEach((f) => Object.assign(f, cambios));
          }
          return { data: null, error: null };
        },
      };
    },
  };
}

// ---------------------------------------------------------------------------
// Lógica del servidor (mismo comportamiento que las funciones SQL)
// ---------------------------------------------------------------------------

function evento(ofertaId: unknown, tipo: string) {
  if (ofertasEventos.some((e) => e.oferta_id === ofertaId && e.tipo === tipo)) return; // uq_ofertas_eventos_tipo
  ofertasEventos.push({ id: nuevoId("ev"), oferta_id: ofertaId, tipo, creado_en: new Date().toISOString() });
}

function datosCupo(cupo: Fila) {
  return {
    especialidad: nombreEspecialidad(cupo.especialidad_id),
    profesional: nombreDe(profesionales, cupo.profesional_id),
    consultorio: nombreDe(consultorios, cupo.consultorio_id),
    fechaHoraISO: cupo.fecha_hora,
  };
}

function notificar(pacienteId: unknown, tipo: string, datos: Fila, referencia: unknown, leida = false) {
  notificaciones.push({
    id: nuevoId("not"),
    paciente_id: pacienteId,
    tipo,
    datos,
    referencia_id: referencia,
    leida,
    creada_en: new Date().toISOString(),
  });
}

function resolverAvisoCupo(ofertaId: unknown) {
  notificaciones
    .filter((n) => n.referencia_id === ofertaId && n.tipo === "cupo-ultimo-minuto")
    .forEach((n) => (n.leida = true));
}

/** Cupos que quedaron abiertos en la transacción: el trigger los manda a priorizar tras el commit. */
let cuposPorPriorizar: string[] = [];

function abrirCupo(cupo: Fila) {
  cupo.estado = "abierto";
  cuposPorPriorizar.push(String(cupo.id)); // trigger AFTER UPDATE OF estado
}

function expirarOferta(oferta: Fila) {
  if (oferta.estado !== "pendiente") return;
  oferta.estado = "expirada";
  oferta.respondida_en = new Date().toISOString();
  const cupo = cupos.find((c) => c.id === oferta.cupo_id);
  if (cupo && cupo.estado === "ofrecido") abrirCupo(cupo);
  evento(oferta.id, "expirada");
  resolverAvisoCupo(oferta.id);
  if (cupo) notificar(oferta.paciente_id, "expiracion", datosCupo(cupo), oferta.id);
}

function puestoEn(solicitud: Fila): number {
  const antes = solicitudesEspera.filter(
    (o) =>
      o.especialidad_id === solicitud.especialidad_id &&
      o.estado === "activa" &&
      (String(o.creada_en) < String(solicitud.creada_en) ||
        (o.creada_en === solicitud.creada_en && String(o.id) < String(solicitud.id)))
  );
  return antes.length + 1;
}

/** `candidatos_cupo`: solo service_role (la Edge Function). */
function candidatosCupo(cupoId: string): Candidato[] {
  const cupo = cupos.find((c) => c.id === cupoId);
  if (!cupo) return [];
  const origen = citas.find((c) => c.id === cupo.cita_origen_id)?.paciente_id;
  const cola = solicitudesEspera
    .filter((s) => s.especialidad_id === cupo.especialidad_id && s.estado === "activa")
    .sort((a, b) => (String(a.creada_en) < String(b.creada_en) ? -1 : 1));
  return cola
    .map((s, i) => ({ s, puesto: i + 1 }))
    .filter(({ s }) => s.paciente_id !== origen && !ofertas.some((o) => o.cupo_id === cupoId && o.paciente_id === s.paciente_id))
    .map(({ s, puesto }) => {
      const p = pacientesCreados.find((x) => x.id === s.paciente_id)!;
      return {
        paciente_id: String(s.paciente_id),
        especialidad: String(nombreEspecialidad(cupo.especialidad_id)),
        solicitud_creada_en: String(s.creada_en),
        dias_espera: Math.max(0, Math.floor((Date.now() - new Date(String(s.creada_en)).getTime()) / DIA)),
        puesto,
        franja_preferida: String(p.franja_preferida),
        notificaciones_activas: p.notificaciones_activas === true,
        distancia_max_km: typeof p.distancia_max_km === "number" ? p.distancia_max_km : null,
        cupo_fecha_hora: String(cupo.fecha_hora),
      };
    });
}

/** `ofrecer_cupo`: solo service_role (la Edge Function). */
function ofrecerCupo(cupoId: string, pacienteId: string, score: number, factores: Factor[], minutos = 10): string {
  const cupo = cupos.find((c) => c.id === cupoId);
  if (!cupo || cupo.estado !== "abierto") throw new Error("cupo_no_disponible");
  if (!candidatosCupo(cupoId).some((c) => c.paciente_id === pacienteId)) throw new Error("candidato_invalido");
  const id = nuevoId("of");
  ofertas.push({
    id,
    cupo_id: cupoId,
    paciente_id: pacienteId,
    estado: "pendiente",
    score: Math.min(1, Math.max(0, score)),
    expira_en: new Date(Date.now() + minutos * 60_000).toISOString(),
    creada_en: new Date().toISOString(),
  });
  factores.slice(0, 4).forEach((f, i) =>
    ofertasFactores.push({ id: nuevoId("fac"), oferta_id: id, ...f, orden: i + 1 })
  );
  cupo.estado = "ofrecido";
  evento(id, "enviada");
  notificar(pacienteId, "cupo-ultimo-minuto", datosCupo(cupo), id);
  return id;
}

/** RPC de la app (security definer): siempre sobre el paciente con sesión. */
type Rpc = (uid: string, args: Fila) => unknown;
class ErrorRpc extends Error {
  constructor(
    public codigo: string,
    mensaje: string
  ) {
    super(mensaje);
  }
}

const rpcs: Record<string, Rpc> = {
  sincronizar_lista_espera(uid, { p_especialidades }) {
    const ids = Array.isArray(p_especialidades) ? p_especialidades.map(Number) : [];
    const ahora = new Date().toISOString();
    solicitudesEspera
      .filter((s) => s.paciente_id === uid && s.estado === "activa" && !ids.includes(Number(s.especialidad_id)))
      .forEach((s) => Object.assign(s, { estado: "retirada", finalizada_en: ahora }));
    ids.filter((id) => especialidadesBase.some((e) => e.id === id)).forEach((id) => insertarSolicitud(uid, id));
    return null;
  },
  unirse_lista_espera(uid, { p_especialidad_id }) {
    if (!especialidadesBase.some((e) => e.id === p_especialidad_id)) throw new ErrorRpc("P0002", "especialidad_inexistente");
    insertarSolicitud(uid, Number(p_especialidad_id));
    return null;
  },
  retirar_lista_espera(uid, { p_especialidad_id }) {
    solicitudesEspera
      .filter((s) => s.paciente_id === uid && s.especialidad_id === p_especialidad_id && s.estado === "activa")
      .forEach((s) => Object.assign(s, { estado: "retirada", finalizada_en: new Date().toISOString() }));
    return null;
  },
  mi_puesto_espera(uid, { p_especialidad_id }) {
    const propia = solicitudesEspera.find(
      (s) => s.paciente_id === uid && s.especialidad_id === p_especialidad_id && s.estado === "activa"
    );
    return propia ? puestoEn(propia) : null;
  },
  mis_puestos_espera(uid) {
    return solicitudesEspera
      .filter((s) => s.paciente_id === uid && s.estado === "activa")
      .map((s) => ({ especialidad_id: s.especialidad_id, puesto: puestoEn(s), creada_en: s.creada_en }));
  },
  cancelar_cita(uid, { p_cita_id }) {
    const cita = citas.find((c) => c.id === p_cita_id && c.paciente_id === uid);
    if (!cita) throw new ErrorRpc("P0002", "cita_no_encontrada");
    if (cita.estado !== "confirmada" || new Date(String(cita.fecha_hora)).getTime() <= Date.now()) {
      throw new ErrorRpc("22023", "cita_no_cancelable");
    }
    cita.estado = "cancelada";
    cita.cancelada_en = new Date().toISOString();
    const existente = cupos.find((c) => c.cita_origen_id === cita.id); // uq_cupos_cita_origen
    if (existente) return existente.id;
    const id = nuevoId("cupo");
    cupos.push({
      id,
      cita_origen_id: cita.id,
      especialidad_id: cita.especialidad_id,
      profesional_id: cita.profesional_id,
      consultorio_id: cita.consultorio_id,
      fecha_hora: cita.fecha_hora,
      motivo: "cancelacion",
      estado: "abierto",
    });
    cuposPorPriorizar.push(id); // trigger AFTER INSERT
    return id;
  },
  reprogramar_cita(uid, { p_cita_id, p_fecha_hora }) {
    if (new Date(String(p_fecha_hora)).getTime() <= Date.now()) throw new ErrorRpc("22023", "fecha_invalida");
    const cita = citas.find(
      (c) => c.id === p_cita_id && c.paciente_id === uid && c.estado === "confirmada" && new Date(String(c.fecha_hora)).getTime() > Date.now()
    );
    if (!cita) throw new ErrorRpc("22023", "cita_no_reprogramable");
    cita.fecha_hora = p_fecha_hora;
    return null;
  },
  expirar_mis_ofertas(uid) {
    const vencidas = ofertas.filter(
      (o) => o.paciente_id === uid && o.estado === "pendiente" && new Date(String(o.expira_en)).getTime() <= Date.now()
    );
    vencidas.forEach(expirarOferta);
    return vencidas.map((o) => o.cupo_id);
  },
  marcar_oferta_vista(uid, { p_oferta_id }) {
    if (ofertaPropia(p_oferta_id, uid)) evento(p_oferta_id, "vista");
    return null;
  },
  aceptar_oferta(uid, { p_oferta_id }) {
    const oferta = ofertas.find((o) => o.id === p_oferta_id && o.paciente_id === uid);
    if (!oferta) throw new ErrorRpc("P0002", "oferta_no_encontrada");
    if (oferta.estado === "aceptada") return citas.find((c) => c.oferta_id === oferta.id)?.id ?? null;
    if (oferta.estado !== "pendiente") throw new ErrorRpc("22023", "oferta_no_disponible");
    if (new Date(String(oferta.expira_en)).getTime() <= Date.now()) {
      expirarOferta(oferta);
      return null;
    }
    const cupo = cupos.find((c) => c.id === oferta.cupo_id)!;
    if (cupo.estado !== "ofrecido") throw new ErrorRpc("22023", "cupo_no_disponible");
    if (ofertas.some((o) => o.cupo_id === cupo.id && o.estado === "aceptada")) throw new ErrorRpc("23505", "uq_oferta_aceptada_por_cupo");
    oferta.estado = "aceptada";
    oferta.respondida_en = new Date().toISOString();
    cupo.estado = "tomado";
    const citaId = `c-${oferta.id}`;
    citas.push({
      id: citaId,
      paciente_id: uid,
      especialidad_id: cupo.especialidad_id,
      profesional_id: cupo.profesional_id,
      consultorio_id: cupo.consultorio_id,
      fecha_hora: cupo.fecha_hora,
      estado: "confirmada",
      origen: "cupo-recuperado",
      oferta_id: oferta.id,
    });
    solicitudesEspera
      .filter((s) => s.paciente_id === uid && s.especialidad_id === cupo.especialidad_id && s.estado === "activa")
      .forEach((s) => Object.assign(s, { estado: "atendida", finalizada_en: new Date().toISOString() }));
    evento(oferta.id, "aceptada");
    resolverAvisoCupo(oferta.id);
    notificar(uid, "confirmacion", datosCupo(cupo), oferta.id, true);
    return citaId;
  },
  rechazar_oferta(uid, { p_oferta_id }) {
    const oferta = ofertas.find((o) => o.id === p_oferta_id && o.paciente_id === uid);
    if (!oferta) throw new ErrorRpc("P0002", "oferta_no_encontrada");
    if (oferta.estado === "rechazada") return oferta.cupo_id;
    if (oferta.estado !== "pendiente") throw new ErrorRpc("22023", "oferta_no_disponible");
    oferta.estado = "rechazada";
    oferta.respondida_en = new Date().toISOString();
    const cupo = cupos.find((c) => c.id === oferta.cupo_id);
    if (cupo && cupo.estado === "ofrecido") abrirCupo(cupo);
    evento(oferta.id, "rechazada");
    resolverAvisoCupo(oferta.id);
    return oferta.cupo_id;
  },
  marcar_notificacion_leida(uid, { p_notificacion_id }) {
    notificaciones.filter((n) => n.id === p_notificacion_id && n.paciente_id === uid).forEach((n) => (n.leida = true));
    return null;
  },
  marcar_todas_notificaciones_leidas(uid) {
    notificaciones.filter((n) => n.paciente_id === uid).forEach((n) => (n.leida = true));
    return null;
  },
};

/** Funciones solo para service_role: desde la app, permiso denegado. */
const SOLO_SERVICIO = ["candidatos_cupo", "ofrecer_cupo", "cerrar_cupo", "expirar_ofertas_vencidas"];

async function rpc(nombre: string, args: Fila = {}): Promise<Resultado<unknown>> {
  rpcLlamadas.push(nombre);
  if (sinConexion) return { data: null, error: errorRed };
  if (SOLO_SERVICIO.includes(nombre)) return { data: null, error: errorPg("42501", `permission denied for function ${nombre}`) };
  const fn = rpcs[nombre];
  if (!fn) return { data: null, error: errorPg("PGRST202", `Could not find the function public.${nombre}`) };
  const uid = sesion?.user.id;
  if (!uid) return { data: null, error: errorPg("42501", "no_autenticado") };
  if (!filaPacienteFalsa(uid)) return { data: null, error: errorPg("P0002", "paciente_inexistente") };
  try {
    cuposPorPriorizar = [];
    const data = fn(uid, args);
    // «Commit»: pg_net llama a priorizar-cupo por cada cupo que quedó abierto.
    const abiertos = cuposPorPriorizar;
    cuposPorPriorizar = [];
    abiertos.forEach((id) => priorizarCupo(id));
    return { data, error: null };
  } catch (e) {
    if (e instanceof ErrorRpc) return { data: null, error: errorPg(e.codigo, e.message) };
    throw e;
  }
}

// ---------------------------------------------------------------------------
// Edge Functions
// ---------------------------------------------------------------------------

/** Llamadas a `priorizar-cupo` (por cupo), para revisar en las pruebas. */
export let cuposPriorizados: string[] = [];

/** `priorizar-cupo` del servidor: la misma estrategia determinista que la función real. */
function priorizarCupo(cupoId: string) {
  cuposPriorizados.push(cupoId);
  const candidatos = candidatosCupo(cupoId);
  if (candidatos.length === 0) {
    const cupo = cupos.find((c) => c.id === cupoId);
    if (cupo && cupo.estado === "abierto") cupo.estado = "expirado";
    return { oferta_id: null, motivo: "sin_candidatos" };
  }
  const [elegido] = priorizarDeterminista(candidatos);
  return {
    oferta_id: ofrecerCupo(cupoId, elegido.paciente_id, elegido.score, elegido.factores),
    estrategia: "determinista",
  };
}

/**
 * Llamadas desde la app: `priorizar-cupo` exige el secreto del servidor
 * (x-priorizar-secreto), que la app no tiene → 401, sin crear nada.
 */
export let invocacionesDesdeApp: string[] = [];
const functions = {
  async invoke(nombre: string, _opciones: { body?: Fila } = {}) {
    invocacionesDesdeApp.push(nombre);
    if (sinConexion) return { data: null, error: new Error("FunctionsFetchError: Failed to send a request to the Edge Function") };
    if (nombre !== "priorizar-cupo") return { data: null, error: new Error(`FunctionsHttpError: 404 ${nombre}`) };
    return { data: null, error: new Error("FunctionsHttpError: 401 no_autorizado") };
  },
};

const cliente = { auth, from, rpc, functions };

export const supabaseConfigurado = true;
export function getSupabase() {
  return cliente;
}
