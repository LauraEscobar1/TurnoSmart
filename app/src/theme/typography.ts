import { TextStyle } from "react-native";
import { colors } from "@/theme/colors";

/**
 * Barlow Condensed 600 para títulos, horas, contadores y KPI.
 * Barlow 400/500/700 para cuerpo, datos y etiquetas.
 * Mínimo en móvil: 12px metadatos, 15px cuerpo (salvo etiquetas de sistema).
 */
export const fonts = {
  heading: "BarlowCondensed_600SemiBold",
  body: "Barlow_400Regular",
  bodyMedium: "Barlow_500Medium",
  bodyBold: "Barlow_700Bold",
} as const;

/** Etiqueta en versalitas: "PARA RESPONDER", "FECHA", "BUEN DÍA"... */
export function label(size = 10, color: string = colors.neutral600): TextStyle {
  return {
    fontFamily: fonts.bodyMedium,
    fontSize: size,
    letterSpacing: size * 0.12,
    textTransform: "uppercase",
    color,
  };
}

export function heading(size: number, color: string = colors.text): TextStyle {
  return {
    fontFamily: fonts.heading,
    fontSize: size,
    lineHeight: Math.round(size * 1.1),
    color,
  };
}

export function body(size = 15, color: string = colors.text): TextStyle {
  return {
    fontFamily: fonts.body,
    fontSize: size,
    lineHeight: Math.round(size * 1.4),
    color,
  };
}
