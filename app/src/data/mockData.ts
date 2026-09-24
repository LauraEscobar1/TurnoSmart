import { Cita, Notificacion, OfertaCupo, Paciente } from "@/types/domain";

/**
 * Datos de ejemplo para desarrollar la UI sin backend real.
 * Reemplazar por llamadas reales en src/services/* cuando exista la API.
 */

const MIN = 1000 * 60;
const DIA = MIN * 60 * 24;

export const pacienteActual: Paciente = {
  id: "p-001",
  nombre: "Laura Escobar",
  email: "laura@example.com",
  telefono: "+57 300 000 0000",
  especialidadesInteres: ["Odontología", "Dermatología"],
  horariosPreferidos: ["Mañana", "Tarde"],
  radioKm: 10,
  listaEspera: { dias: 34, puesto: 3 },
};

export const ofertasMock: OfertaCupo[] = [
  {
    id: "of-001",
    citaOrigenId: "c-100",
    especialidad: "Odontología",
    profesional: "Dr. Camilo Rojas",
    consultorio: "Sede Norte",
    fechaHoraISO: new Date(Date.now() + 90 * MIN).toISOString(),
    estado: "pendiente",
    expiraEnISO: new Date(Date.now() + 8 * MIN).toISOString(),
    scorePrioridad: 0.87,
    factores: [
      { etiqueta: "Tiempo en espera", valor: "34 días", peso: 0.92 },
      { etiqueta: "Tu especialidad", valor: "Odontología", peso: 1 },
      { etiqueta: "Horario preferido", valor: "Tarde", peso: 0.64 },
      { etiqueta: "Distancia a la sede", valor: "2,1 km", peso: 0.48 },
    ],
  },
];

export const citasMock: Cita[] = [
  {
    id: "c-050",
    especialidad: "Dermatología",
    profesional: "Dra. Ana Ibarra",
    consultorio: "Sede Chapinero",
    fechaHoraISO: new Date(Date.now() + 5 * DIA).toISOString(),
    estado: "confirmada",
    origen: "reserva-directa",
  },
  {
    id: "c-032",
    especialidad: "Odontología",
    profesional: "Dr. Camilo Rojas",
    consultorio: "Sede Norte",
    fechaHoraISO: new Date(Date.now() - 10 * DIA).toISOString(),
    estado: "no-show",
    origen: "reserva-directa",
  },
];

export const notificacionesMock: Notificacion[] = [
  {
    id: "n-001",
    tipo: "cupo-ultimo-minuto",
    titulo: "Odontología hoy",
    cuerpo: "Respondé antes de que expire.",
    fechaISO: new Date().toISOString(),
    leida: false,
    referenciaId: "of-001",
  },
  {
    id: "n-002",
    tipo: "recordatorio",
    titulo: "Dermatología en 5 días",
    cuerpo: "Dra. Ana Ibarra · Sede Chapinero.",
    fechaISO: new Date(Date.now() - 3 * 60 * MIN).toISOString(),
    leida: true,
    referenciaId: "c-050",
  },
];
