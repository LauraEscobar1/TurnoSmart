import React, { useEffect, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { colors } from "@/theme/colors";
import { body, heading } from "@/theme/typography";
import { RootStackParamList } from "@/navigation/types";
import { OfertaCupo } from "@/types/domain";
import { aceptarOferta, getOfertaPorId, rechazarOferta } from "@/services/offersService";
import { PrimaryButton } from "@/components/PrimaryButton";
import { ScreenHeader } from "@/components/ScreenHeader";
import { Countdown, useCountdown } from "@/components/Countdown";
import { ExplainabilityPanel } from "@/components/ExplainabilityPanel";
import { DataRow } from "@/components/OfferCard";
import { EmptyState } from "@/components/EmptyState";
import { fechaConDia, hora } from "@/utils/format";

type Props = NativeStackScreenProps<RootStackParamList, "OfferDetail">;

/**
 * Detalle de oferta — Nivel 2/3 (02 · Detalle de oferta, deep link).
 * Flujo crítico descrito en docs/03-navegacion.md §2.4: contador visible
 * y las dos acciones siempre a la vista, sin desplazar ni confirmar.
 * El back va a Home, nunca a una pantalla intermedia.
 */
export function OfferDetailScreen({ route, navigation }: Props) {
  const { ofertaId } = route.params;
  const [oferta, setOferta] = useState<OfertaCupo | null | undefined>(undefined);

  useEffect(() => {
    getOfertaPorId(ofertaId).then(setOferta);
  }, [ofertaId]);

  const volverAHome = () => navigation.navigate("Tabs", { screen: "Inicio" });

  if (oferta === undefined) return <SafeAreaView style={styles.safe} />;

  return (
    <SafeAreaView edges={["top", "bottom"]} style={styles.safe}>
      <ScreenHeader title="Oferta de cupo" onBack={volverAHome} />
      {oferta && oferta.estado === "pendiente" ? (
        <OfertaVigente oferta={oferta} navigation={navigation} />
      ) : oferta?.estado === "aceptada" ? (
        <OfertaResuelta
          title="Ya aceptaste esta oferta"
          description="La cita está confirmada en Mis citas."
          action="Ver en Mis citas"
          onPress={() => navigation.navigate("Tabs", { screen: "MisCitas" })}
        />
      ) : oferta?.estado === "rechazada" ? (
        <OfertaResuelta
          title="Rechazaste esta oferta"
          description="El cupo se ofreció a otro paciente."
          action="Ver historial"
          onPress={() => navigation.navigate("Tabs", { screen: "Ofertas" })}
        />
      ) : (
        <OfertaExpirada onVerHistorial={() => navigation.navigate("Tabs", { screen: "Ofertas" })} />
      )}
    </SafeAreaView>
  );
}

function OfertaVigente({ oferta, navigation }: { oferta: OfertaCupo; navigation: Props["navigation"] }) {
  const segundos = useCountdown(oferta.expiraEnISO);

  if (segundos === 0) {
    return <OfertaExpirada onVerHistorial={() => navigation.navigate("Tabs", { screen: "Ofertas" })} />;
  }

  async function handleAceptar() {
    await aceptarOferta(oferta.id);
    navigation.replace("OfferConfirmation", { ofertaId: oferta.id, resultado: "aceptada" });
  }

  async function handleRechazar() {
    await rechazarOferta(oferta.id);
    navigation.replace("OfferConfirmation", { ofertaId: oferta.id, resultado: "rechazada" });
  }

  return (
    <>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.timer}>
          <Countdown segundos={segundos} size={52} caption="Tiempo para responder" align="center" />
        </View>
        <View>
          <Text style={heading(32)}>{oferta.especialidad}</Text>
          <Text style={body(14, colors.neutral700)}>
            {oferta.profesional} · {oferta.consultorio}
          </Text>
        </View>
        <DataRow fecha={fechaConDia(oferta.fechaHoraISO)} hora={hora(oferta.fechaHoraISO)} size={18} />
        <ExplainabilityPanel factores={oferta.factores} />
      </ScrollView>
      <View style={styles.actions}>
        <PrimaryButton label="Rechazar" variant="secondary" onPress={handleRechazar} style={styles.reject} />
        <PrimaryButton label="Aceptar cupo" onPress={handleAceptar} style={styles.accept} />
      </View>
    </>
  );
}

function OfertaExpirada({ onVerHistorial }: { onVerHistorial: () => void }) {
  return (
    <OfertaResuelta
      title="Oferta expirada"
      description="Este cupo ya se ofreció a otro paciente."
      action="Ver historial"
      onPress={onVerHistorial}
    />
  );
}

function OfertaResuelta(props: { title: string; description: string; action: string; onPress: () => void }) {
  return (
    <View style={styles.content}>
      <EmptyState title={props.title} description={props.description} />
      <PrimaryButton label={props.action} variant="secondary" onPress={props.onPress} />
    </View>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  content: {
    padding: 18,
    gap: 16,
  },
  timer: {
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
    paddingBottom: 16,
  },
  actions: {
    flexDirection: "row",
    gap: 10,
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
  },
  reject: {
    flex: 1,
  },
  accept: {
    flex: 1.4,
  },
});
