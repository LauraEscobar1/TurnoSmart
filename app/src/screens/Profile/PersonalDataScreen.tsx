import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { colors } from "@/theme/colors";
import { body, label } from "@/theme/typography";
import { pacienteActual } from "@/data/mockData";
import { ScreenHeader } from "@/components/ScreenHeader";
import { Blueprint } from "@/components/Blueprint";

export function PersonalDataScreen() {
  const navigation = useNavigation();

  const campos = [
    { label: "Nombre", value: pacienteActual.nombre },
    { label: "Correo", value: pacienteActual.email },
    { label: "Teléfono", value: pacienteActual.telefono },
  ];

  return (
    <SafeAreaView edges={["top"]} style={styles.safe}>
      <ScreenHeader title="Datos personales" onBack={navigation.goBack} />
      <View style={styles.content}>
        <Blueprint>
          {campos.map((c, i) => (
            <View key={c.label} style={[styles.row, i > 0 && styles.rowDivider]}>
              <Text style={label(9)}>{c.label}</Text>
              <Text style={body(15)}>{c.value}</Text>
            </View>
          ))}
        </Blueprint>
      </View>
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
