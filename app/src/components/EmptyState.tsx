import React from "react";
import { StyleSheet, Text } from "react-native";
import { colors } from "@/theme/colors";
import { body, heading } from "@/theme/typography";
import { Card } from "@/components/Card";

interface EmptyStateProps {
  title: string;
  description?: string;
}

export function EmptyState({ title, description }: EmptyStateProps) {
  return (
    <Card style={styles.container}>
      <Text style={[heading(20), styles.center]}>{title}</Text>
      {description ? <Text style={[body(13, colors.neutral700), styles.center]}>{description}</Text> : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 26,
    paddingHorizontal: 18,
    alignItems: "center",
    gap: 6,
  },
  center: {
    textAlign: "center",
  },
});
