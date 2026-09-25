import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
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
  /** Pasada: se atenúa y pierde la acción. */
  past?: boolean;
  /** Versión compacta de Home: fecha a la izquierda, sin estado. */
  compact?: boolean;
}

/**
 * Tarjeta de cita.
 * - Compacta (Home): la fecha es el ancla visual izquierda.
 * - Completa (Mis citas, donde el día ya lo da el calendario): jerarquía
 *   especialidad + hora → profesional → consultorio → estado.
 */
export function AppointmentCard({ cita, onPress, past, compact }: AppointmentCardProps) {
  const e = estadoCita[cita.estado];

  if (compact) {
    return (
      <Card onPress={onPress} style={[styles.card, styles.compact]}>
        <View style={[styles.date, styles.dateCompact]}>
          <Text style={[heading(24, colors.accent900), styles.day]}>{dia(cita.fechaHoraISO)}</Text>
          <Text style={label(9, colors.accent700)}>{mes(cita.fechaHoraISO)}</Text>
        </View>
        <View style={styles.info}>
          <Text style={heading(17)} numberOfLines={1}>
            {cita.especialidad} · {hora(cita.fechaHoraISO)}
          </Text>
          <Text style={body(12, colors.neutral700)} numberOfLines={1}>
            {cita.profesional} · {cita.consultorio}
          </Text>
        </View>
      </Card>
    );
  }

  const accion = past ? undefined : onPress;

  return (
    <Card onPress={accion} style={[styles.completa, past && styles.past]}>
      <View style={styles.encabezado}>
        <Text style={[heading(20, colors.accent900), styles.flex]} numberOfLines={1}>
          {cita.especialidad}
        </Text>
        <View style={styles.hora}>
          <Ionicons name="time-outline" size={14} color={colors.accent700} />
          <Text style={heading(16, colors.accent700)}>{hora(cita.fechaHoraISO)}</Text>
        </View>
      </View>

      <View style={styles.dato}>
        <Ionicons name="person-outline" size={15} color={colors.accent700} />
        <Text style={[body(14, colors.text), styles.flex]} numberOfLines={1}>
          {cita.profesional}
        </Text>
      </View>
      <View style={styles.dato}>
        <Ionicons name="location-outline" size={15} color={colors.neutral600} />
        <Text style={[body(13, colors.neutral700), styles.flex]} numberOfLines={1}>
          {cita.consultorio}
        </Text>
      </View>

      <View style={styles.pie}>
        <Badge label={e.label} variant={e.variant} />
        {cita.origen === "cupo-recuperado" ? <Text style={body(12, colors.neutral600)}>Cupo recuperado</Text> : null}
        {accion ? <Ionicons name="chevron-forward" size={18} color={colors.neutral600} style={styles.chevron} /> : null}
      </View>
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
  completa: {
    padding: 16,
    gap: 6,
  },
  encabezado: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 4,
  },
  flex: {
    flex: 1,
  },
  hora: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: radius.pill,
    backgroundColor: colors.accent100,
  },
  dato: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  pie: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.borde,
  },
  chevron: {
    marginLeft: "auto",
  },
});
