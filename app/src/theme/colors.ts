/**
 * Paleta de TurnoSmart — azules + glass.
 *
 * Claro: celestes Tractor Beam #05BFFD → Perivinkle #028EF3 de lienzo, cards
 * de vidrio blanco y texto Subnautical #011E50 (nunca blanco sobre celeste).
 * Oscuro: el degradado Venice Blue #16587B → azul profundo #0E3D57, cards de
 * vidrio azul claro translúcido y texto Merino #F5EEDD.
 * Ningún fondo, card ni barra es negro o casi negro.
 *
 * Dos familias de texto, que nunca se mezclan:
 * - «…SobreFondo»: texto e íconos directamente sobre el degradado.
 * - text / neutral* / accent700-900: texto dentro de cards, hojas, inputs.
 * Los íconos de contenido usan un único token por modo: `icono`.
 *
 * Cada par texto/fondo está verificado contra WCAG AA en
 * `src/__tests__/contraste.test.ts` (en las cards, contra su color efectivo).
 */

/** Colores de marca. Las pantallas nunca los usan directo: usan los tokens de abajo. */
export const BASE = {
  // Claro
  tractorBeam: "#05BFFD",
  perivinkle: "#028EF3",
  wizardBlue: "#036CD2",
  blueLobster: "#0250A9",
  cobalt: "#02357B",
  subnautical: "#011E50",
  blanco: "#FFFFFF",
  // Oscuro
  merino: "#F5EEDD",
  rockBlue: "#84B3CE",
  veniceBlue: "#16587B",
  lightBlue: "#67BAF4",
  /** Azul profundo del final del degradado oscuro. */
  veniceProfundo: "#0E3D57",
  /** Azul oscuro del texto sobre Rock Blue. */
  azulTinta: "#0E2A3D",
};

/** Estados sólidos e intensos, con texto blanco: iguales en los dos modos. */
const ESTADOS_SOLIDOS = {
  exitoSolido: "#1E7A4F",
  advertenciaSolido: "#B45309",
  errorSolido: "#B42318",
  infoSolido: BASE.wizardBlue,
  sobreEstado: BASE.blanco,
};

/** Splash: fijo, sigue al splash nativo de app.json. */
const SPLASH = {
  splashFondo: BASE.blueLobster,
  splashLogo: BASE.blanco,
  splashAcento: BASE.tractorBeam,
  splashTexto: BASE.blanco,
};

export type TintaBlur = "light" | "dark";
/** Dos o más paradas, como pide expo-linear-gradient. */
export type Degradado = readonly [string, string, ...string[]];

export const paletaClara = {
  // ── Lienzo ────────────────────────────────────────────────────────────
  /** Degradado vertical del fondo de pantalla (arriba → abajo). */
  degradadoFondo: [BASE.tractorBeam, BASE.perivinkle] as Degradado,
  /** Color sólido del lienzo (navegadores, transiciones): el final del degradado. */
  fondoPantalla: BASE.perivinkle,
  /** Barra de estado del sistema sobre el lienzo. */
  barraEstado: "dark" as "dark" | "light",

  // ── Vidrio ────────────────────────────────────────────────────────────
  /** Card de vidrio: blanco al 88 % con desenfoque detrás. */
  fondoCard: "rgba(255,255,255,0.88)",
  /** Android: sin desenfoque, el mismo color un poco más opaco. */
  fondoCardAndroid: "rgba(255,255,255,0.94)",
  bordeCard: "rgba(255,255,255,0.95)",
  /** Card de acento (hay un reloj corriendo): vidrio con tinte celeste. */
  fondoCardAcento: "rgba(236,247,255,0.92)",
  fondoCardAcentoAndroid: "rgba(236,247,255,0.96)",
  bordeCardAcento: "rgba(3,108,210,0.30)",
  /** Barra de pestañas y barras de acciones al pie. */
  fondoBarra: "rgba(255,255,255,0.90)",
  fondoBarraAndroid: "rgba(255,255,255,0.96)",
  tintaBlur: "light" as TintaBlur,
  intensidadBlur: 30,
  /** Sombra suave azulada de las cards. */
  sombraCard: BASE.blueLobster,
  opacidadSombraCard: 0.16,

  // ── Superficies sólidas (inputs, hojas, botones redondos) ─────────────
  superficie: BASE.blanco,
  /** Panel dentro de una card (grilla de datos, horarios). */
  fondo: "#EEF7FE",
  borde: "rgba(2,53,123,0.14)",

  // ── Texto e íconos sobre el degradado: siempre Subnautical ────────────
  textoSobreFondo: BASE.subnautical,
  textoSuaveSobreFondo: BASE.subnautical,
  textoTenueSobreFondo: BASE.subnautical,
  acentoSobreFondo: BASE.subnautical,
  etiquetaCampoSobreFondo: BASE.subnautical,
  ayudaSobreFondo: BASE.subnautical,
  /** Puntos y barras de progreso sobre el fondo. */
  puntoSobreFondo: "rgba(1,30,80,0.28)",
  puntoActivoSobreFondo: BASE.subnautical,
  divisorSobreFondo: "rgba(1,30,80,0.16)",
  /** Bienvenida: líneas de pulso (decorativas) y zona blanca inferior. */
  trazoSobreFondo: BASE.blanco,
  fondoBienvenida: BASE.blanco,
  logoSobreFondo: BASE.subnautical,
  logoAcentoSobreFondo: BASE.cobalt,
  botonBienvenida: BASE.blueLobster,
  textoBotonBienvenida: BASE.blanco,
  /** Arco detrás del avatar en Perfil. */
  arcoPerfil: "rgba(255,255,255,0.22)",

  // ── Roles ─────────────────────────────────────────────────────────────
  text: BASE.subnautical,
  /** Relleno del botón primario y de los acentos sólidos. */
  accent: BASE.blueLobster,
  acentoPresionado: BASE.cobalt,
  /** Borde del botón primario: lo separa del celeste cuando va sobre el fondo. */
  bordePrimario: BASE.cobalt,
  /** Texto e íconos sobre `accent`. */
  sobreAcento: BASE.blanco,
  /** Filtro elegido, chips elegidos. */
  campo: BASE.blueLobster,
  sobreCampo: BASE.blanco,
  /** Campo que ocupa toda la pantalla (cupo confirmado). */
  campoPantalla: BASE.blueLobster,
  sobreCampoPantalla: BASE.blanco,
  suaveSobreCampoPantalla: "#E3F2FE",
  divider: "rgba(2,53,123,0.14)",
  dividerOnField: "rgba(255,255,255,0.25)",
  velo: "rgba(1,30,80,0.45)",
  /** Borde de inputs y casilleros: Cobalt, para que se distingan también sobre el celeste. */
  bordeCampo: BASE.cobalt,
  etiquetaCampo: BASE.cobalt,
  haloCampo: "rgba(255,255,255,0.14)",
  colorSombra: BASE.blueLobster,
  pulgarSwitch: BASE.blanco,
  /** Número del contador de la oferta. */
  contador: BASE.blueLobster,

  // ── Íconos ────────────────────────────────────────────────────────────
  /** Único color de ícono dentro de cards, hojas, inputs y tintes. */
  icono: BASE.wizardBlue,
  /** Barra de pestañas. */
  iconoTabActivo: BASE.blueLobster,
  iconoTabInactivo: "rgba(2,53,123,0.6)",
  textoTabActivo: BASE.blueLobster,
  textoTabInactivo: BASE.cobalt,
  indicadorTab: "#E3F2FE",

  // ── Escala neutra ─────────────────────────────────────────────────────
  neutral100: "#EEF3F9",
  neutral200: "#DCE6F2",
  neutral300: "#A9BCD3",
  neutral600: BASE.cobalt,
  neutral700: BASE.cobalt,
  neutral800: BASE.subnautical,

  // ── Escala de acento ──────────────────────────────────────────────────
  accent100: "#E3F2FE",
  accent200: "#C6E5FD",
  accent300: "#8ECFFB",
  accent400: BASE.tractorBeam,
  accent600: BASE.wizardBlue,
  accent700: BASE.blueLobster,
  accent800: BASE.cobalt,
  accent900: BASE.subnautical,

  // ── Estados ───────────────────────────────────────────────────────────
  /** Texto de estado dentro de cards y su tinte. */
  exito: "#17643F",
  exitoFondo: "#E2F3EA",
  advertencia: "#8A4B00",
  advertenciaFondo: "#FDEFD9",
  error: "#A4161A",
  errorFondo: "#FCE4E2",
  info: BASE.blueLobster,
  infoFondo: "#E3F2FE",
  ...ESTADOS_SOLIDOS,

  // ── IA ────────────────────────────────────────────────────────────────
  /** Insignia «Recomendado por IA»: Wizard Blue → Tractor Beam. */
  degradadoIA: [BASE.wizardBlue, BASE.tractorBeam] as Degradado,
  fondoInsigniaIA: BASE.blanco,
  textoInsigniaIA: BASE.blueLobster,
  /** Círculos e íconos del asistente IA. */
  acentoIA: BASE.wizardBlue,
  sobreAcentoIA: BASE.blanco,
  /** Anillos animados del asistente. */
  anilloIA: BASE.wizardBlue,

  ...SPLASH,

  // ── Ilustración de la doctora: arco detrás ────────────────────────────
  arcoIlustracionInicio: "#C6E5FD",
  arcoIlustracionFin: "#EEF7FE",
};

export type Paleta = typeof paletaClara;

/**
 * Modo oscuro: el degradado Venice → azul profundo, vidrio Rock Blue
 * translúcido (más luminoso que el fondo, para que se distinga) con borde
 * Rock Blue, texto Merino y secundario claro. Botón primario Rock Blue con
 * texto azul oscuro; acentos e IA en Light Blue.
 */
export const paletaOscura: Paleta = {
  degradadoFondo: [BASE.veniceBlue, BASE.veniceProfundo],
  fondoPantalla: BASE.veniceProfundo,
  barraEstado: "light",

  fondoCard: "rgba(132,179,206,0.20)",
  fondoCardAndroid: "rgba(132,179,206,0.22)",
  bordeCard: "rgba(132,179,206,0.45)",
  fondoCardAcento: "rgba(103,186,244,0.18)",
  fondoCardAcentoAndroid: "rgba(103,186,244,0.20)",
  bordeCardAcento: "rgba(103,186,244,0.55)",
  fondoBarra: "rgba(132,179,206,0.18)",
  fondoBarraAndroid: "rgba(132,179,206,0.20)",
  tintaBlur: "dark",
  intensidadBlur: 15,
  sombraCard: "#082638",
  opacidadSombraCard: 0.25,

  superficie: "#174B69",
  fondo: "#1B5577",
  borde: "rgba(132,179,206,0.30)",

  textoSobreFondo: BASE.merino,
  textoSuaveSobreFondo: "#E6EEF2",
  textoTenueSobreFondo: "#DDE8EE",
  acentoSobreFondo: "#CFE8FC",
  etiquetaCampoSobreFondo: "#E6EEF2",
  ayudaSobreFondo: "#DDE8EE",
  puntoSobreFondo: "rgba(245,238,221,0.30)",
  puntoActivoSobreFondo: BASE.merino,
  divisorSobreFondo: "rgba(245,238,221,0.16)",
  trazoSobreFondo: BASE.merino,
  fondoBienvenida: BASE.veniceProfundo,
  logoSobreFondo: BASE.merino,
  logoAcentoSobreFondo: BASE.rockBlue,
  botonBienvenida: BASE.rockBlue,
  textoBotonBienvenida: BASE.azulTinta,
  arcoPerfil: "rgba(132,179,206,0.12)",

  text: BASE.merino,
  accent: BASE.rockBlue,
  acentoPresionado: "#A3C8DE",
  bordePrimario: BASE.rockBlue,
  sobreAcento: BASE.azulTinta,
  campo: BASE.rockBlue,
  sobreCampo: BASE.azulTinta,
  campoPantalla: "#12476A",
  sobreCampoPantalla: BASE.merino,
  suaveSobreCampoPantalla: "#E6EEF2",
  divider: "rgba(245,238,221,0.16)",
  dividerOnField: "rgba(245,238,221,0.16)",
  velo: "rgba(8,38,56,0.6)",
  bordeCampo: BASE.rockBlue,
  etiquetaCampo: "#E6EEF2",
  haloCampo: "rgba(245,238,221,0.08)",
  colorSombra: "#082638",
  pulgarSwitch: BASE.merino,
  contador: BASE.merino,

  icono: BASE.merino,
  iconoTabActivo: BASE.merino,
  iconoTabInactivo: "rgba(245,238,221,0.7)",
  textoTabActivo: BASE.merino,
  textoTabInactivo: "#E6EEF2",
  /** Píldora azul profundo detrás de la pestaña activa. */
  indicadorTab: "rgba(14,61,87,0.55)",

  neutral100: "#1F5C80",
  neutral200: "#24678C",
  neutral300: "#4F86A8",
  neutral600: "#E6EEF2",
  neutral700: "#E6EEF2",
  neutral800: BASE.merino,

  accent100: "#1D5A7E",
  accent200: "#24688F",
  accent300: "#3C82AA",
  accent400: BASE.lightBlue,
  accent600: BASE.merino,
  accent700: "#DCEFFD",
  accent800: "#E3F1FB",
  accent900: BASE.merino,

  exito: "#C4F5DA",
  exitoFondo: "#1B5A4C",
  advertencia: "#FFF0CF",
  advertenciaFondo: "#5A4A22",
  error: "#FFE1DC",
  errorFondo: "#5E2E35",
  info: "#DCEFFD",
  infoFondo: "#1D5A7E",
  ...ESTADOS_SOLIDOS,

  degradadoIA: [BASE.veniceBlue, BASE.lightBlue],
  fondoInsigniaIA: BASE.veniceProfundo,
  textoInsigniaIA: "#8FCCF7",
  acentoIA: BASE.lightBlue,
  sobreAcentoIA: BASE.azulTinta,
  anilloIA: BASE.lightBlue,

  ...SPLASH,

  arcoIlustracionInicio: "#24688F",
  arcoIlustracionFin: "#1D5A7E",
};

/**
 * Colores de la ilustración de la doctora (iguales en los dos modos): ropa
 * en la gama de azules, piel y pelo naturales.
 */
export const paletaIlustracion = {
  bata: "#FFFFFF",
  pliegue: "#D3E1EE",
  camisa: "#BFE3FC",
  camisaSombra: "#7FC4F2",
  corbata: BASE.blueLobster,
  corbataNudo: BASE.cobalt,
  estetoscopio: BASE.subnautical,
  estetoscopioCampana: "#B4C6D8",
  estetoscopioBrillo: "#E3ECF5",
  lineaCara: "#A9BBCD",
  tablilla: BASE.wizardBlue,
  tablillaPapel: "#FFFFFF",
  tablillaLinea: "#C6E5FD",
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
