import React from "react";
import { Pressable, StyleSheet, Text } from "react-native";
import { colors } from "@/theme/colors";
import { radius, spacing } from "@/theme/spacing";

interface PrimaryButtonProps {
  label: string;
  onPress?: () => void;
  variant?: "primary" | "secondary";
}

export function PrimaryButton({ label, onPress, variant = "primary" }: PrimaryButtonProps) {
  const isPrimary = variant === "primary";
  return (
    <Pressable
      style={[styles.base, isPrimary ? styles.primary : styles.secondary]}
      onPress={onPress}
    >
      <Text style={isPrimary ? styles.primaryText : styles.secondaryText}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    paddingVertical: spacing.sm + 4,
    borderRadius: radius.md,
    alignItems: "center",
  },
  primary: {
    backgroundColor: colors.primary,
  },
  secondary: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  primaryText: {
    color: colors.textInverse,
    fontWeight: "700",
    fontSize: 16,
  },
  secondaryText: {
    color: colors.textPrimary,
    fontWeight: "700",
    fontSize: 16,
  },
});
