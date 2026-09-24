import { OfertaCupo } from "@/types/domain";

/** Los mocks son mutables: cada prueba carga módulos frescos. */
function cargar() {
  let mod!: {
    data: typeof import("@/data/mockData");
    offers: typeof import("@/services/offersService");
    citas: typeof import("@/services/appointmentsService");
    notifs: typeof import("@/services/notificationsService");
  };
  jest.isolateModules(() => {
    mod = {
      data: require("@/data/mockData"),
      offers: require("@/services/offersService"),
      citas: require("@/services/appointmentsService"),
      notifs: require("@/services/notificationsService"),
    };
  });
  return mod;
}

describe("offersService", () => {
  it("devuelve la oferta pendiente y la busca por id", async () => {
    const { offers } = cargar();
    const pendiente = await offers.getOfertaPendiente();
    expect(pendiente?.id).toBe("of-001");
    expect(await offers.getOfertaPorId("of-001")).toBe(pendiente);
    expect(await offers.getOfertaPorId("no-existe")).toBeNull();
  });

  it("al aceptar, la oferta pasa a historial y aparece como cita próxima confirmada", async () => {
    const { offers, citas } = cargar();
    const antes = await citas.getCitasProximas();

    await offers.aceptarOferta("of-001");

    expect(await offers.getOfertaPendiente()).toBeNull();
    const historial = await offers.getHistorialOfertas();
    expect(historial.find((o) => o.id === "of-001")?.estado).toBe("aceptada");
    const despues = await citas.getCitasProximas();
    expect(despues).toHaveLength(antes.length + 1);
    const nueva = despues.find((c) => c.id === "c-of-001");
    expect(nueva).toMatchObject({ estado: "confirmada", origen: "cupo-recuperado", especialidad: "Cardiología" });
  });

  it("al rechazar, no crea cita", async () => {
    const { offers, citas } = cargar();
    const antes = (await citas.getCitasProximas()).length;
    await offers.rechazarOferta("of-001");
    expect((await offers.getOfertaPorId("of-001"))?.estado).toBe("rechazada");
    expect(await citas.getCitasProximas()).toHaveLength(antes);
  });

  it("el badge de Ofertas cuenta solo pendientes vigentes", () => {
    const { offers } = cargar();
    const base = { estado: "pendiente", expiraEnISO: new Date(Date.now() + 60_000).toISOString() } as OfertaCupo;
    const vencida = { ...base, expiraEnISO: new Date(Date.now() - 1000).toISOString() };
    const aceptada = { ...base, estado: "aceptada" } as OfertaCupo;
    expect(offers.contarOfertasPendientes([base, vencida, aceptada])).toBe(1);
  });
});

describe("appointmentsService", () => {
  it("ordena las próximas por fecha y separa las pasadas", async () => {
    const { citas } = cargar();
    const proximas = await citas.getCitasProximas();
    const tiempos = proximas.map((c) => new Date(c.fechaHoraISO).getTime());
    expect(tiempos).toEqual([...tiempos].sort((a, b) => a - b));
    expect(proximas.every((c) => c.estado === "confirmada")).toBe(true);
    const pasadas = await citas.getCitasPasadas();
    expect(pasadas.every((c) => new Date(c.fechaHoraISO).getTime() < Date.now())).toBe(true);
  });
});

describe("notificationsService", () => {
  it("cuenta no leídas y las marca como leídas", async () => {
    const { notifs, data } = cargar();
    expect(notifs.contarNoLeidas(data.notificacionesMock)).toBe(2);
    await notifs.marcarComoLeida("n-001");
    expect(notifs.contarNoLeidas(data.notificacionesMock)).toBe(1);
  });
});
