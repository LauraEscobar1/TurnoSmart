import { Cita } from "@/types/domain";
import { citasMock } from "@/data/mockData";

export async function getCitasProximas(): Promise<Cita[]> {
  const ahora = Date.now();
  return citasMock.filter(
    (c) => new Date(c.fechaHoraISO).getTime() >= ahora && c.estado === "confirmada"
  );
}

export async function getCitasPasadas(): Promise<Cita[]> {
  const ahora = Date.now();
  return citasMock.filter((c) => new Date(c.fechaHoraISO).getTime() < ahora);
}

export async function getCitaPorId(id: string): Promise<Cita | null> {
  return citasMock.find((c) => c.id === id) ?? null;
}
