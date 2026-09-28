import * as offers from "@/services/offersService";
import * as citas from "@/services/appointmentsService";
import * as notifs from "@/services/notificationsService";
import { OfertaCupo } from "@/types/domain";
import { CUENTA_DEMO } from "@/data/mockData";
import { reiniciarDatos } from "@/test-utils/app";
import { abrirSesionFalsa } from "@/test-utils/supabaseFalso";

/** Servicios sobre el backend (Supabase falso) con la sesión de la cuenta demo. */
beforeEach(async () => {
  await reiniciarDatos();
  abrirSesionFalsa(CUENTA_DEMO.email);
});

describe("offersService", () => {
  it("devuelve la oferta pendiente y la busca por id", async () => {
    const pendiente = await offers.getOfertaPendiente();
    expect(pendiente?.id).toBe("of-001");
    expect(await offers.getOfertaPorId("of-001")).toEqual(pendiente);
    expect(await offers.getOfertaPorId("no-existe")).toBeNull();
  });

  it("al aceptar, la oferta pasa a historial y aparece como cita próxima confirmada", async () => {
    const antes = await citas.getCitasProximas();

    await offers.aceptarOferta("of-001");

    // Sale de las pendientes; la otra oferta sigue esperando respuesta.
    expect((await offers.getOfertasPendientes()).map((o) => o.id)).toEqual(["of-002"]);
    const historial = await offers.getHistorialOfertas();
    expect(historial.find((o) => o.id === "of-001")?.estado).toBe("aceptada");
    const despues = await citas.getCitasProximas();
    expect(despues).toHaveLength(antes.length + 1);
    const nueva = despues.find((c) => c.id === "c-of-001");
    expect(nueva).toMatchObject({ estado: "confirmada", origen: "cupo-recuperado", especialidad: "Cardiología" });
  });

  it("al rechazar, no crea cita", async () => {
    const antes = (await citas.getCitasProximas()).length;
    await offers.rechazarOferta("of-001");
    expect((await offers.getOfertaPorId("of-001"))?.estado).toBe("rechazada");
    expect(await citas.getCitasProximas()).toHaveLength(antes);
  });

  it("el badge de Ofertas cuenta solo pendientes vigentes", () => {
    const base = { estado: "pendiente", expiraEnISO: new Date(Date.now() + 60_000).toISOString() } as OfertaCupo;
    const vencida = { ...base, expiraEnISO: new Date(Date.now() - 1000).toISOString() };
    const aceptada = { ...base, estado: "aceptada" } as OfertaCupo;
    expect(offers.contarOfertasPendientes([base, vencida, aceptada])).toBe(1);
  });
});

describe("appointmentsService", () => {
  it("ordena las próximas por fecha y separa las pasadas", async () => {
    const proximas = await citas.getCitasProximas();
    const tiempos = proximas.map((c) => new Date(c.fechaHoraISO).getTime());
    expect(tiempos).toEqual([...tiempos].sort((a, b) => a - b));
    expect(proximas.every((c) => c.estado === "confirmada")).toBe(true);
    const pasadas = await citas.getCitasPasadas();
    expect(pasadas.length).toBeGreaterThan(0);
    expect(pasadas.every((c) => new Date(c.fechaHoraISO).getTime() < Date.now())).toBe(true);
  });
});

describe("notificationsService", () => {
  it("cuenta no leídas y las marca como leídas", async () => {
    expect(await notifs.getConteoNoLeidas()).toBe(2);
    await notifs.marcarComoLeida("n-001");
    expect(await notifs.getConteoNoLeidas()).toBe(1);
  });
});
