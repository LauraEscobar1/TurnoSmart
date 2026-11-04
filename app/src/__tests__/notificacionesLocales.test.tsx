import { act, fireEvent, screen, waitFor } from "@testing-library/react-native";
import * as Notifications from "expo-notifications";
import { CUENTA_DEMO } from "@/data/mockData";
import { montarApp, reiniciarDatos } from "@/test-utils/app";
import {
  agregarSolicitudFalsa,
  avisarRiesgoAltoFalso,
  crearCitaFalsa,
  idUsuarioFalso,
  liberarCupoFalso,
  tablaFalsa,
  vaciarListasEspera,
} from "@/test-utils/supabaseFalso";
import {
  avisarNotificacionNueva,
  avisoDeFila,
  CATEGORIA_CONFIRMAR,
  destinoDeRespuesta,
  olvidarAvisadas,
} from "@/services/notificacionesLocales";

/**
 * Notificaciones LOCALES (expo-notifications, compatibles con Expo Go):
 * Realtime avisa una fila nueva de `notificaciones` y la app muestra el aviso
 * del sistema; al tocarlo abre la oferta o la cita. El riesgo alto de
 * inasistencia llega como «Confirma tu asistencia», sin mostrar el riesgo.
 */

const DIA = 86_400_000;
const enDias = (d: number) => new Date(Date.now() + d * DIA).toISOString();
const programar = jest.mocked(Notifications.scheduleNotificationAsync);
const permisos = jest.mocked(Notifications.getPermissionsAsync);
const tocar = (Notifications as unknown as { __tocar: (r: unknown) => void }).__tocar;

/** Lo que el usuario toca: la notificación (acción por defecto) o uno de sus botones. */
const respuesta = (data: unknown, actionIdentifier = "expo.modules.notifications.actions.DEFAULT") => ({
  actionIdentifier,
  notification: { request: { identifier: `aviso-${Math.random()}`, content: { data } } },
});

const avisosProgramados = () => programar.mock.calls.map(([pedido]) => pedido.content);

beforeEach(async () => {
  await reiniciarDatos();
  jest.clearAllMocks();
  permisos.mockResolvedValue({ granted: true, canAskAgain: true } as never);
  olvidarAvisadas();
});

function demo() {
  return idUsuarioFalso(CUENTA_DEMO.email)!;
}

describe("Contenido de los avisos", () => {
  it("oferta nueva: «¡Cita de último minuto disponible!» y abre la oferta", () => {
    const aviso = avisoDeFila({
      id: "n1",
      tipo: "cupo-ultimo-minuto",
      oferta_id: "of-9",
      datos: { especialidad: "Cardiología", fechaHoraISO: "2026-12-01T15:00:00Z" },
    });
    expect(aviso?.title).toBe("¡Cita de último minuto disponible!");
    expect(aviso?.body).toMatch(/^Se liberó un cupo de Cardiología el .+ a las .+\. Tienes pocos minutos para tomarlo\.$/);
    expect(aviso?.data).toEqual({ destino: "oferta", ofertaId: "of-9" });
  });

  it("oferta priorizada por la IA: «La IA de TurnoSmart encontró un cupo para ti»", () => {
    const aviso = avisoDeFila({
      id: "n1b",
      tipo: "cupo-ultimo-minuto",
      oferta_id: "of-9",
      datos: { especialidad: "Cardiología", fechaHoraISO: "2026-12-01T15:00:00Z", estrategia: "ai" },
    });
    expect(aviso?.title).toBe("La IA de TurnoSmart encontró un cupo para ti");
    // Con el respaldo determinista, el título no menciona la IA.
    const respaldo = avisoDeFila({ id: "n1c", tipo: "cupo-ultimo-minuto", oferta_id: "of-9", datos: { estrategia: "fallback" } });
    expect(respaldo?.title).toBe("¡Cita de último minuto disponible!");
  });

  it("riesgo alto: «Confirma tu asistencia» con botones, sin mencionar el riesgo", () => {
    const aviso = avisoDeFila({
      id: "n2",
      tipo: "recordatorio",
      cita_id: "cita-7",
      datos: { especialidad: "Cardiología", fechaHoraISO: "2026-12-01T15:00:00Z", accion: "confirmar-asistencia" },
    });
    expect(aviso?.title).toBe("Confirma tu asistencia");
    expect(aviso?.categoryIdentifier).toBe(CATEGORIA_CONFIRMAR);
    expect(aviso?.data).toEqual({ destino: "cita", citaId: "cita-7" });
    expect(`${aviso?.title} ${aviso?.body}`).not.toMatch(/riesgo/i);
  });

  it("no avisa lo ya leído ni otros tipos (expiración, confirmación, recordatorio común)", () => {
    expect(avisoDeFila({ id: "a", tipo: "cupo-ultimo-minuto", oferta_id: "o", leida: true })).toBeNull();
    expect(avisoDeFila({ id: "b", tipo: "expiracion", oferta_id: "o" })).toBeNull();
    expect(avisoDeFila({ id: "c", tipo: "confirmacion", oferta_id: "o" })).toBeNull();
    expect(avisoDeFila({ id: "d", tipo: "recordatorio", cita_id: "c" })).toBeNull();
  });

  it("los botones Confirmar y Cancelar cita llevan a la cita con su acción", () => {
    const datos = { destino: "cita", citaId: "cita-7" };
    expect(destinoDeRespuesta(datos, "confirmar")).toEqual({ destino: "cita", citaId: "cita-7", accion: "confirmar" });
    expect(destinoDeRespuesta(datos, "cancelar")).toEqual({ destino: "cita", citaId: "cita-7", accion: "cancelar" });
    expect(destinoDeRespuesta(datos, "expo.modules.notifications.actions.DEFAULT")).toEqual({ destino: "cita", citaId: "cita-7" });
    expect(destinoDeRespuesta({ destino: "otro" }, "confirmar")).toBeNull();
  });

  it("avisa una sola vez por fila y nada sin permiso del sistema", async () => {
    const fila = { id: "n3", tipo: "cupo-ultimo-minuto", oferta_id: "of-1", datos: { especialidad: "Cardiología" } };
    expect(await avisarNotificacionNueva(fila)).toBe(true);
    expect(await avisarNotificacionNueva(fila)).toBe(false);
    expect(programar).toHaveBeenCalledTimes(1);

    permisos.mockResolvedValueOnce({ granted: false, canAskAgain: false } as never);
    expect(await avisarNotificacionNueva({ ...fila, id: "n4" })).toBe(false);
    expect(programar).toHaveBeenCalledTimes(1);
  });
});

describe("En la app del paciente", () => {
  it("una oferta nueva por Realtime muestra el aviso y al tocarlo abre la oferta", async () => {
    await montarApp();
    await screen.findByRole("tab", { name: "Ofertas" });
    vaciarListasEspera();
    agregarSolicitudFalsa({ pacienteId: demo(), especialidad: "Medicina general" });
    const ofertaId = liberarCupoFalso("Medicina general", enDias(2));
    expect(ofertaId).not.toBeNull();

    await waitFor(() => expect(avisosProgramados().map((c) => c.title)).toContain("¡Cita de último minuto disponible!"));
    const aviso = avisosProgramados().find((c) => c.title === "¡Cita de último minuto disponible!")!;
    expect(aviso.data).toEqual({ destino: "oferta", ofertaId });

    await act(async () => tocar(respuesta(aviso.data)));
    expect(await screen.findByText("Tiempo para responder")).toBeTruthy();
  });

  it("riesgo alto: «Confirma tu asistencia»; el botón Confirmar abre la cita y la confirma", async () => {
    const citaId = crearCitaFalsa(demo(), "Cardiología", enDias(2));
    await montarApp();
    await screen.findByRole("tab", { name: "Ofertas" });
    expect(avisarRiesgoAltoFalso(citaId)).toBe(true);

    await waitFor(() => expect(avisosProgramados().map((c) => c.title)).toContain("Confirma tu asistencia"));
    const aviso = avisosProgramados().find((c) => c.title === "Confirma tu asistencia")!;
    expect(aviso.categoryIdentifier).toBe(CATEGORIA_CONFIRMAR);

    await act(async () => tocar(respuesta(aviso.data, "confirmar")));
    expect(await screen.findByText("¡Gracias! Confirmaste tu asistencia. Te esperamos.")).toBeTruthy();
    expect(screen.getByText("Confirmada por ti")).toBeTruthy();
    expect(tablaFalsa("citas").find((c) => c.id === citaId)?.asistencia_confirmada_en).toBeTruthy();
    // El aviso de esa cita queda leído.
    expect(tablaFalsa("notificaciones").find((n) => n.cita_id === citaId)?.leida).toBe(true);
  });

  it("riesgo alto: el botón Cancelar cita abre la cita con la confirmación de cancelar", async () => {
    const citaId = crearCitaFalsa(demo(), "Cardiología", enDias(1));
    await montarApp();
    await screen.findByRole("tab", { name: "Ofertas" });
    avisarRiesgoAltoFalso(citaId);
    await waitFor(() => expect(avisosProgramados().map((c) => c.title)).toContain("Confirma tu asistencia"));
    const aviso = avisosProgramados().find((c) => c.title === "Confirma tu asistencia")!;

    await act(async () => tocar(respuesta(aviso.data, "cancelar")));
    expect(await screen.findByText("¿Cancelar esta cita?")).toBeTruthy();
    await fireEvent.press(screen.getByRole("button", { name: "Sí, cancelar cita" }));
    expect(await screen.findByText(/Cancelaste esta cita/)).toBeTruthy();
    // La cancelación libera el cupo, como desde Mis citas.
    expect(tablaFalsa("cupos").some((c) => c.cita_origen_id === citaId)).toBe(true);
  });

  it("el aviso «Confirma tu asistencia» se ve en Notificaciones, sin el nivel de riesgo", async () => {
    const citaId = crearCitaFalsa(demo(), "Cardiología", enDias(2));
    avisarRiesgoAltoFalso(citaId);
    await montarApp();
    await fireEvent.press(await screen.findByRole("tab", { name: "Notificaciones" }));
    expect(await screen.findByText("Confirma tu asistencia")).toBeTruthy();
    expect(screen.getByText(/Confírmala o, si no puedes ir, cancélala/)).toBeTruthy();
    expect(screen.queryByText(/riesgo/i)).toBeNull();
  });

  it("solo avisa una vez por cita, y no si ya confirmó", async () => {
    const citaId = crearCitaFalsa(demo(), "Cardiología", enDias(2));
    expect(avisarRiesgoAltoFalso(citaId)).toBe(true);
    expect(avisarRiesgoAltoFalso(citaId)).toBe(false);
    const otra = crearCitaFalsa(demo(), "Cardiología", enDias(1));
    tablaFalsa("citas").find((c) => c.id === otra)!.asistencia_confirmada_en = new Date().toISOString();
    expect(avisarRiesgoAltoFalso(otra)).toBe(false);
    // Fuera de los próximos 3 días tampoco.
    expect(avisarRiesgoAltoFalso(crearCitaFalsa(demo(), "Cardiología", enDias(6)))).toBe(false);
  });
});

describe("Permiso con explicación", () => {
  it("si el sistema aún no dio permiso, explica para qué sirve antes de pedirlo", async () => {
    permisos.mockResolvedValue({ granted: false, canAskAgain: true } as never);
    await montarApp();
    expect(await screen.findByText("¿Te avisamos al instante?")).toBeTruthy();
    expect(screen.getByText(/cada oferta dura solo unos minutos/)).toBeTruthy();
    await fireEvent.press(screen.getByRole("button", { name: "Activar notificaciones" }));
    expect(Notifications.requestPermissionsAsync).toHaveBeenCalled();
    await waitFor(() => expect(screen.queryByText("¿Te avisamos al instante?")).toBeNull());
  });

  it("«Ahora no» cierra la explicación sin pedir el permiso del sistema", async () => {
    permisos.mockResolvedValue({ granted: false, canAskAgain: true } as never);
    await montarApp();
    await fireEvent.press(await screen.findByRole("button", { name: "Ahora no" }));
    expect(Notifications.requestPermissionsAsync).not.toHaveBeenCalled();
    expect(screen.queryByText("¿Te avisamos al instante?")).toBeNull();
  });

  it("con el permiso ya concedido no pregunta nada", async () => {
    await montarApp();
    await screen.findByRole("tab", { name: "Ofertas" });
    expect(screen.queryByText("¿Te avisamos al instante?")).toBeNull();
  });
});

describe("Detalle de cita: Confirma tu asistencia", () => {
  it("la tarjeta confirma la asistencia y desaparece; la cita sigue cancelable", async () => {
    crearCitaFalsa(demo(), "Cardiología", enDias(2));
    await montarApp();
    await fireEvent.press(await screen.findByRole("tab", { name: "Mis citas" }));
    await fireEvent.press((await screen.findAllByText("Cardiología"))[0]);
    expect(await screen.findByText("Confirma tu asistencia")).toBeTruthy();
    await fireEvent.press(screen.getByRole("button", { name: "Confirmar asistencia" }));
    expect(await screen.findByText("¡Gracias! Confirmaste tu asistencia. Te esperamos.")).toBeTruthy();
    expect(screen.queryByText("Confirma tu asistencia")).toBeNull();
    expect(screen.getByText("Confirmada por ti")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Cancelar cita" })).toBeTruthy();
  });
});
