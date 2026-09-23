import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { colors } from "@/theme/colors";
import { radius, spacing } from "@/theme/spacing";
import { ProfileStackParamList } from "@/navigation/types";
import { pacienteActual } from "@/data/mockData";

type Nav = NativeStackNavigationProp<ProfileStackParamList>;

/**
 * Perfil — Nivel 1, navegación tipo stack simple hacia
 * sub-secciones de baja frecuencia de uso (docs/02-jerarquia.md §2).
 */
export function ProfileHomeScreen() {
  const navigation = useNavigation<Nav>();

  const items: { label: string; target: keyof ProfileStackParamList }[] = [
    { label: "Datos personales", target: "PersonalData" },
    { label: "Preferencias", target: "Preferences" },
  ];

  return (
    <View style={styles.container}>
      <Text style={styles.name}>{pacienteActual.nombre}</Text>
      <Text style={styles.email}>{pacienteActual.email}</Text>

      <View style={styles.list}>
        {items.map((item) => (
          <Pressable
            key={item.target}
            style={styles.row}
            onPress={() => navigation.navigate(item.target)}
          >
            <Text style={styles.rowLabel}>{item.label}</Text>
            <Text style={styles.chevron}>›</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    padding: spacing.md,
  },
  name: {
    fontSize: 22,
    fontWeight: "700",
    color: colors.textPrimary,
  },
  email: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: spacing.lg,
  },
  list: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: "hidden",
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  rowLabel: {
    fontSize: 16,
    color: colors.textPrimary,
  },
  chevron: {
    fontSize: 20,
    color: colors.textSecondary,
  },
});
