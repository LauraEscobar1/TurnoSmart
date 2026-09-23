import { Notificacion } from "@/types/domain";
import { notificacionesMock } from "@/data/mockData";

export async function getNotificaciones(): Promise<Notificacion[]> {
  return [...notificacionesMock].sort(
    (a, b) => new Date(b.fechaISO).getTime() - new Date(a.fechaISO).getTime()
  );
}

export async function marcarComoLeida(id: string): Promise<void> {
  const n = notificacionesMock.find((x) => x.id === id);
  if (n) n.leida = true;
}

export function contarNoLeidas(notificaciones: Notificacion[]): number {
  return notificaciones.filter((n) => !n.leida).length;
}
