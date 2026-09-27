import { Paciente } from "@/types/domain";

/** «Laura Castro» → «LC», sin tildes. */
export function iniciales(p: Pick<Paciente, "nombre" | "apellido">) {
  return `${p.nombre.trim()[0] ?? ""}${p.apellido.trim()[0] ?? ""}`
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toUpperCase();
}

/**
 * Qué tan completo está el perfil, en %. Cuenta solo los datos opcionales
 * (los del registro ya son obligatorios): foto, fecha de nacimiento,
 * ciudad, EPS y contacto de emergencia.
 */
export function perfilCompleto(p: Paciente) {
  const datos = [
    !!p.fotoUri,
    !!p.fechaNacimiento,
    !!p.ciudad?.trim(),
    !!p.eps?.trim(),
    !!p.contactoEmergencia?.nombre.trim() && !!p.contactoEmergencia?.telefono.trim(),
  ];
  return Math.round((datos.filter(Boolean).length / datos.length) * 100);
}

/** "1023456789" → "1.023.456.789" */
export function formatearCedula(cedula: string) {
  return cedula.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

/** "1994-03-07" → "07/03/1994" */
export function fechaADisplay(iso?: string) {
  if (!iso) return "";
  const [a, m, d] = iso.split("-");
  return `${d}/${m}/${a}`;
}

/**
 * "07/03/1994" → "1994-03-07". Devuelve undefined si está vacío y null si
 * no es una fecha válida (o es futura).
 */
export function fechaDesdeDisplay(texto: string): string | undefined | null {
  const t = texto.trim();
  if (!t) return undefined;
  const m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(t);
  if (!m) return null;
  const [dia, mes, anio] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const f = new Date(anio, mes - 1, dia);
  if (f.getFullYear() !== anio || f.getMonth() !== mes - 1 || f.getDate() !== dia) return null;
  if (anio < 1900 || f.getTime() > Date.now()) return null;
  return `${anio}-${String(mes).padStart(2, "0")}-${String(dia).padStart(2, "0")}`;
}
