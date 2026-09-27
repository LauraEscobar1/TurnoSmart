import React, { useRef, useState } from "react";
import {
  NativeScrollEvent,
  NativeSyntheticEvent,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { colors } from "@/theme/colors";
import { body, heading, label } from "@/theme/typography";
import { Clave, useDato, useT } from "@/i18n";
import { AuthStackParamList } from "@/navigation/types";
import { marcarIntroVista } from "@/services/authService";
import { Badge } from "@/components/Badge";
import { Card } from "@/components/Card";
import { ExplainabilityPanel } from "@/components/ExplainabilityPanel";
import { PrimaryButton } from "@/components/PrimaryButton";

type Props = NativeStackScreenProps<AuthStackParamList, "Intro">;

/**
 * Intro de 3 pantallas (solo la primera vez). Cada figura está armada con
 * los componentes reales del sistema, así el paciente ve de entrada la
 * oferta, la explicación de la IA y la confirmación que va a usar.
 */
const PASOS: { titulo: Clave; texto: Clave; Figura: () => React.JSX.Element }[] = [
  { titulo: "intro.uno.titulo", texto: "intro.uno.texto", Figura: FiguraOferta },
  { titulo: "intro.dos.titulo", texto: "intro.dos.texto", Figura: FiguraExplicacion },
  { titulo: "intro.tres.titulo", texto: "intro.tres.texto", Figura: FiguraConfirmacion },
];

export function IntroScreen({ navigation }: Props) {
  const t = useT();
  const { width } = useWindowDimensions();
  const scrollRef = useRef<ScrollView>(null);
  const [paso, setPaso] = useState(0);
  const ultimo = paso === PASOS.length - 1;

  async function terminar() {
    await marcarIntroVista();
    navigation.replace("Bienvenida");
  }

  function siguiente() {
    if (ultimo) {
      terminar();
      return;
    }
    scrollRef.current?.scrollTo({ x: (paso + 1) * width, animated: true });
    setPaso(paso + 1);
  }

  const alDeslizar = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const i = Math.round(e.nativeEvent.contentOffset.x / width);
    if (i !== paso && i >= 0 && i < PASOS.length) setPaso(i);
  };

  return (
    <SafeAreaView edges={["top", "bottom"]} style={styles.safe}>
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={alDeslizar}
        onScroll={alDeslizar}
        scrollEventThrottle={32}
        style={styles.flex}
      >
        {PASOS.map(({ titulo, texto, Figura }) => (
          <View key={titulo} style={[styles.page, { width }]}>
            <View style={styles.figura}>
              <Figura />
            </View>
            <Text style={[heading(28), styles.center]}>{t(titulo)}</Text>
            <Text style={[body(14, colors.neutral700), styles.center, styles.texto]}>{t(texto)}</Text>
          </View>
        ))}
      </ScrollView>

      <View style={styles.dots} accessibilityLabel={t("registro.pasoDe", { paso: paso + 1, total: PASOS.length })}>
        {PASOS.map((p, i) => (
          <View key={p.titulo} style={[styles.dot, i === paso && styles.dotOn]} />
        ))}
      </View>

      <View style={styles.actions}>
        <PrimaryButton label={t("intro.omitir")} variant="secondary" onPress={terminar} style={styles.action} />
        <PrimaryButton label={t(ultimo ? "intro.empezar" : "intro.siguiente")} onPress={siguiente} style={styles.action} />
      </View>
    </SafeAreaView>
  );
}

function FiguraOferta() {
  const t = useT();
  const dato = useDato();
  return (
    <View style={styles.stack}>
      <Badge label={t("notificaciones.mensajes.cupo-ultimo-minuto.titulo")} variant="outline" />
      <Card tono="acento" style={styles.ofertaCard}>
        <View style={styles.row}>
          <Badge label={t("oferta.paraVos")} variant="accent" />
          <View style={{ alignItems: "flex-end" }}>
            <Text style={heading(22, colors.accent800)}>07:39</Text>
            <Text style={label(8, colors.accent800)}>{t("oferta.restantes")}</Text>
          </View>
        </View>
        <Text style={heading(25, colors.accent900)}>{dato("especialidades", "Cardiología")}</Text>
        <Text style={body(13, colors.accent800)}>{t("intro.ofertaEjemplo")}</Text>
      </Card>
    </View>
  );
}

function FiguraExplicacion() {
  return (
    <Card style={styles.panel}>
      <ExplainabilityPanel
        factores={[
          { etiqueta: "Tiempo en espera", valor: "34 días", peso: 0.92 },
          { etiqueta: "Tu especialidad", valor: "Cardiología", peso: 1 },
          { etiqueta: "Horario preferido", valor: "Tarde", peso: 0.64 },
        ]}
      />
    </Card>
  );
}

function FiguraConfirmacion() {
  const t = useT();
  return (
    <Card style={styles.confirmacion}>
      <View style={styles.check}>
        <Ionicons name="checkmark" size={28} color={colors.bg} />
      </View>
      <Text style={heading(24)}>{t("confirmacion.confirmado")}</Text>
      <Text style={body(13, colors.neutral700)}>{t("intro.confirmacionEjemplo")}</Text>
    </Card>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.fondo,
  },
  flex: {
    flex: 1,
  },
  page: {
    flex: 1,
    paddingHorizontal: 28,
    justifyContent: "center",
    alignItems: "center",
  },
  figura: {
    alignSelf: "stretch",
    minHeight: 230,
    justifyContent: "center",
    marginBottom: 36,
  },
  center: {
    textAlign: "center",
  },
  texto: {
    marginTop: 8,
    maxWidth: 300,
  },
  stack: {
    gap: 14,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  ofertaCard: {
    padding: 16,
    gap: 8,
  },
  panel: {
    padding: 20,
  },
  confirmacion: {
    paddingVertical: 26,
    paddingHorizontal: 18,
    alignItems: "center",
    gap: 10,
  },
  check: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.accent900,
    alignItems: "center",
    justifyContent: "center",
  },
  dots: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 18,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: colors.neutral300,
  },
  dotOn: {
    width: 18,
    backgroundColor: colors.accent,
  },
  actions: {
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 22,
    paddingBottom: 18,
  },
  action: {
    flex: 1,
  },
});
