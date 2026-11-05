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

  /** Círculo metalizado (degradado plata) detrás de los íconos. */
  metalCirculo: ["#FFFFFF", "#EEF4FA", "#D7E6F4"] as Degradado,
  /** Brillo (sombra clara) que da relieve metálico al ícono. */
  brilloIcono: "rgba(255,255,255,0.9)",
  /** Cabecera de Perfil: degradado que se funde con el fondo, y su texto. */
  degradadoCabeceraPerfil: ["rgba(5,191,253,0)", BASE.wizardBlue, BASE.wizardBlue, BASE.tractorBeam, "rgba(5,191,253,0)"] as Degradado,
  textoCabeceraPerfil: BASE.blanco,
  /** Anillo metalizado del avatar. */
  anilloAvatar: ["#FFFFFF", "#C9D8E6", "#8FA9C2", "#E9F0F6"] as Degradado,
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
  fondoInsigniaIA: "#E6F3FE",
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
  fondoCard: "rgba(156,195,218,0.92)",
  fondoCardAndroid: "rgba(156,195,218,0.95)",
  bordeCard: "rgba(156,195,218,0.35)",
  fondoCardAcento: "rgba(178,214,236,0.92)",
  fondoCardAcentoAndroid: "rgba(178,214,236,0.95)",
  bordeCardAcento: "rgba(178,214,236,0.4)",
  fondoBarra: "rgba(120,180,215,0.27)",
  fondoBarraAndroid: "rgba(120,180,215,0.28)",
  tintaBlur: "dark",
  intensidadBlur: 15,
  desenfoque: false,
  sombraCard: "#062236",
  opacidadSombraCard: 0.35,

  superficie: "#B7D3E4",
  fondo: "#AECDE0",
  borde: "rgba(15,42,58,0.14)",

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

  text: "#0F2A3A",
  accent: BASE.veniceBlue,
  acentoPresionado: BASE.veniceProfundo,
  bordePrimario: BASE.rockBlue,
  sobreAcento: BASE.merino,
  campo: BASE.veniceBlue,
  sobreCampo: BASE.merino,
  campoPantalla: "#12476A",
  sobreCampoPantalla: BASE.merino,
  suaveSobreCampoPantalla: "#E6EEF2",
  divider: "rgba(15,42,58,0.14)",
  dividerOnField: "rgba(245,238,221,0.16)",
  velo: "rgba(8,38,56,0.6)",
  bordeCampo: "rgba(15,42,58,0.35)",
  etiquetaCampo: "#1E4A63",
  haloCampo: "rgba(245,238,221,0.08)",
  colorSombra: "#082638",
  pulgarSwitch: BASE.merino,
  contador: "#0F2A3A",

  icono: "#1E4A63",
  iconoTabActivo: BASE.merino,
  iconoTabInactivo: "rgba(245,238,221,0.7)",
  textoTabActivo: BASE.merino,
  textoTabInactivo: "#F2F1EA",
  /** Píldora azul profundo detrás de la pestaña activa. */
  indicadorTab: "rgba(14,61,87,0.55)",
  metalCirculo: ["#F7FAFC", "#DCE8F0", "#BCD2E0"],
  brilloIcono: "rgba(255,255,255,0.85)",
  // Venice arriba (texto Merino), Rock Blue al medio y se funde con el fondo.
  degradadoCabeceraPerfil: ["rgba(22,88,123,0)", BASE.veniceBlue, BASE.veniceBlue, BASE.rockBlue, "rgba(22,88,123,0)"],
  textoCabeceraPerfil: BASE.merino,
  anilloAvatar: ["#FFFFFF", "#C9D8E6", "#8FA9C2", "#E9F0F6"],
  // Chip más claro que la card: el texto marino llega a AA.
  fondoChip: "rgba(255,255,255,0.30)",
  acentoSeccion: BASE.lightBlue,
  brilloIA: BASE.lightBlue,

  neutral100: "#C3D9E7",
  neutral200: "#ADCADB",
  neutral300: "#7FA6BE",
  neutral600: "#1E4A63",
  neutral700: "#1E4A63",
  neutral800: "#0F2A3A",

  accent100: "#C9DFEC",
  accent200: "#B3D0E2",
  accent300: "#8FBAD3",
  accent400: BASE.veniceBlue,
  accent600: "#0B456A",
  accent700: "#0B456A",
  accent800: "#133F58",
  accent900: "#0F2A3A",

  exito: "#0A4A2A",
  exitoFondo: "#CDE8D9",
  advertencia: "#5E3300",
  advertenciaFondo: "#F0E0C2",
  error: "#7F0F13",
  errorFondo: "#F2D3D0",
  info: "#0B456A",
  infoFondo: "#C9DFEC",
  ...ESTADOS_SOLIDOS,
  // Tinte oscuro del color (para que el texto claro del badge llegue a AA) y borde intenso al 50 %.
  exitoTinte: "rgba(30,158,90,0.22)",
  exitoBorde: "rgba(30,158,90,0.50)",
  exitoTexto: "#073B21",
  advertenciaTinte: "rgba(234,140,0,0.25)",
  advertenciaBorde: "rgba(234,140,0,0.55)",
  advertenciaTexto: "#5E3300",
  errorTinte: "rgba(217,45,32,0.20)",
  errorBorde: "rgba(217,45,32,0.50)",
  errorTexto: "#62090C",
  infoTinte: "rgba(22,88,123,0.18)",
  infoBorde: "rgba(22,88,123,0.50)",
  infoTexto: "#08324D",
  neutralTinte: "rgba(15,42,58,0.10)",
  neutralBorde: "rgba(15,42,58,0.30)",
  neutralTexto: "#0F2A3A",
  botonDestructivoFondo: "rgba(92,15,18,0.45)",
  botonDestructivoBorde: "#FF8A80",
  botonDestructivoTexto: "#FFC4BD",

  fondoInsigniaIA: "#D3E6F1",
  textoInsigniaIA: "#0B456A",
  acentoIA: BASE.veniceBlue,
  sobreAcentoIA: BASE.merino,
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
