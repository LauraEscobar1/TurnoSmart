import React, { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Paleta } from "@/theme/colors";
import { useEstilos, useTema } from "@/theme/Tema";
import { Pantalla } from "@/components/Vidrio";
import { body, heading, label } from "@/theme/typography";
import { RootStackParamList } from "@/navigation/types";
import { OfertaCupo } from "@/types/domain";
import { getOfertaPorId } from "@/services/offersService";
import { PrimaryButton } from "@/components/PrimaryButton";
import { esDiaCercano, hora, useFormato } from "@/utils/format";
import { useDato, useT } from "@/i18n";

type Props = NativeStackScreenProps<RootStackParamList, "OfferConfirmation">;

const AUTO_NAV_MS = 2000;

/**
 * Confirmación — Nivel 4 (estado terminal, 03 · Confirmación).
 * Aceptada: campo sólido de pantalla completa; auto-navega a
 * Mis citas › Próximas tras 2 s, el botón es para quien no quiera esperar.
 * Rechazada: mismo molde con el campo sólido reemplazado por contorno.
 */
export function OfferConfirmationScreen({ route, navigation }: Props) {
  const { colors, oscuro } = useTema();
  const styles = useEstilos(crearStyles);
  const t = useT();
  const dato = useDato();
  const { diaRelativo } = useFormato();
  const { ofertaId, resultado } = route.params;
  const esAceptada = resultado === "aceptada";
  const [oferta, setOferta] = useState<OfertaCupo | null>(null);

  useEffect(() => {
    getOfertaPorId(ofertaId).then(setOferta);
  }, [ofertaId]);

  // navigate (no replace): «Tabs» ya está debajo en la pila; replace montaba
  // un segundo TabNavigator con sus pestañas y su suscripción a Realtime.
  const irAMisCitas = () =>
    navigation.navigate("Tabs", {
      screen: "MisCitas",
      params: { screen: "AppointmentsList", params: { tab: "proximas" } },
    });
  const irAInicio = () => navigation.navigate("Tabs", { screen: "Inicio" });

  useEffect(() => {
    if (!esAceptada) return;
    const timeout = setTimeout(irAMisCitas, AUTO_NAV_MS);
    return () => clearTimeout(timeout);
    // Solo al montar: el temporizador no debe reiniciarse.
  }, []);

  const fg = esAceptada ? colors.sobreCampoPantalla : colors.textoSobreFondo;
  const rule = esAceptada ? colors.dividerOnField : colors.divisorSobreFondo;
  // Aceptada: campo sólido a pantalla completa. Rechazada: el degradado de siempre.
  const Raiz = esAceptada ? SafeAreaView : Pantalla;

  return (
    <Raiz edges={["top", "bottom"]} style={[styles.safe, esAceptada && { backgroundColor: colors.campoPantalla }]}>
      {/* El campo y el degradado son oscuros en los dos modos: la barra de estado va clara. */}
      <StatusBar style="light" />
      <View style={styles.body}>
        <View style={[styles.halo, { backgroundColor: colors.haloCampo }]}>
          <View style={[styles.mark, { borderColor: fg }]}>
            <Ionicons name={esAceptada ? "checkmark" : "close"} size={34} color={fg} />
          </View>
        </View>
        <Text style={[heading(34, fg), styles.center]}>{t(esAceptada ? "confirmacion.confirmado" : "confirmacion.rechazada")}</Text>
        {oferta && (
          <Text style={[body(14, colors.textoSuaveSobreFondo), styles.center]}>
            {dato("especialidades", oferta.especialidad)} ·{" "}
            {esDiaCercano(oferta.fechaHoraISO)
              ? diaRelativo(oferta.fechaHoraISO).toLowerCase()
              : diaRelativo(oferta.fechaHoraISO)}{" "}
            {hora(oferta.fechaHoraISO)}
            {"\n"}
            {oferta.profesional} · {oferta.consultorio}
          </Text>
        )}
        <View style={[styles.note, { borderTopColor: rule }]}>
          <Text style={[body(12, colors.textoTenueSobreFondo), styles.center]}>
            {esAceptada
              ? t("confirmacion.confirmadoTexto")
              : t("confirmacion.rechazadaTexto")}
          </Text>
        </View>
      </View>
      <View style={styles.footer}>
        {esAceptada ? (
          <>
            {/* En oscuro el campo ya es tenue: el botón vuelve al primario Rock Blue. */}
            <PrimaryButton label={t("confirmacion.verCita")} variant={oscuro ? "primary" : "inverse"} onPress={irAMisCitas} />
            <Text style={[label(10, colors.textoTenueSobreFondo), styles.center]}>{t("confirmacion.volviendo")}</Text>
          </>
        ) : (
          <PrimaryButton label={t("confirmacion.volverInicio")} variant="secondary" onPress={irAInicio} />
        )}
      </View>
    </Raiz>
  );
}

const crearStyles = (colors: Paleta) =>
  StyleSheet.create({
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
});
