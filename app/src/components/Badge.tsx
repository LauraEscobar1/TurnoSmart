import React from "react";
import { StyleProp, StyleSheet, Text, View, ViewStyle } from "react-native";
import { colors } from "@/theme/colors";
import { radius } from "@/theme/spacing";
import { fonts } from "@/theme/typography";

/**
 * Etiqueta de estado. La paleta es mono: el estado se codifica por
 * relleno, nunca por color (docs del sistema §02 Vocabulario y estados).
 *
 * - outline: disponible, todavía no compromete a nadie.
 * - tint:    hay un reloj corriendo (oferta enviada / pendiente).
 * - accent:  tag sólido de acero ("Oferta para vos" en Home).
 * - solid:   estado terminal positivo (confirmada, recuperado).
 * - neutral: dato neutro (asistida, preferencias).
 * - lost:    terminal negativo — gris tachado, sin dramatismo.
 * - risk:    hipótesis de la IA — contorno punteado.
 */
export type BadgeVariant = "outline" | "tint" | "accent" | "solid" | "neutral" | "lost" | "risk";

interface BadgeProps {
  label: string;
  variant?: BadgeVariant;
  style?: StyleProp<ViewStyle>;
}

export function Badge({ label, variant = "neutral", style }: BadgeProps) {
  return (
    <View style={[styles.container, containerByVariant[variant], style]}>
      <Text style={[styles.text, textByVariant[variant]]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignSelf: "flex-start",
    paddingHorizontal: 11,
    paddingVertical: 4,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: "transparent",
  },
  text: {
    fontFamily: fonts.bodyMedium,
    fontSize: 11,
    letterSpacing: 0.2,
  },
});

const containerByVariant = StyleSheet.create({
  outline: { borderColor: colors.accent },
  tint: { backgroundColor: colors.accent100 },
  accent: { backgroundColor: colors.accent },
  solid: { backgroundColor: colors.accent900 },
  neutral: { backgroundColor: colors.neutral100 },
  lost: { backgroundColor: colors.neutral100 },
  risk: { borderColor: colors.accent, borderStyle: "dashed" },
});

const textByVariant = StyleSheet.create({
  outline: { color: colors.accent700 },
  tint: { color: colors.accent800 },
  accent: { color: colors.bg },
  solid: { color: colors.bg },
  neutral: { color: colors.neutral800 },
  lost: { color: colors.neutral800, textDecorationLine: "line-through" },
  risk: { color: colors.accent700 },
});
