import React, { useEffect } from "react";
import { StyleSheet, Text, TextStyle, View, ViewStyle } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import Svg, { Circle, Path } from "react-native-svg";
import { useTema } from "@/theme/Tema";
import { heading } from "@/theme/typography";

interface LogoProps {
  /** Alto del isotipo en px. */
  size?: number;
  /** Color del estetoscopio (tubo, olivas y campana). */
  color?: string;
  /** Color del latido. */
  acento?: string;
  /** Muestra «TurnoSmart» junto al isotipo. */
  wordmark?: boolean;
  /** vertical: nombre debajo (splash, acceso). horizontal: nombre al lado (barras). */
  disposicion?: "vertical" | "horizontal";
  /** Bajada bajo el nombre, solo en disposición vertical. */
  tagline?: string;
  /** Color de «Smart» en el nombre (por defecto, el mismo que «Turno»). */
  acentoNombre?: string;
  /** Tamaño del nombre en disposición horizontal (por defecto, ~ el alto del isotipo). */
  tamanoNombre?: number;
  /** Color de un resplandor suave detrás del isotipo y del nombre (logo claro sobre celeste). */
  resplandor?: string;
  /**
   * El estetoscopio da un «latido» (dos pulsos de escala) a los `latidoAlEntrar` ms
   * de montarse. Quien lo usa no lo pasa si el sistema pide reducir movimiento.
   */
  latidoAlEntrar?: number;
}

/** Latido doble, como un «lub-dub»: sube, vuelve, sube menos y vuelve. */
function IsotipoConLatido({ retraso, children }: { retraso: number; children: React.ReactNode }) {
  const escala = useSharedValue(1);
  useEffect(() => {
    const suave = Easing.out(Easing.quad);
    escala.value = withDelay(
      retraso,
      withSequence(
        withTiming(1.16, { duration: 140, easing: suave }),
        withTiming(1, { duration: 160, easing: suave }),
        withTiming(1.08, { duration: 120, easing: suave }),
        withTiming(1, { duration: 220, easing: suave })
      )
    );
  }, [retraso, escala]);
  const estilo = useAnimatedStyle(() => ({ transform: [{ scale: escala.value }] }));
  return <Animated.View style={estilo}>{children}</Animated.View>;
}

/**
 * Isotipo de TurnoSmart: un estetoscopio dibujado con una sola línea. Las
 * olivas forman la «U»; el tubo baja, gira y se convierte en un único
 * latido antes de llegar a la campana. Trazo de grosor constante y puntas
 * redondeadas: se lee a 16 px y funciona solo como ícono de la app.
 *
 * El viewBox está recortado al contorno exacto del trazo, así el isotipo
 * se alinea al píxel con el texto que lo acompaña.
 */
export const LOGO_VIEWBOX = { x: 11, y: 5, w: 53, h: 56 };
export const LOGO_TRAZOS = {
  olivas: "M14 8 V20 A9 9 0 0 0 32 20 V8",
  tubo: "M23 29 V36 Q23 47 34 47",
  latido: "M34 47 L38 35 L43.5 58 L47 47",
  campana: { cx: 54, cy: 47, r: 6.5 },
  grosor: 5.5,
};

export function Logo({
  size = 56,
  color,
  acento,
  wordmark = false,
  disposicion = "vertical",
  tagline,
  acentoNombre,
  tamanoNombre,
  resplandor,
  latidoAlEntrar,
}: LogoProps) {
  const { colors } = useTema();
  color ??= colors.accent900;
  acento ??= colors.accent;
  const { x, y, w, h } = LOGO_VIEWBOX;
  const t = LOGO_TRAZOS;
  const horizontal = disposicion === "horizontal";

  // Resplandor: sombra difusa sin desplazamiento (en iOS sigue la forma del trazo).
  const brilloIsotipo: ViewStyle | undefined = resplandor
    ? { shadowColor: resplandor, shadowOpacity: 1, shadowRadius: 6, shadowOffset: { width: 0, height: 1 } }
    : undefined;
  const brilloNombre: TextStyle | undefined = resplandor
    ? { textShadowColor: resplandor, textShadowRadius: 8, textShadowOffset: { width: 0, height: 1 } }
    : undefined;

  const dibujo = (
    <Svg width={(size * w) / h} height={size} viewBox={`${x} ${y} ${w} ${h}`} fill="none">
      <Path d={t.olivas} stroke={color} strokeWidth={t.grosor} strokeLinecap="round" strokeLinejoin="round" />
      <Path d={t.tubo} stroke={color} strokeWidth={t.grosor} strokeLinecap="round" strokeLinejoin="round" />
      <Path d={t.latido} stroke={acento} strokeWidth={t.grosor} strokeLinecap="round" strokeLinejoin="round" />
      <Circle cx={t.campana.cx} cy={t.campana.cy} r={t.campana.r} stroke={color} strokeWidth={t.grosor} />
    </Svg>
  );
  const conBrillo = brilloIsotipo ? <View style={brilloIsotipo}>{dibujo}</View> : dibujo;
  const isotipo =
    latidoAlEntrar !== undefined ? <IsotipoConLatido retraso={latidoAlEntrar}>{conBrillo}</IsotipoConLatido> : conBrillo;

  if (horizontal) {
    return (
      <View style={styles.fila} accessibilityRole="image" accessibilityLabel="TurnoSmart">
        {isotipo}
        {wordmark ? (
          <Text style={[heading(tamanoNombre ?? Math.round(size * 0.95), color), brilloNombre]}>
            Turno<Text style={{ color: acentoNombre ?? color }}>Smart</Text>
          </Text>
        ) : null}
      </View>
    );
  }

  return (
    <View style={styles.columna} accessibilityRole="image" accessibilityLabel="TurnoSmart">
      {isotipo}
      {wordmark ? (
        <Text style={[heading(Math.max(18, Math.round(size * 0.4)), color), styles.nombre]}>TurnoSmart</Text>
      ) : null}
      {tagline ? <Text style={[styles.tagline, { color }]}>{tagline}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  columna: {
    alignItems: "center",
  },
  fila: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  nombre: {
    marginTop: 12,
    lineHeight: undefined,
  },
  tagline: {
    marginTop: 4,
    fontSize: 10,
    letterSpacing: 1.4,
    textTransform: "uppercase",
  },
});
