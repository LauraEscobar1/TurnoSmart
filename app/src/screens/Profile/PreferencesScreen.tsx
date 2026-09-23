import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { colors } from "@/theme/colors";
import { spacing } from "@/theme/spacing";
import { pacienteActual } from "@/data/mockData";
import { Badge } from "@/components/Badge";

/**
 * Preferencias del paciente: especialidades, horarios y radio.
 * Estos campos alimentan directamente al motor de priorización de IA
 * (docs/01-arquitectura-informacion.md §2.2).
 */
export function PreferencesScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>Especialidades de interés</Text>
      <View style={styles.tagRow}>
        {pacienteActual.especialidadesInteres.map((e) => (
          <Badge key={e} label={e} variant="neutral" />
        ))}
      </View>

      <Text style={styles.label}>Horarios preferidos</Text>
      <View style={styles.tagRow}>
        {pacienteActual.horariosPreferidos.map((h) => (
          <Badge key={h} label={h} variant="neutral" />
        ))}
      </View>

      <Text style={styles.label}>Radio de búsqueda</Text>
      <Text style={styles.value}>{pacienteActual.radioKm} km</Text>
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
    marginBottom: spacing.xs,
  },
  value: {
    fontSize: 16,
    color: colors.textPrimary,
  },
  tagRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
  },
});
