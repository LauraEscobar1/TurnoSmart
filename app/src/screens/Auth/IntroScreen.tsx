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
import { AuthStackParamList } from "@/navigation/types";
import { marcarIntroVista } from "@/services/authService";
import { Badge } from "@/components/Badge";
import { Blueprint } from "@/components/Blueprint";
import { ExplainabilityPanel } from "@/components/ExplainabilityPanel";
import { PrimaryButton } from "@/components/PrimaryButton";

type Props = NativeStackScreenProps<AuthStackParamList, "Intro">;

/**
 * Intro de 3 pantallas (solo la primera vez). Cada figura está armada con
 * los componentes reales del sistema, así el paciente ve de entrada la
 * oferta, la explicación de la IA y la confirmación que va a usar.
 */
const PASOS = [
  {
    titulo: "Cupos que se liberan",
    texto: "Cuando alguien cancela, te ofrecemos su cita si coincide con lo que estás esperando.",
    Figura: FiguraOferta,
  },
  {
    titulo: "Siempre sabés por qué",
    texto: "La IA prioriza según tu espera, tu especialidad, tu horario y la distancia, y te muestra los motivos.",
    Figura: FiguraExplicacion,
  },
  {
    titulo: "Aceptá en 2 toques",
    texto: "Te llega el aviso, abrís la oferta y la aceptás. Sin pasos de más: la cita queda confirmada.",
    Figura: FiguraConfirmacion,
  },
];

export function IntroScreen({ navigation }: Props) {
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
            <Text style={[heading(28), styles.center]}>{titulo}</Text>
            <Text style={[body(14, colors.neutral700), styles.center, styles.texto]}>{texto}</Text>
          </View>
        ))}
      </ScrollView>

      <View style={styles.dots} accessibilityLabel={`Paso ${paso + 1} de ${PASOS.length}`}>
        {PASOS.map((p, i) => (
          <View key={p.titulo} style={[styles.dot, i === paso && styles.dotOn]} />
        ))}
      </View>

      <View style={styles.actions}>
        <PrimaryButton label="Omitir" variant="secondary" onPress={terminar} style={styles.action} />
        <PrimaryButton label={ultimo ? "Empezar" : "Siguiente"} onPress={siguiente} style={styles.action} />
      </View>
    </SafeAreaView>
  );
}

function FiguraOferta() {
  return (
    <View style={styles.stack}>
      <Badge label="Cupo disponible" variant="outline" />
      <Blueprint style={styles.ofertaCard}>
        <View style={styles.row}>
          <Badge label="Oferta para vos" variant="accent" />
          <View style={{ alignItems: "flex-end" }}>
            <Text style={heading(22, colors.accent800)}>07:39</Text>
            <Text style={label(8, colors.accent800)}>restantes</Text>
          </View>
        </View>
        <Text style={heading(25, colors.accent900)}>Cardiología</Text>
        <Text style={body(13, colors.accent800)}>Hoy 15:40 · Dra. E. Ruiz</Text>
      </Blueprint>
    </View>
  );
}

function FiguraExplicacion() {
  return (
    <Blueprint style={styles.panel}>
      <ExplainabilityPanel
        factores={[
          { etiqueta: "Tiempo en espera", valor: "34 días", peso: 0.92 },
          { etiqueta: "Tu especialidad", valor: "Cardiología", peso: 1 },
          { etiqueta: "Horario preferido", valor: "Tarde", peso: 0.64 },
        ]}
      />
    </Blueprint>
  );
}

function FiguraConfirmacion() {
  return (
    <Blueprint style={styles.confirmacion} cornerColor={colors.accent900}>
      <View style={styles.check}>
        <Ionicons name="checkmark" size={28} color={colors.bg} />
      </View>
      <Text style={heading(24)}>Cupo confirmado</Text>
      <Text style={body(13, colors.neutral700)}>Cardiología · hoy 15:40</Text>
    </Blueprint>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.bg,
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
    padding: 14,
    gap: 8,
    backgroundColor: colors.accent100,
  },
  panel: {
    padding: 18,
  },
  confirmacion: {
    paddingVertical: 26,
    paddingHorizontal: 18,
    alignItems: "center",
    gap: 10,
  },
  check: {
    width: 52,
    height: 52,
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
    width: 6,
    height: 6,
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
