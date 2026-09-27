import { Notificacion } from "@/types/domain";
import { notificacionesMock } from "@/data/mockData";

/**
 * Avisos del paciente, del más reciente al más antiguo, con el saludo
 * personalizado («Hola, Laura.») según su nombre de pila.
 */
export async function getNotificaciones(nombre: string): Promise<Notificacion[]> {
  const pila = nombre.trim().split(/\s+/)[0] ?? "";
  return notificacionesMock
    .map((n) => ({ ...n, cuerpo: n.cuerpo.replace(/\{nombre\}/g, pila) }))
    .sort((a, b) => new Date(b.fechaISO).getTime() - new Date(a.fechaISO).getTime());
}

export async function marcarComoLeida(id: string): Promise<void> {
  const n = notificacionesMock.find((x) => x.id === id);
  if (n) n.leida = true;
}

export function contarNoLeidas(notificaciones: Notificacion[]): number {
  return notificaciones.filter((n) => !n.leida).length;
}

export async function marcarTodasComoLeidas(): Promise<void> {
  notificacionesMock.forEach((n) => (n.leida = true));
}
