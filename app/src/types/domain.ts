/**
 * Entidades del dominio, tal como se definieron en
 * docs/01-arquitectura-informacion.md §2.2 y §5 (glosario controlado).
 *
 * IMPORTANTE: mantener estos nombres en español y singular, iguales
 * a los usados en el panel, para no romper el vocabulario controlado.
 */

export type EstadoCita = "confirmada" | "cancelada" | "reasignada" | "no-show";

export interface Cita {
  id: string;
  especialidad: string;
  profesional: string;
  consultorio: string;
  fechaHoraISO: string;
  estado: EstadoCita;
  origen: "reserva-directa" | "cupo-recuperado";
}

export type EstadoOferta = "pendiente" | "aceptada" | "rechazada" | "expirada";

export interface OfertaCupo {
  id: string;
  citaOrigenId: string;
  especialidad: string;
  profesional: string;
  consultorio: string;
  fechaHoraISO: string;
  estado: EstadoOferta;
  /** Segundos restantes para responder antes de que el cupo se reasigne. */
  segundosParaExpirar: number;
  /** Score de la IA (0-1) que estimó qué tan probable era que este paciente aceptara. */
  scorePrioridad: number;
}

export interface Paciente {
  id: string;
  nombre: string;
  email: string;
  telefono: string;
  especialidadesInteres: string[];
  horariosPreferidos: string[];
  radioKm: number;
}

export type TipoNotificacion =
  | "cupo-ultimo-minuto"
  | "recordatorio"
  | "confirmacion"
  | "expiracion";

export interface Notificacion {
  id: string;
  tipo: TipoNotificacion;
  titulo: string;
  cuerpo: string;
  fechaISO: string;
  leida: boolean;
  /** Si aplica, id de la oferta o cita relacionada, para el deep link. */
  referenciaId?: string;
}
