import React from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { colors } from "@/theme/colors";
import { body, heading, label } from "@/theme/typography";
import { ProfileStackParamList } from "@/navigation/types";
import { pacienteActual } from "@/data/mockData";
import { ScreenHeader } from "@/components/ScreenHeader";
import { Blueprint } from "@/components/Blueprint";

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
    <SafeAreaView edges={["top"]} style={styles.safe}>
      <ScreenHeader title="Perfil" />
      <ScrollView contentContainerStyle={styles.content}>
        <View>
          <Text style={label(10)}>Paciente</Text>
          <Text style={heading(28)}>{pacienteActual.nombre}</Text>
          <Text style={body(14, colors.neutral700)}>{pacienteActual.email}</Text>
        </View>

        <Blueprint>
          {items.map((item, i) => (
            <Pressable
              key={item.target}
              style={({ pressed }) => [styles.row, i > 0 && styles.rowDivider, pressed && styles.rowPressed]}
              onPress={() => navigation.navigate(item.target)}
            >
              <Text style={heading(19)}>{item.label}</Text>
              <Ionicons name="chevron-forward" size={18} color={colors.neutral600} />
            </Pressable>
          ))}
        </Blueprint>
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
    gap: 22,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  rowDivider: {
    borderTopWidth: 1,
    borderTopColor: colors.divider,
  },
  rowPressed: {
    backgroundColor: "rgba(29,31,32,0.07)",
  },
});
