import React, { useCallback, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { colors } from "@/theme/colors";
import { heading, label, body } from "@/theme/typography";
import { OfferCard } from "@/components/OfferCard";
import { AppointmentCard } from "@/components/AppointmentCard";
import { EmptyState } from "@/components/EmptyState";
import { OfertaCupo, Cita } from "@/types/domain";
import { getOfertaPendiente } from "@/services/offersService";
import { getCitasProximas } from "@/services/appointmentsService";
import { RootStackParamList } from "@/navigation/types";
import { pacienteActual } from "@/data/mockData";

type Nav = NativeStackNavigationProp<RootStackParamList>;

function saludo() {
  const h = new Date().getHours();
  if (h < 12) return "Buen día";
  if (h < 20) return "Buenas tardes";
  return "Buenas noches";
}

/**
 * Home — Nivel 1 (docs/02-jerarquia.md §2).
 * Muestra, en orden de prioridad:
 *   1. Oferta de cupo activa (si existe) — máxima prioridad visual.
 *   2. Próxima cita confirmada.
 *   3. Estado de la lista de espera.
 */
export function HomeScreen() {
  const navigation = useNavigation<Nav>();
  const [oferta, setOferta] = useState<OfertaCupo | null>(null);
  const [proximaCita, setProximaCita] = useState<Cita | null>(null);

  useFocusEffect(
    useCallback(() => {
      getOfertaPendiente().then(setOferta);
      getCitasProximas().then((citas) => setProximaCita(citas[0] ?? null));
    }, [])
  );

  const { dias, puesto } = pacienteActual.listaEspera;

  return (
    <SafeAreaView edges={["top"]} style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={label(10)}>{saludo()}</Text>
        <Text style={[heading(28), styles.name]}>{pacienteActual.nombre}</Text>

        <View style={styles.block}>
          {oferta ? (
            <OfferCard
              variant="home"
              oferta={oferta}
              onPress={() => navigation.navigate("OfferDetail", { ofertaId: oferta.id })}
            />
          ) : (
            <EmptyState
              title="Sin ofertas por ahora"
              description="Te avisamos apenas se libere un cupo que te pueda interesar."
            />
          )}
        </View>

        <Text style={[label(10), styles.sectionLabel]}>Próxima cita confirmada</Text>
        <View style={styles.block}>
          {proximaCita ? (
            <AppointmentCard
              compact
              cita={proximaCita}
              onPress={() =>
                navigation.navigate("Tabs", {
                  screen: "MisCitas",
                  params: { screen: "AppointmentDetail", params: { citaId: proximaCita.id }, initial: false },
                })
              }
            />
          ) : (
            <EmptyState title="No tenés citas próximas" />
          )}
        </View>

        <View style={styles.waitlist}>
          <Text style={body(12, colors.neutral700)}>Tu lista de espera</Text>
          <Text style={heading(17)}>
            {dias} días · puesto {puesto}
          </Text>
        </View>
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
  },
  name: {
    marginBottom: 18,
  },
  block: {
    marginBottom: 22,
  },
  sectionLabel: {
    marginBottom: 10,
  },
  waitlist: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "baseline",
    borderTopWidth: 1,
    borderTopColor: colors.divider,
    paddingTop: 12,
  },
});
