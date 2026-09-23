import React, { useCallback, useState } from "react";
import { FlatList, StyleSheet, Text, View } from "react-native";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { colors } from "@/theme/colors";
import { spacing } from "@/theme/spacing";
import { AppointmentCard } from "@/components/AppointmentCard";
import { EmptyState } from "@/components/EmptyState";
import { Cita } from "@/types/domain";
import { getCitasPasadas, getCitasProximas } from "@/services/appointmentsService";
import { AppointmentsStackParamList } from "@/navigation/types";

type Nav = NativeStackNavigationProp<AppointmentsStackParamList>;

type Tab = "proximas" | "pasadas";

/**
 * Mis citas — Nivel 1, con sub-tabs Próximas/Pasadas
 * (docs/02-jerarquia.md §2).
 */
export function AppointmentsListScreen() {
  const navigation = useNavigation<Nav>();
  const [tab, setTab] = useState<Tab>("proximas");
  const [proximas, setProximas] = useState<Cita[]>([]);
  const [pasadas, setPasadas] = useState<Cita[]>([]);

  useFocusEffect(
    useCallback(() => {
      getCitasProximas().then(setProximas);
      getCitasPasadas().then(setPasadas);
    }, [])
  );

  const data = tab === "proximas" ? proximas : pasadas;

  return (
    <View style={styles.container}>
      <View style={styles.tabRow}>
        <Text
          style={[styles.tabItem, tab === "proximas" && styles.tabItemActive]}
          onPress={() => setTab("proximas")}
        >
          Próximas
        </Text>
        <Text
          style={[styles.tabItem, tab === "pasadas" && styles.tabItemActive]}
          onPress={() => setTab("pasadas")}
        >
          Pasadas
        </Text>
      </View>

      <FlatList
        contentContainerStyle={styles.content}
        data={data}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <AppointmentCard
            cita={item}
            onPress={() => navigation.navigate("AppointmentDetail", { citaId: item.id })}
          />
        )}
        ListEmptyComponent={
          <EmptyState
            title={tab === "proximas" ? "No tienes citas próximas" : "Aún no tienes historial"}
          />
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.md,
    gap: spacing.sm,
  },
  tabRow: {
    flexDirection: "row",
    gap: spacing.lg,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  tabItem: {
    paddingBottom: spacing.sm,
    color: colors.textSecondary,
    fontWeight: "600",
  },
  tabItemActive: {
    color: colors.primary,
    borderBottomWidth: 2,
    borderBottomColor: colors.primary,
  },
});
