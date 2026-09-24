import React from "react";
import { Pressable, StyleProp, StyleSheet, View, ViewStyle } from "react-native";
import { colors } from "@/theme/colors";

interface BlueprintProps {
  children?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  /** Color de las marcas de esquina (por defecto, tinta al 55%). */
  cornerColor?: string;
  /** Sin borde propio: solo las marcas (p. ej. botón primario, que ya tiene relleno). */
  borderless?: boolean;
  onPress?: () => void;
  disabled?: boolean;
  accessibilityRole?: "button";
  accessibilityLabel?: string;
}

/**
 * Marco de plano del sistema Industry: esquinas rectas, borde de un pelo
 * y las cuatro marcas de registro "+" en las esquinas.
 * Toda tarjeta, figura y botón primario lo lleva — no se omite.
 */
export function Blueprint({
  children,
  style,
  cornerColor = colors.corner,
  borderless,
  onPress,
  disabled,
  accessibilityRole,
  accessibilityLabel,
}: BlueprintProps) {
  const corners = (
    <>
      <Corner color={cornerColor} style={styles.tl} />
      <Corner color={cornerColor} style={styles.tr} />
      <Corner color={cornerColor} style={styles.bl} />
      <Corner color={cornerColor} style={styles.br} />
    </>
  );
  const frameStyle = [styles.frame, borderless && styles.borderless, style];

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        disabled={disabled}
        accessibilityRole={accessibilityRole}
        accessibilityLabel={accessibilityLabel}
        accessibilityState={disabled ? { disabled } : undefined}
        style={({ pressed }) => [frameStyle, pressed && styles.pressed]}
      >
        {children}
        {corners}
      </Pressable>
    );
  }

  return (
    <View style={frameStyle}>
      {children}
      {corners}
    </View>
  );
}

function Corner({ color, style }: { color: string; style: ViewStyle }) {
  return (
    <View pointerEvents="none" style={[styles.corner, style]}>
      <View style={[styles.vertical, { backgroundColor: color }]} />
      <View style={[styles.horizontal, { backgroundColor: color }]} />
    </View>
  );
}

const SIZE = 11;
const OFFSET = -6;

const styles = StyleSheet.create({
  frame: {
    position: "relative",
    borderWidth: 1,
    borderColor: colors.divider,
    borderRadius: 0,
  },
  borderless: {
    borderColor: "transparent",
  },
  pressed: {
    opacity: 0.85,
  },
  corner: {
    position: "absolute",
    width: SIZE,
    height: SIZE,
  },
  vertical: {
    position: "absolute",
    left: 5,
    top: 0,
    width: 1,
    height: SIZE,
  },
  horizontal: {
    position: "absolute",
    top: 5,
    left: 0,
    width: SIZE,
    height: 1,
  },
  tl: { top: OFFSET, left: OFFSET },
  tr: { top: OFFSET, right: OFFSET },
  bl: { bottom: OFFSET, left: OFFSET },
  br: { bottom: OFFSET, right: OFFSET },
});
