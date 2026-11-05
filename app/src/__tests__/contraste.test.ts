import { Paleta, paletaClara, paletaOscura } from "@/theme/colors";
import { componer, contraste, luminancia, MINIMO_AA } from "@/theme/contraste";
import { OPACIDAD_PULSO } from "@/components/Countdown";

/**
 * Contraste WCAG AA de todos los pares texto/fondo e ícono/fondo que usa
 * la app, en los dos modos. Texto normal ≥ 4,5:1; texto grande, íconos y bordes de
 * componentes ≥ 3:1.
 *
 * Fondos translúcidos (cards de vidrio, barras): se mide contra su color
 * efectivo, el relleno compuesto sobre cada punta del degradado (con y sin
 * desenfoque: iOS y Android). El tinte del desenfoque se ignora: aclara en
 * claro y oscurece en oscuro, así que solo sube el contraste del texto.
 * El número del contador pulsa: se mide en su opacidad mínima.
 */

type Tipo = keyof typeof MINIMO_AA;
type Estado = "exito" | "advertencia" | "error" | "info" | "neutral";
const ESTADOS: Estado[] = ["exito", "advertencia", "error", "info", "neutral"];
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
  | "indicadorSobreBarra"
  | `badge:${Estado}`
  | "circuloIcono"
  | "bannerPerfil"
  | "botonBannerPerfil"
  | "panelIA"
  | "estadoInactivo"
  | "chip"
  | "botonDestructivo"
  | "bienvenida"
  | keyof Paleta;

/** Panel del asistente: su relleno sobre la pantalla oscurecida por el velo (cada punta del degradado). */
function panelesIA(p: Paleta): string[] {
  return p.degradadoFondo.map((f) => componer(p.fondoPanelIA, componer(p.velo, f)));
}

/** Colores efectivos de una superficie (se toma el peor). */
function efectivos(p: Paleta, oscuro: boolean, s: Superficie): string[] {
  const puntas = [...p.degradadoFondo];
  const vidrio = (ios: string, android: string, fondos = puntas) =>
    fondos.flatMap((f) => [componer(ios, f), componer(android, f)]);
  // Las cards van sobre el degradado o dentro del panel del asistente IA.
  const fondosCard = [...puntas, ...panelesIA(p)];
  switch (s) {
    case "degradado":
      return [...puntas, p.fondoPantalla];
    case "card":
      return vidrio(p.fondoCard, p.fondoCardAndroid, fondosCard);
    case "cardAcento":
      return vidrio(p.fondoCardAcento, p.fondoCardAcentoAndroid, fondosCard);
    case "barra":
      return vidrio(p.fondoBarra, p.fondoBarraAndroid);
    case "indicadorSobreBarra":
      return efectivos(p, oscuro, "barra").map((f) => componer(p.indicadorTab, f));
    case "circuloIcono":
      // Círculo metalizado: cada parada del degradado plata.
      return [...p.metalCirculo];
    case "bannerPerfil": {
      // Va arriba en la pantalla: se compone sobre el degradado entre el 0 y el 20 % de su alto.
      const [arriba, abajo] = p.degradadoFondo;
      return Array.from({ length: 11 }, (_, i) => componer(p.bannerPerfil, componer(abajo, arriba, (i * 0.2) / 10)));
    }
    case "botonBannerPerfil":
      // Botón redondo (lápiz) sobre el banner.
      return efectivos(p, oscuro, "bannerPerfil").map((f) => componer(p.botonBannerPerfil, f));
    case "panelIA":
      return panelesIA(p);
    case "chip":
      return [...efectivos(p, oscuro, "card"), ...efectivos(p, oscuro, "cardAcento")].map((f) => componer(p.fondoChip, f));
    case "estadoInactivo":
      // Píldora de estado de una cita inactiva, sobre la ficha (superficie).
      return [componer(p.neutralTinte, p.superficie)];
    case "botonDestructivo":
      // «Cancelar cita» va al final del contenido, sobre el fondo.
      return efectivos(p, oscuro, "degradado").map((f) => componer(p.botonDestructivoFondo, f));
    case "bienvenida":
      // Zona inferior de la Bienvenida: blanca en claro, azul profundo en oscuro.
      return [p.fondoBienvenida];
    default: {
      if (s.startsWith("badge:")) {
        const e = s.slice(6) as Estado;
        const tinte = p[`${e}Tinte` as keyof Paleta] as string;
        // El badge va sobre cards (normal o de acento): tinte compuesto sobre su color efectivo.
        return [...efectivos(p, oscuro, "card"), ...efectivos(p, oscuro, "cardAcento")].map((f) => componer(tinte, f));
      }
      const v = p[s as keyof Paleta];
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
const SUPERFICIES_DE_CONTENIDO: Superficie[] = ["card", "cardAcento", "superficie", "fondo", "accent100"];

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
  // Filtro / chip elegido contra uno sin elegir: el estado se distingue.
  par("campo", "superficie", "icono"),

  // Texto dentro de cards de vidrio, barras, hojas, inputs y tintes.
  ...TEXTO_DE_CONTENIDO.flatMap((k) => SUPERFICIES_DE_CONTENIDO.map((s) => par(k, s))),
  // Único token de ícono, en todas las superficies de contenido (y el ícono del aviso de ofertas).
  ...SUPERFICIES_DE_CONTENIDO.map((s) => par("icono", s, "icono")),
  par("icono", "accent300", "icono"),
  // Barra de pestañas: íconos y etiquetas, activos (sobre el indicador) e inactivos.
  par("iconoTabInactivo", "barra", "icono"),
  par("textoTabInactivo", "barra"),
  {
    texto: (p) => p.iconoTabActivo,
    nombre: "iconoTabActivo",
    sobre: "indicadorSobreBarra",
    tipo: "icono",
  },
  { texto: (p) => p.textoTabActivo, nombre: "textoTabActivo", sobre: "indicadorSobreBarra" },
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
  par("suaveSobreCampoPantalla", "campoPantalla"),
  par("campoPantalla", "sobreCampoPantalla"), // botón inverso
  par("accent700", "accent200", "grande"), // iniciales del avatar (35-47 px)
  par("neutral800", "neutral100"), // badge neutro / perdido
  par("neutral700", "neutral100"),
  par("info", "infoFondo"),
  par("exito", "exitoFondo"),
  par("advertencia", "advertenciaFondo"),
  par("error", "errorFondo"),
  // Badges de vidrio: texto intenso del mismo color sobre su tinte.
  ...ESTADOS.map((e) => par(`${e}Texto` as keyof Paleta, `badge:${e}`)),
  // Íconos dentro de su círculo de vidrio con brillo.
  par("icono", "circuloIcono", "icono"),
  // El robot de IA en su insignia y la cabecera de Perfil.
  par("textoInsigniaIA", "fondoInsigniaIA", "icono"),
  // Perfil: nombre y correo sobre el banner, y el ícono del lápiz en su botón.
  par("textoBannerPerfil", "bannerPerfil"),
  par("textoBannerPerfil", "botonBannerPerfil", "icono"),
  // Panel del asistente IA: su texto.
  par("textoPanelIA", "panelIA"),
  par("textoSuavePanelIA", "panelIA"),
  // Chips de la lista de espera y su texto de «buscando cupo».
  par("accent900", "chip"),
  par("neutral600", "chip"),
  par("accent700", "card"),
  par("neutralTexto", "estadoInactivo"),
  // Botón destructivo de vidrio (Cancelar cita), sobre el fondo o en una card.
  par("botonDestructivoTexto", "botonDestructivo"),
  // El botón destructivo se distingue del fondo por su relleno (claro) o por su borde (oscuro).
  {
    texto: (p, fondo) => {
      const relleno = componer(p.botonDestructivoFondo, fondo);
      return contraste(relleno, fondo) >= contraste(p.botonDestructivoBorde, fondo) ? relleno : p.botonDestructivoBorde;
    },
    nombre: "límite del botón destructivo",
    sobre: "degradado",
    tipo: "icono",
  },
  // Avisos sólidos sobre el fondo (texto blanco).
  par("sobreEstado", "exitoSolido"),
  par("sobreEstado", "advertenciaSolido"),
  par("sobreEstado", "errorSolido"),
  par("sobreEstado", "infoSolido"),
  par("textoInsigniaIA", "fondoInsigniaIA"),
  par("sobreAcentoIA", "acentoIA", "icono"),
  par("textoBotonBienvenida", "botonBienvenida"),
  // Insignia IA y aviso de la Bienvenida en su propio contexto.
  // Texto de la Bienvenida: de card en claro (zona blanca), «sobre fondo» en oscuro.
  ...(
    [
      ["text", "textoSobreFondo"],
      ["neutral700", "textoSuaveSobreFondo"],
      ["accent700", "acentoSobreFondo"],
      ["botonBienvenida", "botonBienvenida"],
    ] as const
  ).map(
    ([claro, oscuro]): Par => ({
      texto: (p) => (p === paletaOscura ? p[oscuro] : p[claro]),
      nombre: `${claro} / ${oscuro}`,
      sobre: "bienvenida",
    })
  ),
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

  it("ningún fondo, card ni barra es negro o casi negro", () => {
    const casiNegro = (c: string) => contraste(c, "#000000") < 1.5;
    for (const p of [paletaClara, paletaOscura]) {
      for (const s of ["degradado", "card", "cardAcento", "barra", "superficie", "fondo"] as const) {
        expect(efectivos(p, p === paletaOscura, s).filter(casiNegro)).toEqual([]);
      }
    }
  });

  it.each([
    ["claro", paletaClara],
    ["oscuro", paletaOscura],
  ] as const)("modo %s: las cards de vidrio se distinguen del fondo (luminancia ≥ 1,4:1; en oscuro ≥ 2:1)", (_, p) => {
    const minimo = p === paletaOscura ? 2 : 1.4;
    const separacion: string[] = [];
    for (const fondo of p.degradadoFondo) {
      for (const relleno of [p.fondoCard, p.fondoCardAndroid, p.fondoCardAcento, p.fondoCardAcentoAndroid]) {
        const card = componer(relleno, fondo);
        const r = contraste(card, fondo);
        // Y siempre más clara que el fondo.
        if (r < minimo || luminancia(card) <= luminancia(fondo)) separacion.push(`${relleno} sobre ${fondo}: ${r.toFixed(2)}`);
      }
    }
    expect(separacion).toEqual([]);
  });

  it("ningún texto del tema es gris claro sobre blanco: el secundario en cards es azul oscuro", () => {
    const peorSecundario = Math.min(
      ...efectivos(paletaClara, false, "card").map((f) => contraste(paletaClara.neutral600, f))
    );
    expect(peorSecundario).toBeGreaterThanOrEqual(MINIMO_AA.texto);
  });
});
