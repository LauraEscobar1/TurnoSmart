import React, { useCallback, useState } from "react";
import { FlatList, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { useCargarDatos } from "@/hooks/useCargarDatos";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { colors } from "@/theme/colors";
import { body, heading, label } from "@/theme/typography";
import { Card } from "@/components/Card";
import { EmptyState } from "@/components/EmptyState";
import { ScreenHeader } from "@/components/ScreenHeader";
import { Notificacion, TipoNotificacion } from "@/types/domain";
import { getNotificaciones, marcarComoLeida } from "@/services/notificationsService";
import { RootStackParamList } from "@/navigation/types";
import { haceCuanto } from "@/utils/format";

type Nav = NativeStackNavigationProp<RootStackParamList>;

const kicker: Record<TipoNotificacion, string> = {
  "cupo-ultimo-minuto": "Cupo disponible",
  recordatorio: "Recordatorio",
  confirmacion: "Confirmación",
  expiracion: "Oferta expirada",
};

/**
 * Notificaciones (Avisos) — Nivel 1 (04 · Notificaciones).
 * Es también un punto de entrada de navegación transversal
 * (docs/03-navegacion.md §4): tocar una notificación de tipo
 * "cupo-ultimo-minuto" lleva directo al detalle de la oferta.
 *
 * No leída: marca cuadrada de acero. Cupo disponible sin leer: además,
 * fila tintada. Leída: baja a 60% de opacidad.
 */
export function NotificationsScreen() {
  const navigation = useNavigation<Nav>();
  const [items, setItems] = useState<Notificacion[]>([]);

  const cargar = useCallback(() => {
    getNotificaciones().then(setItems);
  }, []);

  useCargarDatos(cargar);

  async function handlePress(n: Notificacion) {
    await marcarComoLeida(n.id);
    cargar();
    if (n.tipo === "cupo-ultimo-minuto" && n.referenciaId) {
      navigation.navigate("OfferDetail", { ofertaId: n.referenciaId });
    }
  }

  return (
    <SafeAreaView edges={["top"]} style={styles.safe}>
      <ScreenHeader title="Notificaciones" seccion={4} />
      <FlatList
        contentContainerStyle={styles.content}
        data={items}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => {
          const destacada = !item.leida && item.tipo === "cupo-ultimo-minuto";
          const meta = destacada ? colors.accent800 : colors.neutral600;
          return (
            <Card
              tono={destacada ? "acento" : item.leida ? "plana" : "superficie"}
              style={[styles.item, item.leida && styles.itemRead]}
              onPress={() => handlePress(item)}
            >
              <View style={[styles.dot, !item.leida && styles.dotUnread]} />
              <View style={styles.itemBody}>
                <View style={styles.metaRow}>
                  <Text style={label(9, meta)}>{kicker[item.tipo]}</Text>
                  <Text style={label(9, meta)}>{haceCuanto(item.fechaISO)}</Text>
                </View>
                <Text style={heading(17, destacada ? colors.accent900 : colors.text)}>{item.titulo}</Text>
                {item.cuerpo ? (
                  <Text style={body(12, destacada ? colors.accent800 : colors.neutral700)}>{item.cuerpo}</Text>
                ) : null}
              </View>
            </Card>
          );
        }}
        ListEmptyComponent={<EmptyState title="No tenés notificaciones" />}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.fondo,
  },
  content: {
    padding: 18,
    gap: 10,
  },
  item: {
    flexDirection: "row",
    gap: 12,
    padding: 16,
  },
  itemRead: {
    opacity: 0.6,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 5,
  },
  dotUnread: {
    backgroundColor: colors.accent,
  },
  itemBody: {
    flex: 1,
    minWidth: 0,
  },
  metaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 8,
  },
});
