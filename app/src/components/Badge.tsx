import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { colors } from "@/theme/colors";
import { radius, spacing } from "@/theme/spacing";

type BadgeVariant = "success" | "warning" | "danger" | "neutral";

interface BadgeProps {
  label: string;
  variant?: BadgeVariant;
}

const variantColor: Record<BadgeVariant, string> = {
  success: colors.secondary,
  warning: colors.warning,
  danger: colors.danger,
  neutral: colors.textSecondary,
};

export function Badge({ label, variant = "neutral" }: BadgeProps) {
  return (
    <View style={[styles.container, { backgroundColor: variantColor[variant] }]}>
      <Text style={styles.text}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.full,
    alignSelf: "flex-start",
  },
  text: {
    color: colors.textInverse,
    fontSize: 12,
    fontWeight: "600",
  },
});
