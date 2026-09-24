import React, { useEffect, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { colors } from "@/theme/colors";
import { body, heading, label } from "@/theme/typography";
import { AppointmentsStackParamList } from "@/navigation/types";
import { Cita } from "@/types/domain";
import { getCitaPorId } from "@/services/appointmentsService";
import { ScreenHeader } from "@/components/ScreenHeader";
import { Badge } from "@/components/Badge";
import { estadoCita } from "@/components/AppointmentCard";
import { Card } from "@/components/Card";
import { DataRow } from "@/components/OfferCard";
import { fechaConDia, hora } from "@/utils/format";

type Props = NativeStackScreenProps<AppointmentsStackParamList, "AppointmentDetail">;

export function AppointmentDetailScreen({ route, navigation }: Props) {
  const { citaId } = route.params;
  const [cita, setCita] = useState<Cita | null>(null);

  useEffect(() => {
    getCitaPorId(citaId).then(setCita);
  }, [citaId]);

  const e = cita ? estadoCita[cita.estado] : null;

  return (
    <SafeAreaView edges={["top"]} style={styles.safe}>
      <ScreenHeader title="Detalle de cita" onBack={() => (navigation.canGoBack() ? navigation.goBack() : navigation.navigate("AppointmentsList"))} />
      {cita && e && (
        <ScrollView contentContainerStyle={styles.content}>
          <Card style={styles.card}>
            <Badge label={e.label} variant={e.variant} />
            <View>
              <Text style={heading(32)}>{cita.especialidad}</Text>
              <Text style={body(14, colors.neutral700)}>
                {cita.profesional} · {cita.consultorio}
              </Text>
            </View>
            <DataRow fecha={fechaConDia(cita.fechaHoraISO)} hora={hora(cita.fechaHoraISO)} size={18} />
            <View style={styles.origin}>
              <Text style={label(9)}>Origen</Text>
              <Text style={body(13, colors.neutral700)}>
                {cita.origen === "cupo-recuperado" ? "Cupo de último minuto" : "Reserva directa"}
              </Text>
            </View>
          </Card>
        </ScrollView>
      )}
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
  },
  card: {
    padding: 18,
    gap: 14,
  },
  origin: {
    gap: 2,
  },
});
