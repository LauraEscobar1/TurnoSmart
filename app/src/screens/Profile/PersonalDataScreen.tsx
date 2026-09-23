import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { colors } from "@/theme/colors";
import { spacing } from "@/theme/spacing";
import { pacienteActual } from "@/data/mockData";

export function PersonalDataScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>Nombre</Text>
      <Text style={styles.value}>{pacienteActual.nombre}</Text>

      <Text style={styles.label}>Correo</Text>
      <Text style={styles.value}>{pacienteActual.email}</Text>

      <Text style={styles.label}>Teléfono</Text>
      <Text style={styles.value}>{pacienteActual.telefono}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    padding: spacing.md,
  },
  label: {
    fontSize: 12,
    color: colors.textSecondary,
    textTransform: "uppercase",
    marginTop: spacing.md,
  },
  value: {
    fontSize: 16,
    color: colors.textPrimary,
  },
});
