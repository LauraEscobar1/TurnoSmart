import React from "react";
import { Pressable, StyleProp, StyleSheet, Text, ViewStyle } from "react-native";
import { Paleta } from "@/theme/colors";
import { useEstilos, useTema } from "@/theme/Tema";
import { radius, sombra } from "@/theme/spacing";
import { fonts } from "@/theme/typography";

interface PrimaryButtonProps {
  label: string;
  onPress?: () => void;
  /**
   * primary:   única acción sólida de la pantalla, en acero con sombra suave.
   * secondary: superficie blanca con borde.
   * ghost:     terciario, solo texto en acero.
   * inverse:   sólido blanco sobre campo oscuro (estado terminal).
   */
  variant?: "primary" | "secondary" | "ghost" | "inverse";
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}

const crearTextColor = (colors: Paleta): Record<NonNullable<PrimaryButtonProps["variant"]>, string> => ({
  primary: colors.sobreAcento,
  secondary: colors.text,
  ghost: colors.accent700,
  inverse: colors.campo,
});

export function PrimaryButton({ label, onPress, variant = "primary", disabled, style }: PrimaryButtonProps) {
  const styles = useEstilos(crearStyles);
  const pressedStyle = useEstilos(crearPressedStyle);
  const textColor = useEstilos(crearTextColor);
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={disabled ? { disabled } : undefined}
      style={({ pressed }) => [
        styles.base,
        styles[variant],
        pressed && pressedStyle[variant],
        disabled && styles.disabled,
        style,
      ]}
    >
      <Text style={[styles.text, { color: textColor[variant] }]}>{label}</Text>
    </Pressable>
  );
}

const crearStyles = (colors: Paleta) =>
  StyleSheet.create({
  base: {
    minHeight: 50,
    paddingHorizontal: 18,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.md + 2,
    borderWidth: 1,
  },
  primary: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
    ...sombra.md,
  },
  // Sólido sobre el campo: en claro, blanco con texto Campo.
  inverse: {
    backgroundColor: colors.sobreCampo,
    borderColor: colors.sobreCampo,
  },
  secondary: {
    backgroundColor: colors.superficie,
    borderColor: colors.accent200,
  },
  ghost: {
    backgroundColor: "transparent",
    borderColor: "transparent",
  },
  disabled: {
    opacity: 0.45,
  },
  text: {
    fontFamily: fonts.heading,
    fontSize: 17,
    letterSpacing: 0.3,
  },
});

const crearPressedStyle = (colors: Paleta) =>
  StyleSheet.create({
  primary: { backgroundColor: colors.accent700, borderColor: colors.accent700 },
  inverse: { backgroundColor: colors.accent100 },
  secondary: { backgroundColor: colors.accent100 },
  ghost: { backgroundColor: colors.accent100 },
});
