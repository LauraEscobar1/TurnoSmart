/**
 * Paleta base de TurnoSmart — tokens del sistema de diseño Industry
 * ("Design System/_ds/project/styles.css").
 * Paleta mono: el estado no se codifica con color (no hay verde ni rojo),
 * se codifica con contorno vs. relleno tenue vs. campo sólido.
 */
export const colors = {
  // Roles
  bg: "#f2f2f3", // Papel
  surface: "#e9e9ea",
  text: "#1d1f20", // Tinta
  accent: "#5980a6", // Acero
  divider: "rgba(29,31,32,0.16)",
  dividerOnField: "rgba(242,242,243,0.22)",
  corner: "rgba(29,31,32,0.55)",

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
} as const;
