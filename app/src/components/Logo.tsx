import React from "react";
import { StyleSheet, Text, View } from "react-native";
import Svg, { Circle, Path } from "react-native-svg";
import { colors } from "@/theme/colors";
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
  color = colors.accent900,
  acento = colors.accent,
  wordmark = false,
  disposicion = "vertical",
  tagline,
}: LogoProps) {
  const { x, y, w, h } = LOGO_VIEWBOX;
  const t = LOGO_TRAZOS;
  const horizontal = disposicion === "horizontal";

  const isotipo = (
    <Svg width={(size * w) / h} height={size} viewBox={`${x} ${y} ${w} ${h}`} fill="none">
      <Path d={t.olivas} stroke={color} strokeWidth={t.grosor} strokeLinecap="round" strokeLinejoin="round" />
      <Path d={t.tubo} stroke={color} strokeWidth={t.grosor} strokeLinecap="round" strokeLinejoin="round" />
      <Path d={t.latido} stroke={acento} strokeWidth={t.grosor} strokeLinecap="round" strokeLinejoin="round" />
      <Circle cx={t.campana.cx} cy={t.campana.cy} r={t.campana.r} stroke={color} strokeWidth={t.grosor} />
    </Svg>
  );

  if (horizontal) {
    return (
      <View style={styles.fila} accessibilityRole="image" accessibilityLabel="TurnoSmart">
        {isotipo}
        {wordmark ? <Text style={heading(Math.round(size * 0.95), color)}>TurnoSmart</Text> : null}
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
    gap: 8,
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
    opacity: 0.75,
  },
});
