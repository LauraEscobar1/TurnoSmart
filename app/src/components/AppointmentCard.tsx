import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Cita } from "@/types/domain";
import { colors } from "@/theme/colors";
import { radius, spacing } from "@/theme/spacing";
import { Badge } from "@/components/Badge";

const estadoVariant: Record<Cita["estado"], "success" | "warning" | "danger" | "neutral"> = {
  confirmada: "success",
  cancelada: "danger",
  reasignada: "warning",
  "no-show": "neutral",
};

const estadoLabel: Record<Cita["estado"], string> = {
  confirmada: "Confirmada",
  cancelada: "Cancelada",
  reasignada: "Reasignada",
  "no-show": "No asistió",
};

interface AppointmentCardProps {
  cita: Cita;
  onPress?: () => void;
}

export function AppointmentCard({ cita, onPress }: AppointmentCardProps) {
  const fecha = new Date(cita.fechaHoraISO);

  return (
    <Pressable style={styles.card} onPress={onPress}>
      <View style={styles.headerRow}>
        <Text style={styles.specialty}>{cita.especialidad}</Text>
        <Badge label={estadoLabel[cita.estado]} variant={estadoVariant[cita.estado]} />
      </View>
      <Text style={styles.detail}>{cita.profesional} · {cita.consultorio}</Text>
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
    gap: 4,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.xs,
  },
  specialty: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.textPrimary,
  },
  detail: {
    fontSize: 14,
    color: colors.textSecondary,
  },
});
