import React, { useCallback, useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { colors } from "@/theme/colors";
import { radius, spacing } from "@/theme/spacing";
import { EmptyState } from "@/components/EmptyState";
import { Notificacion } from "@/types/domain";
import { getNotificaciones, marcarComoLeida } from "@/services/notificationsService";
import { RootStackParamList } from "@/navigation/types";

type Nav = NativeStackNavigationProp<RootStackParamList>;

/**
 * Notificaciones — Nivel 1.
 * Es también un punto de entrada de navegación transversal
 * (docs/03-navegacion.md §4): tocar una notificación de tipo
 * "cupo-ultimo-minuto" lleva directo al detalle de la oferta.
 */
export function NotificationsScreen() {
  const navigation = useNavigation<Nav>();
  const [items, setItems] = useState<Notificacion[]>([]);

  useFocusEffect(
    useCallback(() => {
      getNotificaciones().then(setItems);
    }, [])
  );

  async function handlePress(n: Notificacion) {
    await marcarComoLeida(n.id);
    if (n.tipo === "cupo-ultimo-minuto" && n.referenciaId) {
      navigation.navigate("OfferDetail", { ofertaId: n.referenciaId });
    }
  }

  return (
    <View style={styles.container}>
      <FlatList
        contentContainerStyle={styles.content}
        data={items}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <Pressable
            style={[styles.item, !item.leida && styles.itemUnread]}
            onPress={() => handlePress(item)}
          >
            <Text style={styles.itemTitle}>{item.titulo}</Text>
            <Text style={styles.itemBody}>{item.cuerpo}</Text>
          </Pressable>
        )}
        ListEmptyComponent={<EmptyState title="No tienes notificaciones" />}
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
  item: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  itemUnread: {
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
  },
  itemTitle: {
    fontWeight: "700",
    color: colors.textPrimary,
    marginBottom: 2,
  },
  itemBody: {
    color: colors.textSecondary,
  },
});
