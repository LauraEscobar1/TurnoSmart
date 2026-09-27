import React from "react";
import { StyleSheet, Text } from "react-native";
import { Paleta } from "@/theme/colors";
import { useEstilos, useTema } from "@/theme/Tema";
import { body, heading } from "@/theme/typography";
import { Card } from "@/components/Card";

interface EmptyStateProps {
  title: string;
  description?: string;
}

export function EmptyState({ title, description }: EmptyStateProps) {
  const { colors } = useTema();
  const styles = useEstilos(crearStyles);
  return (
    <Card style={styles.container}>
      <Text style={[heading(20, colors.text), styles.center]}>{title}</Text>
      {description ? <Text style={[body(13, colors.neutral700), styles.center]}>{description}</Text> : null}
    </Card>
  );
}

const crearStyles = (colors: Paleta) =>
  StyleSheet.create({
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
