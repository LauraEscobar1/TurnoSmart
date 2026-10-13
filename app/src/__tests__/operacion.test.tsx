import { fireEvent, screen } from "@testing-library/react-native";
import * as offers from "@/services/offersService";
import { CUENTA_DEMO } from "@/data/mockData";
import { montarApp, reiniciarDatos } from "@/test-utils/app";
import {
  abrirSesionFalsa,
  agregarSolicitudFalsa,
  canalesRealtime,
  crearCitaFalsa,
  idUsuarioFalso,
  liberarCupoFalso,
  simularSinConexion,
  tablaFalsa,
  vaciarListasEspera,
} from "@/test-utils/supabaseFalso";

/**
 * Operación de las ofertas con el backend: errores al responder, reglas de
 * candidatos de la migración 20261010220000 y actualización en vivo
 * (Realtime sobre `notificaciones`).
 */

const DIA = 86_400_000;
const enDias = (d: number) => new Date(Date.now() + d * DIA).toISOString();
const filas = (tabla: string, filtro: (f: Record<string, unknown>) => boolean) => tablaFalsa(tabla).filter(filtro);

beforeEach(async () => {
  await reiniciarDatos();
  jest.restoreAllMocks();
});

function entrarComoDemo() {
  abrirSesionFalsa(CUENTA_DEMO.email);
  return idUsuarioFalso(CUENTA_DEMO.email)!;
}

/** Deja a la paciente demo sola en la lista de esa especialidad: el próximo cupo es para ella. */
function soloDemoEnEspera(especialidad: string) {
  const id = idUsuarioFalso(CUENTA_DEMO.email)!;
  vaciarListasEspera();
  agregarSolicitudFalsa({ pacienteId: id, especialidad });
  return id;
}

describe("Responder ofertas: errores", () => {
  it("si la respuesta no llega al servidor, la oferta sigue pendiente y reintentar funciona", async () => {
    entrarComoDemo();
    simularSinConexion(true);
    await expect(offers.aceptarOferta("of-001")).rejects.toBeInstanceOf(offers.RespuestaNoEnviadaError);
    await expect(offers.rechazarOferta("of-001")).rejects.toBeInstanceOf(offers.RespuestaNoEnviadaError);
    simularSinConexion(false);
    expect(filas("ofertas", (o) => o.id === "of-001")[0].estado).toBe("pendiente");

    await offers.aceptarOferta("of-001");
    expect(filas("citas", (c) => c.oferta_id === "of-001")).toHaveLength(1);
    // Aceptar dos veces (p. ej. un reintento) no duplica la cita.
    await offers.aceptarOferta("of-001");
    expect(filas("citas", (c) => c.oferta_id === "of-001")).toHaveLength(1);
  });

  it("detalle de oferta: sin conexión muestra el aviso y no sale; al reintentar confirma", async () => {
    await montarApp();
    await fireEvent.press(await screen.findByRole("tab", { name: "Ofertas" }));
    await fireEvent.press((await screen.findAllByRole("button", { name: "Ver detalles" }))[0]);
    await screen.findByText("Tiempo para responder");

    simularSinConexion(true);
    await fireEvent.press(screen.getByRole("button", { name: "Aceptar cupo" }));
    expect(await screen.findByText(/No pudimos enviar tu respuesta/)).toBeTruthy();
    expect(screen.getByText("Tiempo para responder")).toBeTruthy();

    simularSinConexion(false);
    await fireEvent.press(screen.getByRole("button", { name: "Aceptar cupo" }));
    expect(await screen.findByText("Cupo confirmado")).toBeTruthy();
  });
});

describe("Candidatos de un cupo (migración 20261010220000)", () => {
  it("un cupo cuya hora ya pasó no se ofrece a nadie y queda cerrado", () => {
    soloDemoEnEspera("Medicina general");
    expect(liberarCupoFalso("Medicina general", new Date(Date.now() - 60_000).toISOString())).toBeNull();
    expect(filas("cupos", (c) => c.motivo === "otro").map((c) => c.estado)).toEqual(["expirado"]);
  });

  it("no se ofrece a quien ya tiene una cita confirmada a esa misma hora", () => {
    const demo = soloDemoEnEspera("Medicina general");
    const cuando = enDias(3);
    crearCitaFalsa(demo, "Cardiología", cuando);
    expect(liberarCupoFalso("Medicina general", cuando)).toBeNull();
    // A otra hora, sí.
    expect(liberarCupoFalso("Medicina general", enDias(4))).not.toBeNull();
  });
});

describe("Actualización en vivo", () => {
  it("con la sesión abierta escucha solo sus notificaciones, y deja de escuchar al salir", async () => {
    const { unmount } = await montarApp();
    await screen.findByRole("tab", { name: "Ofertas" });
    const demo = idUsuarioFalso(CUENTA_DEMO.email)!;
    expect(canalesRealtime.map((c) => c.filtro)).toEqual([`paciente_id=eq.${demo}`]);
    await unmount();
    expect(canalesRealtime).toHaveLength(0);
  });

  it("una oferta nueva aparece en Ofertas sin cambiar de pantalla", async () => {
    await montarApp();
    await fireEvent.press(await screen.findByRole("tab", { name: "Ofertas" }));
    expect(await screen.findByText("2 ofertas requieren tu respuesta")).toBeTruthy();

    soloDemoEnEspera("Medicina general");
    expect(liberarCupoFalso("Medicina general", enDias(2))).not.toBeNull();
    expect(await screen.findByText("3 ofertas requieren tu respuesta")).toBeTruthy();
  });
});
