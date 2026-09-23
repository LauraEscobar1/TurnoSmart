import { Cita, Notificacion, OfertaCupo, Paciente } from "@/types/domain";

/**
 * Datos de ejemplo para desarrollar la UI sin backend real.
 * Reemplazar por llamadas reales en src/services/* cuando exista la API.
 */

export const pacienteActual: Paciente = {
  id: "p-001",
  nombre: "Laura Escobar",
  email: "laura@example.com",
  telefono: "+57 300 000 0000",
  especialidadesInteres: ["Odontología", "Dermatología"],
  horariosPreferidos: ["Mañana", "Tarde"],
  radioKm: 10,
};

export const ofertasMock: OfertaCupo[] = [
  {
    id: "of-001",
    citaOrigenId: "c-100",
    especialidad: "Odontología",
    profesional: "Dr. Camilo Rojas",
    consultorio: "Sede Norte",
    fechaHoraISO: new Date(Date.now() + 1000 * 60 * 90).toISOString(),
    estado: "pendiente",
    segundosParaExpirar: 60 * 8,
    scorePrioridad: 0.87,
  },
];

export const citasMock: Cita[] = [
  {
    id: "c-050",
    especialidad: "Dermatología",
    profesional: "Dra. Ana Ibarra",
    consultorio: "Sede Chapinero",
    fechaHoraISO: new Date(Date.now() + 1000 * 60 * 60 * 24 * 5).toISOString(),
    estado: "confirmada",
    origen: "reserva-directa",
  },
  {
    id: "c-032",
    especialidad: "Odontología",
    profesional: "Dr. Camilo Rojas",
    consultorio: "Sede Norte",
    fechaHoraISO: new Date(Date.now() - 1000 * 60 * 60 * 24 * 10).toISOString(),
    estado: "no-show",
    origen: "reserva-directa",
  },
];

export const notificacionesMock: Notificacion[] = [
  {
    id: "n-001",
    tipo: "cupo-ultimo-minuto",
    titulo: "¡Nuevo cupo disponible!",
    cuerpo: "Odontología con Dr. Camilo Rojas, hoy a las 4:30 PM.",
    fechaISO: new Date().toISOString(),
    leida: false,
    referenciaId: "of-001",
  },
  {
    id: "n-002",
    tipo: "recordatorio",
    titulo: "Recordatorio de cita",
    cuerpo: "Tu cita de Dermatología es en 2 días.",
    fechaISO: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString(),
    leida: true,
    referenciaId: "c-050",
  },
];
