import React from "react";
import { Platform, StyleSheet, View, ViewProps } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import { SafeAreaView, SafeAreaViewProps } from "react-native-safe-area-context";
import { useTema } from "@/theme/Tema";

/**
 * Android: el desenfoque nativo es caro y no siempre rinde; se usa el mismo
 * color del vidrio, un poco más opaco, sin BlurView.
 */
export const CON_DESENFOQUE = Platform.OS === "ios";

/** Degradado vertical del lienzo (Venice → azul profundo / Jet Black → azul noche). */
export function FondoDegradado({ children, ...props }: ViewProps) {
  const { colors } = useTema();
  return (
    <LinearGradient {...props} colors={colors.degradadoFondo} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }}>
      {children}
    </LinearGradient>
  );
}

/**
 * Raíz de cada pantalla: el degradado detrás y el área segura encima. Recibe
 * las mismas props que SafeAreaView; su fondo es siempre el degradado.
 */
export function Pantalla({ style, children, ...props }: SafeAreaViewProps) {
  return (
    <FondoDegradado style={styles.flex}>
      <SafeAreaView {...props} style={[styles.flex, style, styles.transparente]}>
        {children}
      </SafeAreaView>
    </FondoDegradado>
  );
}

export type VarianteVidrio = "card" | "acento" | "barra";

/** Relleno del vidrio según variante y plataforma (con o sin desenfoque). */
export function useFondoVidrio(variante: VarianteVidrio): string {
  const { colors } = useTema();
  if (variante === "acento") return CON_DESENFOQUE ? colors.fondoCardAcento : colors.fondoCardAcentoAndroid;
  if (variante === "barra") return CON_DESENFOQUE ? colors.fondoBarra : colors.fondoBarraAndroid;
  return CON_DESENFOQUE ? colors.fondoCard : colors.fondoCardAndroid;
}

/**
 * Capa de vidrio: primer hijo de un contenedor con bordes redondeados.
 * Desenfoca lo que hay detrás y encima pinta el color translúcido del tema,
 * que es el color efectivo contra el que se mide el contraste del texto.
 * Se recorta sola con `radio`, así el contenedor no necesita
 * `overflow: "hidden"` y conserva su sombra.
 */
export function CapaVidrio({
  variante = "card",
  radio = 0,
  brillo = false,
}: {
  variante?: VarianteVidrio;
  radio?: number;
  /** Línea de luz en el borde superior (degradado horizontal). */
  brillo?: boolean;
}) {
  const { colors } = useTema();
  const fondo = useFondoVidrio(variante);
  const recorte = { borderRadius: radio, overflow: "hidden" as const };
  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, recorte]}>
      {CON_DESENFOQUE && colors.desenfoque ? (
        <BlurView intensity={colors.intensidadBlur} tint={colors.tintaBlur} style={StyleSheet.absoluteFill} />
      ) : null}
      <View style={[StyleSheet.absoluteFill, { backgroundColor: fondo }]} />
      {brillo ? (
        <LinearGradient
          colors={["transparent", colors.bordeSuperiorCard, "transparent"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.brillo}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  transparente: {
    backgroundColor: "transparent",
  },
  brillo: {
    position: "absolute",
    top: 0,
    left: 12,
    right: 12,
    height: 1.5,
  },
});
