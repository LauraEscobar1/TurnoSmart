import { Paleta, paletaClara, paletaOscura } from "@/theme/colors";
import { componer, contraste, MINIMO_AA } from "@/theme/contraste";
import { OPACIDAD_PULSO } from "@/components/Countdown";

/**
 * Contraste WCAG AA de todos los pares texto/fondo que usa la app, en los
 * dos modos. Texto normal ≥ 4,5:1; texto grande, íconos y bordes de
 * componentes ≥ 3:1.
 *
 * Fondos translúcidos (cards de vidrio, barras): se mide contra su color
 * efectivo, el relleno compuesto sobre cada punta del degradado (con y sin
 * desenfoque: iOS y Android). El tinte del desenfoque se ignora: aclara en
 * claro y oscurece en oscuro, así que solo sube el contraste del texto.
 * El número del contador pulsa: se mide en su opacidad mínima.
 */

type Tipo = keyof typeof MINIMO_AA;
interface Par {
  /** Color del texto (o del borde / relleno, en los pares de interfaz); recibe el fondo efectivo. */
  texto: (p: Paleta, fondo: string) => string;
  nombre: string;
  sobre: Superficie;
  tipo?: Tipo;
  /** Opacidad del texto (animación del contador). */
  opacidad?: number;
}
type Superficie =
  | "degradado"
  | "card"
  | "cardAcento"
  | "barra"
  | "bienvenida"
  | keyof Paleta;

/** Colores efectivos de una superficie (se toma el peor). */
function efectivos(p: Paleta, oscuro: boolean, s: Superficie): string[] {
  const puntas = [...p.degradadoFondo];
  const vidrio = (ios: string, android: string) => puntas.flatMap((f) => [componer(ios, f), componer(android, f)]);
  switch (s) {
    case "degradado":
      return [...puntas, p.fondoPantalla];
    case "card":
      return vidrio(p.fondoCard, p.fondoCardAndroid);
    case "cardAcento":
      return vidrio(p.fondoCardAcento, p.fondoCardAcentoAndroid);
    case "barra":
      return vidrio(p.fondoBarra, p.fondoBarraAndroid);
    case "bienvenida":
      // Claro: zona crema inferior. Oscuro: toda la pantalla es el degradado.
      return oscuro ? efectivos(p, oscuro, "degradado") : [p.fondoBienvenida];
    default: {
      const v = p[s];
      if (typeof v !== "string") throw new Error(`${String(s)} no es un color`);
      return [v];
    }
  }
}

const t = (k: keyof Paleta) => (p: Paleta) => p[k] as string;
const par = (k: keyof Paleta, sobre: Superficie, tipo: Tipo = "texto", opacidad?: number): Par => ({
  texto: t(k),
  nombre: String(k),
  sobre,
  tipo,
  opacidad,
});

/** Texto dentro de cards, hojas, barras e inputs (todas las superficies de contenido). */
const TEXTO_DE_CONTENIDO: (keyof Paleta)[] = [
  "text",
  "accent900",
  "accent800",
  "accent700",
  "neutral800",
  "neutral700",
  "neutral600",
  "etiquetaCampo",
  "error",
  "exito",
  "info",
  "contador",
];
const SUPERFICIES_DE_CONTENIDO: Superficie[] = ["card", "cardAcento", "barra", "superficie", "fondo", "accent100"];

const PARES: Par[] = [
  // Texto e íconos directamente sobre el degradado.
  ...(
    [
      "textoSobreFondo",
      "textoSuaveSobreFondo",
      "textoTenueSobreFondo",
      "acentoSobreFondo",
      "etiquetaCampoSobreFondo",
      "ayudaSobreFondo",
      "errorSobreFondo",
      "exitoSobreFondo",
    ] as const
  ).map((k) => par(k, "degradado")),
  par("logoSobreFondo", "degradado", "icono"),
  par("logoAcentoSobreFondo", "degradado", "icono"),
  par("puntoActivoSobreFondo", "degradado", "icono"),
  // El borde del botón primario lo separa del degradado.
  par("bordePrimario", "degradado", "icono"),
  // Inputs sobre el degradado: se distinguen del fondo por su relleno (claro) o por su borde (oscuro).
  {
    texto: (p, fondo) => {
      const borde = componer(p.bordeCampo, p.superficie);
      return contraste(p.superficie, fondo) >= contraste(borde, fondo) ? p.superficie : borde;
    },
    nombre: "límite del input",
    sobre: "degradado",
    tipo: "icono",
  },
  // Rellenos que van sobre el degradado (filtro elegido, chips, aviso de ofertas).
  par("campo", "degradado", "icono"),

  // Texto dentro de cards de vidrio, barras, hojas, inputs y tintes.
  ...TEXTO_DE_CONTENIDO.flatMap((k) => SUPERFICIES_DE_CONTENIDO.map((s) => par(k, s))),
  // Íconos de acento dentro de cards.
  ...SUPERFICIES_DE_CONTENIDO.map((s) => par("accent600", s, "icono")),
  ...SUPERFICIES_DE_CONTENIDO.map((s) => par("accent", s, "icono")),
  // El contador pulsa: también en su opacidad mínima (y en urgente, en advertencia).
  ...(["card", "cardAcento"] as const).flatMap((s) => [
    par("contador", s, "texto", OPACIDAD_PULSO),
    par("advertencia", s, "texto", OPACIDAD_PULSO),
    par("accent800", s, "texto", OPACIDAD_PULSO),
  ]),

  // Rellenos sólidos y su texto.
  par("sobreAcento", "accent"),
  par("sobreCampo", "campo"),
  par("accent900", "accent300", "icono"),
  par("sobreCampoPantalla", "campoPantalla"),
  par("textoSuaveSobreFondo", "campoPantalla"),
  par("textoTenueSobreFondo", "campoPantalla"),
  par("campoPantalla", "sobreCampoPantalla"), // botón inverso
  par("accent700", "accent200", "grande"), // iniciales del avatar (35-47 px)
  par("neutral800", "neutral100"), // badge neutro / perdido
  par("neutral700", "neutral100"),
  par("info", "infoFondo"),
  par("exito", "exitoFondo"),
  par("advertencia", "advertenciaFondo"),
  par("error", "errorFondo"),
  par("textoInsigniaIA", "fondoInsigniaIA"),
  par("sobreAcentoIA", "acentoIA", "icono"),
  par("textoBotonBienvenida", "botonBienvenida"),
  // Insignia IA y aviso de la Bienvenida en su propio contexto.
  par("text", "bienvenida"),
  par("neutral700", "bienvenida"),
  par("accent700", "bienvenida"),
  par("botonBienvenida", "bienvenida", "icono"),
  // Splash.
  par("splashTexto", "splashFondo"),
  par("splashLogo", "splashFondo", "icono"),
  par("splashAcento", "splashFondo", "icono"),
];

function fallas(p: Paleta, oscuro: boolean) {
  const resultado: string[] = [];
  for (const { texto, nombre, sobre, tipo = "texto", opacidad = 1 } of PARES) {
    for (const fondo of efectivos(p, oscuro, sobre)) {
      const color = componer(texto(p, fondo), fondo, opacidad);
      const r = contraste(color, fondo);
      if (r < MINIMO_AA[tipo]) {
        resultado.push(`${nombre} sobre ${String(sobre)} (${fondo}): ${r.toFixed(2)} < ${MINIMO_AA[tipo]}`);
      }
    }
  }
  return resultado;
}

describe("Contraste WCAG AA", () => {
  it("cálculo de referencia: negro sobre blanco es 21:1 y una card translúcida se compone", () => {
    expect(contraste("#000000", "#ffffff")).toBeCloseTo(21, 5);
    expect(componer("rgba(255,255,255,0.5)", "#000000")).toBe("#808080");
  });

  it("modo claro: todos los pares texto/fondo cumplen AA", () => {
    expect(fallas(paletaClara, false)).toEqual([]);
  });

  it("modo oscuro: todos los pares texto/fondo cumplen AA", () => {
    expect(fallas(paletaOscura, true)).toEqual([]);
  });

  it("ningún texto del tema es gris claro sobre crema: el secundario en cards es azul oscuro", () => {
    const peorSecundario = Math.min(
      ...efectivos(paletaClara, false, "card").map((f) => contraste(paletaClara.neutral600, f))
    );
    expect(peorSecundario).toBeGreaterThanOrEqual(MINIMO_AA.texto);
  });
});
