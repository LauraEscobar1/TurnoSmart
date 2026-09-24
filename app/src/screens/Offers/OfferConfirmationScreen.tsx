import React, { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { colors } from "@/theme/colors";
import { body, heading, label } from "@/theme/typography";
import { RootStackParamList } from "@/navigation/types";
import { OfertaCupo } from "@/types/domain";
import { getOfertaPorId } from "@/services/offersService";
import { PrimaryButton } from "@/components/PrimaryButton";
import { diaRelativo, hora } from "@/utils/format";

type Props = NativeStackScreenProps<RootStackParamList, "OfferConfirmation">;

const AUTO_NAV_MS = 2000;

/**
 * Confirmación — Nivel 4 (estado terminal, 03 · Confirmación).
 * Aceptada: campo sólido Campo (accent 900); auto-navega a
 * Mis citas › Próximas tras 2 s, el botón es para quien no quiera esperar.
 * Rechazada: mismo molde con el campo sólido reemplazado por contorno.
 */
export function OfferConfirmationScreen({ route, navigation }: Props) {
  const { ofertaId, resultado } = route.params;
  const esAceptada = resultado === "aceptada";
  const [oferta, setOferta] = useState<OfertaCupo | null>(null);

  useEffect(() => {
    getOfertaPorId(ofertaId).then(setOferta);
  }, [ofertaId]);

  const irAMisCitas = () =>
    navigation.replace("Tabs", {
      screen: "MisCitas",
      params: { screen: "AppointmentsList", params: { tab: "proximas" } },
    });
  const irAInicio = () => navigation.replace("Tabs", { screen: "Inicio" });

  useEffect(() => {
    if (!esAceptada) return;
    const timeout = setTimeout(irAMisCitas, AUTO_NAV_MS);
    return () => clearTimeout(timeout);
    // Solo al montar: el temporizador no debe reiniciarse.
  }, []);

  const fg = esAceptada ? colors.bg : colors.text;
  const rule = esAceptada ? colors.dividerOnField : colors.divider;

  return (
    <SafeAreaView
      edges={["top", "bottom"]}
      style={[styles.safe, { backgroundColor: esAceptada ? colors.accent900 : colors.fondo }]}
    >
      <StatusBar style={esAceptada ? "light" : "dark"} />
      <View style={styles.body}>
        <View style={[styles.halo, { backgroundColor: esAceptada ? "rgba(255,255,255,0.08)" : colors.accent100 }]}>
          <View style={[styles.mark, { borderColor: fg }]}>
            <Ionicons name={esAceptada ? "checkmark" : "close"} size={34} color={fg} />
          </View>
        </View>
        <Text style={[heading(34, fg), styles.center]}>{esAceptada ? "Cupo confirmado" : "Oferta rechazada"}</Text>
        {oferta && (
          <Text style={[body(14, fg), styles.center, styles.soft]}>
            {oferta.especialidad} · {diaRelativo(oferta.fechaHoraISO).toLowerCase()} {hora(oferta.fechaHoraISO)}
            {"\n"}
            {oferta.profesional} · {oferta.consultorio}
          </Text>
        )}
        <View style={[styles.note, { borderTopColor: rule }]}>
          <Text style={[body(12, fg), styles.center, styles.faint]}>
            {esAceptada
              ? "Te enviamos un recordatorio 2 horas antes. Podés cancelar desde Mis citas."
              : "Gracias por avisarnos. Se lo ofrecemos a otro paciente."}
          </Text>
        </View>
      </View>
      <View style={styles.footer}>
        {esAceptada ? (
          <>
            <PrimaryButton label="Ver cita" variant="inverse" onPress={irAMisCitas} />
            <Text style={[label(10, colors.bg), styles.center, styles.hint]}>Volviendo a Mis citas en 2 s</Text>
          </>
        ) : (
          <PrimaryButton label="Volver al inicio" variant="secondary" onPress={irAInicio} />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },
  body: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
    padding: 28,
  },
  halo: {
    width: 112,
    height: 112,
    borderRadius: 56,
    alignItems: "center",
    justifyContent: "center",
  },
  mark: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  center: {
    textAlign: "center",
  },
  soft: {
    opacity: 0.9,
  },
  faint: {
    opacity: 0.75,
  },
  note: {
    alignSelf: "stretch",
    borderTopWidth: 1,
    paddingTop: 16,
  },
  footer: {
    paddingVertical: 14,
    paddingHorizontal: 18,
    gap: 8,
  },
  hint: {
    opacity: 0.65,
  },
});
