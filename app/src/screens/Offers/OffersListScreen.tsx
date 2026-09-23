import React, { useCallback, useEffect, useState } from "react";
import { FlatList, StyleSheet, Text, View } from "react-native";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { colors } from "@/theme/colors";
import { spacing } from "@/theme/spacing";
import { OfferCard } from "@/components/OfferCard";
import { EmptyState } from "@/components/EmptyState";
import { OfertaCupo } from "@/types/domain";
import { getHistorialOfertas, getOfertaPendiente } from "@/services/offersService";
import { RootStackParamList } from "@/navigation/types";

type Nav = NativeStackNavigationProp<RootStackParamList>;

type Tab = "pendiente" | "historial";

/**
 * Ofertas — Nivel 1, con sub-tabs internos Pendiente/Historial
 * (docs/02-jerarquia.md §2, docs/03-navegacion.md §2.2).
 */
export function OffersListScreen() {
  const navigation = useNavigation<Nav>();
  const [tab, setTab] = useState<Tab>("pendiente");
  const [pendiente, setPendiente] = useState<OfertaCupo | null>(null);
  const [historial, setHistorial] = useState<OfertaCupo[]>([]);

  const cargar = useCallback(() => {
    getOfertaPendiente().then(setPendiente);
    getHistorialOfertas().then(setHistorial);
  }, []);

  useFocusEffect(cargar);

  return (
    <View style={styles.container}>
      <View style={styles.tabRow}>
        <Text
          style={[styles.tabItem, tab === "pendiente" && styles.tabItemActive]}
          onPress={() => setTab("pendiente")}
        >
          Pendiente
        </Text>
        <Text
          style={[styles.tabItem, tab === "historial" && styles.tabItemActive]}
          onPress={() => setTab("historial")}
        >
          Historial
        </Text>
      </View>

      {tab === "pendiente" ? (
        pendiente ? (
          <View style={styles.content}>
            <OfferCard
              oferta={pendiente}
              onPress={() => navigation.navigate("OfferDetail", { ofertaId: pendiente.id })}
            />
          </View>
        ) : (
          <EmptyState title="No tienes ofertas pendientes" />
        )
      ) : (
        <FlatList
          contentContainerStyle={styles.content}
          data={historial}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <OfferCard oferta={item} />}
          ListEmptyComponent={<EmptyState title="Aún no tienes historial de ofertas" />}
        />
      )}
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
