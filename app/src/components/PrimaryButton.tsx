import React from "react";
import { Pressable, StyleProp, StyleSheet, Text, ViewStyle } from "react-native";
import { colors } from "@/theme/colors";
import { fonts } from "@/theme/typography";
import { Blueprint } from "@/components/Blueprint";

interface PrimaryButtonProps {
  label: string;
  onPress?: () => void;
  /**
   * primary:   único objeto sólido de la pantalla, con marcas de esquina.
   * secondary: contorno de un pelo.
   * ghost:     terciario, solo texto en acento.
   * inverse:   sólido papel sobre campo oscuro (estado terminal).
   */
  variant?: "primary" | "secondary" | "ghost" | "inverse";
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function PrimaryButton({ label, onPress, variant = "primary", disabled, style }: PrimaryButtonProps) {
  if (variant === "primary" || variant === "inverse") {
    const isInverse = variant === "inverse";
    return (
      <Blueprint
        onPress={onPress}
        disabled={disabled}
        accessibilityRole="button"
        accessibilityLabel={label}
        cornerColor={isInverse ? colors.bg : colors.corner}
        style={[styles.base, isInverse ? styles.inverse : styles.primary, disabled && styles.disabled, style]}
      >
        <Text style={[styles.text, { color: isInverse ? colors.accent900 : colors.bg }]}>{label}</Text>
      </Blueprint>
    );
  }

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={disabled ? { disabled } : undefined}
      style={({ pressed }) => [
        styles.base,
        variant === "secondary" ? styles.secondary : styles.ghost,
        pressed && styles.pressedOutline,
        disabled && styles.disabled,
        style,
      ]}
    >
      <Text style={[styles.text, { color: variant === "ghost" ? colors.accent700 : colors.text }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 44,
    paddingHorizontal: 14,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 0,
    borderWidth: 1,
  },
  primary: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  inverse: {
    backgroundColor: colors.bg,
    borderColor: colors.bg,
  },
  secondary: {
    backgroundColor: "transparent",
    borderColor: colors.divider,
  },
  ghost: {
    backgroundColor: "transparent",
    borderColor: "transparent",
  },
  pressedOutline: {
    backgroundColor: "rgba(29,31,32,0.07)",
  },
  disabled: {
    opacity: 0.45,
  },
  text: {
    fontFamily: fonts.heading,
    fontSize: 16,
    letterSpacing: 0.2,
  },
});
