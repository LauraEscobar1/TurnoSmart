import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Cita } from "@/types/domain";
import { colors } from "@/theme/colors";
import { radius } from "@/theme/spacing";
import { body, fonts, heading, label } from "@/theme/typography";
import { Badge, BadgeVariant } from "@/components/Badge";
import { Card } from "@/components/Card";
import { dia, esDiaCercano, hora, useFormato } from "@/utils/format";
import { useDato, useT } from "@/i18n";

/** Relleno de la etiqueta de cada estado; el texto sale de i18n (datos.estadosCita). */
export const varianteEstado: Record<Cita["estado"], BadgeVariant> = {
  confirmada: "solid",
  asistida: "neutral",
  cancelada: "lost",
  reasignada: "outline",
  "no-show": "neutral",
};

interface AppointmentCardProps {
  cita: Cita;
  onPress?: () => void;
  /** Pasada: se atenúa y pierde la acción. */
  past?: boolean;
  /** Versión compacta: fecha a la izquierda, sin estado. */
  compact?: boolean;
  /** Muestra la fecha bajo la especialidad (Inicio, donde no hay calendario). */
  conFecha?: boolean;
}

/**
 * Tarjeta de cita.
 * - Compacta (Home): la fecha es el ancla visual izquierda.
 * - Completa (Mis citas, donde el día ya lo da el calendario): jerarquía
 *   especialidad + hora → profesional → consultorio → estado.
 */
export function AppointmentCard({ cita, onPress, past, compact, conFecha }: AppointmentCardProps) {
  const t = useT();
  const dato = useDato();
  const { diaRelativo, diaSemanaCorto, fechaCorta, mes } = useFormato();
  const especialidad = dato("especialidades", cita.especialidad);

  /** "Hoy, 24 sep", "Mañana, 25 sep" o "Jue 8 oct". */
  const fechaCita = (iso: string) =>
    esDiaCercano(iso) ? `${diaRelativo(iso)}, ${fechaCorta(iso)}` : `${diaSemanaCorto(new Date(iso))} ${fechaCorta(iso)}`;

  if (compact) {
    return (
      <Card onPress={onPress} style={[styles.card, styles.compact]}>
        <View style={[styles.date, styles.dateCompact]}>
          <Text style={[heading(24, colors.accent900), styles.day]}>{dia(cita.fechaHoraISO)}</Text>
          <Text style={label(9, colors.accent700)}>{mes(cita.fechaHoraISO)}</Text>
        </View>
        <View style={styles.info}>
          <Text style={heading(17)} numberOfLines={1}>
            {especialidad} · {hora(cita.fechaHoraISO)}
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
          {especialidad}
        </Text>
        <View style={styles.hora}>
          <Ionicons name="time-outline" size={14} color={colors.accent700} />
          <Text style={heading(16, colors.accent700)}>{hora(cita.fechaHoraISO)}</Text>
        </View>
      </View>

      {conFecha ? (
        <View style={styles.dato}>
          <Ionicons name="calendar-outline" size={15} color={colors.accent700} />
          <Text style={[body(14, colors.accent700), styles.fecha]}>{fechaCita(cita.fechaHoraISO)}</Text>
        </View>
      ) : null}
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
        <Badge label={dato("estadosCita", cita.estado)} variant={varianteEstado[cita.estado]} />
        {cita.origen === "cupo-recuperado" ? (
          <Text style={body(12, colors.neutral600)}>{t("citas.cupoRecuperado")}</Text>
        ) : null}
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
  fecha: {
    fontFamily: fonts.bodyMedium,
  },
});
