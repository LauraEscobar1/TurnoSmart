import * as auth from "@/services/authService";
import * as offers from "@/services/offersService";
import * as citas from "@/services/appointmentsService";
import * as notifs from "@/services/notificationsService";
import { getMisPuestos, getResumenListaEspera, sincronizarListaEspera } from "@/services/solicitudesEsperaService";
import { getSupabase } from "@/services/supabaseClient";
import { traducirFactor } from "@/i18n";
import { CUENTA_DEMO } from "@/data/mockData";
import { reiniciarDatos } from "@/test-utils/app";
import {
  abrirSesionFalsa,
  crearCitaFalsa,
  cuposPriorizados,
  idEspecialidadFalsa,
  idUsuarioFalso,
  insertsIntentados,
  simularSinConexion,
  tablaFalsa,
  vencerOfertaFalsa,
} from "@/test-utils/supabaseFalso";
import {
  aplicarRespuestaIA,
  Candidato,
  datosParaIA,
  factoresExplicacion,
  franjaDelCupo,
  priorizarDeterminista,
} from "../../../supabase/functions/_shared/priorizacion";

const DIA = 86_400_000;
const enDias = (d: number) => new Date(Date.now() + d * DIA).toISOString();

beforeEach(async () => {
  await reiniciarDatos();
  jest.restoreAllMocks();
});

function entrar(email: string) {
  abrirSesionFalsa(email);
  return idUsuarioFalso(email)!;
}
const entrarComoDemo = () => entrar(CUENTA_DEMO.email);
const filas = (tabla: string, filtro: (f: Record<string, unknown>) => boolean) => tablaFalsa(tabla).filter(filtro);

describe("Lista de espera (solicitudes_espera + RPC)", () => {
  it("el puesto es real: cuenta solo las solicitudes activas anteriores de la misma especialidad", async () => {
    const id = entrarComoDemo();
    const puestos = await getMisPuestos();
    const porEspecialidad = Object.fromEntries(puestos.map((p) => [p.especialidadId, p.puesto]));
    expect(porEspecialidad[idEspecialidadFalsa("Cardiología")]).toBe(3);
    expect(porEspecialidad[idEspecialidadFalsa("Dermatología")]).toBe(4);
    // Resumen para la UI: el mejor puesto y la alta más antigua (34 días).
    const resumen = await getResumenListaEspera(id);
    expect(resumen.puesto).toBe(3);
    expect(Math.round((Date.now() - new Date(resumen.desdeISO!).getTime()) / DIA)).toBe(34);
  });

  it("sumarse, retirarse y volver a entrar conserva el historial y no duplica", async () => {
    const id = entrarComoDemo();
    const pediatria = idEspecialidadFalsa("Pediatría");
    const dePediatria = () => filas("solicitudes_espera", (s) => s.paciente_id === id && s.especialidad_id === pediatria);

    await sincronizarListaEspera(["Cardiología", "Dermatología", "Pediatría"]);
    await sincronizarListaEspera(["Cardiología", "Dermatología", "Pediatría"]); // repetir no duplica
    expect(dePediatria().filter((s) => s.estado === "activa")).toHaveLength(1);

    await sincronizarListaEspera(["Cardiología", "Dermatología"]);
    expect(dePediatria()).toEqual([expect.objectContaining({ estado: "retirada", finalizada_en: expect.any(String) })]);

    await sincronizarListaEspera(["Cardiología", "Dermatología", "Pediatría"]);
    const historial = dePediatria();
    expect(historial.map((s) => s.estado)).toEqual(["retirada", "activa"]);
    expect(historial[0].id).not.toBe(historial[1].id); // volver a entrar crea una solicitud nueva
  });

  it("desde el perfil, las especialidades se sincronizan y el puesto se recalcula", async () => {
    entrarComoDemo();
    await auth.iniciarSesion(CUENTA_DEMO.email, CUENTA_DEMO.password);
    const p = await auth.actualizarPaciente(CUENTA_DEMO.email, { especialidadesInteres: ["Dermatología", "Nutrición"] });
    expect(p.especialidadesInteres).toEqual(["Dermatología", "Nutrición"]);
    expect(p.puestoEspera).toBe(1); // en Nutrición no espera nadie
  });

  it("un paciente solo ve su lista y no puede escribir la tabla directamente", async () => {
    entrarComoDemo();
    const { data } = await getSupabase().from("solicitudes_espera").select("id, paciente_id");
    const demo = idUsuarioFalso(CUENTA_DEMO.email);
    expect((data ?? []).every((s) => s.paciente_id === demo)).toBe(true);
    const { error } = await getSupabase().from("solicitudes_espera").insert({ especialidad_id: 1 });
    expect(error?.code).toBe("42501");
    expect(insertsIntentados).toEqual(["solicitudes_espera"]);
  });
});

describe("Citas y cupos", () => {
  it("cancelar libera un cupo (uno solo) y se ofrece al primer candidato de la lista", async () => {
    const id = entrarComoDemo();
    // c-050: Dermatología, en 14 días.
    const cancelada = await citas.cancelarCita("c-050");
    expect(cancelada?.estado).toBe("cancelada");

    const cupos = filas("cupos", (c) => c.cita_origen_id === "c-050");
    expect(cupos).toHaveLength(1);
    expect(cupos[0].estado).toBe("ofrecido");
    expect(cuposPriorizados).toEqual([cupos[0].id]);

    // Se ofreció a quien más espera en Dermatología (nunca a quien canceló), con su explicación.
    const oferta = filas("ofertas", (o) => o.cupo_id === cupos[0].id)[0];
    expect(oferta.paciente_id).toBe(idUsuarioFalso("espera1@correo.com"));
    expect(oferta.paciente_id).not.toBe(id);
    const factores = filas("ofertas_factores", (f) => f.oferta_id === oferta.id);
    expect(factores.length).toBeGreaterThan(0);
    expect(factores.length).toBeLessThanOrEqual(4);
    expect(filas("ofertas_eventos", (e) => e.oferta_id === oferta.id).map((e) => e.tipo)).toEqual(["enviada"]);
    expect(filas("notificaciones", (n) => n.referencia_id === oferta.id)).toEqual([
      expect.objectContaining({ tipo: "cupo-ultimo-minuto", paciente_id: oferta.paciente_id }),
    ]);

    // Cancelar otra vez no genera otro cupo.
    const aviso = jest.spyOn(console, "warn").mockImplementation(() => {});
    expect(await citas.cancelarCita("c-050")).toBeNull();
    expect(aviso).toHaveBeenCalledWith(expect.stringContaining("cita_no_cancelable"));
    aviso.mockRestore();
    expect(filas("cupos", (c) => c.cita_origen_id === "c-050")).toHaveLength(1);
  });

  it("no se puede cancelar ni reprogramar una cita ajena o pasada", async () => {
    const otra = entrar("espera1@correo.com");
    const ajena = crearCitaFalsa(otra, "Cardiología", enDias(5));
    entrarComoDemo();
    const aviso = jest.spyOn(console, "warn").mockImplementation(() => {});
    expect(await citas.cancelarCita(ajena)).toBeNull();
    expect(await citas.reprogramarCita(ajena, enDias(7))).toBeNull();
    expect(await citas.cancelarCita("c-032")).toBeNull(); // pasada
    expect(filas("citas", (c) => c.id === ajena)[0].estado).toBe("confirmada");
    expect(await citas.getCitaPorId(ajena)).toBeNull(); // ni siquiera la ve
    aviso.mockRestore();
  });

  it("reprogramar guarda la nueva fecha en la base", async () => {
    entrarComoDemo();
    const nueva = enDias(20);
    const cita = await citas.reprogramarCita("c-050", nueva);
    expect(cita?.fechaHoraISO).toBe(nueva);
  });
});

describe("Ofertas: aceptar, rechazar, expirar", () => {
  it("aceptar hace todo en una operación: oferta, cupo, cita, lista de espera, evento y notificación", async () => {
    const id = entrarComoDemo();
    await offers.aceptarOferta("of-001");

    expect(filas("ofertas", (o) => o.id === "of-001")[0]).toMatchObject({ estado: "aceptada" });
    expect(filas("cupos", (c) => c.id === "cupo-of-001")[0].estado).toBe("tomado");
    expect(filas("citas", (c) => c.oferta_id === "of-001")).toEqual([
      expect.objectContaining({ paciente_id: id, estado: "confirmada", origen: "cupo-recuperado" }),
    ]);
    const cardio = filas("solicitudes_espera", (s) => s.paciente_id === id && s.especialidad_id === idEspecialidadFalsa("Cardiología"));
    expect(cardio.map((s) => s.estado)).toEqual(["atendida"]);
    expect(filas("ofertas_eventos", (e) => e.oferta_id === "of-001").map((e) => e.tipo)).toEqual(["enviada", "aceptada"]);
    expect(filas("notificaciones", (n) => n.referencia_id === "of-001" && n.tipo === "confirmacion")).toHaveLength(1);

    // Aceptar de nuevo es idempotente: no duplica cita, evento ni notificación.
    await offers.aceptarOferta("of-001");
    expect(filas("citas", (c) => c.oferta_id === "of-001")).toHaveLength(1);
    expect(filas("ofertas_eventos", (e) => e.oferta_id === "of-001" && e.tipo === "aceptada")).toHaveLength(1);
  });

  it("ver una oferta registra el evento «vista» una sola vez", async () => {
    entrarComoDemo();
    await offers.getOfertaPorId("of-002");
    await offers.getOfertaPorId("of-002");
    expect(filas("ofertas_eventos", (e) => e.oferta_id === "of-002" && e.tipo === "vista")).toHaveLength(1);
  });

  it("rechazar devuelve el cupo y se ofrece al siguiente candidato", async () => {
    entrarComoDemo();
    await offers.rechazarOferta("of-001");
    expect(filas("ofertas", (o) => o.id === "of-001")[0].estado).toBe("rechazada");
    const siguiente = filas("ofertas", (o) => o.cupo_id === "cupo-of-001" && o.estado === "pendiente");
    expect(siguiente).toHaveLength(1);
    expect(siguiente[0].paciente_id).toBe(idUsuarioFalso("espera1@correo.com"));
    expect(filas("cupos", (c) => c.id === "cupo-of-001")[0].estado).toBe("ofrecido");
    expect(filas("citas", (c) => c.oferta_id === "of-001")).toHaveLength(0);
  });

  it("una oferta vencida expira sola, avisa y el cupo pasa al siguiente; ya no se puede aceptar", async () => {
    const id = entrarComoDemo();
    vencerOfertaFalsa("of-001");
    expect((await offers.getOfertasPendientes()).map((o) => o.id)).toEqual(["of-002"]);
    expect(filas("ofertas", (o) => o.id === "of-001")[0].estado).toBe("expirada");
    expect(filas("ofertas_eventos", (e) => e.oferta_id === "of-001" && e.tipo === "expirada")).toHaveLength(1);
    expect(filas("notificaciones", (n) => n.paciente_id === id && n.tipo === "expiracion" && n.referencia_id === "of-001")).toHaveLength(1);
    expect(filas("ofertas", (o) => o.cupo_id === "cupo-of-001" && o.estado === "pendiente")).toHaveLength(1);
    await expect(offers.aceptarOferta("of-001")).rejects.toBeInstanceOf(offers.OfertaNoDisponibleError);
  });

  it("aceptar justo cuando vence la marca expirada y no crea la cita", async () => {
    entrarComoDemo();
    vencerOfertaFalsa("of-002");
    await expect(offers.aceptarOferta("of-002")).rejects.toBeInstanceOf(offers.OfertaNoDisponibleError);
    expect(filas("ofertas", (o) => o.id === "of-002")[0].estado).toBe("expirada");
    expect(filas("citas", (c) => c.oferta_id === "of-002")).toHaveLength(0);
  });

  it("nadie puede aceptar, rechazar ni ver ofertas ajenas; como máximo una aceptada por cupo", async () => {
    entrar("espera1@correo.com");
    await expect(offers.aceptarOferta("of-001")).rejects.toBeInstanceOf(offers.OfertaNoDisponibleError);
    expect(await offers.getOfertaPorId("of-001")).toBeNull();
    const aviso = jest.spyOn(console, "warn").mockImplementation(() => {});
    await offers.rechazarOferta("of-001");
    aviso.mockRestore();
    expect(filas("ofertas", (o) => o.id === "of-001")[0].estado).toBe("pendiente");

    entrarComoDemo();
    await offers.aceptarOferta("of-001");
    expect(filas("ofertas", (o) => o.cupo_id === "cupo-of-001" && o.estado === "aceptada")).toHaveLength(1);
  });
});

describe("Notificaciones", () => {
  it("cada paciente ve y marca solo las suyas", async () => {
    entrar("espera1@correo.com");
    expect(await notifs.getNotificaciones("Paciente")).toEqual([]);
    await notifs.marcarComoLeida("n-001"); // ajena: no cambia
    await notifs.marcarTodasComoLeidas();
    expect(filas("notificaciones", (n) => n.id === "n-001")[0].leida).toBe(false);

    entrarComoDemo();
    await notifs.marcarTodasComoLeidas();
    expect(await notifs.getConteoNoLeidas()).toBe(0);
  });
});

describe("Seguridad de la priorización", () => {
  it("la app no puede pedir candidatos ni crear ofertas: solo la Edge Function (service_role)", async () => {
    entrarComoDemo();
    const candidatos = await getSupabase().rpc("candidatos_cupo", { p_cupo_id: "cupo-of-001" });
    expect(candidatos.error?.code).toBe("42501");
    const oferta = await getSupabase().rpc("ofrecer_cupo", { p_cupo_id: "cupo-of-001" });
    expect(oferta.error?.code).toBe("42501");
  });
});

describe("Sin conexión", () => {
  it("las pantallas reciben listas vacías o null, sin romperse; el perfil sigue con los datos locales", async () => {
    entrarComoDemo();
    await auth.iniciarSesion(CUENTA_DEMO.email, CUENTA_DEMO.password);
    const aviso = jest.spyOn(console, "warn").mockImplementation(() => {});
    simularSinConexion(true);

    expect(await offers.getOfertasPendientes()).toEqual([]);
    expect(await citas.getCitasProximas()).toEqual([]);
    expect(await citas.getCitaPorId("c-050")).toBeNull();
    expect(await notifs.getNotificaciones("Martín")).toEqual([]);
    expect(await citas.cancelarCita("c-050")).toBeNull();
    const p = await auth.actualizarPaciente(CUENTA_DEMO.email, { especialidadesInteres: ["Cardiología"] });
    expect(p.especialidadesInteres).toEqual(["Cardiología"]); // queda local
    expect(aviso).toHaveBeenCalled();

    simularSinConexion(false);
    expect(filas("citas", (c) => c.id === "c-050")[0].estado).toBe("confirmada");
  });
});

describe("Priorización con IA (lógica compartida con la Edge Function)", () => {
  const cupoTarde = "2026-10-08T21:30:00Z"; // 16:30 en Colombia
  const candidato = (paciente_id: string, dias: number, puesto: number, franja: string, alertas = true): Candidato => ({
    paciente_id,
    especialidad: "Dermatología",
    solicitud_creada_en: new Date(Date.now() - dias * DIA).toISOString(),
    dias_espera: dias,
    puesto,
    franja_preferida: franja,
    notificaciones_activas: alertas,
    distancia_max_km: null,
    cupo_fecha_hora: cupoTarde,
  });

  it("franja del cupo según la hora de Colombia", () => {
    expect(franjaDelCupo(cupoTarde)).toBe("Tarde");
    expect(franjaDelCupo("2026-10-08T14:00:00Z")).toBe("Mañana"); // 9:00
  });

  it("la estrategia determinista prioriza espera, orden, horario y disponibilidad", () => {
    const [primero, segundo, tercero] = priorizarDeterminista([
      candidato("b", 10, 3, "Mañana", false),
      candidato("a", 50, 1, "Tarde"),
      candidato("c", 30, 2, "Indistinto"),
    ]);
    expect([primero.paciente_id, segundo.paciente_id, tercero.paciente_id]).toEqual(["a", "c", "b"]);
    expect(primero.score).toBeGreaterThan(segundo.score);
  });

  it("la explicación usa datos reales, máximo 4 factores y sin distancia inventada", () => {
    const f = factoresExplicacion(candidato("a", 34, 1, "Tarde"), "alta");
    expect(f.length).toBeLessThanOrEqual(4);
    expect(f.map((x) => x.clave)).not.toContain("distancia");
    expect(f.map((x) => x.clave)).toEqual(expect.arrayContaining(["especialidad", "tiempo-espera"]));
    expect(f.find((x) => x.clave === "tiempo-espera")).toMatchObject({ valor: "34 días", valor_numerico: 34 });
    expect(f.every((x) => x.peso >= 0 && x.peso <= 1)).toBe(true);
    expect([...f].sort((a, b) => b.peso - a.peso)).toEqual(f);
  });

  it("los factores que genera el servidor se muestran traducidos en inglés", () => {
    const f = factoresExplicacion(candidato("a", 34, 1, "Tarde"), "alta");
    const enIngles = f.map((x) => `${traducirFactor("en", x.etiqueta)}: ${traducirFactor("en", x.valor)}`);
    expect(enIngles).toEqual(expect.arrayContaining(["Time waiting: 34 days", "Compatibility: High", "Your specialty: Dermatology"]));
  });

  it("la IA solo recibe alias y señales, y su orden se aplica ignorando alias desconocidos", () => {
    const base = priorizarDeterminista([candidato("id-real-1", 50, 1, "Tarde"), candidato("id-real-2", 10, 2, "Mañana")]);
    const { alias, filas: datos } = datosParaIA(base);
    expect(JSON.stringify(datos)).not.toContain("id-real");
    const ordenados = aplicarRespuestaIA(base, alias, {
      orden: [
        { alias: "desconocido", compatibilidad: "alta" },
        { alias: alias[1], compatibilidad: "alta" },
        { alias: alias[0], compatibilidad: "media" },
      ],
    });
    expect(ordenados.map((c) => c.paciente_id)).toEqual(["id-real-2", "id-real-1"]);
    expect(ordenados[0].factores.some((x) => x.clave === "compatibilidad" && x.valor === "Alta")).toBe(true);
  });
});
