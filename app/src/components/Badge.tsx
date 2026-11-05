import React from "react";
import { StyleProp, StyleSheet, Text, View, ViewStyle } from "react-native";
import { Paleta } from "@/theme/colors";
import { useEstilos } from "@/theme/Tema";
import { radius } from "@/theme/spacing";
import { fonts } from "@/theme/typography";

/**
 * Etiqueta de estado: sólida e intensa, con texto blanco sobre los colores
 * de estado del tema (iguales y legibles en los dos modos).
 *
 * - outline: disponible, todavía no compromete a nadie.
 * - tint:    hay un reloj corriendo (oferta enviada / pendiente) — info.
 * - accent:  chip Rock Blue ("Oferta para vos").
 * - solid:   estado terminal positivo (confirmada, recuperado) — éxito.
 * - neutral: dato neutro (asistida, preferencias).
 * - lost:    terminal negativo — neutro tachado, sin dramatismo.
 * - risk:    hipótesis de la IA (riesgo de inasistencia) — advertencia, contorno punteado.
 */
export type BadgeVariant = "outline" | "tint" | "accent" | "solid" | "neutral" | "lost" | "risk";

interface BadgeProps {
  label: string;
  variant?: BadgeVariant;
  style?: StyleProp<ViewStyle>;
}

export function Badge({ label, variant = "neutral", style }: BadgeProps) {
  const styles = useEstilos(crearStyles);
  const containerByVariant = useEstilos(crearContainerByVariant);
  const textByVariant = useEstilos(crearTextByVariant);
  return (
    <View style={[styles.container, containerByVariant[variant], style]}>
      <Text style={[styles.text, textByVariant[variant]]}>{label}</Text>
    </View>
  );
}

const crearStyles = (colors: Paleta) =>
  StyleSheet.create({
  container: {
    alignSelf: "flex-start",
    paddingHorizontal: 11,
    paddingVertical: 4,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: "transparent",
  },
  text: {
    fontFamily: fonts.bodyBold,
    fontSize: 11,
    letterSpacing: 0.2,
  },
});

const crearContainerByVariant = (colors: Paleta) =>
  StyleSheet.create({
  outline: { borderColor: colors.accent },
  tint: { backgroundColor: colors.infoSolido },
  accent: { backgroundColor: colors.campo },
  solid: { backgroundColor: colors.exitoSolido },
  neutral: { backgroundColor: colors.neutral100 },
  lost: { backgroundColor: colors.neutral100 },
  risk: { backgroundColor: colors.advertenciaSolido, borderColor: colors.sobreEstado, borderStyle: "dashed" },
});

const crearTextByVariant = (colors: Paleta) =>
  StyleSheet.create({
  outline: { color: colors.accent700 },
  tint: { color: colors.sobreEstado },
  accent: { color: colors.sobreCampo },
  solid: { color: colors.sobreEstado },
  neutral: { color: colors.neutral800 },
  lost: { color: colors.neutral800, textDecorationLine: "line-through" },
  risk: { color: colors.sobreEstado },
});
