import React, { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { colors } from "@/theme/colors";
import { spacing } from "@/theme/spacing";
import { AppointmentsStackParamList } from "@/navigation/types";
import { Cita } from "@/types/domain";
import { getCitaPorId } from "@/services/appointmentsService";

type Props = NativeStackScreenProps<AppointmentsStackParamList, "AppointmentDetail">;

export function AppointmentDetailScreen({ route }: Props) {
  const { citaId } = route.params;
  const [cita, setCita] = useState<Cita | null>(null);

  useEffect(() => {
    getCitaPorId(citaId).then(setCita);
  }, [citaId]);

  if (!cita) return null;

  const fecha = new Date(cita.fechaHoraISO);

  return (
    <View style={styles.container}>
      <Text style={styles.specialty}>{cita.especialidad}</Text>
      <Text style={styles.detail}>{cita.profesional}</Text>
      <Text style={styles.detail}>{cita.consultorio}</Text>
      <Text style={styles.detail}>
        {fecha.toLocaleDateString()} · {fecha.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
      </Text>
      <Text style={styles.detail}>Estado: {cita.estado}</Text>
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
  specialty: {
    fontSize: 22,
    fontWeight: "700",
    color: colors.textPrimary,
  },
  detail: {
    fontSize: 16,
    color: colors.textSecondary,
  },
});
