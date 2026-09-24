import React from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { colors } from "@/theme/colors";
import { heading, label, body } from "@/theme/typography";
import { pacienteActual } from "@/data/mockData";
import { Badge } from "@/components/Badge";
import { Blueprint } from "@/components/Blueprint";
import { ScreenHeader } from "@/components/ScreenHeader";

/**
 * Preferencias del paciente: especialidades, horarios y radio.
 * Estos campos alimentan directamente al motor de priorización de IA
 * (docs/01-arquitectura-informacion.md §2.2).
 */
export function PreferencesScreen() {
  const navigation = useNavigation();

  return (
    <SafeAreaView edges={["top"]} style={styles.safe}>
      <ScreenHeader title="Preferencias" onBack={navigation.goBack} />
      <ScrollView contentContainerStyle={styles.content}>
        <Blueprint style={styles.card}>
          <View style={styles.section}>
            <Text style={label(9)}>Especialidades de interés</Text>
            <View style={styles.tagRow}>
              {pacienteActual.especialidadesInteres.map((e) => (
                <Badge key={e} label={e} variant="outline" />
              ))}
            </View>
          </View>

          <View style={[styles.section, styles.divided]}>
            <Text style={label(9)}>Horarios preferidos</Text>
            <View style={styles.tagRow}>
              {pacienteActual.horariosPreferidos.map((h) => (
                <Badge key={h} label={h} variant="outline" />
              ))}
            </View>
          </View>

          <View style={[styles.section, styles.divided]}>
            <Text style={label(9)}>Radio de búsqueda</Text>
            <Text style={heading(22)}>{pacienteActual.radioKm} km</Text>
          </View>
        </Blueprint>
        <Text style={body(13, colors.neutral700)}>
          Usamos estas preferencias para decidir a quién ofrecer cada cupo liberado.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  content: {
    padding: 18,
    gap: 14,
  },
  card: {
    paddingHorizontal: 16,
  },
  section: {
    paddingVertical: 14,
    gap: 8,
  },
  divided: {
    borderTopWidth: 1,
    borderTopColor: colors.divider,
  },
  tagRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
});
