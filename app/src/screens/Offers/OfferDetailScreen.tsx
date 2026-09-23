import React, { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { colors } from "@/theme/colors";
import { radius, spacing } from "@/theme/spacing";
import { RootStackParamList } from "@/navigation/types";
import { OfertaCupo } from "@/types/domain";
import { aceptarOferta, getOfertaPendiente, rechazarOferta } from "@/services/offersService";
import { PrimaryButton } from "@/components/PrimaryButton";

type Props = NativeStackScreenProps<RootStackParamList, "OfferDetail">;

/**
 * Detalle de oferta — Nivel 2/3.
 * Flujo crítico descrito en docs/03-navegacion.md §2.4:
 * el usuario tiene un temporizador visible para aceptar o rechazar.
 */
export function OfferDetailScreen({ route, navigation }: Props) {
  const { ofertaId } = route.params;
  const [oferta, setOferta] = useState<OfertaCupo | null>(null);

  useEffect(() => {
    getOfertaPendiente().then((o) => {
      if (o && o.id === ofertaId) setOferta(o);
    });
  }, [ofertaId]);

  if (!oferta) {
    return (
      <View style={styles.container}>
        <Text style={styles.detail}>Esta oferta ya no está disponible.</Text>
      </View>
    );
  }

  const fecha = new Date(oferta.fechaHoraISO);
  const minutosRestantes = Math.max(0, Math.round(oferta.segundosParaExpirar / 60));

  async function handleAceptar() {
    await aceptarOferta(oferta!.id);
    navigation.replace("OfferConfirmation", { ofertaId: oferta!.id, resultado: "aceptada" });
  }

  async function handleRechazar() {
    await rechazarOferta(oferta!.id);
    navigation.replace("OfferConfirmation", { ofertaId: oferta!.id, resultado: "rechazada" });
  }

  return (
    <View style={styles.container}>
      <View style={styles.timerBanner}>
        <Text style={styles.timerText}>Expira en {minutosRestantes} minutos</Text>
      </View>

      <Text style={styles.specialty}>{oferta.especialidad}</Text>
      <Text style={styles.detail}>{oferta.profesional}</Text>
      <Text style={styles.detail}>{oferta.consultorio}</Text>
      <Text style={styles.detail}>
        {fecha.toLocaleDateString()} · {fecha.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
      </Text>

      <View style={styles.actions}>
        <PrimaryButton label="Aceptar cupo" onPress={handleAceptar} />
        <PrimaryButton label="Rechazar" onPress={handleRechazar} variant="secondary" />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    padding: spacing.md,
    gap: spacing.xs,
  },
  timerBanner: {
    backgroundColor: colors.warning,
    borderRadius: radius.md,
    padding: spacing.sm,
    marginBottom: spacing.md,
  },
  timerText: {
    color: colors.textInverse,
    fontWeight: "700",
    textAlign: "center",
  },
  specialty: {
    fontSize: 22,
    fontWeight: "700",
    color: colors.textPrimary,
  },
  detail: {
    fontSize: 16,
    color: colors.textSecondary,
  },
  actions: {
    marginTop: spacing.xl,
    gap: spacing.sm,
  },
});
