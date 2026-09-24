import { ViewStyle } from "react-native";
import { colors } from "@/theme/colors";

/**
 * Retícula de la app. Los espaciados siguen las pantallas de referencia
 * ("Design System/TurnoSmart - Sistema de Diseño.dc.html" §04); los radios
 * y sombras son los del estilo suave que adoptó toda la app (esquinas
 * redondeadas, superficies blancas, sombras tenues en Campo).
 */
export const spacing = {
  xs: 4,
  sm: 8,
  md: 14,
  lg: 18,
  xl: 22,
  xxl: 28,
} as const;

export const hairline = 1;

export const radius = {
  sm: 8,
  md: 12,
  lg: 18,
  xl: 24,
  pill: 999,
} as const;

/** Sombra de tarjeta: apenas separa la superficie blanca del fondo. */
export const sombra: Record<"sm" | "md", ViewStyle> = {
  sm: {
    shadowColor: colors.accent900,
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
    elevation: 1,
  },
  md: {
    shadowColor: colors.accent900,
    shadowOpacity: 0.16,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
};
