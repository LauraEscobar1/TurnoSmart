/**
 * Paleta de TurnoSmart — azules + glass.
 *
 * Base: Merino #F5EEDD, Rock Blue #84B3CE y Venice Blue #16587B; en oscuro
 * se suman Jet Black #0D0D0D y Light Blue #67BAF4.
 *
 * El lienzo de cada pantalla es un degradado azul (claro) o negro → azul
 * noche (oscuro). Sobre él van las cards de vidrio: crema translúcida en
 * claro y Venice translúcido en oscuro, con desenfoque detrás.
 *
 * Dos familias de texto, que nunca se mezclan:
 * - «…SobreFondo»: texto e íconos directamente sobre el degradado.
 * - text / neutral* / accent700-900: texto dentro de cards, hojas, inputs.
 *
 * Cada par texto/fondo está verificado contra WCAG AA en
 * `src/__tests__/contraste.test.ts` (en las cards, contra su color efectivo).
 */

/** Colores de marca. Las pantallas nunca los usan directo: usan los tokens de abajo. */
export const BASE = {
  merino: "#F5EEDD",
  rockBlue: "#84B3CE",
  veniceBlue: "#16587B",
  jetBlack: "#0D0D0D",
  lightBlue: "#67BAF4",
  /** Azul marino casi negro: texto principal en claro. */
  marino: "#0F2A3A",
  /** Azul profundo del final del degradado claro. */
  veniceProfundo: "#0E3D57",
  /** Azul noche del final del degradado oscuro. */
  azulNoche: "#0B1E2B",
};

export type TintaBlur = "light" | "dark";
/** Dos o más paradas, como pide expo-linear-gradient. */
export type Degradado = readonly [string, string, ...string[]];

export const paletaClara = {
  // ── Lienzo ────────────────────────────────────────────────────────────
  /** Degradado vertical del fondo de pantalla (arriba → abajo). */
  degradadoFondo: [BASE.veniceBlue, BASE.veniceProfundo] as Degradado,
  /** Color sólido del lienzo (navegadores, transiciones): el final del degradado. */
  fondoPantalla: BASE.veniceProfundo,

  // ── Vidrio ────────────────────────────────────────────────────────────
  /** Card de vidrio: Merino al 88 % con desenfoque detrás. */
  fondoCard: "rgba(245,238,221,0.88)",
  /** Android: sin desenfoque, el mismo color un poco más opaco. */
  fondoCardAndroid: "rgba(245,238,221,0.94)",
  bordeCard: "rgba(255,255,255,0.55)",
  /** Card de acento (hay un reloj corriendo): vidrio con tinte Rock Blue. */
  fondoCardAcento: "rgba(220,233,240,0.92)",
  fondoCardAcentoAndroid: "rgba(220,233,240,0.96)",
  bordeCardAcento: "rgba(132,179,206,0.65)",
  /** Barra de pestañas y barras de acciones al pie. */
  fondoBarra: "rgba(245,238,221,0.90)",
  fondoBarraAndroid: "rgba(245,238,221,0.96)",
  tintaBlur: "light" as TintaBlur,
  intensidadBlur: 30,

  // ── Superficies sólidas (inputs, hojas, botones redondos) ─────────────
  superficie: BASE.merino,
  /** Panel dentro de una card (grilla de datos, horarios). */
  fondo: "#ECE3CC",
  borde: "rgba(15,42,58,0.12)",

  // ── Texto e íconos sobre el degradado ─────────────────────────────────
  textoSobreFondo: BASE.merino,
  textoSuaveSobreFondo: "#DCE7EC",
  textoTenueSobreFondo: "#C5D9E5",
  acentoSobreFondo: "#BFE0F5",
  etiquetaCampoSobreFondo: "#DCE7EC",
  ayudaSobreFondo: "#C5D9E5",
  errorSobreFondo: "#FFD3C9",
  exitoSobreFondo: "#C4EBD5",
  /** Puntos y barras de progreso sobre el fondo. */
  puntoSobreFondo: "rgba(245,238,221,0.35)",
  puntoActivoSobreFondo: BASE.merino,
  divisorSobreFondo: "rgba(245,238,221,0.18)",
  /** Bienvenida: líneas de pulso sobre la zona azul y zona crema inferior. */
  trazoSobreFondo: BASE.merino,
  fondoBienvenida: BASE.merino,
  logoSobreFondo: BASE.merino,
  logoAcentoSobreFondo: BASE.rockBlue,
  botonBienvenida: BASE.veniceBlue,
  textoBotonBienvenida: BASE.merino,
  /** Arco detrás del avatar en Perfil. */
  arcoPerfil: "rgba(245,238,221,0.10)",

  // ── Roles ─────────────────────────────────────────────────────────────
  text: BASE.marino,
  /** Relleno del botón primario y de los acentos sólidos. */
  accent: BASE.veniceBlue,
  acentoPresionado: "#0F4563",
  /** Borde del botón primario: lo separa del degradado azul cuando va sobre el fondo. */
  bordePrimario: "rgba(245,238,221,0.55)",
  /** Texto e íconos sobre `accent`. */
  sobreAcento: BASE.merino,
  /** Pestaña activa, filtro elegido, chips: Rock Blue con texto marino. */
  campo: BASE.rockBlue,
  sobreCampo: BASE.marino,
  /** Campo que ocupa toda la pantalla (cupo confirmado). */
  campoPantalla: BASE.marino,
  sobreCampoPantalla: BASE.merino,
  divider: "rgba(15,42,58,0.14)",
  dividerOnField: "rgba(245,238,221,0.22)",
  velo: "rgba(9,30,43,0.55)",
  bordeCampo: "rgba(15,42,58,0.24)",
  etiquetaCampo: "#3D5A6C",
  haloCampo: "rgba(245,238,221,0.10)",
  colorSombra: BASE.azulNoche,
  pulgarSwitch: "#FFFDF7",

  /** Número del contador de la oferta. */
  contador: "#123F58",

  // ── Escala neutra (crema → marino) ────────────────────────────────────
  neutral100: "#ECE4CF",
  neutral200: "#E1D8C1",
  neutral300: "#B8B09A",
  neutral600: "#3D5A6C",
  neutral700: "#34505F",
  neutral800: "#233E4E",

  // ── Escala de acento (Rock Blue → Venice → marino) ────────────────────
  accent100: "#DCE8EE",
  accent200: "#C3D9E5",
  accent300: "#A3C6DA",
  accent400: BASE.rockBlue,
  accent600: "#1F6A91",
  accent700: BASE.veniceBlue,
  accent800: "#123F58",
  accent900: BASE.marino,

  // ── Estados ───────────────────────────────────────────────────────────
  exito: "#1D6B4E",
  exitoFondo: "#D7EBDF",
  advertencia: "#7A4500",
  advertenciaFondo: "#F5E2BC",
  error: "#A63A2E",
  errorFondo: "#F6DAD3",
  info: BASE.veniceBlue,
  infoFondo: "#DCE8EE",

  // ── IA ────────────────────────────────────────────────────────────────
  /** Aro de la insignia «Recomendado por IA»: Venice → Light Blue. */
  degradadoIA: [BASE.veniceBlue, BASE.lightBlue] as Degradado,
  fondoInsigniaIA: "#E6F0F5",
  textoInsigniaIA: "#123F58",
  /** Círculos e íconos del asistente IA. */
  acentoIA: BASE.veniceBlue,
  sobreAcentoIA: BASE.merino,

  // ── Splash (sigue al splash nativo de app.json) ───────────────────────
  splashFondo: BASE.veniceProfundo,
  splashLogo: BASE.merino,
  splashAcento: BASE.rockBlue,
  splashTexto: "#DCE7EC",

  // ── Ilustración de la doctora: arco detrás ────────────────────────────
  arcoIlustracionInicio: "#C3D9E5",
  arcoIlustracionFin: "#E9EFEF",
};

export type Paleta = typeof paletaClara;

/**
 * Modo oscuro: degradado Jet Black → azul noche, vidrio Venice translúcido
 * con borde Rock Blue tenue, texto Merino y secundario Rock Blue claro. El
 * botón primario es Rock Blue con texto oscuro; acentos e IA en Light Blue.
 */
export const paletaOscura: Paleta = {
  degradadoFondo: [BASE.jetBlack, BASE.azulNoche],
  fondoPantalla: BASE.azulNoche,

  fondoCard: "rgba(22,88,123,0.35)",
  fondoCardAndroid: "rgba(22,88,123,0.45)",
  bordeCard: "rgba(132,179,206,0.24)",
  fondoCardAcento: "rgba(22,88,123,0.55)",
  fondoCardAcentoAndroid: "rgba(22,88,123,0.62)",
  bordeCardAcento: "rgba(103,186,244,0.35)",
  fondoBarra: "rgba(22,88,123,0.30)",
  fondoBarraAndroid: "rgba(22,88,123,0.40)",
  tintaBlur: "dark",
  intensidadBlur: 40,

  superficie: "#11283A",
  fondo: "#0F2C3E",
  borde: "rgba(132,179,206,0.20)",

  textoSobreFondo: BASE.merino,
  textoSuaveSobreFondo: "#BCD5E4",
  textoTenueSobreFondo: "#A8C9DD",
  acentoSobreFondo: BASE.lightBlue,
  etiquetaCampoSobreFondo: "#BCD5E4",
  ayudaSobreFondo: "#A8C9DD",
  errorSobreFondo: "#F4A99F",
  exitoSobreFondo: "#86D4AE",
  puntoSobreFondo: "rgba(132,179,206,0.35)",
  puntoActivoSobreFondo: BASE.lightBlue,
  divisorSobreFondo: "rgba(132,179,206,0.18)",
  trazoSobreFondo: BASE.merino,
  fondoBienvenida: BASE.azulNoche,
  logoSobreFondo: BASE.merino,
  logoAcentoSobreFondo: BASE.lightBlue,
  botonBienvenida: BASE.rockBlue,
  textoBotonBienvenida: BASE.azulNoche,
  arcoPerfil: "rgba(103,186,244,0.06)",

  text: BASE.merino,
  accent: BASE.rockBlue,
  acentoPresionado: "#A3C8DE",
  bordePrimario: BASE.rockBlue,
  sobreAcento: BASE.azulNoche,
  campo: BASE.lightBlue,
  sobreCampo: BASE.azulNoche,
  campoPantalla: "#12344A",
  sobreCampoPantalla: BASE.merino,
  divider: "rgba(132,179,206,0.18)",
  dividerOnField: "rgba(245,238,221,0.16)",
  velo: "rgba(0,0,0,0.6)",
  bordeCampo: "rgba(132,179,206,0.5)",
  etiquetaCampo: "#BCD5E4",
  haloCampo: "rgba(245,238,221,0.06)",
  colorSombra: "#000000",
  pulgarSwitch: BASE.merino,
  contador: "#86C9F7",

  neutral100: "#163447",
  neutral200: "#1D4258",
  neutral300: "#3A6580",
  neutral600: "#A8C9DD",
  neutral700: "#BCD5E4",
  neutral800: "#DCE7EC",

  accent100: "#12374D",
  accent200: "#1A4A66",
  accent300: "#2B6A8F",
  accent400: "#4F95BF",
  accent600: "#7CC4F6",
  accent700: BASE.lightBlue,
  accent800: "#CDE6F8",
  accent900: BASE.merino,

  exito: "#86D4AE",
  exitoFondo: "#123A30",
  advertencia: "#F2C46B",
  advertenciaFondo: "#3A2F16",
  error: "#F4A99F",
  errorFondo: "#3F1F1D",
  info: BASE.lightBlue,
  infoFondo: "#12374D",

  degradadoIA: [BASE.veniceBlue, BASE.lightBlue],
  fondoInsigniaIA: "#0B2536",
  textoInsigniaIA: BASE.lightBlue,
  acentoIA: BASE.lightBlue,
  sobreAcentoIA: BASE.azulNoche,

  splashFondo: BASE.veniceProfundo,
  splashLogo: BASE.merino,
  splashAcento: BASE.rockBlue,
  splashTexto: "#DCE7EC",

  arcoIlustracionInicio: "#1A4A66",
  arcoIlustracionFin: "#12374D",
};

/**
 * Colores de la ilustración de la doctora (iguales en los dos modos): ropa
 * en la gama Rock Blue / Venice, piel y pelo naturales.
 */
export const paletaIlustracion = {
  bata: "#FFFDF7",
  pliegue: "#D5DEE2",
  camisa: "#BFD8E6",
  camisaSombra: "#8DB4CC",
  corbata: BASE.veniceBlue,
  corbataNudo: "#124A68",
  estetoscopio: BASE.marino,
  estetoscopioCampana: "#B4C6D1",
  estetoscopioBrillo: "#E3EAEE",
  lineaCara: "#A9BBC7",
  tablilla: "#3F7DA3",
  tablillaPapel: "#FFFDF7",
  tablillaLinea: "#D3E5EF",
  piel: "#F7C7A5",
  pielCuello: "#F5BF9B",
  pielSombra: "#EA9870",
  pielOreja: "#F2B08A",
  pielTrazo: "#E39A78",
  pielOrejaTrazo: "#DC8A62",
  pelo: "#6B3F2A",
  peloSombra: "#54301F",
  peloOscuro: "#4A291B",
  peloBrillo: "#8A5638",
  ojos: "#3A2A24",
  boca: "#D27150",
};

/**
 * Paleta clara fija, para lo que no cambia con el modo: el splash (sigue
 * al splash nativo) y los valores por defecto de tipografía y sombras.
 * Las pantallas leen la paleta activa con `useTema()`.
 */
export const colors = paletaClara;
