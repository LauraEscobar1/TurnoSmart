import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { colors } from "@/theme/colors";
import { body, label } from "@/theme/typography";
import { usePaciente } from "@/auth/AuthContext";
import { ScreenHeader } from "@/components/ScreenHeader";
import { Card } from "@/components/Card";

/** "35482910" → "35.482.910" */
const formatearDni = (dni: string) => dni.replace(/\B(?=(\d{3})+(?!\d))/g, ".");

export function PersonalDataScreen() {
  const navigation = useNavigation();
  const paciente = usePaciente();

  const campos = [
    { label: "Nombre", value: `${paciente.nombre} ${paciente.apellido}` },
    { label: "DNI", value: formatearDni(paciente.dni) },
    { label: "Correo", value: paciente.email },
    { label: "Teléfono", value: paciente.telefono },
    { label: "Obra social / prepaga", value: paciente.obraSocial || "—" },
  ];

  return (
    <SafeAreaView edges={["top"]} style={styles.safe}>
      <ScreenHeader title="Datos personales" onBack={navigation.goBack} />
      <View style={styles.content}>
        <Card>
          {campos.map((c, i) => (
            <View key={c.label} style={[styles.row, i > 0 && styles.rowDivider]}>
              <Text style={label(9)}>{c.label}</Text>
              <Text style={body(15)}>{c.value}</Text>
            </View>
          ))}
        </Card>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.fondo,
  },
  content: {
    padding: 18,
  },
  row: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    gap: 2,
  },
  rowDivider: {
    borderTopWidth: 1,
    borderTopColor: colors.divider,
  },
});
