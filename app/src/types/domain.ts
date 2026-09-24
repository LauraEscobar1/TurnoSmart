/**
 * Entidades del dominio, tal como se definieron en
 * docs/01-arquitectura-informacion.md §2.2 y §5 (glosario controlado).
 *
 * IMPORTANTE: mantener estos nombres en español y singular, iguales
 * a los usados en el panel, para no romper el vocabulario controlado.
 */

export type EstadoCita = "confirmada" | "asistida" | "cancelada" | "reasignada" | "no-show";

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
  /** Momento en que la oferta expira y el cupo se ofrece a otro paciente. */
  expiraEnISO: string;
  /**
   * Score de la IA (0-1) que estimó qué tan probable era que este paciente aceptara.
   * Nunca se muestra al paciente: la interfaz muestra `factores`.
   */
  scorePrioridad: number;
  /** Razones de la priorización, ordenadas por peso (máximo 4). */
  factores: FactorPrioridad[];
}

export interface FactorPrioridad {
  etiqueta: string;
  /** Dato concreto que se muestra a la derecha: "34 días", "Tarde"... */
  valor: string;
  /** Peso relativo 0-1, solo para dibujar la barra. */
  peso: number;
}

export type FranjaHoraria = "Mañana" | "Tarde" | "Indistinto";

/** Distancia máxima al consultorio en km; `null` = sin límite. */
export type DistanciaMaxima = 3 | 10 | null;

export interface Paciente {
  id: string;
  nombre: string;
  apellido: string;
  dni: string;
  email: string;
  telefono: string;
  /**
   * Preferencias del registro (paso 2). Son los mismos factores que luego
   * muestra el panel de explicabilidad de cada oferta.
   */
  especialidadesInteres: string[];
  franjaPreferida: FranjaHoraria;
  distanciaMaxKm: DistanciaMaxima;
  obraSocial: string;
  notificacionesActivas: boolean;
  /** Alta en la lista de espera; de acá sale «34 días». */
  registradoEnISO: string;
  puestoEspera: number;
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
