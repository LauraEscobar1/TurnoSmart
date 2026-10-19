import * as offers from "@/services/offersService";
import * as citas from "@/services/appointmentsService";
import { CUENTA_DEMO } from "@/data/mockData";
import { reiniciarDatos } from "@/test-utils/app";
import {
  abrirSesionFalsa,
  agregarSolicitudFalsa,
  configurarIAFalsa,
  crearCitaFalsa,
  idUsuarioFalso,
  tablaFalsa,
  ultimaPriorizacion,
  vaciarListasEspera,
} from "@/test-utils/supabaseFalso";
import {
  Candidato,
  CLAVES_IA,
  crearEstrategiaDeepSeek,
  DEEPSEEK_MODELO,
  DEEPSEEK_URL,
  datosParaIA,
  priorizarConRespaldo,
  priorizarDeterminista,
} from "../../../supabase/functions/_shared/priorizacion";

/**
 * Priorización con DeepSeek: la IA ordena y pondera los cuatro factores; el
 * servidor valida la respuesta, usa la estrategia determinista si algo
 * falla y crea la oferta con las reglas de siempre (ofrecer_cupo).
 */

const DIA = 86_400_000;
const enDias = (d: number) => new Date(Date.now() + d * DIA).toISOString();
const hace = (d: number) => new Date(Date.now() - d * DIA).toISOString();
const filas = (tabla: string, filtro: (f: Record<string, unknown>) => boolean) => tablaFalsa(tabla).filter(filtro);

// — Candidatos tal como los devuelve candidatos_cupo —

const CUPO_TARDE = "2026-12-01T20:00:00Z"; // 15:00 en Colombia

function candidato(id: string, datos: Partial<Candidato>): Candidato {
  return {
    paciente_id: id,
    especialidad: "Medicina general",
    solicitud_creada_en: hace(10),
    dias_espera: 10,
    puesto: 1,
    franja_preferida: "Tarde",
    notificaciones_activas: true,
    distancia_max_km: null,
    cupo_fecha_hora: CUPO_TARDE,
    ...datos,
  };
}

// La determinista prefiere a A (más espera, mejor puesto): c1 = A, c2 = B.
const A = candidato("11111111-1111-4111-8111-111111111111", { dias_espera: 40, puesto: 1 });
const B = candidato("22222222-2222-4222-8222-222222222222", { dias_espera: 5, puesto: 2, franja_preferida: "Indistinto" });
const CANDIDATOS = [A, B];

/** Contenido de DeepSeek: un ranking con los cuatro factores por alias. */
function ranking(items: { candidato: string; score: unknown; pesos?: Record<string, unknown> }[]) {
  return JSON.stringify({
    ranking: items.map((i) => ({
      candidato: i.candidato,
      score: i.score,
      factores: CLAVES_IA.map((clave) => ({ clave, peso: i.pesos?.[clave] ?? 0.5 })),
    })),
  });
}

const IA_PREFIERE_B = ranking([
  { candidato: "c2", score: 0.91, pesos: { especialidad: 1, horario: 0.8, "tiempo-espera": 0.3, disponibilidad: 0.95 } },
  { candidato: "c1", score: 0.42 },
]);

/** fetch falso de la API de DeepSeek. */
function fetchDeepSeek(contenido: unknown, { status = 200, finish = "stop" } = {}) {
  return jest.fn(async (_url: string, _init?: RequestInit) => ({
    ok: status >= 200 && status < 300,
    status,
    json: async () => ({ choices: [{ finish_reason: finish, message: { content: contenido } }] }),
  })) as unknown as jest.Mock & typeof fetch;
}

function deepseek(fetchFalso: typeof fetch, timeoutMs?: number) {
  return crearEstrategiaDeepSeek({ apiKey: "clave-de-prueba", fetch: fetchFalso, timeoutMs });
}

describe("DeepSeek: solicitud, respuesta y respaldo", () => {
  it("1. una priorización válida decide el orden; los factores usan los pesos de la IA y datos reales", async () => {
    const fetchFalso = fetchDeepSeek(IA_PREFIERE_B);
    const r = await priorizarConRespaldo(CANDIDATOS, deepseek(fetchFalso));

    expect(r.estrategia).toBe("ai");
    expect(r.motivo).toBeNull();
    expect(r.priorizados.map((c) => c.paciente_id)).toEqual([B.paciente_id, A.paciente_id]);
    expect(r.priorizados[0].score).toBe(0.91);
    const factores = Object.fromEntries(r.priorizados[0].factores.map((f) => [f.clave, f]));
    expect(factores.horario).toMatchObject({ etiqueta: "Horario preferido", valor: "Indistinto", peso: 0.8 });
    expect(factores["tiempo-espera"]).toMatchObject({ valor: "5 días", valor_numerico: 5, peso: 0.3 });
    expect(factores.disponibilidad).toMatchObject({ valor: "Alertas activas", peso: 0.95 });
    expect(factores.especialidad).toMatchObject({ valor: "Medicina general", peso: 1 });

    // Una sola solicitud, a la API oficial, barata y estable.
    expect(fetchFalso).toHaveBeenCalledTimes(1);
    const [url, init] = fetchFalso.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(DEEPSEEK_URL);
    expect((init.headers as Record<string, string>).Authorization).toBe("Bearer clave-de-prueba");
    const cuerpo = JSON.parse(String(init.body));
    expect(cuerpo).toMatchObject({
      model: DEEPSEEK_MODELO,
      temperature: 0,
      thinking: { type: "disabled" },
      response_format: { type: "json_object" },
      stream: false,
    });
  });

  it("solo envía alias y las señales de los cuatro factores: sin ids, especialidad ni otros datos", () => {
    const datos = datosParaIA(CANDIDATOS);
    expect(datos.cupo).toEqual({ franja: "Tarde", todos_esperan_esta_especialidad: true });
    expect(datos.candidatos).toEqual([
      { candidato: "c1", dias_espera: 40, puesto_en_lista: 1, franja_preferida: "Tarde", alertas_activas: true },
      { candidato: "c2", dias_espera: 5, puesto_en_lista: 2, franja_preferida: "Indistinto", alertas_activas: true },
    ]);
    const texto = JSON.stringify(datos);
    expect(texto).not.toContain(A.paciente_id);
    expect(texto).not.toContain("Medicina general");
  });

  it("2. JSON inválido → estrategia determinista", async () => {
    const r = await priorizarConRespaldo(CANDIDATOS, deepseek(fetchDeepSeek("{ranking: [esto no es json")));
    expect(r).toMatchObject({ estrategia: "fallback", motivo: "json_invalido" });
  });

  it("3. un paciente que no está entre los candidatos → estrategia determinista", async () => {
    for (const intruso of ["c9", A.paciente_id]) {
      const contenido = ranking([{ candidato: intruso, score: 0.99 }, { candidato: "c1", score: 0.5 }]);
      const r = await priorizarConRespaldo(CANDIDATOS, deepseek(fetchDeepSeek(contenido)));
      expect(r).toMatchObject({ estrategia: "fallback", motivo: "candidato_desconocido" });
    }
    const repetido = ranking([{ candidato: "c1", score: 0.9 }, { candidato: "c1", score: 0.8 }]);
    expect(await priorizarConRespaldo(CANDIDATOS, deepseek(fetchDeepSeek(repetido)))).toMatchObject({
      estrategia: "fallback",
      motivo: "candidato_repetido",
    });
  });

  it("4. score fuera de rango, o pesos inválidos → estrategia determinista", async () => {
    for (const score of [1.5, -0.1, "0.8", null]) {
      const r = await priorizarConRespaldo(CANDIDATOS, deepseek(fetchDeepSeek(ranking([{ candidato: "c1", score }]))));
      expect(r).toMatchObject({ estrategia: "fallback", motivo: "score_invalido" });
    }
    const pesoInvalido = ranking([{ candidato: "c1", score: 0.7, pesos: { horario: 2 } }]);
    expect(await priorizarConRespaldo(CANDIDATOS, deepseek(fetchDeepSeek(pesoInvalido)))).toMatchObject({
      motivo: "factores_invalidos",
    });
    const claveInventada = JSON.stringify({
      ranking: [{ candidato: "c1", score: 0.7, factores: [{ clave: "diagnostico", peso: 1 }] }],
    });
    expect(await priorizarConRespaldo(CANDIDATOS, deepseek(fetchDeepSeek(claveInventada)))).toMatchObject({
      motivo: "factores_invalidos",
    });
  });

  it("5. si DeepSeek no responde a tiempo, se corta la solicitud y se usa la determinista", async () => {
    let senal: AbortSignal | undefined;
    const sinRespuesta = jest.fn((_url: string, init?: RequestInit) => {
      senal = init?.signal ?? undefined;
      return new Promise<Response>(() => {});
    }) as unknown as typeof fetch;
    const r = await priorizarConRespaldo(CANDIDATOS, deepseek(sinRespuesta, 30));
    expect(r).toMatchObject({ estrategia: "fallback", motivo: "timeout" });
    expect(senal?.aborted).toBe(true);
  });

  it("errores de la API, de red, respuesta cortada o vacía → determinista", async () => {
    const casos: [typeof fetch, string][] = [
      [fetchDeepSeek(IA_PREFIERE_B, { status: 503 }), "http_503"],
      [fetchDeepSeek(IA_PREFIERE_B, { status: 402 }), "http_402"],
      [jest.fn(async () => Promise.reject(new TypeError("Network request failed"))) as unknown as typeof fetch, "error_red"],
      [fetchDeepSeek(IA_PREFIERE_B, { finish: "length" }), "respuesta_incompleta"],
      [fetchDeepSeek(""), "respuesta_vacia"],
      [fetchDeepSeek(JSON.stringify({ ranking: [] })), "formato_invalido"],
    ];
    for (const [fetchFalso, motivo] of casos) {
      expect(await priorizarConRespaldo(CANDIDATOS, deepseek(fetchFalso))).toMatchObject({ estrategia: "fallback", motivo });
    }
  });

  it("6. el respaldo es exactamente la estrategia determinista (también sin DEEPSEEK_API_KEY)", async () => {
    const sinClave = await priorizarConRespaldo(CANDIDATOS, null);
    expect(sinClave).toEqual({ priorizados: priorizarDeterminista(CANDIDATOS), estrategia: "fallback", motivo: "ia_no_configurada" });
    const conError = await priorizarConRespaldo(CANDIDATOS, deepseek(fetchDeepSeek("no es json")));
    expect(conError.priorizados).toEqual(priorizarDeterminista(CANDIDATOS));
  });

  it("los candidatos que la IA no ordenó quedan detrás, en orden determinista", async () => {
    const C = candidato("33333333-3333-4333-8333-333333333333", { dias_espera: 1, puesto: 3 });
    const r = await priorizarConRespaldo([A, B, C], deepseek(fetchDeepSeek(ranking([{ candidato: "c3", score: 0.8 }]))));
    expect(r.estrategia).toBe("ai");
    expect(r.priorizados.map((c) => c.paciente_id)).toEqual([C.paciente_id, A.paciente_id, B.paciente_id]);
  });
});

// — Con el backend: cancelación → priorización → oferta → aceptación —

describe("DeepSeek con el backend (Supabase falso)", () => {
  let demo: string;
  let espera1: string;
  let espera2: string;

  beforeEach(async () => {
    await reiniciarDatos();
    demo = idUsuarioFalso(CUENTA_DEMO.email)!;
    espera1 = idUsuarioFalso("espera1@correo.com")!;
    espera2 = idUsuarioFalso("espera2@correo.com")!;
    // Medicina general: la demo espera hace 30 días (la determinista la elige: c1) y espera1 hace 2 (c2).
    vaciarListasEspera();
    agregarSolicitudFalsa({ pacienteId: demo, especialidad: "Medicina general", creadaEn: hace(30) });
    agregarSolicitudFalsa({ pacienteId: espera1, especialidad: "Medicina general", creadaEn: hace(2) });
  });

  /** espera2 cancela su cita de Medicina general: se libera el cupo y el «servidor» lo prioriza. */
  async function liberarCupoPorCancelacion() {
    const citaId = crearCitaFalsa(espera2, "Medicina general", enDias(2));
    abrirSesionFalsa("espera2@correo.com");
    expect(await citas.cancelarCita(citaId)).not.toBeNull();
    const cupo = filas("cupos", (c) => c.cita_origen_id === citaId)[0];
    return filas("ofertas", (o) => o.cupo_id === cupo.id)[0];
  }

  it("7-8. la oferta se crea para quien eligió la IA y sus factores se guardan con los pesos de la IA", async () => {
    configurarIAFalsa(IA_PREFIERE_B);
    const oferta = await liberarCupoPorCancelacion();

    expect(ultimaPriorizacion).toEqual({ estrategia: "ai", motivo: null });
    expect(oferta).toMatchObject({ paciente_id: espera1, estado: "pendiente", score: 0.91 });
    const factores = filas("ofertas_factores", (f) => f.oferta_id === oferta.id);
    expect(factores.map((f) => f.orden)).toEqual([1, 2, 3, 4]);
    const porClave = Object.fromEntries(factores.map((f) => [f.clave, f]));
    expect(Object.keys(porClave).sort()).toEqual([...CLAVES_IA].sort());
    expect(porClave.horario).toMatchObject({ tipo: "horario", peso: 0.8, valor: "Tarde" });
    expect(porClave["tiempo-espera"]).toMatchObject({ tipo: "tiempo-espera", peso: 0.3, valor: "2 días" });
    expect(porClave.disponibilidad).toMatchObject({ tipo: "disponibilidad", peso: 0.95, valor: "Alertas activas" });
    expect(porClave.especialidad).toMatchObject({ tipo: "especialidad", peso: 1, valor: "Medicina general" });
    // Se avisa solo a la elegida, con oferta_id (chk_notificacion_referencia del proyecto real).
    const avisos = filas("notificaciones", (n) => n.referencia_id === oferta.id);
    expect(avisos.map((n) => [n.paciente_id, n.tipo, n.oferta_id, n.cita_id])).toEqual([
      [espera1, "cupo-ultimo-minuto", oferta.id, null],
    ]);
  });

  it("9-10. la paciente ve la oferta con su explicación, acepta y se crea la cita como siempre", async () => {
    configurarIAFalsa(IA_PREFIERE_B);
    const oferta = await liberarCupoPorCancelacion();

    abrirSesionFalsa("espera1@correo.com");
    const [vista] = await offers.getOfertasPendientes();
    expect(vista.id).toBe(oferta.id);
    expect(vista.factores.map((f) => f.etiqueta)).toContain("Horario preferido");
    expect(vista).not.toHaveProperty("score");

    await offers.aceptarOferta(String(oferta.id));
    expect(filas("ofertas", (o) => o.id === oferta.id)[0].estado).toBe("aceptada");
    expect(filas("cupos", (c) => c.id === oferta.cupo_id)[0].estado).toBe("tomado");
    const [cita] = filas("citas", (c) => c.oferta_id === oferta.id);
    expect(cita).toMatchObject({ paciente_id: espera1, estado: "confirmada", origen: "cupo-recuperado" });
    expect((await citas.getCitasProximas()).map((c) => c.id)).toContain(cita.id);
    // La confirmación también queda ligada a la oferta.
    expect(filas("notificaciones", (n) => n.tipo === "confirmacion" && n.oferta_id === oferta.id)).toHaveLength(1);
  });

  it("si la IA falla, el cupo se ofrece igual con la estrategia determinista", async () => {
    configurarIAFalsa("esto no es json");
    const oferta = await liberarCupoPorCancelacion();
    expect(ultimaPriorizacion).toEqual({ estrategia: "fallback", motivo: "json_invalido" });
    expect(oferta).toMatchObject({ paciente_id: demo, estado: "pendiente" });
  });

  it("la IA no puede saltarse las reglas: un paciente fuera de la lista no recibe la oferta", async () => {
    configurarIAFalsa(ranking([{ candidato: "c3", score: 1 }]));
    const oferta = await liberarCupoPorCancelacion();
    expect(ultimaPriorizacion).toEqual({ estrategia: "fallback", motivo: "candidato_desconocido" });
    expect(oferta.paciente_id).toBe(demo);
    expect(filas("ofertas", (o) => o.paciente_id === espera2)).toHaveLength(0);
  });

  it("sin DEEPSEEK_API_KEY se comporta como antes (determinista)", async () => {
    const oferta = await liberarCupoPorCancelacion();
    expect(ultimaPriorizacion).toEqual({ estrategia: "fallback", motivo: "ia_no_configurada" });
    expect(oferta.paciente_id).toBe(demo);
  });
});
