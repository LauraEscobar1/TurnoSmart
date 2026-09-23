import React, { useEffect, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { colors } from "@/theme/colors";
import { spacing } from "@/theme/spacing";
import { OfferCard } from "@/components/OfferCard";
import { AppointmentCard } from "@/components/AppointmentCard";
import { EmptyState } from "@/components/EmptyState";
import { OfertaCupo, Cita } from "@/types/domain";
import { getOfertaPendiente } from "@/services/offersService";
import { getCitasProximas } from "@/services/appointmentsService";
import { RootStackParamList } from "@/navigation/types";

type Nav = NativeStackNavigationProp<RootStackParamList>;

/**
 * Home — Nivel 1 (docs/02-jerarquia.md §2).
 * Muestra, en orden de prioridad:
 *   1. Oferta de cupo activa (si existe) — máxima prioridad visual.
 *   2. Próxima cita confirmada.
 */
export function HomeScreen() {
  const navigation = useNavigation<Nav>();
  const [oferta, setOferta] = useState<OfertaCupo | null>(null);
  const [proximaCita, setProximaCita] = useState<Cita | null>(null);

  useEffect(() => {
    getOfertaPendiente().then(setOferta);
    getCitasProximas().then((citas) => setProximaCita(citas[0] ?? null));
  }, []);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.greeting}>Hola 👋</Text>

      <Text style={styles.sectionTitle}>Oferta de cupo</Text>
      {oferta ? (
        <OfferCard
          oferta={oferta}
          onPress={() => navigation.navigate("OfferDetail", { ofertaId: oferta.id })}
        />
      ) : (
        <EmptyState
          title="Sin ofertas por ahora"
          description="Te avisaremos apenas se libere un cupo que te pueda interesar."
        />
      )}

      <Text style={styles.sectionTitle}>Tu próxima cita</Text>
      {proximaCita ? (
        <AppointmentCard cita={proximaCita} />
      ) : (
        <EmptyState title="No tienes citas próximas" />
      )}
    </ScrollView>
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
  greeting: {
    fontSize: 24,
    fontWeight: "700",
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.textSecondary,
    textTransform: "uppercase",
    marginTop: spacing.md,
    marginBottom: spacing.xs,
  },
});
