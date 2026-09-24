import React, { useCallback, useEffect, useState } from "react";
import { FlatList, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { colors } from "@/theme/colors";
import { AppointmentCard } from "@/components/AppointmentCard";
import { EmptyState } from "@/components/EmptyState";
import { ScreenHeader } from "@/components/ScreenHeader";
import { SubTabs } from "@/components/SubTabs";
import { Cita } from "@/types/domain";
import { getCitasPasadas, getCitasProximas } from "@/services/appointmentsService";
import { AppointmentsStackParamList } from "@/navigation/types";

type Props = NativeStackScreenProps<AppointmentsStackParamList, "AppointmentsList">;

type Tab = "proximas" | "pasadas";

/**
 * Mis citas — Nivel 1, con sub-tabs Próximas/Pasadas
 * (docs/02-jerarquia.md §2).
 */
export function AppointmentsListScreen({ navigation, route }: Props) {
  const [tab, setTab] = useState<Tab>(route.params?.tab ?? "proximas");
  const [proximas, setProximas] = useState<Cita[]>([]);
  const [pasadas, setPasadas] = useState<Cita[]>([]);

  useEffect(() => {
    if (route.params?.tab) setTab(route.params.tab);
  }, [route.params?.tab]);

  useFocusEffect(
    useCallback(() => {
      getCitasProximas().then(setProximas);
      getCitasPasadas().then(setPasadas);
    }, [])
  );

  const esPasada = tab === "pasadas";

  return (
    <SafeAreaView edges={["top"]} style={styles.safe}>
      <ScreenHeader title="Mis citas" />
      <SubTabs
        value={tab}
        onChange={setTab}
        options={[
          { value: "proximas", label: "Próximas" },
          { value: "pasadas", label: "Pasadas" },
        ]}
      />
      <FlatList
        contentContainerStyle={styles.content}
        data={esPasada ? pasadas : proximas}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <AppointmentCard
            cita={item}
            past={esPasada}
            onPress={() => navigation.navigate("AppointmentDetail", { citaId: item.id })}
          />
        )}
        ListEmptyComponent={
          <EmptyState title={esPasada ? "Todavía no tenés historial" : "No tenés citas próximas"} />
        }
      />
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
    gap: 16,
  },
});
