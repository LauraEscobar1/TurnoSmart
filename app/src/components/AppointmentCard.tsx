import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { Cita } from "@/types/domain";
import { colors } from "@/theme/colors";
import { radius } from "@/theme/spacing";
import { body, heading, label } from "@/theme/typography";
import { Badge, BadgeVariant } from "@/components/Badge";
import { Card } from "@/components/Card";
import { dia, hora, mes } from "@/utils/format";

export const estadoCita: Record<Cita["estado"], { label: string; variant: BadgeVariant }> = {
  confirmada: { label: "Confirmada", variant: "solid" },
  asistida: { label: "Asistida", variant: "neutral" },
  cancelada: { label: "Cancelada", variant: "lost" },
  reasignada: { label: "Reasignada", variant: "outline" },
  "no-show": { label: "No asistió", variant: "neutral" },
};

interface AppointmentCardProps {
  cita: Cita;
  onPress?: () => void;
  /** Pasada: baja a 55% de opacidad y pierde la acción. */
  past?: boolean;
  /** Versión compacta de Home: sin etiqueta de estado. */
  compact?: boolean;
}

/**
 * Tarjeta de cita — un solo componente para Próximas y Pasadas.
 * La fecha es el ancla visual izquierda en ambos casos.
 */
export function AppointmentCard({ cita, onPress, past, compact }: AppointmentCardProps) {
  const e = estadoCita[cita.estado];

  return (
    <Card onPress={past ? undefined : onPress} style={[styles.card, compact && styles.compact, past && styles.past]}>
      <View style={[styles.date, compact && styles.dateCompact]}>
        <Text style={[heading(compact ? 24 : 28, colors.accent900), styles.day]}>{dia(cita.fechaHoraISO)}</Text>
        <Text style={label(compact ? 9 : 10, colors.accent700)}>{mes(cita.fechaHoraISO)}</Text>
      </View>
      <View style={styles.info}>
        <Text style={heading(compact ? 17 : 19)} numberOfLines={1}>
          {cita.especialidad} · {hora(cita.fechaHoraISO)}
        </Text>
        <Text style={body(compact ? 12 : 13, colors.neutral700)} numberOfLines={1}>
          {cita.profesional} · {cita.consultorio}
        </Text>
      </View>
      {!compact && <Badge label={e.label} variant={e.variant} style={styles.centered} />}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  compact: {
    padding: 12,
    gap: 12,
  },
  past: {
    opacity: 0.55,
  },
  date: {
    alignItems: "center",
    justifyContent: "center",
    width: 58,
    paddingVertical: 8,
    borderRadius: radius.md,
    backgroundColor: colors.accent100,
  },
  dateCompact: {
    width: 52,
    paddingVertical: 6,
  },
  day: {
    lineHeight: undefined,
  },
  info: {
    flex: 1,
    minWidth: 0,
  },
  centered: {
    alignSelf: "center",
  },
});
