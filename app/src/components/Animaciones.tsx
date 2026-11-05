import React, { useEffect } from "react";
import { StyleProp, StyleSheet, View, ViewStyle } from "react-native";
import Animated, {
  cancelAnimation,
  Easing,
  Extrapolation,
  FadeInDown,
  interpolate,
  LinearTransition,
  ReduceMotion,
  SharedValue,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import { Paleta } from "@/theme/colors";
import { useEstilos, useTema } from "@/theme/Tema";
import { CapaVidrio } from "@/components/Vidrio";
import { heading } from "@/theme/typography";

/**
 * Animaciones de la app (react-native-reanimated). Todas respetan la opción
 * «Reducir movimiento» del sistema: las de entrada y de diseño la consultan
 * solas (ReduceMotion.System) y las continuas no arrancan si está activa.
 */

/** Paso entre una card y la siguiente en la entrada escalonada, y tope de cards escalonadas. */
const PASO_MS = 55;
const MAX_ESCALONADAS = 8;

/** Entrada de una card: aparece y sube unos píxeles, un poco después que la anterior. */
export function EntradaEscalonada({
  indice,
  children,
  style,
}: {
  indice: number;
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <Animated.View
      style={style}
      entering={FadeInDown.delay(Math.min(indice, MAX_ESCALONADAS) * PASO_MS)
        .duration(320)
        .withInitialValues({ transform: [{ translateY: 14 }] })
        .reduceMotion(ReduceMotion.System)}
      layout={LinearTransition.duration(220).reduceMotion(ReduceMotion.System)}
    >
      {children}
    </Animated.View>
  );
}

/**
 * Encabezado que gana un fondo de vidrio a medida que el contenido se
 * desplaza por debajo (de 0 a 32 px de desplazamiento). Devuelve el
 * manejador para el `onScroll` de un Animated.ScrollView / FlatList y el
 * estilo para `<EncabezadoConVidrio>`.
 */
export function useEncabezadoAlDesplazar() {
  const desplazamiento = useSharedValue(0);
  const onScroll = useAnimatedScrollHandler((e) => {
    desplazamiento.value = e.contentOffset.y;
  });
  const estiloVidrio = useAnimatedStyle(() => ({
    opacity: interpolate(desplazamiento.value, [0, 32], [0, 1], Extrapolation.CLAMP),
  }));

  return { onScroll, estiloVidrio, desplazamiento };
}

/**
 * Encabezado de sección que se compacta al bajar: el título pasa de 28 a
 * 20 px, se acerca al borde y gana el fondo de vidrio. Va ligado al
 * desplazamiento (no es una animación por tiempo).
 */
export function EncabezadoCompacto({
  titulo,
  accion,
  desplazamiento,
}: {
  titulo: string;
  accion?: React.ReactNode;
  desplazamiento: SharedValue<number>;
}) {
  const { colors } = useTema();
  const styles = useEstilos(crearStyles);
  const estiloVidrio = useAnimatedStyle(() => ({
    opacity: interpolate(desplazamiento.value, [0, 32], [0, 1], Extrapolation.CLAMP),
  }));
  const estiloFila = useAnimatedStyle(() => ({
    paddingTop: interpolate(desplazamiento.value, [0, 56], [14, 8], Extrapolation.CLAMP),
    paddingBottom: interpolate(desplazamiento.value, [0, 56], [6, 8], Extrapolation.CLAMP),
  }));
  const estiloTitulo = useAnimatedStyle(() => ({
    fontSize: interpolate(desplazamiento.value, [0, 56], [28, 20], Extrapolation.CLAMP),
    lineHeight: interpolate(desplazamiento.value, [0, 56], [31, 23], Extrapolation.CLAMP),
  }));
  return (
    <View style={styles.encabezado}>
      <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.vidrioEncabezado, estiloVidrio]}>
        <CapaVidrio variante="barra" />
      </Animated.View>
      <Animated.View style={[styles.filaEncabezado, estiloFila]}>
        <Animated.Text style={[heading(28, colors.textoSobreFondo), styles.flex, estiloTitulo]} accessibilityRole="header">
          {titulo}
        </Animated.Text>
        {accion}
      </Animated.View>
    </View>
  );
}

export function EncabezadoConVidrio({
  estilo,
  children,
}: {
  estilo: ReturnType<typeof useAnimatedStyle>;
  children: React.ReactNode;
}) {
  const styles = useEstilos(crearStyles);
  return (
    <View style={styles.encabezado}>
      <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.vidrioEncabezado, estilo]}>
        <CapaVidrio variante="barra" />
      </Animated.View>
      {children}
    </View>
  );
}

/**
 * El asistente IA en espera: el contenido respira (escala 1 → 1,04) y dos
 * anillos salen del centro y se desvanecen, como un radar tranquilo. Con
 * «Reducir movimiento» queda quieto.
 */
export function PulsoAsistente({ tamano, children }: { tamano: number; children: React.ReactNode }) {
  const { colors } = useTema();
  const reducir = useReducedMotion();
  const respiro = useSharedValue(0);
  const onda = useSharedValue(0);

  useEffect(() => {
    if (reducir) return;
    const suave = Easing.inOut(Easing.sin);
    respiro.value = withRepeat(withTiming(1, { duration: 2400, easing: suave }), -1, true);
    onda.value = withDelay(400, withRepeat(withTiming(1, { duration: 3200, easing: Easing.out(Easing.quad) }), -1, false));
    return () => {
      cancelAnimation(respiro);
      cancelAnimation(onda);
    };
  }, [reducir, respiro, onda]);

  const estiloRespiro = useAnimatedStyle(() => ({
    transform: [{ scale: 1 + respiro.value * 0.04 }],
  }));
  const anilloA = useAnimatedStyle(() => estiloAnillo(onda.value, reducir));
  const anilloB = useAnimatedStyle(() => estiloAnillo((onda.value + 0.5) % 1, reducir));
  const forma = { width: tamano, height: tamano, borderRadius: tamano / 2, borderColor: colors.anilloIA };

  return (
    <View style={[estilosFijos.pulso, { width: tamano, height: tamano }]}>
      <Animated.View pointerEvents="none" style={[estilosFijos.anillo, forma, anilloA]} />
      <Animated.View pointerEvents="none" style={[estilosFijos.anillo, forma, anilloB]} />
      <Animated.View style={estiloRespiro}>{children}</Animated.View>
    </View>
  );
}

/** Un anillo en el punto `p` (0 a 1) de su recorrido: sale del centro y se desvanece. */
function estiloAnillo(p: number, reducir: boolean) {
  "worklet";
  return {
    opacity: reducir ? 0 : interpolate(p, [0, 0.15, 1], [0, 0.45, 0]),
    transform: [{ scale: interpolate(p, [0, 1], [0.55, 1.15]) }],
  };
}

const estilosFijos = StyleSheet.create({
  pulso: {
    alignItems: "center",
    justifyContent: "center",
  },
  anillo: {
    position: "absolute",
    borderWidth: 1.5,
  },
});

const crearStyles = (colors: Paleta) =>
  StyleSheet.create({
    encabezado: {
      zIndex: 1,
    },
    filaEncabezado: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 12,
      paddingHorizontal: 18,
    },
    flex: {
      flex: 1,
    },
    vidrioEncabezado: {
      borderBottomWidth: 1,
      borderBottomColor: colors.bordeCard,
    },
  });
