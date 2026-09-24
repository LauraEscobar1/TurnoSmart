import React, { useCallback, useState } from "react";
import { FlatList, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { colors } from "@/theme/colors";
import { OfferCard } from "@/components/OfferCard";
import { EmptyState } from "@/components/EmptyState";
import { ScreenHeader } from "@/components/ScreenHeader";
import { SubTabs } from "@/components/SubTabs";
import { OfertaCupo } from "@/types/domain";
import { aceptarOferta, getHistorialOfertas, getOfertaPendiente, rechazarOferta } from "@/services/offersService";
import { RootStackParamList } from "@/navigation/types";

type Nav = NativeStackNavigationProp<RootStackParamList>;

type Tab = "pendiente" | "historial";

/**
 * Ofertas — Nivel 1, con sub-tabs internos Pendiente/Historial
 * (docs/02-jerarquia.md §2, docs/03-navegacion.md §2.2).
 * La tarjeta pendiente lleva las dos acciones: aceptar desde aquí
 * sigue siendo un solo toque.
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

  async function responder(oferta: OfertaCupo, resultado: "aceptada" | "rechazada") {
    await (resultado === "aceptada" ? aceptarOferta(oferta.id) : rechazarOferta(oferta.id));
    navigation.navigate("OfferConfirmation", { ofertaId: oferta.id, resultado });
  }

  return (
    <SafeAreaView edges={["top"]} style={styles.safe}>
      <ScreenHeader title="Ofertas" />
      <SubTabs
        value={tab}
        onChange={setTab}
        options={[
          { value: "pendiente", label: "Pendiente" },
          { value: "historial", label: "Historial" },
        ]}
      />

      {tab === "pendiente" ? (
        <View style={styles.content}>
          {pendiente ? (
            <OfferCard
              oferta={pendiente}
              onAceptar={() => responder(pendiente, "aceptada")}
              onRechazar={() => responder(pendiente, "rechazada")}
            />
          ) : (
            <EmptyState
              title="No tenés ofertas pendientes"
              description="Te avisamos apenas se libere un cupo que te pueda interesar."
            />
          )}
        </View>
      ) : (
        <FlatList
          contentContainerStyle={styles.content}
          data={historial}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <OfferCard variant="historial" oferta={item} />}
          ListEmptyComponent={<EmptyState title="Todavía no tenés historial de ofertas" />}
        />
      )}
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
