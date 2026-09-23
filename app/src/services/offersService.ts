import { OfertaCupo } from "@/types/domain";
import { ofertasMock } from "@/data/mockData";

/**
 * Capa de servicio para ofertas de cupo.
 * Hoy devuelve datos mock; cuando exista la API, solo se cambia
 * la implementación interna — la firma de las funciones no cambia.
 */

export async function getOfertaPendiente(): Promise<OfertaCupo | null> {
  return ofertasMock.find((o) => o.estado === "pendiente") ?? null;
}

export async function getHistorialOfertas(): Promise<OfertaCupo[]> {
  return ofertasMock.filter((o) => o.estado !== "pendiente");
}

export async function aceptarOferta(ofertaId: string): Promise<void> {
  const oferta = ofertasMock.find((o) => o.id === ofertaId);
  if (oferta) oferta.estado = "aceptada";
}

export async function rechazarOferta(ofertaId: string): Promise<void> {
  const oferta = ofertasMock.find((o) => o.id === ofertaId);
  if (oferta) oferta.estado = "rechazada";
}
