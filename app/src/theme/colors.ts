/**
 * Paleta base de TurnoSmart — tokens del sistema de diseño Industry
 * ("Design System/_ds/project/styles.css").
 * Paleta mono: el estado no se codifica con color (no hay verde ni rojo),
 * se codifica con contorno vs. relleno tenue vs. campo sólido.
 */
export const paletaClara = {
  // Estilo suave: fondo de pantalla levemente acerado y superficies blancas.
  fondo: "#f3f7fc",
  superficie: "#ffffff",
  borde: "rgba(29,45,61,0.10)",

  // Roles
  bg: "#f2f2f3", // Papel (texto e íconos sobre campos oscuros)
  surface: "#e9e9ea",
  text: "#1d1f20", // Tinta
  accent: "#5980a6", // Acero
  divider: "rgba(29,31,32,0.16)",
  dividerOnField: "rgba(242,242,243,0.22)",
  corner: "rgba(29,31,32,0.55)",

  /** Campo sólido (pestaña activa, filtro elegido, confirmación) y el texto que va encima. */
  campo: "#1d2d3d",
  sobreCampo: "#ffffff",
  /** Texto e íconos sobre un relleno de Acero (botón primario, etiquetas sólidas). */
  sobreAcento: "#ffffff",
  /** Velo detrás de las hojas que suben desde abajo. */
  velo: "rgba(29,45,61,0.45)",
  /** Borde de campos de formulario y casilleros del código. */
  bordeCampo: "rgba(29,45,61,0.16)",
  /** Etiqueta de un campo de formulario. */
  etiquetaCampo: "rgba(29,31,32,0.7)",
  /** Halo del ícono en la confirmación sobre el campo sólido. */
  haloCampo: "rgba(255,255,255,0.08)",
  /** Color de las sombras (en oscuro la elevación es sobre todo el borde de un pelo). */
  colorSombra: "#1d2d3d",

  // Escala neutra
  neutral100: "#f5f5f8",
  neutral200: "#e7e7ea",
  neutral300: "#d4d4d7",
  neutral600: "#7a7a7d",
  neutral700: "#5d5d60",
  neutral800: "#424244",

  // Escala de acento
  accent100: "#eef6ff",
  accent200: "#d6ebff",
  accent300: "#b5d9fd",
  accent400: "#94bce3",
  accent600: "#597ea3",
  accent700: "#416180",
  accent800: "#2c455d",
  accent900: "#1d2d3d", // Campo
};

export type Paleta = typeof paletaClara;

/**
 * Modo oscuro — "Modo oscuro" del sistema de diseño: mismos tokens con las
 * rampas invertidas. Fondo en el acero más profundo (#111820, no negro
 * puro) y superficies en su tinte (#16222f); títulos en tinta clara
 * (#e8ecf0, 15:1), datos secundarios en neutro 600 (7:1) y todo texto en
 * acento sube a #94bce3. Los rellenos de Acero pasan al acero luminoso
 * (#749dc4) con texto oscuro, y la elevación es un filo de un pelo.
 * Cada pantalla usa los mismos nombres de token en los dos modos.
 */
export const paletaOscura: Paleta = {
  fondo: "#111820",
  superficie: "#16222f",
  borde: "rgba(232,236,240,0.10)",

  bg: "#111820",
  surface: "#1c2733",
  text: "#e8ecf0",
  accent: "#749dc4",
  divider: "rgba(232,236,240,0.14)",
  dividerOnField: "rgba(17,24,32,0.22)",
  corner: "rgba(232,236,240,0.55)",

  campo: "#749dc4",
  sobreCampo: "#111820",
  sobreAcento: "#111820",
  velo: "rgba(5,9,13,0.6)",
  bordeCampo: "rgba(232,236,240,0.16)",
  etiquetaCampo: "rgba(232,236,240,0.7)",
  haloCampo: "rgba(17,24,32,0.08)",
  colorSombra: "#000000",

  neutral100: "#1c2733",
  neutral200: "#26323f",
  neutral300: "#364351",
  neutral600: "#a3adb8",
  neutral700: "#b9c1ca",
  neutral800: "#d3d9df",

  accent100: "#1a2a3b",
  accent200: "#243a50",
  accent300: "#34506c",
  accent400: "#4d7094",
  accent600: "#83a9cf",
  accent700: "#94bce3",
  accent800: "#b5d9fd",
  accent900: "#e8ecf0",
};

/**
 * Paleta clara fija, para lo que no cambia con el modo: el splash (sigue
 * al splash nativo), las sombras y los valores por defecto de tipografía.
 * Las pantallas leen la paleta activa con `useTema()`.
 */
export const colors = paletaClara;
