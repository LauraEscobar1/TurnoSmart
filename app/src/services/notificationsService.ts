import { Notificacion } from "@/types/domain";
import { notificacionesMock, NotificacionGuardada } from "@/data/mockData";
import { Clave, getIdiomaActual, Idioma, traducir, traducirDato } from "@/i18n";
import { fechaCorta, fechaLarga, hora } from "@/utils/format";

/** Redacta el título y el mensaje de una notificación en el idioma del paciente. */
function redactar(n: NotificacionGuardada, nombre: string, idioma: Idioma): Notificacion {
  const { datos, ...resto } = n;
  const cuando = datos.fechaHoraISO;
  const profesional = datos.profesional ?? "";
  const params = {
    nombre,
    especialidad: traducirDato(idioma, "especialidades", datos.especialidad),
    // «el Dr. J. Peralta» / «la Dra. Elena Ruiz»; en inglés, el nombre tal cual.
    profesional: idioma === "es" ? `${/^Dra\./.test(profesional) ? "la" : "el"} ${profesional}` : profesional,
    // «Cons. 1C» / «Consultorio 1C» → «1C».
    consultorio: (datos.consultorio ?? "").replace(/^(Cons\.|Consultorio)\s*/i, ""),
    fechaLarga: cuando ? fechaLarga(new Date(cuando), idioma) : "",
    fechaCorta: cuando ? fechaCorta(cuando, idioma) : "",
    hora: cuando ? hora(cuando) : "",
  };
  const base = `notificaciones.mensajes.${n.tipo}`;
  return {
    ...resto,
    titulo: traducir(idioma, `${base}.titulo` as Clave),
    cuerpo: traducir(idioma, `${base}.cuerpo` as Clave, params),
  };
}

/**
 * Notificaciones del paciente, de la más reciente a la más antigua, en su
 * idioma y con el saludo personalizado («Hola, Laura.») por su nombre de pila.
 */
export async function getNotificaciones(nombre: string, idioma: Idioma = getIdiomaActual()): Promise<Notificacion[]> {
  const pila = nombre.trim().split(/\s+/)[0] ?? "";
  return notificacionesMock
    .map((n) => redactar(n, pila, idioma))
    .sort((a, b) => new Date(b.fechaISO).getTime() - new Date(a.fechaISO).getTime());
}

export async function marcarComoLeida(id: string): Promise<void> {
  const n = notificacionesMock.find((x) => x.id === id);
  if (n) n.leida = true;
}

export function contarNoLeidas(notificaciones: Pick<Notificacion, "leida">[]): number {
  return notificaciones.filter((n) => !n.leida).length;
}

export async function marcarTodasComoLeidas(): Promise<void> {
  notificacionesMock.forEach((n) => (n.leida = true));
}
