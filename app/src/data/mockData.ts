import { Cita, Notificacion, OfertaCupo, Paciente } from "@/types/domain";

/**
 * Datos de ejemplo para desarrollar la UI sin backend real.
 * Reemplazar por llamadas reales en src/services/* cuando exista la API.
 * Los valores siguen los mockups del sistema de diseño.
 */

const MIN = 1000 * 60;
const DIA = MIN * 60 * 24;

/** Especialidades que se ofrecen en el registro (paso 2) y en Preferencias. */
export const ESPECIALIDADES = ["Cardiología", "Dermatología", "Traumatología", "Nutrición", "Clínica médica"];

/** Todas las especialidades con lista de espera (pantalla «Buscar especialista»). */
export const CATALOGO_ESPECIALIDADES = [
  ...ESPECIALIDADES,
  "Pediatría",
  "Ginecología",
  "Oftalmología",
  "Neurología",
  "Endocrinología",
  "Gastroenterología",
  "Otorrinolaringología",
  "Psiquiatría",
  "Urología",
  "Kinesiología",
];

/** Cuenta de demostración: se puede ingresar con estas credenciales. */
export const CUENTA_DEMO = { email: "martin.avila@correo.com", password: "contraseña123" };

export const pacienteDemo: Paciente = {
  id: "p-001",
  nombre: "Martín",
  apellido: "Ávila",
  cedula: "1023456789",
  email: CUENTA_DEMO.email,
  telefono: "+54 11 5555 0192",
  especialidadesInteres: ["Cardiología", "Dermatología"],
  franjaPreferida: "Tarde",
  distanciaMaxKm: 10,
  notificacionesActivas: true,
  registradoEnISO: new Date(Date.now() - 34 * DIA).toISOString(),
  puestoEspera: 3,
  ciudad: "Bogotá",
  eps: "Sura EPS",
};

const ofertaActivaISO = new Date(Date.now() + 90 * MIN).toISOString();

export const ofertasMock: OfertaCupo[] = [
  {
    id: "of-001",
    citaOrigenId: "c-100",
    especialidad: "Cardiología",
    profesional: "Dra. Elena Ruiz",
    consultorio: "Consultorio 4B",
    fechaHoraISO: ofertaActivaISO,
    estado: "pendiente",
    expiraEnISO: new Date(Date.now() + 8 * MIN).toISOString(),
    scorePrioridad: 0.87,
    factores: [
      { etiqueta: "Tiempo en espera", valor: "34 días", peso: 0.92 },
      { etiqueta: "Tu especialidad", valor: "Cardiología", peso: 1 },
      { etiqueta: "Horario preferido", valor: "Tarde", peso: 0.64 },
      { etiqueta: "Distancia al consultorio", valor: "2,1 km", peso: 0.48 },
    ],
  },
  {
    id: "of-002",
    citaOrigenId: "c-101",
    especialidad: "Dermatología",
    profesional: "Dra. Lucía Méndez",
    consultorio: "Consultorio 1C",
    fechaHoraISO: new Date(Date.now() + DIA + 3 * 60 * MIN).toISOString(),
    estado: "pendiente",
    expiraEnISO: new Date(Date.now() + 25 * MIN).toISOString(),
    scorePrioridad: 0.79,
    factores: [
      { etiqueta: "Tu especialidad", valor: "Dermatología", peso: 1 },
      { etiqueta: "Tiempo en espera", valor: "34 días", peso: 0.92 },
      { etiqueta: "Distancia al consultorio", valor: "3,4 km", peso: 0.41 },
    ],
  },
  {
    id: "of-000",
    citaOrigenId: "c-090",
    especialidad: "Clínica médica",
    profesional: "Dr. M. Salas",
    consultorio: "Consultorio 2A",
    fechaHoraISO: new Date(Date.now() - 5 * DIA).toISOString(),
    estado: "expirada",
    expiraEnISO: new Date(Date.now() - 6 * DIA).toISOString(),
    scorePrioridad: 0.71,
    factores: [],
  },
  {
    id: "of-099",
    citaOrigenId: "c-080",
    especialidad: "Nutrición",
    profesional: "Lic. P. Gómez",
    consultorio: "Consultorio 3A",
    fechaHoraISO: new Date(Date.now() - 11 * DIA).toISOString(),
    estado: "aceptada",
    expiraEnISO: new Date(Date.now() - 12 * DIA).toISOString(),
    scorePrioridad: 0.9,
    factores: [],
  },
  {
    id: "of-098",
    citaOrigenId: "c-070",
    especialidad: "Traumatología",
    profesional: "Dr. A. Gómez",
    consultorio: "Consultorio 3B",
    fechaHoraISO: new Date(Date.now() - 18 * DIA).toISOString(),
    estado: "rechazada",
    expiraEnISO: new Date(Date.now() - 19 * DIA).toISOString(),
    scorePrioridad: 0.64,
    factores: [],
  },
];

export const citasMock: Cita[] = [
  {
    id: "c-050",
    especialidad: "Dermatología",
    profesional: "Dr. J. Peralta",
    consultorio: "Cons. 1C",
    fechaHoraISO: new Date(Date.now() + 14 * DIA).toISOString(),
    estado: "confirmada",
    origen: "reserva-directa",
  },
  {
    id: "c-032",
    especialidad: "Clínica médica",
    profesional: "Dr. M. Salas",
    consultorio: "Consultorio 2A",
    fechaHoraISO: new Date(Date.now() - 52 * DIA).toISOString(),
    estado: "asistida",
    origen: "reserva-directa",
  },
];

/**
 * Notificación tal como la guarda el sistema: qué tipo de mensaje se envió
 * y con qué datos. notificationsService redacta el título y el texto en el
 * idioma del paciente («Hola, Laura. Te recordamos…»). El detalle completo
 * vive en el destino (la oferta o la cita), al que se llega desde la
 * notificación.
 */
export interface NotificacionGuardada extends Omit<Notificacion, "titulo" | "cuerpo"> {
  datos: { especialidad: string; profesional?: string; consultorio?: string; fechaHoraISO?: string };
}

export const notificacionesMock: NotificacionGuardada[] = [
  {
    id: "n-001",
    tipo: "cupo-ultimo-minuto",
    datos: { especialidad: ofertasMock[0].especialidad },
    fechaISO: new Date().toISOString(),
    leida: false,
    referenciaId: "of-001",
  },
  {
    id: "n-002",
    tipo: "recordatorio",
    datos: {
      especialidad: citasMock[0].especialidad,
      profesional: citasMock[0].profesional,
      consultorio: citasMock[0].consultorio,
      fechaHoraISO: citasMock[0].fechaHoraISO,
    },
    fechaISO: new Date(Date.now() - DIA).toISOString(),
    leida: false,
    referenciaId: "c-050",
  },
  {
    id: "n-003",
    tipo: "expiracion",
    datos: { especialidad: ofertasMock[2].especialidad, fechaHoraISO: ofertasMock[2].fechaHoraISO },
    fechaISO: new Date(Date.now() - 6 * DIA).toISOString(),
    leida: true,
    referenciaId: "of-000",
  },
  {
    id: "n-004",
    tipo: "confirmacion",
    datos: {
      especialidad: ofertasMock[3].especialidad,
      profesional: ofertasMock[3].profesional,
      fechaHoraISO: ofertasMock[3].fechaHoraISO,
    },
    fechaISO: new Date(Date.now() - 12 * DIA).toISOString(),
    leida: true,
    referenciaId: "of-099",
  },
];
