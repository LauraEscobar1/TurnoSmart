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
   * primary:   única acción sólida de la pantalla: Venice con texto Merino
   *            (claro) o Rock Blue con texto oscuro (oscuro).
   * secondary: superficie crema / azul noche con borde de acento.
   * ghost:     terciario, solo texto de acento.
   * inverse:   sólido claro sobre el campo de pantalla completa (estado terminal).
   * destructive: sólido de error con texto blanco (confirmar que se borra algo).
   */
  variant?: "primary" | "secondary" | "ghost" | "inverse" | "destructive";
  /** El botón (ghost) está directamente sobre el degradado: texto en su color «sobre fondo». */
  sobreFondo?: boolean;
  disabled?: boolean;
  /** Texto extra para lectores de pantalla (qué pasa al tocarlo). */
  accessibilityHint?: string;
  style?: StyleProp<ViewStyle>;
}

const crearTextColor = (colors: Paleta): Record<NonNullable<PrimaryButtonProps["variant"]>, string> => ({
  primary: colors.sobreAcento,
  secondary: colors.accent700,
  ghost: colors.accent700,
  inverse: colors.campoPantalla,
  destructive: colors.sobreEstado,
});

export function PrimaryButton({
  label,
  onPress,
  variant = "primary",
  sobreFondo,
  disabled,
  accessibilityHint,
  style,
}: PrimaryButtonProps) {
  const { colors } = useTema();
  const styles = useEstilos(crearStyles);
  const pressedStyle = useEstilos(crearPressedStyle);
  const textColor = useEstilos(crearTextColor);
  const fantasmaSobreFondo = sobreFondo && variant === "ghost";
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      accessibilityState={disabled ? { disabled } : undefined}
      style={({ pressed }) => [
        styles.base,
        styles[variant],
        pressed && (fantasmaSobreFondo ? pressedStyle.ghostSobreFondo : pressedStyle[variant]),
        disabled && styles.disabled,
        style,
      ]}
    >
      <Text style={[styles.text, { color: fantasmaSobreFondo ? colors.acentoSobreFondo : textColor[variant] }]}>{label}</Text>
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
  // El borde claro lo separa del degradado cuando va directo sobre el fondo.
  primary: {
    backgroundColor: colors.accent,
    borderColor: colors.bordePrimario,
    ...sombra.md,
  },
  // Sólido sobre el campo de pantalla completa: Merino con texto marino.
  inverse: {
    backgroundColor: colors.sobreCampoPantalla,
    borderColor: colors.sobreCampoPantalla,
  },
  secondary: {
    backgroundColor: colors.superficie,
    borderColor: colors.accent,
  },
  destructive: {
    backgroundColor: colors.errorSolido,
    borderColor: colors.errorSolido,
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
  primary: { backgroundColor: colors.acentoPresionado },
  inverse: { backgroundColor: colors.accent100 },
  secondary: { backgroundColor: colors.accent100 },
  ghost: { backgroundColor: colors.accent100 },
  ghostSobreFondo: { backgroundColor: colors.divisorSobreFondo },
  destructive: { opacity: 0.85 },
});
