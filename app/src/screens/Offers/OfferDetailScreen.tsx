import React, { useCallback, useEffect, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Paleta } from "@/theme/colors";
import { useEstilos, useTema } from "@/theme/Tema";
import { body, heading } from "@/theme/typography";
import { RootStackParamList } from "@/navigation/types";
import { OfertaCupo } from "@/types/domain";
import { aceptarOferta, getOfertaPorId, OfertaNoDisponibleError, rechazarOferta } from "@/services/offersService";
import { PrimaryButton } from "@/components/PrimaryButton";
import { ScreenHeader } from "@/components/ScreenHeader";
import { Countdown, useCountdown } from "@/components/Countdown";
import { ExplainabilityPanel } from "@/components/ExplainabilityPanel";
import { DataRow } from "@/components/OfferCard";
import { EmptyState } from "@/components/EmptyState";
import { Card } from "@/components/Card";
import { hora, useFormato } from "@/utils/format";
import { useDato, useT } from "@/i18n";

type Props = NativeStackScreenProps<RootStackParamList, "OfferDetail">;

/**
 * Detalle de oferta — Nivel 2/3 (02 · Detalle de oferta, deep link).
 * Flujo crítico descrito en docs/03-navegacion.md §2.4: contador visible
 * y las dos acciones siempre a la vista, sin desplazar ni confirmar.
 * El back va a Home, nunca a una pantalla intermedia.
 */
export function OfferDetailScreen({ route, navigation }: Props) {
  const styles = useEstilos(crearStyles);
  const t = useT();
  const { ofertaId } = route.params;
  const [oferta, setOferta] = useState<OfertaCupo | null | undefined>(undefined);

  const recargar = useCallback(() => {
    getOfertaPorId(ofertaId).then(setOferta);
  }, [ofertaId]);

  useEffect(recargar, [recargar]);

  const insets = useSafeAreaInsets();

  const volverAHome = () => navigation.navigate("Tabs", { screen: "Inicio" });

  // Presentada como fullScreenModal: los insets se toman del proveedor raíz
  // (ventana completa) y no de un SafeAreaView nativo, que dentro del modal
  // de iOS puede medir 0 arriba y dejar el encabezado bajo la barra de estado.
  const marco = [styles.safe, { paddingTop: insets.top, paddingLeft: insets.left, paddingRight: insets.right }];

  if (oferta === undefined) return <View style={marco} />;

  return (
    <View style={marco}>
      <ScreenHeader title={t("oferta.titulo")} onBack={volverAHome} />
      {oferta && oferta.estado === "pendiente" ? (
        <OfertaVigente oferta={oferta} navigation={navigation} onYaNoDisponible={recargar} />
      ) : oferta?.estado === "aceptada" ? (
        <OfertaResuelta
          title={t("oferta.yaAceptaste")}
          description={t("oferta.yaAceptasteTexto")}
          action={t("oferta.verEnMisCitas")}
          onPress={() => navigation.navigate("Tabs", { screen: "MisCitas" })}
        />
      ) : oferta?.estado === "rechazada" ? (
        <OfertaResuelta
          title={t("oferta.rechazaste")}
          description={t("oferta.rechazasteTexto")}
          action={t("oferta.verHistorial")}
          onPress={() => navigation.navigate("Tabs", { screen: "Ofertas" })}
        />
      ) : (
        <OfertaExpirada onVerHistorial={() => navigation.navigate("Tabs", { screen: "Ofertas" })} />
      )}
    </View>
  );
}

function OfertaVigente({
  oferta,
  navigation,
  onYaNoDisponible,
}: {
  oferta: OfertaCupo;
  navigation: Props["navigation"];
  /** La oferta se resolvió o venció en el servidor: se vuelve a leer para mostrar su estado real. */
  onYaNoDisponible: () => void;
}) {
  const { colors } = useTema();
  const styles = useEstilos(crearStyles);
  const t = useT();
  const dato = useDato();
  const { fechaConDia } = useFormato();
  const insets = useSafeAreaInsets();
  const segundos = useCountdown(oferta.expiraEnISO);
  // Mientras se envía la respuesta los botones quedan inactivos (sin doble toque).
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (segundos === 0) {
    return <OfertaExpirada onVerHistorial={() => navigation.navigate("Tabs", { screen: "Ofertas" })} />;
  }

  async function responder(accion: (id: string) => Promise<void>, resultado: "aceptada" | "rechazada") {
    setEnviando(true);
    setError(null);
    try {
      await accion(oferta.id);
      navigation.replace("OfferConfirmation", { ofertaId: oferta.id, resultado });
    } catch (e) {
      setEnviando(false);
      if (e instanceof OfertaNoDisponibleError) {
        setError(t("oferta.errorNoDisponible"));
        onYaNoDisponible();
      } else {
        setError(t("oferta.errorSinConexion"));
      }
    }
  }

  return (
    <>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Card tono="acento" style={styles.timer}>
          <Countdown segundos={segundos} size={52} caption={t("oferta.tiempoParaResponder")} align="center" />
        </Card>
        <View>
          <Text style={heading(32, colors.text)}>{dato("especialidades", oferta.especialidad)}</Text>
          <Text style={body(14, colors.neutral700)}>
            {oferta.profesional} · {oferta.consultorio}
          </Text>
        </View>
        <DataRow fecha={fechaConDia(oferta.fechaHoraISO)} hora={hora(oferta.fechaHoraISO)} size={18} />
        <Card style={styles.panel}>
          <ExplainabilityPanel factores={oferta.factores} />
        </Card>
      </ScrollView>
      {/* La barra llega al borde inferior y absorbe el inset (indicador de inicio). */}
      <View style={[styles.barra, { paddingBottom: Math.max(insets.bottom, 14) }]}>
        {error && (
          <Text style={[body(13, colors.text), styles.error]} accessibilityRole="alert">
            {error}
          </Text>
        )}
        <View style={styles.actions}>
          <PrimaryButton
            label={t("oferta.rechazar")}
            variant="secondary"
            onPress={() => responder(rechazarOferta, "rechazada")}
            disabled={enviando}
            style={styles.reject}
          />
          <PrimaryButton
            label={t("oferta.aceptar")}
            onPress={() => responder(aceptarOferta, "aceptada")}
            disabled={enviando}
            style={styles.accept}
          />
        </View>
      </View>
    </>
  );
}

function OfertaExpirada({ onVerHistorial }: { onVerHistorial: () => void }) {
  const t = useT();
  return (
    <OfertaResuelta
      title={t("oferta.expirada")}
      description={t("oferta.expiradaTexto")}
      action={t("oferta.verHistorial")}
      onPress={onVerHistorial}
    />
  );
}

function OfertaResuelta(props: { title: string; description: string; action: string; onPress: () => void }) {
  const styles = useEstilos(crearStyles);
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.content, { paddingBottom: Math.max(insets.bottom, 18) }]}>
      <EmptyState title={props.title} description={props.description} />
      <PrimaryButton label={props.action} variant="secondary" onPress={props.onPress} />
    </View>
  );
}

const crearStyles = (colors: Paleta) =>
  StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.fondo,
  },
  scroll: {
    flex: 1,
  },
  content: {
    padding: 18,
    gap: 16,
  },
  timer: {
    paddingVertical: 18,
  },
  panel: {
    padding: 18,
  },
  barra: {
    gap: 10,
    paddingTop: 14,
    paddingHorizontal: 18,
    backgroundColor: colors.superficie,
    borderTopWidth: 1,
    borderTopColor: colors.borde,
  },
  error: {
    textAlign: "center",
  },
  actions: {
    flexDirection: "row",
    gap: 10,
  },
  reject: {
    flex: 1,
  },
  accept: {
    flex: 1.4,
  },
});
