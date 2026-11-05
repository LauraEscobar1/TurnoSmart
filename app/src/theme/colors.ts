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
  /** Si el vidrio desenfoca lo de atrás (en oscuro no: el tinte del blur agrisaba las cards). */
  desenfoque: true,
  /** Borde superior iluminado e inferior más oscuro: dan profundidad a la card. */
  bordeSuperiorCard: "rgba(255,255,255,1)",
  bordeInferiorCard: "rgba(2,53,123,0.16)",
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

  /** Círculo de vidrio detrás de los íconos y su brillo. */
  circuloIcono: "rgba(3,108,210,0.12)",
  bordeCirculoIcono: "rgba(3,108,210,0.22)",
  brilloCirculoIcono: "rgba(255,255,255,0.75)",
  /** Chips de vidrio dentro de cards (lista de espera de Inicio). */
  fondoChip: "rgba(3,108,210,0.12)",
  /** Barra de acento de los títulos de sección (decorativa). */
  acentoSeccion: BASE.blueLobster,
  /** Brillo (sombra de color) de los elementos de IA. */
  brilloIA: BASE.tractorBeam,

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
  /** Badges de vidrio: tinte del color (~20 %), borde al 50 % y texto intenso. */
  exitoTinte: "rgba(30,158,90,0.20)",
  exitoBorde: "rgba(30,158,90,0.50)",
  exitoTexto: "#0F6A3C",
  advertenciaTinte: "rgba(234,140,0,0.22)",
  advertenciaBorde: "rgba(234,140,0,0.55)",
  advertenciaTexto: "#8A4B00",
  errorTinte: "rgba(217,45,32,0.18)",
  errorBorde: "rgba(217,45,32,0.50)",
  errorTexto: "#A4161A",
  infoTinte: "rgba(3,108,210,0.16)",
  infoBorde: "rgba(3,108,210,0.50)",
  infoTexto: BASE.blueLobster,
  neutralTinte: "rgba(2,53,123,0.10)",
  neutralBorde: "rgba(2,53,123,0.35)",
  neutralTexto: BASE.cobalt,
  /** Botón destructivo de vidrio (rojo translúcido), sobre el fondo o en cards. */
  botonDestructivoFondo: "rgba(255,236,234,0.92)",
  /** Rojo profundo: separa el botón del celeste (≥ 3:1). */
  botonDestructivoBorde: "#7A0F12",
  botonDestructivoTexto: "#A4161A",

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

  // Azul medio translúcido: más claro que el fondo (≥ 1,4:1 de luminancia) sin perder el AA del texto Merino.
  fondoCard: "rgba(120,180,215,0.27)",
  fondoCardAndroid: "rgba(120,180,215,0.28)",
  bordeCard: "rgba(132,179,206,0.40)",
  fondoCardAcento: "rgba(103,186,244,0.24)",
  fondoCardAcentoAndroid: "rgba(103,186,244,0.26)",
  bordeCardAcento: "rgba(103,186,244,0.55)",
  fondoBarra: "rgba(120,180,215,0.27)",
  fondoBarraAndroid: "rgba(120,180,215,0.28)",
  tintaBlur: "dark",
  intensidadBlur: 15,
  desenfoque: false,
  bordeSuperiorCard: "rgba(245,238,221,0.25)",
  bordeInferiorCard: "rgba(8,38,56,0.45)",
  sombraCard: "#082638",
  opacidadSombraCard: 0.25,

  superficie: "#174B69",
  fondo: "#1B5577",
  borde: "rgba(132,179,206,0.30)",

  textoSobreFondo: BASE.merino,
  textoSuaveSobreFondo: "#F2F1EA",
  textoTenueSobreFondo: "#F2F1EA",
  acentoSobreFondo: "#E4F3FE",
  etiquetaCampoSobreFondo: "#F2F1EA",
  ayudaSobreFondo: "#F2F1EA",
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
  etiquetaCampo: "#F2F1EA",
  haloCampo: "rgba(245,238,221,0.08)",
  colorSombra: "#082638",
  pulgarSwitch: BASE.merino,
  contador: BASE.blanco,

  icono: BASE.merino,
  iconoTabActivo: BASE.merino,
  iconoTabInactivo: "rgba(245,238,221,0.7)",
  textoTabActivo: BASE.merino,
  textoTabInactivo: "#F2F1EA",
  /** Píldora azul profundo detrás de la pestaña activa. */
  indicadorTab: "rgba(14,61,87,0.55)",
  circuloIcono: "rgba(255,255,255,0.08)",
  bordeCirculoIcono: "rgba(245,238,221,0.22)",
  brilloCirculoIcono: "rgba(255,255,255,0.08)",
  // Tinte azul profundo: el texto claro del chip llega a AA sobre la card.
  fondoChip: "rgba(14,61,87,0.30)",
  acentoSeccion: BASE.lightBlue,
  brilloIA: BASE.lightBlue,

  neutral100: "#1F5C80",
  neutral200: "#24678C",
  neutral300: "#4F86A8",
  neutral600: "#F2F1EA",
  neutral700: "#F2F1EA",
  neutral800: BASE.merino,

  accent100: "#1D5A7E",
  accent200: "#24688F",
  accent300: "#3C82AA",
  accent400: BASE.lightBlue,
  accent600: BASE.merino,
  accent700: "#E4F3FE",
  accent800: "#F2F9FE",
  accent900: BASE.merino,

  exito: "#E3FBEC",
  exitoFondo: "#1B5A4C",
  advertencia: "#FFF8E6",
  advertenciaFondo: "#5A4A22",
  error: "#FFEDEA",
  errorFondo: "#5E2E35",
  info: "#E4F3FE",
  infoFondo: "#1D5A7E",
  ...ESTADOS_SOLIDOS,
  // Tinte oscuro del color (para que el texto claro del badge llegue a AA) y borde intenso al 50 %.
  exitoTinte: "rgba(6,74,48,0.25)",
  exitoBorde: "rgba(169,240,200,0.50)",
  exitoTexto: "#A9F0C8",
  advertenciaTinte: "rgba(90,51,0,0.25)",
  advertenciaBorde: "rgba(255,217,138,0.50)",
  advertenciaTexto: "#FFD98A",
  errorTinte: "rgba(92,15,18,0.25)",
  errorBorde: "rgba(255,196,189,0.50)",
  errorTexto: "#FFC4BD",
  infoTinte: "rgba(10,58,102,0.25)",
  infoBorde: "rgba(184,225,252,0.50)",
  infoTexto: "#B8E1FC",
  neutralTinte: "rgba(14,61,87,0.30)",
  neutralBorde: "rgba(245,238,221,0.35)",
  neutralTexto: BASE.merino,
  botonDestructivoFondo: "rgba(92,15,18,0.45)",
  botonDestructivoBorde: "#FF8A80",
  botonDestructivoTexto: "#FFC4BD",

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
