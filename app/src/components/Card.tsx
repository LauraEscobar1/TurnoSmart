import React from "react";
import { Pressable, StyleProp, StyleSheet, View, ViewStyle } from "react-native";
import { colors } from "@/theme/colors";
import { radius, sombra } from "@/theme/spacing";

interface CardProps {
  children?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  /**
   * superficie: blanca con sombra tenue (por defecto).
   * acento: tinte acero 100, para lo que tiene un reloj corriendo (oferta).
   * plana: sin sombra ni relleno, solo el borde (figuras, filas atenuadas).
   */
  tono?: "superficie" | "acento" | "plana";
  onPress?: () => void;
  disabled?: boolean;
  accessibilityRole?: "button";
  accessibilityLabel?: string;
}

/**
 * Tarjeta del estilo suave de TurnoSmart: esquinas redondeadas, superficie
 * blanca y una sombra apenas visible sobre el fondo acerado.
 */
export function Card({
  children,
  style,
  tono = "superficie",
  onPress,
  disabled,
  accessibilityRole,
  accessibilityLabel,
}: CardProps) {
  const cardStyle = [styles.base, styles[tono], style];

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        disabled={disabled}
        accessibilityRole={accessibilityRole}
        accessibilityLabel={accessibilityLabel}
        accessibilityState={disabled ? { disabled } : undefined}
        style={({ pressed }) => [cardStyle, pressed && styles.pressed]}
      >
        {children}
      </Pressable>
    );
  }

  return <View style={cardStyle}>{children}</View>;
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radius.lg,
    borderWidth: 1,
  },
  superficie: {
    backgroundColor: colors.superficie,
    borderColor: colors.borde,
    ...sombra.sm,
  },
  acento: {
    backgroundColor: colors.accent100,
    borderColor: colors.accent200,
  },
  plana: {
    backgroundColor: "transparent",
    borderColor: colors.borde,
  },
  pressed: {
    opacity: 0.85,
  },
});
