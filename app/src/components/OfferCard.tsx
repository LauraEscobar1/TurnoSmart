import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { OfertaCupo } from "@/types/domain";
import { colors } from "@/theme/colors";
import { radius, spacing } from "@/theme/spacing";
import { Badge } from "@/components/Badge";

interface OfferCardProps {
  oferta: OfertaCupo;
  onPress?: () => void;
}

/**
 * Tarjeta de oferta de cupo.
 * Es el elemento de mayor prioridad visual de la app
 * (ver docs/02-jerarquia.md §4).
 */
export function OfferCard({ oferta, onPress }: OfferCardProps) {
  const fecha = new Date(oferta.fechaHoraISO);
  const minutosRestantes = Math.max(0, Math.round(oferta.segundosParaExpirar / 60));

  return (
    <Pressable style={styles.card} onPress={onPress}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>Cupo disponible</Text>
        <Badge label={`Expira en ${minutosRestantes} min`} variant="warning" />
      </View>
      <Text style={styles.specialty}>{oferta.especialidad}</Text>
      <Text style={styles.detail}>{oferta.profesional} · {oferta.consultorio}</Text>
      <Text style={styles.detail}>
        {fecha.toLocaleDateString()} · {fecha.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
    gap: 4,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.xs,
  },
  title: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.primary,
  },
  specialty: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.textPrimary,
  },
  detail: {
    fontSize: 14,
    color: colors.textSecondary,
  },
});
