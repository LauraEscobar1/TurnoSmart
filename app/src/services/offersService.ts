import { OfertaCupo } from "@/types/domain";
import { citasMock, notificacionesMock, ofertasMock } from "@/data/mockData";

/**
 * Capa de servicio para ofertas de cupo.
 * Hoy devuelve datos mock; cuando exista la API, solo se cambia
 * la implementación interna — la firma de las funciones no cambia.
 */

export async function getOfertaPendiente(): Promise<OfertaCupo | null> {
  return ofertasMock.find((o) => o.estado === "pendiente") ?? null;
}

export async function getOfertaPorId(ofertaId: string): Promise<OfertaCupo | null> {
  return ofertasMock.find((o) => o.id === ofertaId) ?? null;
}

export async function getHistorialOfertas(): Promise<OfertaCupo[]> {
  return ofertasMock.filter((o) => o.estado !== "pendiente");
}

/** Al responder una oferta, su aviso de «cupo disponible» deja de estar pendiente. */
function resolverAvisos(ofertaId: string) {
  notificacionesMock
    .filter((n) => n.referenciaId === ofertaId)
    .forEach((n) => {
      n.leida = true;
    });
}

export async function aceptarOferta(ofertaId: string): Promise<void> {
  const oferta = ofertasMock.find((o) => o.id === ofertaId);
  if (!oferta) return;
  oferta.estado = "aceptada";
  resolverAvisos(oferta.id);
  // El cupo aceptado pasa a ser una cita confirmada en Mis citas › Próximas.
  citasMock.push({
    id: `c-${oferta.id}`,
    especialidad: oferta.especialidad,
    profesional: oferta.profesional,
    consultorio: oferta.consultorio,
    fechaHoraISO: oferta.fechaHoraISO,
    estado: "confirmada",
    origen: "cupo-recuperado",
  });
}

export async function rechazarOferta(ofertaId: string): Promise<void> {
  const oferta = ofertasMock.find((o) => o.id === ofertaId);
  if (!oferta) return;
  oferta.estado = "rechazada";
  resolverAvisos(oferta.id);
}

/** Ofertas pendientes de respuesta y aún vigentes — alimenta el badge de Ofertas. */
export function contarOfertasPendientes(ofertas: OfertaCupo[]): number {
  const ahora = Date.now();
  return ofertas.filter((o) => o.estado === "pendiente" && new Date(o.expiraEnISO).getTime() > ahora).length;
}
