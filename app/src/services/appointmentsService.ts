import { Cita } from "@/types/domain";
import { citasMock } from "@/data/mockData";

export async function getCitasProximas(): Promise<Cita[]> {
  const ahora = Date.now();
  return citasMock
    .filter((c) => new Date(c.fechaHoraISO).getTime() >= ahora && c.estado === "confirmada")
    .sort((a, b) => new Date(a.fechaHoraISO).getTime() - new Date(b.fechaHoraISO).getTime());
}

export async function getCitasPasadas(): Promise<Cita[]> {
  const ahora = Date.now();
  return citasMock.filter((c) => new Date(c.fechaHoraISO).getTime() < ahora);
}

export async function getCitaPorId(id: string): Promise<Cita | null> {
  return citasMock.find((c) => c.id === id) ?? null;
}

/** Cancela una cita confirmada. En el sistema real, el cupo liberado pasa a ofrecerse a otro paciente. */
export async function cancelarCita(id: string): Promise<Cita | null> {
  const cita = citasMock.find((c) => c.id === id);
  if (!cita || cita.estado !== "confirmada") return null;
  cita.estado = "cancelada";
  return cita;
}

const HORAS_ATENCION = [
  [9, 0],
  [11, 30],
  [16, 30],
] as const;

/**
 * Horarios libres del mismo especialista para reprogramar. Simulado: la
 * API real devolverá la agenda del consultorio; la firma no cambia.
 */
export async function getHorariosDisponibles(cita: Cita, cantidad = 6): Promise<string[]> {
  const actual = new Date(cita.fechaHoraISO).getTime();
  const hoy = new Date();
  const horarios: string[] = [];
  for (let d = 1; horarios.length < cantidad && d <= 21; d++) {
    const dia = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() + d);
    if (dia.getDay() === 0) continue; // domingos sin atención
    for (const [h, m] of HORAS_ATENCION) {
      const t = new Date(dia.getFullYear(), dia.getMonth(), dia.getDate(), h, m);
      if (t.getTime() !== actual && horarios.length < cantidad) horarios.push(t.toISOString());
    }
  }
  return horarios;
}

export async function reprogramarCita(id: string, nuevaFechaISO: string): Promise<Cita | null> {
  const cita = citasMock.find((c) => c.id === id);
  if (!cita || cita.estado !== "confirmada") return null;
  cita.fechaHoraISO = nuevaFechaISO;
  return cita;
}
