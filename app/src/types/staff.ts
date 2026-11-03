/**
 * Tipos del panel del staff (consultorio). El paciente nunca llega con su
 * nombre ni su cédula: solo iniciales y un código opaco (P-XXXXXX).
 */

export interface PerfilStaff {
  nombre: string;
  email: string;
  consultorios: { id: string; nombre: string }[];
}

export interface MetricasStaff {
  /** Ventana de las métricas, en días (30 por defecto). */
  dias: number;
  cancelaciones: number;
  inasistencias: number;
  cuposLiberados: number;
  cuposRecuperados: number;
  /** 0-1; null si no se liberó ningún cupo. */
  tasaRecuperacion: number | null;
}

export type NivelRiesgo = "bajo" | "medio" | "alto";

export interface RiesgoCita {
  nivel: NivelRiesgo;
  puntaje: number;
  /** "ai": nivel y explicación de DeepSeek (validados); "fallback": reglas deterministas. */
  estrategia: "ai" | "fallback";
  explicacion: { es: string; en: string };
  calculadoEnISO: string;
}

export interface CitaAgenda {
  id: string;
  fechaHoraISO: string;
  especialidad: string;
  profesional: string;
  consultorio: string;
  origen: "reserva-directa" | "cupo-recuperado";
  paciente: { iniciales: string; codigo: string };
  riesgo: RiesgoCita | null;
}

export type EstadoCupo = "abierto" | "ofrecido" | "tomado" | "expirado";
export type EstadoOfertaCupo = "pendiente" | "aceptada" | "rechazada" | "expirada";

export interface OfertaDeCupo {
  estado: EstadoOfertaCupo;
  creadaEnISO: string;
  paciente: { iniciales: string; codigo: string };
}

export interface CupoStaff {
  id: string;
  fechaHoraISO: string;
  especialidad: string;
  profesional: string;
  motivo: "cancelacion" | "inasistencia" | "otro";
  estado: EstadoCupo;
  ofertas: OfertaDeCupo[];
}

export interface ResultadoCalculoRiesgo {
  calculadas: number;
  ai: number;
  fallback: number;
}
