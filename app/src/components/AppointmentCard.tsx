import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { Cita } from "@/types/domain";
import { colors } from "@/theme/colors";
import { body, heading, label } from "@/theme/typography";
import { Badge, BadgeVariant } from "@/components/Badge";
import { Blueprint } from "@/components/Blueprint";
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
    <Blueprint
      onPress={past ? undefined : onPress}
      style={[styles.card, compact && styles.compact, past && styles.past]}
    >
      <View style={[styles.date, compact && styles.dateCompact]}>
        <Text style={[heading(compact ? 26 : 30), styles.day]}>{dia(cita.fechaHoraISO)}</Text>
        <Text style={label(compact ? 9 : 10)}>{mes(cita.fechaHoraISO)}</Text>
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
    </Blueprint>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  compact: {
    padding: 14,
    gap: 14,
  },
  past: {
    opacity: 0.55,
  },
  date: {
    alignItems: "center",
    minWidth: 52,
    paddingRight: 16,
    borderRightWidth: 1,
    borderRightColor: colors.divider,
  },
  dateCompact: {
    minWidth: 46,
    paddingRight: 14,
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
