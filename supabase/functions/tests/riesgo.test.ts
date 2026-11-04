/**
 * Pruebas de Deno de la lógica compartida de riesgo de inasistencia y de la
 * validación de la respuesta de DeepSeek (sin red: fetch falso).
 *   cd supabase/functions && deno test tests/
 */
import { assert, assertEquals, assertThrows } from "jsr:@std/assert@1";
import {
  aplicarRespuestaRiesgo,
  DatosRiesgo,
  datosParaIA,
  diaYHoraColombia,
  explicacionDeterminista,
  nivelDePuntaje,
  predecirConRespaldo,
  puntajeRiesgo,
  senalesRiesgo,
} from "../_shared/riesgo.ts";
import { DEEPSEEK_URL, motivoDeError } from "../_shared/deepseek.ts";

// Martes 2026-12-01 10:00 en Colombia (15:00 UTC).
const MARTES_10 = "2026-12-01T15:00:00Z";
// Lunes 2026-11-30 7:00 en Colombia (12:00 UTC).
const LUNES_7 = "2026-11-30T12:00:00Z";
const diasAntes = (iso: string, dias: number) => new Date(new Date(iso).getTime() - dias * 86_400_000).toISOString();

const cumplido: DatosRiesgo = {
  cita_id: "c-cumplido",
  fecha_hora: MARTES_10,
  creada_en: diasAntes(MARTES_10, 3),
  asistidas: 5,
  inasistencias: 0,
  canceladas: 0,
  ofertas_aceptadas: 1,
  ofertas_rechazadas: 0,
  ofertas_expiradas: 0,
};
const ausente: DatosRiesgo = {
  cita_id: "c-ausente",
  fecha_hora: LUNES_7,
  creada_en: diasAntes(LUNES_7, 40),
  asistidas: 2,
  inasistencias: 3,
  canceladas: 1,
  ofertas_aceptadas: 0,
  ofertas_rechazadas: 0,
  ofertas_expiradas: 2,
};

const respuestaIA = (evaluaciones: unknown) => JSON.stringify({ evaluaciones });
const evaluacion = (cita: string, nivel: string) => ({
  cita,
  nivel,
  explicacion_es: "Explicación breve basada en el historial de asistencia.",
  explicacion_en: "Short explanation based on attendance history.",
});

Deno.test("día y hora se calculan en hora de Colombia", () => {
  assertEquals(diaYHoraColombia(MARTES_10), { dia: 2, hora: 10 });
  // En UTC ya es miércoles; en Colombia sigue siendo martes a las 22:00.
  assertEquals(diaYHoraColombia("2026-12-02T03:00:00Z"), { dia: 2, hora: 22 });
});

Deno.test("puntaje determinista: historial limpio → bajo; inasistencias + antelación + lunes 7:00 → alto", () => {
  const bajo = puntajeRiesgo(senalesRiesgo(cumplido));
  const alto = puntajeRiesgo(senalesRiesgo(ausente));
  assertEquals(nivelDePuntaje(bajo), "bajo");
  assertEquals(nivelDePuntaje(alto), "alto");
  assert(alto > bajo);
  // Determinista: mismo dato, mismo puntaje.
  assertEquals(puntajeRiesgo(senalesRiesgo(ausente)), alto);
});

Deno.test("sin historial ni ofertas se usan valores neutros (no extremos)", () => {
  const s = senalesRiesgo({ ...cumplido, asistidas: 0, inasistencias: 0, ofertas_aceptadas: 0 });
  assertEquals(s.historial, 0.2);
  assertEquals(s.ofertas, 0.3);
});

Deno.test("la explicación determinista usa datos reales en es y en", () => {
  const e = explicacionDeterminista(ausente, "alto");
  assert(e.es.startsWith("Riesgo alto:"));
  assert(e.es.includes("3 inasistencia(s) en 5 citas previas"));
  assert(e.en.startsWith("High risk:"));
});

Deno.test("a la IA solo viajan alias y señales, sin ids", () => {
  const datos = JSON.stringify(datosParaIA([cumplido, ausente]));
  assert(datos.includes('"cita":"a1"') && datos.includes('"cita":"a2"'));
  assert(!datos.includes("c-cumplido") && !datos.includes("c-ausente"));
});

Deno.test("respuesta válida de la IA → estrategia ai con nivel y explicación de la IA", () => {
  const r = aplicarRespuestaRiesgo([cumplido, ausente], respuestaIA([evaluacion("a2", "alto"), evaluacion("a1", "medio")]), "m");
  assertEquals(r.map((x) => [x.cita_id, x.nivel, x.estrategia]), [
    ["c-cumplido", "medio", "ai"],
    ["c-ausente", "alto", "ai"],
  ]);
  // El puntaje sigue siendo el determinista.
  assertEquals(r[1].puntaje, puntajeRiesgo(senalesRiesgo(ausente)));
});

Deno.test("validación estricta: cada respuesta inválida descarta el lote con su motivo", () => {
  const casos: [unknown, string][] = [
    ["", "respuesta_vacia"],
    ["no es json", "json_invalido"],
    [JSON.stringify({ otra: [] }), "formato_invalido"],
    [respuestaIA([evaluacion("a9", "bajo"), evaluacion("a2", "alto")]), "cita_desconocida"],
    [respuestaIA([evaluacion("a1", "bajo"), evaluacion("a1", "bajo")]), "cita_repetida"],
    [respuestaIA([evaluacion("a1", "bajo")]), "citas_incompletas"],
    [respuestaIA([evaluacion("a1", "critico"), evaluacion("a2", "alto")]), "nivel_invalido"],
    // Determinista «bajo» → la IA no puede decir «alto» (dos escalones).
    [respuestaIA([evaluacion("a1", "alto"), evaluacion("a2", "alto")]), "nivel_incoherente"],
    [respuestaIA([{ ...evaluacion("a1", "bajo"), explicacion_es: "corta" }, evaluacion("a2", "alto")]), "explicacion_invalida"],
    [
      respuestaIA([{ ...evaluacion("a1", "bajo"), explicacion_en: "See https://example.com for details" }, evaluacion("a2", "alto")]),
      "explicacion_invalida",
    ],
    [respuestaIA([{ ...evaluacion("a1", "bajo"), explicacion_es: "x".repeat(400) }, evaluacion("a2", "alto")]), "explicacion_invalida"],
  ];
  for (const [contenido, motivo] of casos) {
    const error = assertThrows(() => aplicarRespuestaRiesgo([cumplido, ausente], contenido, "m"));
    assertEquals(motivoDeError(error), motivo, String(contenido).slice(0, 60));
  }
});

const fetchFalso = (respuesta: () => Promise<Response>) => ((url: string) => {
  assertEquals(url, DEEPSEEK_URL);
  return respuesta();
}) as unknown as typeof fetch;
const ok = (contenido: string, finish = "stop") =>
  Promise.resolve(new Response(JSON.stringify({ choices: [{ finish_reason: finish, message: { content: contenido } }] })));

Deno.test("predecirConRespaldo: con IA válida todo es ai", async () => {
  const r = await predecirConRespaldo([cumplido, ausente], {
    apiKey: "k",
    fetch: fetchFalso(() => ok(respuestaIA([evaluacion("a1", "bajo"), evaluacion("a2", "alto")]))),
  });
  assertEquals(r.map((x) => x.estrategia), ["ai", "ai"]);
});

Deno.test("predecirConRespaldo: sin clave, HTTP 500, respuesta cortada o timeout → fallback con motivo", async () => {
  const sinClave = await predecirConRespaldo([cumplido], null);
  assertEquals([sinClave[0].estrategia, sinClave[0].motivo_fallback], ["fallback", "ia_no_configurada"]);

  const http = await predecirConRespaldo([cumplido], {
    apiKey: "k",
    fetch: fetchFalso(() => Promise.resolve(new Response("x", { status: 500 }))),
  });
  assertEquals(http[0].motivo_fallback, "http_500");

  const cortada = await predecirConRespaldo([cumplido], {
    apiKey: "k",
    fetch: fetchFalso(() => ok(respuestaIA([evaluacion("a1", "bajo")]), "length")),
  });
  assertEquals(cortada[0].motivo_fallback, "respuesta_incompleta");

  const lenta = await predecirConRespaldo([cumplido], {
    apiKey: "k",
    timeoutMs: 20,
    fetch: ((_url: string, init: RequestInit) =>
      new Promise<Response>((_, rechazar) => init.signal?.addEventListener("abort", () => rechazar(new Error("abort"))))) as unknown as typeof fetch,
  });
  assertEquals([lenta[0].estrategia, lenta[0].motivo_fallback], ["fallback", "timeout"]);
  // El fallback conserva el nivel determinista.
  assertEquals(lenta[0].nivel, nivelDePuntaje(puntajeRiesgo(senalesRiesgo(cumplido))));
});
