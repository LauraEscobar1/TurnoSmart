import React, { useCallback, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { useCargarDatos } from "@/hooks/useCargarDatos";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { colors } from "@/theme/colors";
import { label } from "@/theme/typography";
import { OfferCard } from "@/components/OfferCard";
import { EmptyState } from "@/components/EmptyState";
import { ScreenHeader } from "@/components/ScreenHeader";
import { OfertaCupo } from "@/types/domain";
import { getHistorialOfertas, getOfertaPendiente } from "@/services/offersService";
import { RootStackParamList } from "@/navigation/types";

type Nav = NativeStackNavigationProp<RootStackParamList>;

/**
 * Ofertas — Nivel 1 ("NavDeslizable.dc.html", sección 2 / 5).
 * Una sola lista: lo pendiente de respuesta arriba y el historial debajo,
 * atenuado. La fila pendiente abre el detalle con el contador.
 */
export function OffersListScreen() {
  const navigation = useNavigation<Nav>();
  const [pendiente, setPendiente] = useState<OfertaCupo | null>(null);
  const [historial, setHistorial] = useState<OfertaCupo[]>([]);

  useCargarDatos(
    useCallback(() => {
      getOfertaPendiente().then(setPendiente);
      getHistorialOfertas().then(setHistorial);
    }, [])
  );

  return (
    <SafeAreaView edges={["top"]} style={styles.safe}>
      <ScreenHeader title="Ofertas" seccion={2} />
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={label(10)}>Pendiente de respuesta · {pendiente ? 1 : 0}</Text>
        {pendiente ? (
          <OfferCard
            variant="pendiente"
            oferta={pendiente}
            onPress={() => navigation.navigate("OfferDetail", { ofertaId: pendiente.id })}
          />
        ) : (
          <EmptyState
            title="No tenés ofertas pendientes"
            description="Te avisamos apenas se libere un cupo que te pueda interesar."
          />
        )}

        <Text style={[label(10), styles.historial]}>Historial</Text>
        {historial.length ? (
          <View style={styles.list}>
            {historial.map((o) => (
              <OfferCard key={o.id} variant="historial" oferta={o} />
            ))}
          </View>
        ) : (
          <EmptyState title="Todavía no tenés historial de ofertas" />
        )}
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
    gap: 12,
  },
  historial: {
    marginTop: 8,
  },
  list: {
    gap: 12,
  },
});
