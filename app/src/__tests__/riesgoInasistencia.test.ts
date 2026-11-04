import {
  aplicarRespuestaRiesgo,
  DatosRiesgo,
  datosParaIA,
  enLotes,
  INSTRUCCIONES_RIESGO,
  nivelDePuntaje,
  predecirConRespaldo,
  puntajeRiesgo,
  riesgoDeterminista,
  senalesRiesgo,
} from "../../../supabase/functions/_shared/riesgo";
import { DEEPSEEK_URL, motivoDeError } from "../../../supabase/functions/_shared/deepseek";

/**
 * Riesgo de inasistencia (supabase/functions/_shared/riesgo.ts, la misma
 * lógica que corre en la Edge Function predecir-inasistencia): puntaje
 * determinista y validación estricta de la respuesta de DeepSeek.
 * También la prueban los tests de Deno (supabase/functions/tests).
 */

const MIERCOLES_10 = "2026-12-02T15:00:00Z"; // 10:00 en Colombia
const LUNES_7 = "2026-11-30T12:00:00Z"; // 7:00 en Colombia
const antes = (iso: string, dias: number) => new Date(new Date(iso).getTime() - dias * 86_400_000).toISOString();

const base: DatosRiesgo = {
  cita_id: "cita-1",
  fecha_hora: MIERCOLES_10,
  creada_en: antes(MIERCOLES_10, 3),
  asistidas: 5,
  inasistencias: 0,
  canceladas: 0,
  ofertas_aceptadas: 1,
  ofertas_rechazadas: 0,
  ofertas_expiradas: 0,
};
const riesgosa: DatosRiesgo = {
  ...base,
  cita_id: "cita-2",
  fecha_hora: LUNES_7,
  creada_en: antes(LUNES_7, 40),
  asistidas: 2,
  inasistencias: 3,
  ofertas_aceptadas: 0,
  ofertas_expiradas: 2,
};

const puntaje = (d: DatosRiesgo) => puntajeRiesgo(senalesRiesgo(d));
const evaluacion = (cita: string, nivel: string) => ({
  cita,
  nivel,
  explicacion_es: "Historial de asistencia y antelación de la cita.",
  explicacion_en: "Attendance history and booking lead time.",
});
const json = (evaluaciones: unknown[]) => JSON.stringify({ evaluaciones });

describe("Puntaje determinista", () => {
  it("es estable y está entre 0 y 1", () => {
    for (const d of [base, riesgosa]) {
      expect(puntaje(d)).toBe(puntaje(d));
      expect(puntaje(d)).toBeGreaterThanOrEqual(0);
      expect(puntaje(d)).toBeLessThanOrEqual(1);
    }
  });

  it("cada factor sube el riesgo por separado", () => {
    expect(puntaje({ ...base, inasistencias: 3 })).toBeGreaterThan(puntaje(base));
    expect(puntaje({ ...base, creada_en: antes(MIERCOLES_10, 30) })).toBeGreaterThan(puntaje(base));
    expect(puntaje({ ...base, fecha_hora: LUNES_7, creada_en: antes(LUNES_7, 3) })).toBeGreaterThan(puntaje(base));
    expect(puntaje({ ...base, ofertas_expiradas: 2 })).toBeGreaterThan(puntaje(base));
    // Vencer una oferta sin responder pesa más que rechazarla.
    expect(puntaje({ ...base, ofertas_expiradas: 1 })).toBeGreaterThan(puntaje({ ...base, ofertas_rechazadas: 1 }));
  });

  it("clasifica en bajo, medio y alto con los umbrales 0,25 y 0,45", () => {
    expect([nivelDePuntaje(0.1), nivelDePuntaje(0.25), nivelDePuntaje(0.44), nivelDePuntaje(0.45)]).toEqual([
      "bajo",
      "medio",
      "medio",
      "alto",
    ]);
    expect(riesgoDeterminista(base, "ia_no_configurada").nivel).toBe("bajo");
    expect(riesgoDeterminista(riesgosa, "ia_no_configurada").nivel).toBe("alto");
  });

  it("el respaldo explica con datos reales en español e inglés", () => {
    const r = riesgoDeterminista(riesgosa, "timeout");
    expect(r).toMatchObject({ estrategia: "fallback", motivo_fallback: "timeout", modelo: null });
    expect(r.explicacion_es).toMatch(/^Riesgo alto: .*3 inasistencia\(s\) en 5 citas previas/);
    expect(r.explicacion_en).toMatch(/^High risk: /);
  });
});

describe("Datos para la IA", () => {
  it("solo viajan alias y señales: sin ids de cita ni datos clínicos", () => {
    const datos = datosParaIA([base, riesgosa]);
    expect(datos.citas.map((c) => c.cita)).toEqual(["a1", "a2"]);
    expect(JSON.stringify(datos)).not.toMatch(/cita-1|cita-2|paciente|cedula|diagn/i);
    expect(INSTRUCCIONES_RIESGO).toMatch(/json/);
  });

  it("parte la agenda en lotes de 20", () => {
    expect(enLotes(Array.from({ length: 45 }, (_, i) => i)).map((l) => l.length)).toEqual([20, 20, 5]);
  });
});

describe("Validación de la respuesta de la IA", () => {
  it("acepta una respuesta completa y conserva el puntaje determinista", () => {
    const r = aplicarRespuestaRiesgo([base, riesgosa], json([evaluacion("a2", "alto"), evaluacion("a1", "medio")]), "deepseek-flash");
    expect(r.map((x) => [x.cita_id, x.nivel, x.estrategia, x.modelo])).toEqual([
      ["cita-1", "medio", "ai", "deepseek-flash"],
      ["cita-2", "alto", "ai", "deepseek-flash"],
    ]);
    expect(r[0].puntaje).toBe(puntaje(base));
  });

  it.each([
    ["vacía", "", "respuesta_vacia"],
    ["no JSON", "{ranking", "json_invalido"],
    ["sin evaluaciones", JSON.stringify({ ranking: [] }), "formato_invalido"],
    ["alias desconocido", json([evaluacion("a7", "bajo"), evaluacion("a2", "alto")]), "cita_desconocida"],
    ["alias repetido", json([evaluacion("a1", "bajo"), evaluacion("a1", "bajo")]), "cita_repetida"],
    ["faltan citas", json([evaluacion("a2", "alto")]), "citas_incompletas"],
    ["nivel fuera de la lista", json([evaluacion("a1", "muy bajo"), evaluacion("a2", "alto")]), "nivel_invalido"],
    ["salta dos niveles", json([evaluacion("a1", "alto"), evaluacion("a2", "alto")]), "nivel_incoherente"],
    ["explicación vacía", json([{ ...evaluacion("a1", "bajo"), explicacion_en: "" }, evaluacion("a2", "alto")]), "explicacion_invalida"],
    ["explicación con correo", json([{ ...evaluacion("a1", "bajo"), explicacion_es: "Escribir a x@y.co para confirmar" }, evaluacion("a2", "alto")]), "explicacion_invalida"],
  ])("descarta el lote si la respuesta es %s", (_caso, contenido, motivo) => {
    let error: unknown;
    try {
      aplicarRespuestaRiesgo([base, riesgosa], contenido, "m");
    } catch (e) {
      error = e;
    }
    expect(motivoDeError(error)).toBe(motivo);
  });

  it("con la IA caída usa el respaldo determinista, sin rechazar", async () => {
    const fetchCaido = jest.fn(async () => ({ ok: false, status: 503 }) as Response);
    const r = await predecirConRespaldo([base, riesgosa], { apiKey: "k", fetch: fetchCaido as unknown as typeof fetch });
    expect(fetchCaido).toHaveBeenCalledWith(DEEPSEEK_URL, expect.any(Object));
    expect(r.map((x) => [x.estrategia, x.motivo_fallback, x.nivel])).toEqual([
      ["fallback", "http_503", "bajo"],
      ["fallback", "http_503", "alto"],
    ]);
  });

  it("con una respuesta válida usa la IA en modo JSON, sin razonamiento y con temperatura 0", async () => {
    const fetchOk = jest.fn(
      async () =>
        ({
          ok: true,
          json: async () => ({
            choices: [{ finish_reason: "stop", message: { content: json([evaluacion("a1", "bajo"), evaluacion("a2", "alto")]) } }],
          }),
        }) as unknown as Response
    );
    const r = await predecirConRespaldo([base, riesgosa], { apiKey: "k", fetch: fetchOk as unknown as typeof fetch });
    expect(r.map((x) => x.estrategia)).toEqual(["ai", "ai"]);
    const cuerpo = JSON.parse((fetchOk.mock.calls[0] as unknown as [string, RequestInit])[1].body as string);
    expect(cuerpo).toMatchObject({ temperature: 0, thinking: { type: "disabled" }, response_format: { type: "json_object" } });
  });
});
