import { Cita, Notificacion, OfertaCupo, Paciente } from "@/types/domain";
import { fechaCorta, hora } from "@/utils/format";

/**
 * Datos de ejemplo para desarrollar la UI sin backend real.
 * Reemplazar por llamadas reales en src/services/* cuando exista la API.
 * Los valores siguen los mockups del sistema de diseño.
 */

const MIN = 1000 * 60;
const DIA = MIN * 60 * 24;

/** Especialidades que se ofrecen en el registro (paso 2) y en Preferencias. */
export const ESPECIALIDADES = ["Cardiología", "Dermatología", "Traumatología", "Nutrición", "Clínica médica"];

/** Cuenta de demostración: se puede ingresar con estas credenciales. */
export const CUENTA_DEMO = { email: "martin.avila@correo.com", password: "contraseña123" };

export const pacienteDemo: Paciente = {
  id: "p-001",
  nombre: "Martín",
  apellido: "Ávila",
  dni: "35482910",
  email: CUENTA_DEMO.email,
  telefono: "+54 11 5555 0192",
  especialidadesInteres: ["Cardiología", "Dermatología"],
  franjaPreferida: "Tarde",
  distanciaMaxKm: 10,
  obraSocial: "OSDE 310",
  notificacionesActivas: true,
  registradoEnISO: new Date(Date.now() - 34 * DIA).toISOString(),
  puestoEspera: 3,
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

export const notificacionesMock: Notificacion[] = [
  {
    id: "n-001",
    tipo: "cupo-ultimo-minuto",
    titulo: `Cardiología hoy ${hora(ofertaActivaISO)}`,
    cuerpo: "Respondé antes de que expire.",
    fechaISO: new Date().toISOString(),
    leida: false,
    referenciaId: "of-001",
  },
  {
    id: "n-002",
    tipo: "recordatorio",
    titulo: `Dermatología · ${fechaCorta(citasMock[0].fechaHoraISO)} ${hora(citasMock[0].fechaHoraISO)}`,
    cuerpo: "Consultorio 1C, planta baja.",
    fechaISO: new Date(Date.now() - DIA).toISOString(),
    leida: false,
    referenciaId: "c-050",
  },
  {
    id: "n-003",
    tipo: "expiracion",
    titulo: `Clínica médica · ${fechaCorta(ofertasMock[1].fechaHoraISO)} ${hora(ofertasMock[1].fechaHoraISO)}`,
    cuerpo: "Se ofreció a otro paciente.",
    fechaISO: new Date(Date.now() - 6 * DIA).toISOString(),
    leida: true,
    referenciaId: "of-000",
  },
  {
    id: "n-004",
    tipo: "confirmacion",
    titulo: "Cupo aceptado · Nutrición",
    cuerpo: "",
    fechaISO: new Date(Date.now() - 12 * DIA).toISOString(),
    leida: true,
    referenciaId: "of-099",
  },
];
